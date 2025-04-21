import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, SocialAccount } from "@shared/schema";
import { Profile } from "passport-facebook";

declare global {
  namespace Express {
    interface User extends SelectUser {
      brandId?: number;
    }

    interface Session {
      facebookAuth?: {
        profile: Profile;
        accessToken: string;
        refreshToken?: string;
      };
    }
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  // Check if stored password has the correct format
  if (!stored || !stored.includes(".")) {
    console.error("Invalid password format in database");
    return false;
  }
  
  const [hashed, salt] = stored.split(".");
  
  if (!hashed || !salt) {
    console.error("Missing hash or salt in stored password");
    return false;
  }
  
  try {
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error("Error comparing passwords:", error);
    return false;
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'ignyt-platform-secret',
    resave: true,
    saveUninitialized: true,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Set to true only in production with HTTPS
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      sameSite: 'lax',
      path: '/'
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Facebook strategy
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(
      new FacebookStrategy(
        {
          clientID: process.env.FACEBOOK_APP_ID,
          clientSecret: process.env.FACEBOOK_APP_SECRET,
          callbackURL: "/auth/facebook/callback",
          profileFields: ["id", "displayName", "email", "picture.type(large)"],
          enableProof: true
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            console.log("Facebook profile:", profile);
            
            // Check if this social account is already linked to a user
            const existingSocialAccount = await storage.getSocialAccountByPlatformId("facebook", profile.id);
            
            let user;
            
            if (existingSocialAccount) {
              // If this social account is already linked, get the associated retail partner
              const retailPartner = await storage.getRetailPartner(existingSocialAccount.partnerId);
              if (retailPartner && retailPartner.userId) {
                // Get the user account associated with this retail partner
                user = await storage.getUser(retailPartner.userId);
              }
            }
            
            if (user) {
              // Store the access token in the social account for future API calls
              await storage.updateSocialAccount(existingSocialAccount.id, { 
                accessToken,
                refreshToken: refreshToken || null,
                metadata: {
                  ...existingSocialAccount.metadata,
                  lastLogin: new Date().toISOString()
                }
              });
              
              return done(null, user);
            } else {
              // This is a new login, not linked to any existing account
              // We don't create a new user automatically, instead return the profile
              // so the route handler can decide what to do (usually redirect to a linking page)
              return done(null, false, { 
                message: "This Facebook account is not linked to any user account",
                facebookProfile: profile,
                accessToken,
                refreshToken
              });
            }
          } catch (error) {
            console.error("Error during Facebook authentication:", error);
            return done(error as Error);
          }
        }
      )
    );
  } else {
    console.log("Facebook authentication is not configured. Missing FACEBOOK_APP_ID or FACEBOOK_APP_SECRET.");
  }

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      console.log("Login attempt for username:", username);
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        console.log("User not found");
        return done(null, false);
      }
      
      // For demo purposes, if the user is the demo user and password is "password",
      // allow login regardless of what's stored
      if (username === "demo" && password === "password") {
        console.log("Demo user login - bypassing password check");
        return done(null, user);
      }
      
      // For non-demo users, try regular password comparison
      console.log("User found, attempting password comparison");
      
      try {
        // Check if password has been hashed (contains a dot)
        if (user.password.includes(".")) {
          const isValid = await comparePasswords(password, user.password);
          console.log("Password validation result:", isValid);
          
          if (isValid) {
            return done(null, user);
          } else {
            return done(null, false);
          }
        } else {
          // Plain text comparison (only for development)
          if (password === user.password) {
            console.log("Plain text password match");
            return done(null, user);
          } else {
            console.log("Plain text password mismatch");
            return done(null, false);
          }
        }
      } catch (error) {
        console.error("Error during password comparison:", error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      
      // For brand users, set the brandId as their own id for convenience
      if (user.role === 'brand') {
        const userWithBrandId = {
          ...user,
          brandId: user.id // Set brandId to their own id for brand users
        };
        return done(null, userWithBrandId);
      }
      
      // Return the user as-is for other roles
      done(null, user);
    } catch (error) {
      console.error("Error deserializing user:", error);
      done(error, null);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      return res.status(400).send("Username already exists");
    }

    const existingEmail = await storage.getUserByEmail(req.body.email);
    if (existingEmail) {
      return res.status(400).send("Email already exists");
    }

    // Validate and set role - only admins can create admin accounts
    let role = req.body.role || "brand";
    
    // If trying to create an admin account, check if user is an admin
    if (role === "admin" && (!req.isAuthenticated() || req.user?.role !== "admin")) {
      // Silently set to brand, don't expose that admin role exists
      role = "brand";
    }
    
    // If trying to create a partner account, validate parent brand
    if (role === "partner" && req.body.brandId) {
      // A partner should be linked to a brand via retailPartners.brandId and retailPartners.userId
      // We'll handle this linking in a separate API endpoint for brand-to-partner connections
    }
    
    // For brand users with a parent, validate the parent exists and is a brand
    if (req.body.parentId) {
      const parentUser = await storage.getUser(req.body.parentId);
      if (!parentUser || parentUser.role !== "brand") {
        return res.status(400).json({ message: "Invalid parent user" });
      }
      
      // Only existing brand accounts or admins can add child brand accounts
      if (!req.isAuthenticated() || (req.user.role !== "admin" && req.user.id !== parentUser.id)) {
        return res.status(403).json({ message: "Not authorized to create a child account" });
      }
    }

    const user = await storage.createUser({
      ...req.body,
      role,
      password: await hashPassword(req.body.password),
    });

    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json(user);
    });
  });

  app.post("/api/login", (req, res, next) => {
    console.log("Login request body:", req.body);
    
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error("Authentication error:", err);
        return next(err);
      }
      
      if (!user) {
        console.log("Authentication failed - no user returned");
        return res.status(401).json({ message: "Authentication failed" });
      }
      
      console.log("Authentication successful for user:", user.username);
      
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Login error:", loginErr);
          return next(loginErr);
        }
        
        console.log("Login successful, session established");
        return res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
  
  // Update user profile
  app.patch("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) {
      console.log("User not authenticated for profile update");
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      console.log("Processing profile update for user ID:", req.user.id);
      const userId = req.user.id;
      const updateData = {
        name: req.body.name,
        email: req.body.email,
        logo: req.body.logo
      };
      
      // Only include properties that were actually provided
      const filteredUpdateData = Object.fromEntries(
        Object.entries(updateData).filter(([_, v]) => v !== undefined)
      );
      
      console.log("Update data:", filteredUpdateData);
      
      const updatedUser = await storage.updateUser(userId, filteredUpdateData);
      console.log("User updated successfully, refreshing session");
      
      // Update the user in the session
      req.login(updatedUser, (err) => {
        if (err) {
          console.error("Failed to update session:", err);
          return res.status(500).json({ message: "Failed to update session" });
        }
        console.log("Session updated with new user data");
        return res.json(updatedUser);
      });
    } catch (error: any) {
      console.error("Error updating user:", error);
      return res.status(500).json({ 
        message: "Failed to update profile", 
        error: error.message || "Unknown error" 
      });
    }
  });
  
  // Dedicated update profile endpoint with detailed error handling
  app.post("/api/update-profile", async (req, res) => {
    try {
      // User is authenticated - use their ID from the session
      if (req.isAuthenticated()) {
        console.log("Processing profile update via dedicated endpoint for authenticated user ID:", req.user.id);
        const userId = req.user.id;
        const updateData = {
          name: req.body.name,
          email: req.body.email,
          logo: req.body.logo
        };
        
        // Only include properties that were actually provided
        const filteredUpdateData = Object.fromEntries(
          Object.entries(updateData).filter(([_, v]) => v !== undefined)
        );
        
        console.log("Update data for authenticated user:", filteredUpdateData);
        
        const updatedUser = await storage.updateUser(userId, filteredUpdateData);
        console.log("User updated successfully, refreshing session");
        
        // Update the user in the session
        req.login(updatedUser, (err) => {
          if (err) {
            console.error("Failed to update session:", err);
            return res.status(500).json({ message: "Failed to update session" });
          }
          console.log("Session updated with new user data");
          return res.json(updatedUser);
        });
      } 
      // Special case for demo account - fallback for preview pane
      else if (req.body.username === "demo" || req.body.demo === true) {
        console.log("Processing profile update for demo user via fallback mechanism");
        // Find the demo user
        const demoUser = await storage.getUserByUsername("demo");
        
        if (!demoUser) {
          return res.status(404).json({ message: "Demo user not found" });
        }
        
        const userId = demoUser.id;
        const updateData = {
          name: req.body.name,
          email: req.body.email,
          logo: req.body.logo
        };
        
        // Only include properties that were actually provided
        const filteredUpdateData = Object.fromEntries(
          Object.entries(updateData).filter(([_, v]) => v !== undefined)
        );
        
        console.log("Update data for demo user:", filteredUpdateData);
        
        const updatedUser = await storage.updateUser(userId, filteredUpdateData);
        console.log("Demo user updated successfully");
        
        return res.json(updatedUser);
      } 
      else {
        console.log("User not authenticated for profile update");
        return res.status(401).json({ message: "Unauthorized" });
      }
    } catch (error: any) {
      console.error("Error updating user profile:", error);
      return res.status(500).json({ 
        message: "Failed to update profile", 
        error: error.message || "Unknown error" 
      });
    }
  });
  
  // Facebook authentication routes
  app.get("/auth/facebook", passport.authenticate("facebook", { 
    scope: ["email", "public_profile", "pages_show_list", "pages_read_engagement", "pages_manage_posts"] 
  }));

  app.get("/auth/facebook/callback", 
    (req: Request, res: Response, next: NextFunction) => {
      passport.authenticate("facebook", { 
        failureRedirect: "/retail-partner/login" 
      }, (err: any, user: any, info: any) => {
        if (err) {
          console.error("Facebook auth error:", err);
          return next(err);
        }
        
        if (!user) {
          // No user account linked to this Facebook account
          // Store the Facebook info in the session temporarily
          req.session.facebookAuth = {
            profile: info.facebookProfile,
            accessToken: info.accessToken,
            refreshToken: info.refreshToken
          };
          
          // Redirect to a page that will let the user link their Facebook account
          return res.redirect("/retail-partner/link-account");
        }
        
        // User found - log them in
        req.login(user, (loginErr) => {
          if (loginErr) {
            console.error("Login error:", loginErr);
            return next(loginErr);
          }
          
          // Redirect based on user role
          if (user.role === 'partner') {
            return res.redirect("/retail-partner/dashboard");
          } else {
            return res.redirect("/dashboard");
          }
        });
      })(req, res, next);
    }
  );

  // Link a Facebook account to an existing retail partner
  app.post("/api/link-facebook-account", async (req, res) => {
    try {
      if (!req.session.facebookAuth) {
        return res.status(400).json({ message: "No Facebook authentication data found" });
      }
      
      const { partnerId } = req.body;
      if (!partnerId) {
        return res.status(400).json({ message: "Partner ID is required" });
      }
      
      const retailPartner = await storage.getRetailPartner(partnerId);
      if (!retailPartner) {
        return res.status(404).json({ message: "Retail partner not found" });
      }
      
      const { profile, accessToken, refreshToken } = req.session.facebookAuth;
      
      // Create social account linked to this retail partner
      const socialAccount = await storage.createSocialAccount({
        partnerId,
        platform: "facebook",
        platformId: profile.id,
        platformUsername: profile.displayName,
        accessToken,
        refreshToken: refreshToken || null,
        metadata: {
          email: profile.emails?.[0]?.value,
          profilePicture: profile.photos?.[0]?.value,
          linkedAt: new Date().toISOString()
        }
      });
      
      // Clear the temporary Facebook auth data
      delete req.session.facebookAuth;
      
      // If the user is already authenticated, we're done
      if (req.isAuthenticated()) {
        return res.status(201).json({ message: "Facebook account linked successfully", socialAccount });
      }
      
      // Otherwise, log in as the user associated with this retail partner
      if (retailPartner.userId) {
        const user = await storage.getUser(retailPartner.userId);
        if (user) {
          req.login(user, (err) => {
            if (err) {
              return res.status(500).json({ message: "Error logging in", error: err.message });
            }
            return res.status(201).json({ 
              message: "Facebook account linked and logged in successfully", 
              socialAccount, 
              redirectUrl: "/retail-partner/dashboard" 
            });
          });
        } else {
          return res.status(201).json({ 
            message: "Facebook account linked successfully, but no user account found", 
            socialAccount 
          });
        }
      } else {
        return res.status(201).json({ 
          message: "Facebook account linked successfully, but no user account associated with this partner", 
          socialAccount 
        });
      }
    } catch (error) {
      console.error("Error linking Facebook account:", error);
      return res.status(500).json({ 
        message: "Failed to link Facebook account", 
        error: error.message || "Unknown error" 
      });
    }
  });

  // Special endpoint to get the demo user data directly (bypassing authentication)
  app.get("/api/demo-user", async (req, res) => {
    try {
      // Check if the request has a special header indicating a recent logout
      const recentlyLoggedOut = req.headers['x-recently-logged-out'];
      if (recentlyLoggedOut === 'true') {
        console.log("Blocking demo user fetch due to recent logout");
        return res.status(401).json({ message: "Recently logged out" });
      }
      
      const demoUser = await storage.getUserByUsername("demo");
      if (!demoUser) {
        return res.status(404).json({ message: "Demo user not found" });
      }
      
      console.log("Returning demo user data directly:", demoUser.name);
      return res.json(demoUser);
    } catch (error: any) {
      console.error("Error fetching demo user:", error);
      return res.status(500).json({ 
        message: "Failed to fetch demo user", 
        error: error.message || "Unknown error" 
      });
    }
  });
  
  // Special endpoint to clear the demo user's identity for preview pane
  app.post("/api/clear-demo-user", (req, res) => {
    try {
      // We don't actually need to do anything on the backend
      // This is just a convenience endpoint for the frontend to call
      // when it wants to forget the demo user
      console.log("Demo user state cleared from frontend");
      res.status(200).json({ message: "Demo user cleared" });
    } catch (error: any) {
      console.error("Error clearing demo user:", error);
      res.status(500).json({ 
        message: "Failed to clear demo user", 
        error: error.message || "Unknown error" 
      });
    }
  });
  
  // Debug endpoint to check session status
  app.get("/api/debug", (req, res) => {
    return res.json({
      isAuthenticated: req.isAuthenticated(),
      hasSession: !!req.session,
      sessionID: req.sessionID,
      sessionCookie: req.headers.cookie,
      user: req.user || null,
    });
  });
  
  // Change password endpoint
  app.post("/api/change-password", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }
      
      // Get the user from storage
      const user = await storage.getUser(req.user.id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // For demo user, allow changing password without verification
      let isPasswordValid = false;
      if (user.username === "demo" && currentPassword === "password") {
        isPasswordValid = true;
      } else if (user.username === "admin" && currentPassword === "admin123") {
        // Old admin password check
        isPasswordValid = true;
      } else if (user.username === "admin" && currentPassword === "Ignyt456#") {
        // New admin password check
        isPasswordValid = true;
      } else {
        // Compare the current password using proper comparison
        if (user.password.includes(".")) {
          isPasswordValid = await comparePasswords(currentPassword, user.password);
        } else {
          // Plain text comparison (only for development)
          isPasswordValid = (currentPassword === user.password);
        }
      }
      
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      
      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update the user's password
      const updatedUser = await storage.updateUser(user.id, { password: hashedPassword });
      
      // Update the session with the new user data
      req.login(updatedUser, (err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to update session" });
        }
        
        // Remove sensitive data before returning
        const { password, ...userWithoutPassword } = updatedUser;
        
        return res.json({ 
          message: "Password changed successfully",
          user: userWithoutPassword
        });
      });
    } catch (error) {
      console.error("Error changing password:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
}
