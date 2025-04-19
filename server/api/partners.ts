import { Express, Request, Response } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { insertRetailPartnerSchema, insertUserSchema } from "@shared/schema";
import { retailPartners, users, brands, postAssignments } from "@shared/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireBrandOrAdmin, checkBrandAccess, checkPartnerAccess } from "../middleware/auth";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// Copy of the hash password function from auth.ts to avoid circular imports
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export function setupPartnerRoutes(app: Express) {
  // Get all retail partners for the brand
  app.get('/api/retail-partners', requireBrandOrAdmin, async (req: Request, res: Response) => {
    try {
      // For brand users, only show their own partners
      if (req.user?.role === 'brand') {
        // Get all brands owned by this user
        const userBrands = await db.query.brands.findMany({
          where: eq(brands.ownerId, req.user.id)
        });
        
        const brandIds = userBrands.map(brand => brand.id);
        
        if (brandIds.length === 0) {
          return res.json([]);
        }
        
        // Get all partners for all brands owned by this user
        // This is simplified - in production you would use an "in" clause
        const partners = await storage.getRetailPartnersByBrandId(brandIds[0]);
        return res.json(partners);
      }
      
      // For admins, allow filtering by brand ID
      const brandId = req.query.brandId ? parseInt(req.query.brandId as string, 10) : null;
      
      if (brandId) {
        const partners = await storage.getRetailPartnersByBrandId(brandId);
        return res.json(partners);
      } else {
        // For admins without a filter, return all partners (potentially paginated in a real app)
        // This is simplified - you would implement pagination in production
        const allPartners = await db.query.retailPartners.findMany({
          limit: 100
        });
        return res.json(allPartners);
      }
    } catch (error) {
      console.error("Error fetching retail partners:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Get a specific retail partner
  app.get('/api/retail-partners/:partnerId', requireAuth, checkPartnerAccess(), async (req: Request, res: Response) => {
    try {
      const partnerId = parseInt(req.params.partnerId, 10);
      const partner = await storage.getRetailPartner(partnerId);
      
      if (!partner) {
        return res.status(404).json({ message: "Retail partner not found" });
      }
      
      return res.json(partner);
    } catch (error) {
      console.error("Error fetching retail partner:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Create a new retail partner (no user account)
  app.post('/api/retail-partners', requireBrandOrAdmin, async (req: Request, res: Response) => {
    try {
      const validation = insertRetailPartnerSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid partner data", errors: validation.error.format() });
      }
      
      // Get the brand to verify brand ownership
      const brand = await db.query.brands.findFirst({
        where: eq(brands.id, req.body.brandId)
      });
      
      if (!brand) {
        return res.status(404).json({ message: "Brand not found" });
      }
      
      // Verify this user owns the brand (admins bypass this check)
      if (req.user?.role === 'brand' && brand.ownerId !== req.user.id) {
        return res.status(403).json({ message: "You don't have access to this brand" });
      }
      
      const partner = await storage.createRetailPartner(validation.data);
      return res.status(201).json(partner);
    } catch (error) {
      console.error("Error creating retail partner:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Create a retail partner with a user account
  app.post('/api/retail-partners/with-user', requireBrandOrAdmin, async (req: Request, res: Response) => {
    try {
      const { partner, user } = req.body;
      
      // Validate partner data
      const partnerValidation = insertRetailPartnerSchema.safeParse(partner);
      if (!partnerValidation.success) {
        return res.status(400).json({ message: "Invalid partner data", errors: partnerValidation.error.format() });
      }
      
      // Validate user data
      const userValidation = insertUserSchema.safeParse({
        ...user,
        role: 'partner',
      });
      
      if (!userValidation.success) {
        return res.status(400).json({ message: "Invalid user data", errors: userValidation.error.format() });
      }
      
      // Get the brand to verify brand ownership
      const brand = await db.query.brands.findFirst({
        where: eq(brands.id, partner.brandId)
      });
      
      if (!brand) {
        return res.status(404).json({ message: "Brand not found" });
      }
      
      // Verify this user owns the brand (admins bypass this check)
      if (req.user?.role === 'brand' && brand.ownerId !== req.user.id) {
        return res.status(403).json({ message: "You don't have access to this brand" });
      }
      
      // Check if username or email already exists
      const existingUser = await storage.getUserByUsername(user.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const existingEmail = await storage.getUserByEmail(user.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      // Create the user account first
      const createdUser = await storage.createUser({
        ...userValidation.data,
        password: await hashPassword(userValidation.data.password),
      });
      
      // Then create the partner and link it to the user
      const createdPartner = await storage.createRetailPartner({
        ...partnerValidation.data,
        userId: createdUser.id,
      });
      
      return res.status(201).json({
        partner: createdPartner,
        user: {
          id: createdUser.id,
          username: createdUser.username,
          name: createdUser.name,
          email: createdUser.email,
          role: createdUser.role,
        },
      });
    } catch (error) {
      console.error("Error creating retail partner with user:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Update a retail partner
  app.patch('/api/retail-partners/:partnerId', requireAuth, checkPartnerAccess(), async (req: Request, res: Response) => {
    try {
      const partnerId = parseInt(req.params.partnerId, 10);
      const partner = await storage.getRetailPartner(partnerId);
      
      if (!partner) {
        return res.status(404).json({ message: "Retail partner not found" });
      }
      
      // For partner users, limit what fields they can update
      if (req.user?.role === 'partner') {
        const allowedFields = ['footerTemplate', 'contactPhone', 'contactEmail', 'address'];
        const updatedData: any = {};
        
        for (const field of allowedFields) {
          if (req.body[field] !== undefined) {
            updatedData[field] = req.body[field];
          }
        }
        
        if (Object.keys(updatedData).length === 0) {
          return res.status(400).json({ message: "No valid fields to update" });
        }
        
        const updatedPartner = await storage.updateRetailPartner(partnerId, updatedData);
        return res.json(updatedPartner);
      }
      
      // For brand and admin users, allow updating any fields
      const updatedPartner = await storage.updateRetailPartner(partnerId, req.body);
      return res.json(updatedPartner);
    } catch (error) {
      console.error("Error updating retail partner:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // For partners to get all posts assigned to them
  app.get('/api/partner/posts', requireAuth, async (req: Request, res: Response) => {
    try {
      if (req.user?.role !== 'partner') {
        return res.status(403).json({ message: "This endpoint is only for partner users" });
      }
      
      // Get all retail partners for this user
      const userPartners = await db.query.retailPartners.findMany({
        where: eq(retailPartners.userId, req.user.id)
      });
      
      if (userPartners.length === 0) {
        return res.json([]);
      }
      
      const partnerIds = userPartners.map(partner => partner.id);
      
      // Get all post assignments for these partners
      const assignments = [];
      for (const partnerId of partnerIds) {
        const partnerAssignments = await db.query.postAssignments.findMany({
          where: eq(postAssignments.partnerId, partnerId),
          with: {
            post: true
          }
        });
        
        assignments.push(...partnerAssignments);
      }
      
      return res.json(assignments);
    } catch (error) {
      console.error("Error fetching partner posts:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Bulk import retail partners
  app.post('/api/retail-partners/bulk', requireBrandOrAdmin, async (req: Request, res: Response) => {
    try {
      const { partners } = req.body;
      
      if (!Array.isArray(partners) || partners.length === 0) {
        return res.status(400).json({ message: "Invalid request: partners must be a non-empty array" });
      }
      
      // Get brand ID for brand users (use the first partner's brandId for admin users)
      let brandId = partners[0].brandId;
      
      if (req.user?.role === 'brand') {
        // Get all brands owned by this user
        const userBrands = await db.query.brands.findMany({
          where: eq(brands.ownerId, req.user.id)
        });
        
        if (userBrands.length === 0) {
          return res.status(403).json({ message: "You don't have any brands" });
        }
        
        // Verify this user owns the brand
        const userBrandIds = userBrands.map(brand => brand.id);
        if (!userBrandIds.includes(brandId)) {
          // If the user provided a brand they don't own, use their first brand
          brandId = userBrands[0].id;
        }
      } else {
        // For admin users, verify that the brand exists
        const brand = await db.query.brands.findFirst({
          where: eq(brands.id, brandId)
        });
        
        if (!brand) {
          return res.status(404).json({ message: "Brand not found" });
        }
      }
      
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
          // Create the partner with the correct brand ID
          const createdPartner = await storage.createRetailPartner({
            ...partner,
            brandId: brandId,
            status: partner.status || 'pending'
          });
          
          createdPartners.push(createdPartner);
        } catch (error) {
          errors.push({
            index: i,
            partner: partner.name,
            error: error.message || "Unknown error"
          });
        }
      }
      
      return res.status(201).json({
        success: true,
        created: createdPartners.length,
        partners: createdPartners,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error("Error bulk importing retail partners:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
}