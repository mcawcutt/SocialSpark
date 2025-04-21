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
      // In a real application, this would be paginated
      const brands = Array.from(storage.users.values())
        .filter(user => user.role === 'brand')
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
      // Count total brands
      const totalBrands = Array.from(storage.users.values())
        .filter(user => user.role === 'brand').length;
      
      // Count total retail partners
      const totalRetailPartners = storage.retailPartners.size;
      
      // Count total content posts
      const totalPosts = storage.contentPosts.size;
      
      // Count total social accounts
      const totalSocialAccounts = storage.socialAccounts.size;
      
      return res.json({
        totalBrands,
        totalRetailPartners,
        totalPosts,
        totalSocialAccounts,
        activeBrands: totalBrands, // For demo purposes, all brands are active
        activeRetailPartners: totalRetailPartners, // For demo purposes, all partners are considered active
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
}