import { Express, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { User } from "@shared/schema";
import { createBackup } from '../backup';
import fs from 'fs';

export function setupAdminRoutes(app: Express) {
  // Add backup endpoint
  app.get('/api/admin/backup', async (req, res) => {
    try {
      const backupFile = await createBackup();
      res.download(backupFile, () => {
        // Clean up backup file after download
        fs.unlinkSync(backupFile);
      });
    } catch (error) {
      console.error('Backup creation failed:', error);
      res.status(500).json({ error: 'Failed to create backup' });
    }
  });

  // Custom middleware for admin routes
  const adminOnly = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      console.log(`[AdminAPI] ${req.method} ${req.path} - Not authenticated`);
      return res.status(401).json({ 
        message: "Unauthorized", 
        detail: "You must be logged in to access this resource." 
      });
    }

    if (!req.user || req.user.role !== 'admin') {
      console.log(`[AdminAPI] ${req.method} ${req.path} - Not admin, role:`, req.user?.role);
      return res.status(403).json({ 
        message: "Forbidden", 
        detail: "You do not have permission to access this resource. Admin access required." 
      });
    }

    console.log(`[AdminAPI] ${req.method} ${req.path} - Admin access granted:`, req.user.username);
    next();
  };

  // Schema for creating a new brand
  const createBrandSchema = z.object({
    name: z.string().min(1, "Brand name is required"),
    email: z.string().email("Invalid email address"),
    username: z.string().min(3, "Username must be at least 3 characters"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    planType: z.string().default("standard"),
    logo: z.string().optional(),
  });

  // Debug route to get brands without auth - FOR TESTING ONLY
  app.get('/api/debug/brands', async (_req: Request, res: Response) => {
    try {
      console.log("Debug route: Getting all brands without auth check");
      const brands = await storage.getUsersByRole('brand');
      
      // Add active property for any brands where it might be undefined
      const brandsWithActive = brands.map(user => ({
        ...user,
        active: user.active !== undefined ? user.active : true
      }));
      
      console.log(`Found ${brandsWithActive.length} brands:`, brandsWithActive.map(b => b.name).join(', '));
      return res.json(brandsWithActive);
    } catch (error) {
      console.error("Error in debug brands route:", error);
      return res.status(500).json({ error: "Failed to fetch brands" });
    }
  });

  // Get all brands (admin only)
  app.get('/api/admin/brands', adminOnly, async (req: Request, res: Response) => {
    try {
      // Use our new method to get all brand users directly
      const brands = await storage.getUsersByRole('brand');
      
      // Add active property for any brands where it might be undefined
      const brandsWithActive = brands.map(user => ({
        ...user,
        active: user.active !== undefined ? user.active : true
      }));
      
      return res.json(brandsWithActive);
    } catch (error) {
      console.error("Error fetching brands:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Create a new brand (admin only)
  app.post('/api/admin/brands', adminOnly, async (req: Request, res: Response) => {
    try {
      const validation = createBrandSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid brand data", 
          errors: validation.error.format() 
        });
      }
      
      const { name, email, username, password, planType, logo } = validation.data;
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ 
          message: "Username already exists"
        });
      }
      
      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ 
          message: "Email already exists"
        });
      }
      
      // Create the brand user
      const brand = await storage.createUser({
        name,
        email,
        username,
        password, // Password will be hashed by the auth middleware
        role: 'brand',
        planType: planType || 'standard',
        logo: logo || null,
        active: true
      });
      
      return res.status(201).json(brand);
    } catch (error) {
      console.error("Error creating brand:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Update brand status (admin only)
  app.patch('/api/admin/brands/:id', adminOnly, async (req: Request, res: Response) => {
    try {
      const brandId = parseInt(req.params.id);
      
      if (isNaN(brandId)) {
        return res.status(400).json({ message: "Invalid brand ID" });
      }
      
      const brand = await storage.getUser(brandId);
      
      if (!brand) {
        return res.status(404).json({ message: "Brand not found" });
      }
      
      // Only allow updating brands
      if (brand.role !== 'brand') {
        return res.status(400).json({ message: "Not a brand account" });
      }
      
      // Update only allowed fields
      // Allowed fields to update
      const updates: Partial<User> = {};
      
      // Manual assignment to avoid TypeScript issues with dynamic property access
      if ('active' in req.body) updates.active = req.body.active;
      if ('planType' in req.body) updates.planType = req.body.planType;
      if ('name' in req.body) updates.name = req.body.name;
      if ('logo' in req.body) updates.logo = req.body.logo;
      
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No valid updates provided" });
      }
      
      const updatedBrand = await storage.updateUser(brandId, updates);
      
      return res.json(updatedBrand);
    } catch (error) {
      console.error("Error updating brand:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Impersonate a brand (admin only)
  app.post('/api/admin/impersonate/:id', adminOnly, async (req: Request, res: Response) => {
    try {
      const brandId = parseInt(req.params.id);
      
      console.log(`[AdminImpersonation] Admin ${req.user.username} is attempting to impersonate brand with ID: ${brandId}`);
      
      if (isNaN(brandId)) {
        console.log(`[AdminImpersonation] Invalid brand ID: ${req.params.id}`);
        return res.status(400).json({ message: "Invalid brand ID" });
      }
      
      const brand = await storage.getUser(brandId);
      
      if (!brand) {
        console.log(`[AdminImpersonation] Brand with ID ${brandId} not found`);
        return res.status(404).json({ message: "Brand not found" });
      }
      
      console.log(`[AdminImpersonation] Found brand: ${brand.name} (${brand.role})`);
      
      // Only allow impersonating brands
      if (brand.role !== 'brand') {
        console.log(`[AdminImpersonation] Cannot impersonate non-brand account. Role: ${brand.role}`);
        return res.status(400).json({ message: "Not a brand account" });
      }
      
      // Store the original admin user's ID in the session for returning later
      if (!req.user) {
        console.log(`[AdminImpersonation] ERROR: User not available in request!`);
        return res.status(500).json({ message: "User not available in request" });
      }
      
      const adminUser = req.user;
      console.log(`[AdminImpersonation] Storing admin user in session: ${adminUser.id} (${adminUser.username})`);
      
      // Ensure session is initialized
      if (!req.session) {
        console.log(`[AdminImpersonation] ERROR: Session is not initialized!`);
        return res.status(500).json({ message: "Session not initialized" });
      }
      
      console.log(`[AdminImpersonation] Current session info:`, {
        sessionID: req.sessionID,
        hasSession: !!req.session,
        sessionSize: JSON.stringify(req.session).length
      });
      
      req.session.adminImpersonator = {
        id: adminUser.id,
        username: adminUser.username,
        role: adminUser.role
      };
      
      console.log(`[AdminImpersonation] After setting adminImpersonator:`, req.session.adminImpersonator);
      
      // For brand users, set the brandId as their own id for convenience
      // This is important after our data isolation changes
      const brandWithBrandId = {
        ...brand,
        brandId: brand.id // Set brandId to their own id for brand users
      };
      
      console.log(`[AdminImpersonation] Added brandId=${brandWithBrandId.brandId} to impersonated brand user`);
      
      // Login as the brand
      req.login(brandWithBrandId, (err) => {
        if (err) {
          console.error("Error during impersonation login:", err);
          return res.status(500).json({ message: "Failed to impersonate brand", error: err.message });
        }
        
        // Set a flag to indicate this is an impersonated session
        req.session.isImpersonated = true;
        
        console.log(`[AdminImpersonation] Responding with impersonated brand user:`, JSON.stringify(brandWithBrandId));
        res.status(200).json({ 
          success: true, 
          message: `Now impersonating ${brand.name}`,
          user: brandWithBrandId
        });
      });
    } catch (error) {
      console.error("Error impersonating brand:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Return to admin account after impersonation
  app.post('/api/admin/end-impersonation', (req: Request, res: Response, next: NextFunction) => {
    // Special middleware for end-impersonation - we just need to check if authenticated
    if (!req.isAuthenticated()) {
      console.log("[EndImpersonation] Not authenticated");
      return res.status(401).json({ 
        message: "Unauthorized", 
        detail: "You must be logged in to access this resource." 
      });
    }
    console.log("[EndImpersonation] User is authenticated, proceeding with middleware");
    next();
  }, async (req: Request, res: Response) => {
    try {
      console.log("[EndImpersonation] Session data:", {
        sessionID: req.sessionID,
        isImpersonated: req.session.isImpersonated,
        hasAdminImpersonator: !!req.session.adminImpersonator,
        adminImpersonator: req.session.adminImpersonator
      });
      
      // Check if this is an impersonated session
      if (!req.session.isImpersonated || !req.session.adminImpersonator) {
        console.log("[EndImpersonation] Not in an impersonation session");
        return res.status(400).json({ message: "Not in an impersonation session" });
      }
      
      console.log("[EndImpersonation] Found admin impersonator:", req.session.adminImpersonator);
      const adminId = req.session.adminImpersonator.id;
      const adminUser = await storage.getUser(adminId);
      
      if (!adminUser) {
        console.log("[EndImpersonation] Admin user not found:", adminId);
        return res.status(404).json({ message: "Original admin account not found" });
      }
      
      console.log("[EndImpersonation] Found admin user:", adminUser.username);
      
      // Login as the original admin
      req.login(adminUser, (err) => {
        if (err) {
          console.error("[EndImpersonation] Error returning to admin account:", err);
          return res.status(500).json({ message: "Failed to return to admin account", error: err.message });
        }
        
        console.log("[EndImpersonation] Successfully switched back to admin user");
        
        // Clear impersonation data from session
        delete req.session.isImpersonated;
        delete req.session.adminImpersonator;
        
        res.status(200).json({ 
          success: true, 
          message: "Returned to admin account",
          user: adminUser
        });
      });
      
    } catch (error) {
      console.error("Error ending impersonation:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Get a specific brand (admin only)
  app.get('/api/admin/brands/:id', adminOnly, async (req: Request, res: Response) => {
    try {
      const brandId = parseInt(req.params.id);
      
      if (isNaN(brandId)) {
        return res.status(400).json({ message: "Invalid brand ID" });
      }
      
      const brand = await storage.getUser(brandId);
      
      if (!brand) {
        return res.status(404).json({ message: "Brand not found" });
      }
      
      // Only allow viewing brands
      if (brand.role !== 'brand') {
        return res.status(400).json({ message: "Not a brand account" });
      }
      
      // Add active property if not already present
      const brandWithActive = {
        ...brand,
        active: brand.active !== undefined ? brand.active : true
      };
      
      return res.json(brandWithActive);
    } catch (error) {
      console.error("Error fetching brand:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Get platform stats (admin only)
  app.get('/api/admin/stats', adminOnly, async (req: Request, res: Response) => {
    try {
      // Get all brand users directly using our new method
      const brandUsers = await storage.getUsersByRole('brand');
      const totalBrands = brandUsers.length;
      const activeBrands = brandUsers.filter(user => user.active !== false).length;
      
      // Get retail partners count
      const retailPartnersByBrand = new Map();
      for (const brandUser of brandUsers) {
        const partners = await storage.getRetailPartnersByBrandId(brandUser.id);
        retailPartnersByBrand.set(brandUser.id, partners);
      }
      
      // Calculate total retail partners
      const allPartners = Array.from(retailPartnersByBrand.values()).flat();
      const totalRetailPartners = allPartners.length;
      const activeRetailPartners = allPartners.filter(partner => partner.status === 'active').length;
      
      // For content posts, need to accumulate by brand
      let totalPosts = 0;
      for (const brandUser of brandUsers) {
        const posts = await storage.getContentPostsByBrandId(brandUser.id);
        totalPosts += posts.length;
      }
      
      // For social accounts, need to get all partners and their social accounts
      let totalSocialAccounts = 0;
      for (const partners of retailPartnersByBrand.values()) {
        for (const partner of partners) {
          const accounts = await storage.getSocialAccountsByPartnerId(partner.id);
          totalSocialAccounts += accounts.length;
        }
      }
      
      return res.json({
        totalBrands,
        totalRetailPartners,
        totalPosts,
        totalSocialAccounts,
        activeBrands,
        activeRetailPartners
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
}