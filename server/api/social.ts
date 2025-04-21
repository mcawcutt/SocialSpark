import express, { Router, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { insertSocialAccountSchema, SocialAccount } from "@shared/schema";
import { requireAuth, requireBrandOrAdmin } from "../middleware";

const socialRouter = Router();

// Get all social accounts for a specific partner
socialRouter.get("/social-accounts/:partnerId",
  requireAuth,
  requireBrandOrAdmin,
  async (req: Request, res: Response) => {
    try {
      const partnerId = parseInt(req.params.partnerId);
      
      if (isNaN(partnerId)) {
        return res.status(400).json({ error: "Invalid partner ID" });
      }
      
      // Get the partner to verify ownership
      const partner = await storage.getRetailPartner(partnerId);
      
      if (!partner) {
        return res.status(404).json({ error: "Partner not found" });
      }
      
      // If user is a brand, verify they own this partner
      if (req.user && req.user.role === "brand") {
        // The partner's brandId should match the user's brand ID
        if (partner.brandId !== req.user.brandId) {
          return res.status(403).json({ error: "You don't have permission to access this partner's accounts" });
        }
      }
      
      const accounts = await storage.getSocialAccountsByPartnerId(partnerId);
      return res.status(200).json(accounts);
    } catch (error) {
      console.error("Error fetching social accounts:", error);
      return res.status(500).json({ error: "Failed to fetch social accounts" });
    }
  }
);

// Delete a social account
socialRouter.delete("/social-accounts/:accountId",
  requireAuth,
  requireBrandOrAdmin,
  async (req: Request, res: Response) => {
    try {
      const accountId = parseInt(req.params.accountId);
      
      if (isNaN(accountId)) {
        return res.status(400).json({ error: "Invalid account ID" });
      }
      
      // Get the account to verify ownership
      const account = await storage.getSocialAccount(accountId);
      
      if (!account) {
        return res.status(404).json({ error: "Social account not found" });
      }
      
      // Get the partner to verify ownership
      const partner = await storage.getRetailPartner(account.partnerId);
      
      if (!partner) {
        return res.status(404).json({ error: "Partner not found" });
      }
      
      // If user is a brand, verify they own this partner
      if (req.user && req.user.role === "brand") {
        // The partner's brandId should match the user's brand ID
        if (partner.brandId !== req.user.brandId) {
          return res.status(403).json({ error: "You don't have permission to delete this account" });
        }
      }
      
      await storage.deleteSocialAccount(accountId);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting social account:", error);
      return res.status(500).json({ error: "Failed to delete social account" });
    }
  }
);

// Add a social account to a partner (direct method, not via OAuth)
socialRouter.post("/social-accounts",
  requireAuth,
  requireBrandOrAdmin,
  async (req: Request, res: Response) => {
    try {
      // Parse and validate the incoming data
      const accountData = insertSocialAccountSchema.parse(req.body);
      
      // Get the partner to verify ownership
      const partner = await storage.getRetailPartner(accountData.partnerId);
      
      if (!partner) {
        return res.status(404).json({ error: "Partner not found" });
      }
      
      // If user is a brand, verify they own this partner
      if (req.user && req.user.role === "brand") {
        // The partner's brandId should match the user's brand ID
        if (partner.brandId !== req.user.brandId) {
          return res.status(403).json({ error: "You don't have permission to add accounts to this partner" });
        }
      }
      
      // Check if account already exists for this platform and platform ID
      const existingAccount = await storage.getSocialAccountByPlatformId(
        accountData.platform,
        accountData.platformId
      );
      
      if (existingAccount) {
        return res.status(409).json({ error: "This social account is already connected" });
      }
      
      // Create the new social account
      const newAccount = await storage.createSocialAccount(accountData);
      return res.status(201).json(newAccount);
    } catch (error) {
      console.error("Error creating social account:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      
      return res.status(500).json({ error: "Failed to create social account" });
    }
  }
);

// Store Facebook auth data temporarily during OAuth flow
socialRouter.post("/social/store-facebook-auth", 
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { profile, accessToken } = req.body;
      
      if (!profile || !accessToken) {
        return res.status(400).json({ error: "Missing required data" });
      }
      
      // Store the Facebook auth data in the session
      req.session.facebookAuth = { profile, accessToken };
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error storing Facebook auth data:", error);
      return res.status(500).json({ error: "Failed to store Facebook auth data" });
    }
  }
);

// Setup social routes
export function setupSocialRoutes(app: express.Application) {
  app.use('/api', socialRouter);
}

export { socialRouter };