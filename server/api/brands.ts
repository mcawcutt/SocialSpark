import { Express, Request, Response } from "express";
import { db } from "../db";
import { insertBrandSchema } from "@shared/schema";
import { brands, retailPartners } from "@shared/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireBrandOrAdmin } from "../middleware/auth";

export function setupBrandRoutes(app: Express) {
  // Get all brands for the current user
  app.get('/api/brands', requireAuth, async (req: Request, res: Response) => {
    try {
      // For admin users, return all brands (potentially paginated in a real app)
      if (req.user?.role === 'admin') {
        const allBrands = await db.query.brands.findMany({
          limit: 100,
        });
        return res.json(allBrands);
      }
      
      // For brand users, only show brands they own
      if (req.user?.role === 'brand') {
        const userBrands = await db.query.brands.findMany({
          where: eq(brands.ownerId, req.user.id),
        });
        return res.json(userBrands);
      }
      
      // For partner users, show brands they are connected to
      if (req.user?.role === 'partner') {
        // Get all retail partners for this user
        const userPartners = await db.query.retailPartners.findMany({
          where: eq(retailPartners.userId, req.user.id),
          with: {
            brand: true
          }
        });
        
        // Extract unique brands
        const uniqueBrands = new Map();
        for (const partner of userPartners) {
          if (partner.brand) {
            uniqueBrands.set(partner.brand.id, partner.brand);
          }
        }
        
        return res.json(Array.from(uniqueBrands.values()));
      }
      
      return res.json([]);
    } catch (error) {
      console.error("Error fetching brands:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Get a specific brand
  app.get('/api/brands/:brandId', requireAuth, async (req: Request, res: Response) => {
    try {
      const brandId = parseInt(req.params.brandId, 10);
      
      // Admins can view any brand
      if (req.user?.role === 'admin') {
        const brand = await db.query.brands.findFirst({
          where: eq(brands.id, brandId),
        });
        
        if (!brand) {
          return res.status(404).json({ message: "Brand not found" });
        }
        
        return res.json(brand);
      }
      
      // Brand users can only view their own brands
      if (req.user?.role === 'brand') {
        const brand = await db.query.brands.findFirst({
          where: eq(brands.id, brandId),
        });
        
        if (!brand || brand.ownerId !== req.user.id) {
          return res.status(404).json({ message: "Brand not found" });
        }
        
        return res.json(brand);
      }
      
      // Partner users can only view brands they're connected to
      if (req.user?.role === 'partner') {
        // Get all retail partners for this user
        const userPartners = await db.query.retailPartners.findMany({
          where: eq(retailPartners.userId, req.user.id),
        });
        
        // Check if any partner is connected to this brand
        const brandPartnerIds = userPartners
          .filter(partner => partner.brandId === brandId)
          .map(partner => partner.id);
        
        if (brandPartnerIds.length === 0) {
          return res.status(404).json({ message: "Brand not found" });
        }
        
        const brand = await db.query.brands.findFirst({
          where: eq(brands.id, brandId),
        });
        
        if (!brand) {
          return res.status(404).json({ message: "Brand not found" });
        }
        
        return res.json(brand);
      }
      
      return res.status(404).json({ message: "Brand not found" });
    } catch (error) {
      console.error("Error fetching brand:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Create a new brand (only for brand users or admins)
  app.post('/api/brands', requireBrandOrAdmin, async (req: Request, res: Response) => {
    try {
      const validation = insertBrandSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid brand data", errors: validation.error.format() });
      }
      
      // Set owner to current user if not specified (or not admin)
      let ownerId = validation.data.ownerId;
      if (!ownerId || (req.user?.role !== 'admin')) {
        ownerId = req.user!.id;
      }
      
      // Insert the brand
      const [brand] = await db.insert(brands)
        .values({
          ...validation.data,
          ownerId,
        })
        .returning();
      
      return res.status(201).json(brand);
    } catch (error) {
      console.error("Error creating brand:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Update a brand
  app.patch('/api/brands/:brandId', requireBrandOrAdmin, async (req: Request, res: Response) => {
    try {
      const brandId = parseInt(req.params.brandId, 10);
      
      // Get the current brand
      const brand = await db.query.brands.findFirst({
        where: eq(brands.id, brandId),
      });
      
      if (!brand) {
        return res.status(404).json({ message: "Brand not found" });
      }
      
      // Brand users can only update their own brands
      if (req.user?.role === 'brand' && brand.ownerId !== req.user.id) {
        return res.status(403).json({ message: "You don't have access to this brand" });
      }
      
      // Admin users can update any brand and can change the owner
      // Brand users cannot change the owner
      let updateData = { ...req.body };
      if (req.user?.role !== 'admin') {
        delete updateData.ownerId;
      }
      
      // Update the brand
      const [updatedBrand] = await db.update(brands)
        .set(updateData)
        .where(eq(brands.id, brandId))
        .returning();
      
      return res.json(updatedBrand);
    } catch (error) {
      console.error("Error updating brand:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
}