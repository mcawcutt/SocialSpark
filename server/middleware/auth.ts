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
    console.log(`[Auth] checkPartnerAccess for partnerId=${partnerId}, user=${req.user?.username} (${req.user?.id}), role=${req.user?.role}, brandId=${req.user?.brandId}`);
    
    if (isNaN(partnerId)) {
      console.log(`[Auth] Invalid partner ID: ${req.params[partnerIdParam]}`);
      return res.status(400).json({ message: "Invalid partner ID" });
    }
    
    // Admin can access any partner
    if (req.user?.role === "admin") {
      console.log(`[Auth] Admin user ${req.user.username} granted access to partner ${partnerId}`);
      return next();
    }
    
    try {
      // Partner users can only access their own partner
      if (req.user?.role === "partner") {
        console.log(`[Auth] Partner user ${req.user.username} checking access to partner ${partnerId}`);
        const partner = await db.query.retailPartners.findFirst({
          where: and(
            eq(retailPartners.id, partnerId),
            eq(retailPartners.userId, req.user.id)
          )
        });
        
        if (partner) {
          console.log(`[Auth] Partner user ${req.user.username} granted access to their own partner ${partnerId}`);
          return next();
        } else {
          console.log(`[Auth] Partner user ${req.user.username} denied access to partner ${partnerId} - not their partner`);
        }
      }
      
      // Brand users can access partners under their brands
      if (req.user?.role === "brand") {
        console.log(`[Auth] Brand user ${req.user.username} checking access to partner ${partnerId}`);
        
        // First check if the partner exists
        const partner = await db.query.retailPartners.findFirst({
          where: eq(retailPartners.id, partnerId)
        });
        
        if (!partner) {
          console.log(`[Auth] Partner with ID ${partnerId} not found`);
          return res.status(404).json({ message: "Retail partner not found" });
        }
        
        console.log(`[Auth] Found partner: ${partner.name}, brandId=${partner.brandId}`);
        
        // First try to match with user's brandId property (from impersonation or session)
        if (req.user.brandId && req.user.brandId === partner.brandId) {
          console.log(`[Auth] Brand user has matching brandId property (${req.user.brandId}), granting access`);
          return next();
        }
        
        // If the brandId doesn't match or isn't set, check all brands owned by this user
        const userBrands = await db.query.brands.findMany({
          where: eq(brands.ownerId, req.user.id)
        });
        
        console.log(`[Auth] Found ${userBrands.length} brands owned by user ${req.user.username}`);
        console.log(`[Auth] Brand IDs: ${userBrands.map(b => b.id).join(', ')}`);
        
        // Check if partner.brandId is in the list of user's brand IDs
        const brandIds = userBrands.map(brand => brand.id);
        
        if (brandIds.includes(partner.brandId)) {
          console.log(`[Auth] Partner's brandId (${partner.brandId}) found in user's owned brands, granting access`);
          return next();
        } else {
          console.log(`[Auth] Partner's brandId (${partner.brandId}) NOT found in user's owned brands ${JSON.stringify(brandIds)}`);
        }
      }
      
      console.log(`[Auth] Access denied for user ${req.user?.username} to partner ${partnerId}`);
      return res.status(403).json({ 
        message: "Forbidden", 
        detail: "You don't have access to this retail partner" 
      });
    } catch (error) {
      console.error("[Auth] Error checking partner access:", error);
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