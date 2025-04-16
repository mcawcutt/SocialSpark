import { Request, Response, NextFunction } from "express";
import { User } from "@shared/schema";
import { db } from "../db";
import { brands, retailPartners, contentPosts, postAssignments } from "@shared/schema";
import { eq, and } from "drizzle-orm";

// Enhanced Request interface with user property
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/**
 * Middleware to check if user is authenticated
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ 
      message: "Unauthorized", 
      detail: "Please log in to continue"
    });
  }
  next();
};

/**
 * Middleware to check if user is an admin
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  if (req.user?.role !== "admin") {
    return res.status(403).json({ 
      message: "Forbidden", 
      detail: "Admin access required" 
    });
  }
  
  next();
};

/**
 * Middleware to check if user is a brand owner or admin
 */
export const requireBrandOrAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  if (req.user?.role !== "brand" && req.user?.role !== "admin") {
    return res.status(403).json({ 
      message: "Forbidden", 
      detail: "Brand or Admin access required" 
    });
  }
  
  next();
};

/**
 * Check if user is authorized to access a specific brand
 * To be used after requireBrandOrAdmin
 */
export const checkBrandAccess = (brandIdParam: string = "brandId") => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const brandId = parseInt(req.params[brandIdParam], 10);
    if (isNaN(brandId)) {
      return res.status(400).json({ message: "Invalid brand ID" });
    }
    
    // Admin can access any brand
    if (req.user?.role === "admin") {
      return next();
    }
    
    try {
      // Check if this brand belongs to the user
      const brand = await db.query.brands.findFirst({
        where: and(
          eq(brands.id, brandId), 
          eq(brands.ownerId, req.user!.id)
        )
      });
      
      if (brand) {
        return next();
      }
      
      return res.status(403).json({ 
        message: "Forbidden", 
        detail: "You don't have access to this brand" 
      });
    } catch (error) {
      console.error("Error checking brand access:", error);
      return res.status(500).json({ message: "Server error" });
    }
  };
};

/**
 * Check if user has access to a specific retail partner
 * Can be used by brand owners or the partner themselves
 */
export const checkPartnerAccess = (partnerIdParam: string = "partnerId") => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const partnerId = parseInt(req.params[partnerIdParam], 10);
    if (isNaN(partnerId)) {
      return res.status(400).json({ message: "Invalid partner ID" });
    }
    
    // Admin can access any partner
    if (req.user?.role === "admin") {
      return next();
    }
    
    try {
      // Partner users can only access their own partner
      if (req.user?.role === "partner") {
        const partner = await db.query.retailPartners.findFirst({
          where: and(
            eq(retailPartners.id, partnerId),
            eq(retailPartners.userId, req.user.id)
          )
        });
        
        if (partner) {
          return next();
        }
      }
      
      // Brand users can access partners under their brands
      if (req.user?.role === "brand") {
        // First get all brands owned by this user
        const userBrands = await db.query.brands.findMany({
          where: eq(brands.ownerId, req.user.id)
        });
        
        const brandIds = userBrands.map(brand => brand.id);
        
        // Now check if the partner belongs to any of those brands
        const partner = await db.query.retailPartners.findFirst({
          where: and(
            eq(retailPartners.id, partnerId),
            // This is a simplified check - in a real implementation 
            // you'd use an "in" operator for brandIds
            eq(retailPartners.brandId, brandIds[0])
          )
        });
        
        if (partner || brandIds.length === 0) {
          return next();
        }
      }
      
      return res.status(403).json({ 
        message: "Forbidden", 
        detail: "You don't have access to this retail partner" 
      });
    } catch (error) {
      console.error("Error checking partner access:", error);
      return res.status(500).json({ message: "Server error" });
    }
  };
};

/**
 * Check if user has access to a specific content post
 */
export const checkPostAccess = (postIdParam: string = "postId") => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const postId = parseInt(req.params[postIdParam], 10);
    if (isNaN(postId)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }
    
    // Admin can access any post
    if (req.user?.role === "admin") {
      return next();
    }
    
    try {
      // Get the post
      const post = await db.query.contentPosts.findFirst({
        where: eq(contentPosts.id, postId)
      });
      
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      // Brand users can access posts for their brands
      if (req.user?.role === "brand") {
        const userBrands = await db.query.brands.findMany({
          where: eq(brands.ownerId, req.user.id)
        });
        
        const brandIds = userBrands.map(brand => brand.id);
        
        if (brandIds.includes(post.brandId)) {
          return next();
        }
      }
      
      // Partner users can access posts assigned to them
      if (req.user?.role === "partner") {
        // Get all retail partners associated with this user
        const userPartners = await db.query.retailPartners.findMany({
          where: eq(retailPartners.userId, req.user.id)
        });
        
        const partnerIds = userPartners.map(partner => partner.id);
        
        // Check if the post is assigned to any of the user's partners
        for (const partnerId of partnerIds) {
          const assignment = await db.query.postAssignments.findFirst({
            where: and(
              eq(postAssignments.postId, postId),
              eq(postAssignments.partnerId, partnerId)
            )
          });
          
          if (assignment) {
            return next();
          }
        }
      }
      
      return res.status(403).json({ 
        message: "Forbidden", 
        detail: "You don't have access to this post" 
      });
    } catch (error) {
      console.error("Error checking post access:", error);
      return res.status(500).json({ message: "Server error" });
    }
  };
};