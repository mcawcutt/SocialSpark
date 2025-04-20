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
  // Get all available partner tags endpoint
  app.get('/api/retail-partners/tags', requireAuth, async (req: Request, res: Response) => {
    try {
      console.log("Getting partner tags for user:", req.user?.id, "Role:", req.user?.role);
      
      // For brand users, only show their own partners' tags
      const brandId = req.user?.role === 'brand' ? 1 : 1; // Use brand ID 1 for demo mode
      
      // Get all partners for the brand
      const partners = await storage.getRetailPartnersByBrandId(brandId);
      
      // Extract all unique tags from partners
      const allTags: string[] = [];
      partners.forEach(partner => {
        if (partner.metadata && typeof partner.metadata === 'object') {
          if ('tags' in partner.metadata && Array.isArray(partner.metadata.tags)) {
            allTags.push(...partner.metadata.tags.filter(tag => typeof tag === 'string'));
          }
        }
      });
      
      // Get unique tags only
      const uniqueTags = [...new Set(allTags)];
      console.log(`Found ${uniqueTags.length} unique tags for brand ${brandId}`);
      
      return res.json(uniqueTags);
    } catch (error) {
      console.error("Error fetching partner tags:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Demo endpoint for retail partners (when not authenticated)
  app.get('/api/demo/retail-partners', async (req: Request, res: Response) => {
    try {
      // Get all partners for demo brand
      const partners = await storage.getRetailPartnersByBrandId(1);
      console.log(`Found ${partners.length} partners for demo brand 1`);
      return res.json(partners);
    } catch (error) {
      console.error("Error fetching demo retail partners:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Demo endpoint for partner tags (when not authenticated)
  app.get('/api/demo/retail-partners/tags', async (req: Request, res: Response) => {
    try {
      // Get all partners for demo brand
      const partners = await storage.getRetailPartnersByBrandId(1);
      
      // Extract all unique tags from partners
      const allTags: string[] = [];
      partners.forEach(partner => {
        console.log("DEBUG - Partner", partner.name, "metadata:", partner.metadata);
        if (partner.metadata && typeof partner.metadata === 'object') {
          if ('tags' in partner.metadata && Array.isArray(partner.metadata.tags)) {
            allTags.push(...partner.metadata.tags.filter(tag => typeof tag === 'string'));
          }
        } else {
          console.log(`Partner ${partner.name} has no metadata object`);
        }
      });
      
      // Get unique tags only
      const uniqueTags = [...new Set(allTags)];
      console.log(`Found ${uniqueTags.length} unique tags for demo brand`);
      
      return res.json(uniqueTags);
    } catch (error) {
      console.error("Error fetching demo partner tags:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  // Get all retail partners for the brand
  app.get('/api/retail-partners', requireBrandOrAdmin, async (req: Request, res: Response) => {
    try {
      console.log("Getting retail partners for user:", req.user?.id, "Role:", req.user?.role);
      
      // For brand users, only show their own partners
      if (req.user?.role === 'brand') {
        // Get all brands owned by this user
        const userBrands = await db.query.brands.findMany({
          where: eq(brands.ownerId, req.user.id)
        });
        
        const brandIds = userBrands.map(brand => brand.id);
        
        if (brandIds.length === 0) {
          console.log("No brands found for user. Using demo brandId: 1");
          // Special case for demo mode - just use brand ID 1
          const partners = await storage.getRetailPartnersByBrandId(1);
          console.log(`Found ${partners.length} partners for demo brand 1`);
          return res.json(partners);
        }
        
        // Get all partners for all brands owned by this user
        // This is simplified - in production you would use an "in" clause
        const partners = await storage.getRetailPartnersByBrandId(brandIds[0]);
        console.log(`Found ${partners.length} partners for brand ${brandIds[0]}`);
        return res.json(partners);
      }
      
      // For admins, allow filtering by brand ID
      const brandId = req.query.brandId ? parseInt(req.query.brandId as string, 10) : null;
      
      if (brandId) {
        const partners = await storage.getRetailPartnersByBrandId(brandId);
        console.log(`Found ${partners.length} partners for brand ${brandId}`);
        return res.json(partners);
      } else {
        // For admins without a filter, return all partners (potentially paginated in a real app)
        // This is simplified - you would implement pagination in production
        try {
          const allPartners = await db.query.retailPartners.findMany({
            limit: 100
          });
          console.log(`Found ${allPartners.length} partners in database`);
          return res.json(allPartners);
        } catch (dbError) {
          console.error("Error querying database for partners:", dbError);
          // Fallback to in-memory partners
          const memPartners = await storage.getRetailPartnersByBrandId(1);
          console.log(`Falling back to in-memory partners. Found ${memPartners.length} partners.`);
          return res.json(memPartners);
        }
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
      console.log("Bulk import request received:", JSON.stringify(req.body).substring(0, 200) + "...");
      const { partners } = req.body;
      
      if (!Array.isArray(partners) || partners.length === 0) {
        return res.status(400).json({ message: "Invalid request: partners must be a non-empty array" });
      }
      
      // Get brand ID for brand users (use the first partner's brandId for admin users)
      let brandId = partners[0].brandId;
      
      if (req.user?.role === 'brand') {
        console.log("Processing bulk import for brand user:", req.user.id);
        // Get all brands owned by this user
        const userBrands = await db.query.brands.findMany({
          where: eq(brands.ownerId, req.user.id)
        });
        
        if (userBrands.length === 0) {
          console.log("No brands found for user. Using demo brandId: 1");
          // Special case for demo mode - just use brand ID 1
          brandId = 1;
        } else {
          // Verify this user owns the brand
          const userBrandIds = userBrands.map(brand => brand.id);
          if (!userBrandIds.includes(brandId)) {
            // If the user provided a brand they don't own, use their first brand
            brandId = userBrands[0].id;
          }
        }
      } else {
        console.log("Processing bulk import for admin user");
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
          console.log(`Creating partner ${i+1}/${partners.length}: ${partner.name}`);
          // Create the partner with the correct brand ID
          const createdPartner = await storage.createRetailPartner({
            ...partner,
            brandId: brandId,
            status: partner.status || 'pending'
          });
          
          createdPartners.push(createdPartner);
        } catch (error) {
          console.error(`Error creating partner ${partner.name}:`, error);
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
      
      console.log(`Bulk import completed. Created: ${createdPartners.length}, Errors: ${errors.length}`);
      
      // Ensure we're sending JSON content type
      res.setHeader('Content-Type', 'application/json');
      return res.status(201).json(response);
    } catch (error) {
      console.error("Error bulk importing retail partners:", error);
      // Ensure we're sending JSON content type even on error
      res.setHeader('Content-Type', 'application/json');
      return res.status(500).json({ message: "Server error", error: error.message });
    }
  });
}