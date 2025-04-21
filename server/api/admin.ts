import { Express, Request, Response } from "express";
import { storage } from "../storage";
import { requireAuth, requireRole } from "../middleware";
import { z } from "zod";
import { User } from "@shared/schema";

// Schema for creating a new brand
const createBrandSchema = z.object({
  name: z.string().min(1, "Brand name is required"),
  email: z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  planType: z.string().default("standard"),
  logo: z.string().optional(),
});

export function setupAdminRoutes(app: Express) {
  // Get all brands (admin only)
  app.get('/api/admin/brands', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      // We can't directly access private users map, so we need to get users another way
      // Since we don't have a direct method to get all users, we'll create a workaround
      const allUsers = [];
      let userFound = true;
      let userId = 1;
      
      // Fetch users one by one until we don't find any more
      while (userFound && userId < 100) { // Limit to prevent infinite loops
        const user = await storage.getUser(userId);
        if (user) {
          allUsers.push(user);
          userId++;
        } else {
          userFound = false;
        }
      }
      
      // Filter to get only brand users
      const brands = allUsers
        .filter(user => user?.role === 'brand')
        .map(user => ({
          ...user,
          // Add active property (all brands are active by default)
          active: user.active !== undefined ? user.active : true
        }));
      
      return res.json(brands);
    } catch (error) {
      console.error("Error fetching brands:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Create a new brand (admin only)
  app.post('/api/admin/brands', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
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
  app.patch('/api/admin/brands/:id', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
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
      const allowedUpdates = ['active', 'planType', 'name', 'logo'];
      const updates: Partial<User> = {};
      
      for (const field of allowedUpdates) {
        if (field in req.body) {
          updates[field] = req.body[field];
        }
      }
      
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
  app.post('/api/admin/impersonate/:id', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const brandId = parseInt(req.params.id);
      
      if (isNaN(brandId)) {
        return res.status(400).json({ message: "Invalid brand ID" });
      }
      
      const brand = await storage.getUser(brandId);
      
      if (!brand) {
        return res.status(404).json({ message: "Brand not found" });
      }
      
      // Only allow impersonating brands
      if (brand.role !== 'brand') {
        return res.status(400).json({ message: "Not a brand account" });
      }
      
      // Store the original admin user's ID in the session for returning later
      const adminUser = req.user;
      req.session.adminImpersonator = {
        id: adminUser.id,
        username: adminUser.username,
        role: adminUser.role
      };
      
      // Login as the brand
      req.login(brand, (err) => {
        if (err) {
          console.error("Error during impersonation login:", err);
          return res.status(500).json({ message: "Failed to impersonate brand", error: err.message });
        }
        
        // Set a flag to indicate this is an impersonated session
        req.session.isImpersonated = true;
        
        res.status(200).json({ 
          success: true, 
          message: `Now impersonating ${brand.name}`,
          user: brand
        });
      });
    } catch (error) {
      console.error("Error impersonating brand:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Return to admin account after impersonation
  app.post('/api/admin/end-impersonation', requireAuth, async (req: Request, res: Response) => {
    try {
      // Check if this is an impersonated session
      if (!req.session.isImpersonated || !req.session.adminImpersonator) {
        return res.status(400).json({ message: "Not in an impersonation session" });
      }
      
      const adminId = req.session.adminImpersonator.id;
      const adminUser = await storage.getUser(adminId);
      
      if (!adminUser) {
        return res.status(404).json({ message: "Original admin account not found" });
      }
      
      // Login as the original admin
      req.login(adminUser, (err) => {
        if (err) {
          console.error("Error returning to admin account:", err);
          return res.status(500).json({ message: "Failed to return to admin account", error: err.message });
        }
        
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
  app.get('/api/admin/brands/:id', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
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
  app.get('/api/admin/stats', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      // Get all users to count brands
      const allUsers = [];
      let userId = 1;
      let userFound = true;
      
      // Fetch users one by one
      while (userFound && userId < 100) {
        const user = await storage.getUser(userId);
        if (user) {
          allUsers.push(user);
          userId++;
        } else {
          userFound = false;
        }
      }
      
      // Count brands
      const brandUsers = allUsers.filter(user => user.role === 'brand');
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