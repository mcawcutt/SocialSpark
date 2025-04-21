import express, { type Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { setupContentRoutes } from "./api/content";
import { setupMediaRoutes } from "./api/media";
import { setupUploadRoutes, serveUploads } from "./upload";
import { setupPartnerRoutes } from "./api/partners";
import { setupBrandRoutes } from "./api/brands";
import { setupInviteRoutes } from "./api/invites";
import { setupTestInviteRoutes } from "./api/test-invites";
import { setupAdminRoutes } from "./api/admin";
// Import social API routes
import { socialRouter } from "./api/social";
import { createBackup } from "./backup";
import { z } from "zod";
import {
  insertRetailPartnerSchema,
  insertSocialAccountSchema,
  insertContentPostSchema,
  insertPostAssignmentSchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Check authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    console.log(`[Auth] ${req.method} ${req.path} - Auth check:`, req.isAuthenticated ? req.isAuthenticated() : "isAuthenticated not available");
    console.log(`[Auth] ${req.method} ${req.path} - Session ID:`, req.sessionID);
    console.log(`[Auth] ${req.method} ${req.path} - User:`, req.user ? req.user.username : "Not logged in");
    
    if (!req.isAuthenticated()) {
      console.log(`[Auth] ${req.method} ${req.path} - Authentication failed, redirecting to login`);
      return res.status(401).json({ 
        message: "Unauthorized", 
        detail: "Your session has expired or you are not logged in. Please log in again." 
      });
    }
    next();
  };
  
  // Check if user is a brand or admin
  const requireBrandOrAdmin = (req: any, res: any, next: any) => {
    // First check authentication
    if (!req.isAuthenticated()) {
      return res.status(401).json({ 
        message: "Unauthorized", 
        detail: "Your session has expired or you are not logged in. Please log in again." 
      });
    }
    
    // Check if user is a brand or admin
    if (req.user.role !== 'brand' && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: "Forbidden", 
        detail: "You do not have permission to access this resource. Only brand and admin users can access this." 
      });
    }
    
    next();
  };
  
  // Check if user has a specific role
  const requireRole = (roles: string[]) => {
    return (req: any, res: any, next: any) => {
      console.log(`[Auth] ${req.method} ${req.path} - Role check:`, req.user?.role, `Required roles: ${roles}`);
      
      // First check authentication
      if (!req.isAuthenticated()) {
        return res.status(401).json({ 
          message: "Unauthorized", 
          detail: "Your session has expired or you are not logged in. Please log in again." 
        });
      }
      
      // Check if user has required role
      if (!req.user || !req.user.role || !roles.includes(req.user.role)) {
        return res.status(403).json({ 
          message: "Forbidden", 
          detail: `You do not have permission to access this resource. Required role(s): ${roles.join(', ')}.` 
        });
      }
      
      next();
    };
  };

  // Serve static assets from the attached_assets directory
  app.use("/assets", express.static(path.join(process.cwd(), "attached_assets")));
  
  // Serve the upload test page (only in development)
  if (process.env.NODE_ENV === 'development') {
    app.get("/test-upload", (req, res) => {
      res.sendFile(path.join(process.cwd(), "upload-test.html"));
    });
  }
  
  // Set up authentication routes
  setupAuth(app);
  
  // Set up content routes
  setupContentRoutes(app);
  
  // Set up media library routes
  setupMediaRoutes(app);
  
  // Set up partner routes
  setupPartnerRoutes(app);
  
  // Set up brand routes
  setupBrandRoutes(app);
  
  // Set up invite routes
  setupInviteRoutes(app);
  
  // Set up test invite routes for development
  setupTestInviteRoutes(app);
  
  // Set up admin routes
  setupAdminRoutes(app);
  
  // Set up file upload routes
  setupUploadRoutes(app);
  
  // Serve uploaded files
  serveUploads(app);
  
  // Set up social media routes
  // Using the socialRouter directly
  app.use('/api', socialRouter);

  // Debug endpoint to check if server is running correctly
  // Backup endpoint
  app.post("/api/backup", requireBrandOrAdmin, async (req, res) => {
    try {
      const backupDir = await createBackup();
      res.json({ 
        success: true, 
        message: "Backup created successfully",
        location: backupDir
      });
    } catch (error) {
      console.error("Backup failed:", error);
      res.status(500).json({ 
        success: false, 
        message: "Backup failed",
        error: String(error) 
      });
    }
  });

  app.get("/api/debug", (req, res) => {
    res.json({ 
      message: "Debug endpoint reached", 
      sessionExists: !!req.session,
      isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
      hasSession: !!req.session,
      sessionID: req.sessionID,
      sessionCookie: req.headers.cookie,
      session: req.session ? {
        isImpersonated: req.session.isImpersonated || false,
        adminImpersonator: req.session.adminImpersonator || null
      } : null,
      user: req.user || null,
      timestamp: new Date().toISOString()
    });
  });
  
  // Serve the admin brand login page directly
  app.get('/admin-brand-login', (_req, res) => {
    // Use absolute path and set Content-Type explicitly to avoid Vite middleware interference
    const absolutePath = path.resolve(process.cwd(), "admin-brand-login.html");
    console.log("Serving admin-brand-login from:", absolutePath);
    res.setHeader('Content-Type', 'text/html');
    res.sendFile(absolutePath, (err) => {
      if (err) {
        console.error("Error serving admin-brand-login.html:", err);
        res.status(500).send("Error loading admin brand login page");
      }
    });
  });
  
  // Serve the new brand login page directly
  app.get('/brand-login', (_req, res) => {
    // Use absolute path and set Content-Type explicitly to avoid Vite middleware interference
    const absolutePath = path.resolve(process.cwd(), "brand-login.html");
    console.log("Serving brand-login from:", absolutePath);
    res.setHeader('Content-Type', 'text/html');
    res.sendFile(absolutePath, (err) => {
      if (err) {
        console.error("Error serving brand-login.html:", err);
        res.status(500).send("Error loading brand login page");
      }
    });
  });
  
  // Special demo brand login endpoint for specific brand selection
  app.post("/api/demo-brand-login", async (req, res) => {
    // This is only for development and testing
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ message: "Demo login not available in production" });
    }
    
    console.log("Processing demo BRAND login with selection");
    
    try {
      const { brandUsername } = req.body;
      
      if (!brandUsername) {
        return res.status(400).json({ message: "Brand username is required" });
      }
      
      console.log(`Looking up brand user with username: ${brandUsername}`);
      
      // Get the brand user from storage
      const brandUser = await storage.getUserByUsername(brandUsername);
      
      if (!brandUser) {
        console.log(`[DemoBrandLogin] Brand with username '${brandUsername}' not found`);
        return res.status(404).json({ message: `Brand with username '${brandUsername}' not found` });
      }
      
      console.log(`[DemoBrandLogin] Found brand user:`, JSON.stringify({
        id: brandUser.id,
        username: brandUser.username,
        name: brandUser.name,
        role: brandUser.role
      }));
      
      // Check if it's actually a brand
      if (brandUser.role !== 'brand') {
        console.log(`[DemoBrandLogin] Selected user is not a brand account. Role: ${brandUser.role}`);
        return res.status(400).json({ message: "Selected user is not a brand account" });
      }
      
      // For brand users, set the brandId as their own id for convenience
      // This is important after our data isolation changes
      const brandUserWithBrandId = {
        ...brandUser,
        brandId: brandUser.id // Set brandId to their own id for brand users
      };
      
      console.log(`[DemoBrandLogin] Added brandId=${brandUserWithBrandId.brandId} to brand user`);
      
      req.login(brandUserWithBrandId, (err) => {
        if (err) {
          console.error("[DemoBrandLogin] Demo brand login failed:", err);
          return res.status(500).json({ message: "Demo brand login failed", error: err.message });
        }
        
        console.log(`[DemoBrandLogin] Login successful for brand: ${brandUserWithBrandId.name} (ID: ${brandUserWithBrandId.id})`);
        return res.json({ 
          success: true, 
          user: brandUserWithBrandId 
        });
      });
    } catch (error) {
      console.error("[DemoBrandLogin] Error in demo brand login:", error);
      return res.status(500).json({ message: "Server error during demo login" });
    }
  });

  // Special demo login endpoint for testing purposes
  app.post("/api/demo-login", async (req, res) => {
    // This is only for development and testing
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ message: "Demo login not available in production" });
    }
    
    console.log("Processing demo login request");
    
    try {
      // Check if requesting admin login
      if (req.body.role === 'admin') {
        console.log("[DemoLogin] Processing demo ADMIN login");
        
        // Get the admin user from storage
        const adminUser = await storage.getUserByUsername("admin");
        
        if (!adminUser) {
          console.log("[DemoLogin] Admin user not found in database");
          return res.status(404).json({ message: "Admin user not found in database" });
        }
        
        console.log(`[DemoLogin] Found admin user: ${adminUser.username} (ID: ${adminUser.id})`);
        
        req.login(adminUser, (err) => {
          if (err) {
            console.error("[DemoLogin] Demo admin login failed:", err);
            return res.status(500).json({ message: "Demo admin login failed", error: err.message });
          }
          
          console.log(`[DemoLogin] Admin login successful`);
          return res.json({ success: true, user: adminUser });
        });
      } else {
        console.log("[DemoLogin] Processing demo BRAND login");
        
        // Get the demo user from storage
        const demoUser = await storage.getUserByUsername("demo");
        
        if (!demoUser) {
          console.log("[DemoLogin] Demo user not found in database");
          return res.status(404).json({ message: "Demo user not found in database" });
        }
        
        // For brand users, set the brandId as their own id for convenience
        const demoUserWithBrandId = {
          ...demoUser,
          brandId: demoUser.id // Set brandId to their own id for brand users
        };
        
        console.log(`[DemoLogin] Found demo brand user: ${demoUserWithBrandId.username} (ID: ${demoUserWithBrandId.id}, brandId: ${demoUserWithBrandId.brandId})`);
        
        req.login(demoUserWithBrandId, (err) => {
          if (err) {
            console.error("[DemoLogin] Demo user login failed:", err);
            return res.status(500).json({ message: "Demo login failed", error: err.message });
          }
          
          console.log(`[DemoLogin] Demo brand login successful`);
          return res.json({ 
            success: true, 
            user: demoUserWithBrandId 
          });
        });
      }
    } catch (error) {
      console.error("[DemoLogin] Error in demo login:", error);
      return res.status(500).json({ message: "Server error during demo login" });
    }
  });

  // Retail Partners endpoints
  app.get("/api/retail-partners", requireAuth, async (req, res) => {
    // For brand users, use the brandId property (which is set to their own ID)
    // For other users (admin), use their user ID directly
    const brandId = req.user!.brandId || req.user!.id;
    console.log(`[RetailPartners] Getting partners for user ${req.user!.username} (${req.user!.id}) with brandId=${brandId}`);
    const partners = await storage.getRetailPartnersByBrandId(brandId);
    console.log(`[RetailPartners] Found ${partners.length} partners for brandId=${brandId}`);
    res.json(partners);
  });

  // Special demo route to view retail partners without authentication
  app.get("/api/demo/retail-partners", async (req, res) => {
    try {
      console.log("Demo route: Getting retail partners for brand ID 1");
      const partners = await storage.getRetailPartnersByBrandId(1);
      console.log(`Found ${partners.length} partners for demo brand 1`);
      return res.json(partners);
    } catch (error) {
      console.error("Error fetching demo retail partners:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Get all unique tags for retail partners (for tag suggestions)
  // Important: This route must come BEFORE any route with :id parameter to avoid conflicts
  app.get("/api/demo/retail-partners/tags", async (req, res) => {
    try {
      console.log("Demo route: Getting all tags for retail partners");
      const partners = await storage.getRetailPartnersByBrandId(1);
      
      // Extract tags from all partners
      const allTags = new Set<string>();
      
      console.log(`Processing ${partners.length} partners for tags`);
      
      partners.forEach(partner => {
        // Debugging
        console.log(`Partner ${partner.id}: ${partner.name} - metadata:`, JSON.stringify(partner.metadata || {}));
        
        try {
          if (partner.metadata && typeof partner.metadata === 'object') {
            const metadata = partner.metadata as any;
            
            if (metadata.tags && Array.isArray(metadata.tags)) {
              metadata.tags.forEach((tag: any) => {
                if (tag && typeof tag === 'string') {
                  console.log(`Adding tag: ${tag} from partner ${partner.id}`);
                  allTags.add(tag);
                }
              });
            }
          }
        } catch (err) {
          console.error(`Error processing tags for partner ${partner.id}:`, err);
        }
      });
      
      const uniqueTags = Array.from(allTags).sort();
      console.log(`Found ${uniqueTags.length} unique tags: ${JSON.stringify(uniqueTags)}`);
      
      return res.status(200).json(uniqueTags);
    } catch (error) {
      console.error("Error fetching retail partner tags:", error);
      return res.status(500).json({ message: "Server error", error: String(error) });
    }
  });

  // Special demo route to get a specific retail partner
  app.get("/api/demo/retail-partners/:id", async (req, res) => {
    try {
      // Check if the ID is "tags" which should be handled by the tags endpoint
      if (req.params.id === "tags") {
        return res.status(400).json({ message: "Invalid ID. Use /api/demo/retail-partners/tags to get tags." });
      }
      
      const partnerId = parseInt(req.params.id);
      
      if (isNaN(partnerId)) {
        return res.status(400).json({ message: "Invalid partner ID" });
      }
      
      const partner = await storage.getRetailPartner(partnerId);
      
      if (!partner) {
        return res.status(404).json({ message: "Partner not found" });
      }
      
      // Only allow access to partners from demo brand (ID 1)
      if (partner.brandId !== 1) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      console.log(`Demo route: Fetched partner with ID ${partnerId}`);
      return res.json(partner);
    } catch (error) {
      console.error("Error fetching demo retail partner:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Special demo route to update a retail partner
  app.patch("/api/demo/retail-partners/:id", async (req, res) => {
    try {
      // Validate that id is a number
      const partnerId = parseInt(req.params.id);
      if (isNaN(partnerId)) {
        console.error(`Invalid partner ID: ${req.params.id}`);
        return res.status(400).json({ message: "Invalid partner ID" });
      }
      
      console.log(`Demo route: Fetching partner with ID ${partnerId}`);
      const partner = await storage.getRetailPartner(partnerId);
      
      if (!partner) {
        console.error(`Partner not found with ID: ${partnerId}`);
        return res.status(404).json({ message: "Partner not found" });
      }
      
      // Only allow updating partners from demo brand (ID 1)
      if (partner.brandId !== 1) {
        console.error(`Forbidden access: Partner ${partnerId} is not from demo brand`);
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Log the incoming body for debugging
      console.log(`Demo route: Updating partner with ID ${partnerId}`, JSON.stringify(req.body));
      
      // Ensure partner ID is preserved
      const dataToUpdate = { ...req.body, id: partnerId };
      
      const updatedPartner = await storage.updateRetailPartner(partnerId, dataToUpdate);
      
      // Log successful update
      console.log(`Successfully updated partner ${partnerId}`);
      
      // Make sure we're sending a valid JSON response
      return res.status(200).json({
        success: true,
        message: "Partner updated successfully",
        partner: updatedPartner
      });
    } catch (error) {
      console.error("Error updating demo retail partner:", error);
      return res.status(500).json({ 
        success: false,
        message: "Server error", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Special route for demo mode bulk import - no authentication required
  app.post("/api/demo/retail-partners/bulk", async (req, res) => {
    try {
      console.log("Demo bulk import request received");
      const { partners } = req.body;
      
      if (!Array.isArray(partners) || partners.length === 0) {
        return res.status(400).json({ message: "Invalid request: partners must be a non-empty array" });
      }
      
      // Use brand ID 1 for demo mode
      const brandId = 1;
      
      // Process each partner in the array
      const createdPartners = [];
      const errors = [];
      
      for (let i = 0; i < partners.length; i++) {
        const partner = partners[i];
        
        // Simple validation for the required fields
        if (!partner.name || !partner.contactEmail) {
          errors.push({
            index: i,
            partner: partner.name || `Partner at index ${i}`,
            error: "Missing required fields (name and contactEmail)"
          });
          continue;
        }
        
        try {
          console.log(`Creating demo partner ${i+1}/${partners.length}: ${partner.name}`);
          // Create the partner with the demo brand ID
          const createdPartner = await storage.createRetailPartner({
            ...partner,
            brandId: brandId,
            status: partner.status || 'pending'
          });
          
          createdPartners.push(createdPartner);
        } catch (error) {
          console.error(`Error creating demo partner ${partner.name}:`, error);
          errors.push({
            index: i,
            partner: partner.name,
            error: error.message || "Unknown error"
          });
        }
      }
      
      const response = {
        success: true,
        created: createdPartners.length,
        partners: createdPartners,
        errors: errors.length > 0 ? errors : undefined
      };
      
      console.log(`Demo bulk import completed. Created: ${createdPartners.length}, Errors: ${errors.length}`);
      
      // Ensure we're sending JSON content type
      res.setHeader('Content-Type', 'application/json');
      return res.status(201).json(response);
    } catch (error) {
      console.error("Error in demo bulk import:", error);
      // Ensure we're sending JSON content type even on error
      res.setHeader('Content-Type', 'application/json');
      return res.status(500).json({ message: "Server error", error: error.message });
    }
  });

  app.post("/api/retail-partners", requireAuth, async (req, res) => {
    try {
      const brandId = req.user!.brandId || req.user!.id;
      console.log(`[CreateRetailPartner] Creating partner for brandId=${brandId}, user=${req.user!.username}`);
      
      const data = insertRetailPartnerSchema.parse({
        ...req.body,
        brandId: brandId
      });
      
      const partner = await storage.createRetailPartner(data);
      console.log(`[CreateRetailPartner] Created partner ${partner.id} for brandId=${brandId}`);
      res.status(201).json(partner);
    } catch (error) {
      console.error("[CreateRetailPartner] Error:", error);
      res.status(400).json({ message: "Invalid data", error });
    }
  });

  app.get("/api/retail-partners/:id", requireAuth, async (req, res) => {
    const partner = await storage.getRetailPartner(parseInt(req.params.id));
    if (!partner) {
      return res.status(404).json({ message: "Partner not found" });
    }
    
    if (partner.brandId !== req.user!.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    res.json(partner);
  });

  app.patch("/api/retail-partners/:id", requireAuth, async (req, res) => {
    const partner = await storage.getRetailPartner(parseInt(req.params.id));
    if (!partner) {
      return res.status(404).json({ message: "Partner not found" });
    }
    
    if (partner.brandId !== req.user!.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    try {
      const updatedPartner = await storage.updateRetailPartner(parseInt(req.params.id), req.body);
      res.json(updatedPartner);
    } catch (error) {
      res.status(400).json({ message: "Invalid data", error });
    }
  });

  // Social Accounts endpoints
  app.get("/api/social-accounts", requireAuth, async (req, res) => {
    const brandId = req.user!.brandId || req.user!.id;
    console.log(`[GetSocialAccounts] Getting accounts for brandId=${brandId}, user=${req.user!.username}`);
    
    const partners = await storage.getRetailPartnersByBrandId(brandId);
    const partnerIds = partners.map(p => p.id);
    
    const accounts = await storage.getSocialAccountsByPartnerIds(partnerIds);
    console.log(`[GetSocialAccounts] Found ${accounts.length} accounts for ${partners.length} partners`);
    res.json(accounts);
  });

  app.post("/api/social-accounts", requireAuth, async (req, res) => {
    const partner = await storage.getRetailPartner(req.body.partnerId);
    if (!partner || partner.brandId !== req.user!.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    try {
      const data = insertSocialAccountSchema.parse(req.body);
      const account = await storage.createSocialAccount(data);
      res.status(201).json(account);
    } catch (error) {
      res.status(400).json({ message: "Invalid data", error });
    }
  });

  // Content Posts endpoints
  app.get("/api/content-posts", requireAuth, async (req, res) => {
    const brandId = req.user!.brandId || req.user!.id;
    console.log(`[GetContentPosts] Getting posts for brandId=${brandId}, user=${req.user!.username}`);
    
    const posts = await storage.getContentPostsByBrandId(brandId);
    console.log(`[GetContentPosts] Found ${posts.length} posts for brandId=${brandId}`);
    res.json(posts);
  });

  app.post("/api/content-posts", requireAuth, async (req, res) => {
    try {
      const brandId = req.user!.brandId || req.user!.id;
      console.log(`[CreateContentPost] Creating post for brandId=${brandId}, user=${req.user!.username}`);
      
      const data = insertContentPostSchema.parse({
        ...req.body,
        brandId: brandId
      });
      
      const post = await storage.createContentPost(data);
      console.log(`[CreateContentPost] Created post ${post.id} for brandId=${brandId}`);
      
      // If post assignments are included
      if (req.body.partners && Array.isArray(req.body.partners)) {
        console.log(`[CreateContentPost] Creating ${req.body.partners.length} partner assignments`);
        for (const partnerId of req.body.partners) {
          await storage.createPostAssignment({
            postId: post.id,
            partnerId,
            customFooter: req.body.customFooter || null,
            customTags: req.body.customTags || null
          });
        }
      }
      
      res.status(201).json(post);
    } catch (error) {
      console.error("[CreateContentPost] Error:", error);
      res.status(400).json({ message: "Invalid data", error });
    }
  });

  app.get("/api/content-posts/:id", requireAuth, async (req, res) => {
    const brandId = req.user!.brandId || req.user!.id;
    const postId = parseInt(req.params.id);
    console.log(`[GetContentPost] Getting post ${postId} for brandId=${brandId}, user=${req.user!.username}`);
    
    const post = await storage.getContentPost(postId);
    if (!post) {
      console.log(`[GetContentPost] Post ${postId} not found`);
      return res.status(404).json({ message: "Post not found" });
    }
    
    if (post.brandId !== brandId) {
      console.log(`[GetContentPost] Forbidden: Post ${postId} belongs to brand ${post.brandId}, not ${brandId}`);
      return res.status(403).json({ message: "Forbidden" });
    }
    
    // Get assignments for this post
    const assignments = await storage.getPostAssignmentsByPostId(post.id);
    console.log(`[GetContentPost] Found post ${postId} with ${assignments.length} assignments`);
    res.json({ ...post, assignments });
  });

  app.patch("/api/content-posts/:id", requireAuth, async (req, res) => {
    const brandId = req.user!.brandId || req.user!.id;
    const postId = parseInt(req.params.id);
    console.log(`[UpdateContentPost] Updating post ${postId} for brandId=${brandId}, user=${req.user!.username}`);
    
    const post = await storage.getContentPost(postId);
    if (!post) {
      console.log(`[UpdateContentPost] Post ${postId} not found`);
      return res.status(404).json({ message: "Post not found" });
    }
    
    if (post.brandId !== brandId) {
      console.log(`[UpdateContentPost] Forbidden: Post ${postId} belongs to brand ${post.brandId}, not ${brandId}`);
      return res.status(403).json({ message: "Forbidden" });
    }
    
    try {
      const updatedPost = await storage.updateContentPost(postId, req.body);
      console.log(`[UpdateContentPost] Successfully updated post ${postId}`);
      res.json(updatedPost);
    } catch (error) {
      console.error(`[UpdateContentPost] Error updating post ${postId}:`, error);
      res.status(400).json({ message: "Invalid data", error });
    }
  });

  // Analytics endpoints
  app.get("/api/analytics", requireAuth, async (req, res) => {
    const brandId = req.user!.brandId || req.user!.id;
    console.log(`[GetAnalytics] Getting analytics for brandId=${brandId}, user=${req.user!.username}`);
    
    const partners = await storage.getRetailPartnersByBrandId(brandId);
    const partnerIds = partners.map(p => p.id);
    
    const posts = await storage.getContentPostsByBrandId(brandId);
    const postIds = posts.map(p => p.id);
    
    const analytics = await storage.getAnalyticsByPostAndPartnerIds(postIds, partnerIds);
    console.log(`[GetAnalytics] Found ${analytics.length} analytics items for ${posts.length} posts and ${partners.length} partners`);
    res.json(analytics);
  });

  // Summary statistics for dashboard
  // Get all brands (admin only)
  app.get("/api/brands", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      console.log("Fetching all brands for admin");
      const brands = await storage.getUsersByRole('brand');
      return res.json(brands);
    } catch (error) {
      console.error("Error fetching brands:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get("/api/dashboard-stats", requireAuth, async (req, res) => {
    const brandId = req.user!.brandId || req.user!.id;
    console.log(`[GetDashboardStats] Getting stats for brandId=${brandId}, user=${req.user!.username}`);
    
    // Get counts for quick stats
    const activePosts = await storage.getActivePostCount(brandId);
    const partnerCount = await storage.getRetailPartnerCount(brandId);
    const scheduledPosts = await storage.getScheduledPostCount(brandId);
    const totalEngagements = await storage.getTotalEngagements(brandId);
    
    // Get most recent partners
    const recentPartners = await storage.getRecentPartners(brandId, 3);
    
    // Get partner stats by status
    const partnerStats = await storage.getPartnerStatsByStatus(brandId);
    
    // Get performance metrics
    const performanceMetrics = await storage.getPerformanceMetrics(brandId);
    
    // Get upcoming posts
    const upcomingPosts = await storage.getUpcomingPosts(brandId, 3);
    
    // Get recent activity
    const recentActivity = await storage.getRecentActivity(brandId, 4);
    
    console.log(`[GetDashboardStats] Found ${partnerCount} partners, ${activePosts} active posts for brandId=${brandId}`);
    
    res.json({
      quickStats: {
        activePosts,
        partnerCount,
        scheduledPosts,
        totalEngagements
      },
      recentPartners,
      partnerStats,
      performanceMetrics,
      upcomingPosts,
      recentActivity
    });
  });

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
