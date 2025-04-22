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
      // Use brandId property (set during login/impersonation) if available, otherwise fall back to user ID
      const brandId = req.user?.brandId || req.user?.id;
      console.log(`[GetPartnerTags] Getting tags for brandId=${brandId}, user=${req.user?.username} (${req.user?.id}), role=${req.user?.role}`);
      
      // If admin, allow overriding with query param
      let effectiveBrandId = brandId;
      if (req.user?.role === 'admin' && req.query.brandId) {
        effectiveBrandId = parseInt(req.query.brandId as string, 10);
      }
      
      // If admin with no brand specified, return default tags
      if (req.user?.role === 'admin' && !req.query.brandId) {
        const defaultTags = [
          "Urban", "Outdoor", "Premium", "Sale", 
          "Family", "Summer", "Winter", "Gear"
        ];
        console.log(`[GetPartnerTags] Admin requested tags with no brand specified, returning defaults`);
        return res.json(defaultTags);
      }
      
      // Get all partners for the brand
      const partners = await storage.getRetailPartnersByBrandId(effectiveBrandId);
      console.log(`[GetPartnerTags] Found ${partners.length} partners for brandId=${effectiveBrandId}`);
      
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
      console.log(`[GetPartnerTags] Found ${uniqueTags.length} unique tags for brandId=${effectiveBrandId}`);
      
      // If there are no tags, return some defaults
      if (uniqueTags.length === 0) {
        const defaultTags = [
          "Urban", "Outdoor", "Premium", "Sale", 
          "Family", "Summer", "Winter", "Gear"
        ];
        console.log(`[GetPartnerTags] No tags found for brandId=${effectiveBrandId}, returning defaults`);
        return res.json(defaultTags);
      }
      
      return res.json(uniqueTags);
    } catch (error) {
      console.error("[GetPartnerTags] Error fetching partner tags:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Demo endpoint for retail partners (works both when authenticated and not)
  app.get('/api/demo/retail-partners', async (req: Request, res: Response) => {
    try {
      // Get the appropriate brand ID based on authentication status
      let brandId: number;
      
      if (req.isAuthenticated()) {
        // For authenticated users, use their own brandId or respect query param if admin
        brandId = req.user?.brandId || req.user?.id || 1;
        
        // Admin users can override with query param
        if (req.user?.role === 'admin' && req.query.brandId) {
          brandId = parseInt(req.query.brandId as string, 10);
        }
        
        console.log(`[DemoGetPartners] Authenticated request from ${req.user?.username} (${req.user?.role}) with brandId=${brandId}`);
      } else {
        // For unauthenticated users, use demo brand or query param
        brandId = req.query.brandId ? parseInt(req.query.brandId as string, 10) : 1;
        console.log(`[DemoGetPartners] Unauthenticated request using brandId=${brandId}`);
      }
      
      // Get all partners for the appropriate brand
      const partners = await storage.getRetailPartnersByBrandId(brandId);
      console.log(`[DemoGetPartners] Found ${partners.length} partners for brandId=${brandId}`);
      
      return res.json(partners);
    } catch (error) {
      console.error("[DemoGetPartners] Error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Demo endpoint for partner tags (works both when authenticated and not)
  app.get('/api/demo/retail-partners/tags', async (req: Request, res: Response) => {
    try {
      // Default tags for new brands
      const defaultTags = [
        "Urban", "Outdoor", "Premium", "Sale", 
        "Family", "Summer", "Winter", "Gear"
      ];
      
      // Get the appropriate brand ID based on authentication status
      let brandId: number;
      
      if (req.isAuthenticated()) {
        // For authenticated users, use their own brandId or respect query param if admin
        brandId = req.user?.brandId || req.user?.id || 1;
        
        // Admin users can override with query param
        if (req.user?.role === 'admin' && req.query.brandId) {
          brandId = parseInt(req.query.brandId as string, 10);
        }
        
        console.log(`[DemoGetTags] Authenticated request from ${req.user?.username} (${req.user?.role}) with brandId=${brandId}`);
      } else {
        // For unauthenticated users, use demo brand or query param
        brandId = req.query.brandId ? parseInt(req.query.brandId as string, 10) : 1;
        console.log(`[DemoGetTags] Unauthenticated request using brandId=${brandId}`);
      }
      
      // Get all partners for the appropriate brand
      const partners = await storage.getRetailPartnersByBrandId(brandId);
      
      // If no partners found, return default tags
      if (!partners || partners.length === 0) {
        console.log(`[DemoGetTags] No partners found for brandId=${brandId}, returning default tags`);
        return res.json(defaultTags);
      }
      
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
      console.log(`[DemoGetTags] Found ${uniqueTags.length} unique tags for brandId=${brandId}`);
      
      // If no tags found, return default tags
      if (uniqueTags.length === 0) {
        return res.json(defaultTags);
      }
      
      return res.json(uniqueTags);
    } catch (error) {
      console.error("[DemoGetTags] Error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  // Get all retail partners for the brand
  app.get('/api/retail-partners', requireBrandOrAdmin, async (req: Request, res: Response) => {
    try {
      // Use brandId property (set during login/impersonation) if available, otherwise fall back to user ID
      const brandId = req.user?.brandId || req.user?.id;
      console.log(`[GetRetailPartnersAPI] Getting retail partners for brandId=${brandId}, user=${req.user?.username} (${req.user?.id}), role=${req.user?.role}`);
      
      // For brand users, only show their own partners using the brandId
      if (req.user?.role === 'brand') {
        const partners = await storage.getRetailPartnersByBrandId(brandId);
        console.log(`[GetRetailPartnersAPI] Found ${partners.length} partners for brandId=${brandId}`);
        return res.json(partners);
      }
      
      // For admins, allow filtering by brand ID from query param
      const requestedBrandId = req.query.brandId ? parseInt(req.query.brandId as string, 10) : null;
      
      if (requestedBrandId) {
        const partners = await storage.getRetailPartnersByBrandId(requestedBrandId);
        console.log(`[GetRetailPartnersAPI] Admin requested partners for brandId=${requestedBrandId}, found ${partners.length}`);
        return res.json(partners);
      } else {
        // For admins without a filter, return all partners (potentially paginated in a real app)
        try {
          const allPartners = await db.query.retailPartners.findMany({
            limit: 100
          });
          console.log(`[GetRetailPartnersAPI] Admin requested all partners, found ${allPartners.length}`);
          return res.json(allPartners);
        } catch (dbError) {
          console.error("[GetRetailPartnersAPI] Error querying database for partners:", dbError);
          return res.json([]); // Return empty array
        }
      }
    } catch (error) {
      console.error("[GetRetailPartnersAPI] Error fetching retail partners:", error);
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
      
      // IMPORTANT: Use the brandId from the user object if it exists (for impersonation)
      // This ensures retail partners are created under the correct brand, especially for impersonated brands
      let brandId = req.user?.brandId || partners[0].brandId;
      
      console.log(`[BulkImport] Initial brandId=${brandId} for user ${req.user?.username} (${req.user?.id}, role=${req.user?.role})`);
      
      if (req.user?.role === 'brand') {
        console.log("Processing bulk import for brand user:", req.user.id);
        // If the user is impersonated (has brandId property), use that directly
        if (req.user.brandId) {
          console.log(`Using impersonated brandId=${req.user.brandId} for user ${req.user.username}`);
          brandId = req.user.brandId;
        } else {
          // Otherwise use normal logic
          // Get all brands owned by this user
          const userBrands = await db.query.brands.findMany({
            where: eq(brands.ownerId, req.user.id)
          });
          
          if (userBrands.length === 0) {
            console.log("No brands found for user. Using user's own ID as brandId");
            // Use the user's ID directly when no brands are found - ensures data isolation
            brandId = req.user.id;
          } else {
            // Verify this user owns the brand
            const userBrandIds = userBrands.map(brand => brand.id);
            if (!userBrandIds.includes(brandId)) {
              // If the user provided a brand they don't own, use their first brand
              brandId = userBrands[0].id;
            }
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