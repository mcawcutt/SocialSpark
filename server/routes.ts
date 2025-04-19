import express, { type Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { setupContentRoutes } from "./api/content";
import { setupMediaRoutes } from "./api/media";
import { setupUploadRoutes, serveUploads } from "./upload";
import { setupPartnerRoutes } from "./api/partners";
import { setupBrandRoutes } from "./api/brands";
import { setupInviteRoutes } from "./api/invites";
import { setupTestInviteRoutes } from "./api/test-invites";
import { z } from "zod";
import {
  insertRetailPartnerSchema,
  insertSocialAccountSchema,
  insertContentPostSchema,
  insertPostAssignmentSchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve static assets from the attached_assets directory
  app.use("/assets", express.static(path.join(process.cwd(), "attached_assets")));
  
  // Serve the upload test page (only in development)
  if (process.env.NODE_ENV === 'development') {
    app.get("/test-upload", (req, res) => {
      res.sendFile(path.join(process.cwd(), "upload-test.html"));
    });
  }
  
  // Set up authentication routes
  setupAuth(app);
  
  // Set up content routes
  setupContentRoutes(app);
  
  // Set up media library routes
  setupMediaRoutes(app);
  
  // Set up partner routes
  setupPartnerRoutes(app);
  
  // Set up brand routes
  setupBrandRoutes(app);
  
  // Set up invite routes
  setupInviteRoutes(app);
  
  // Set up test invite routes for development
  setupTestInviteRoutes(app);
  
  // Set up file upload routes
  setupUploadRoutes(app);
  
  // Serve uploaded files
  serveUploads(app);

  // Debug endpoint to check if server is running correctly
  app.get("/api/debug", (req, res) => {
    res.json({ 
      message: "Debug endpoint reached", 
      sessionExists: !!req.session,
      isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
      user: req.user || null,
      timestamp: new Date().toISOString()
    });
  });
  
  // Special demo login endpoint for testing purposes
  app.post("/api/demo-login", (req, res) => {
    // This is only for development and testing
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ message: "Demo login not available in production" });
    }
    
    console.log("Processing demo login request");
    
    // In demo mode, log in as the demo user
    req.login({
      id: 1,
      username: "demo",
      password: "password", // This is just for the session object, not security sensitive
      name: req.body.name || "Acme Brands",
      email: "demo@example.com",
      role: "brand",
      brandId: 1,
      planType: "premium",
      logo: req.body.logo || null,
      parentId: null,
      createdAt: new Date()
    }, (err) => {
      if (err) {
        console.error("Demo login failed:", err);
        return res.status(500).json({ message: "Demo login failed", error: err.message });
      }
      
      console.log(`Demo login successful for: ${req.user?.name}`);
      return res.json({ success: true, user: req.user });
    });
  });

  // Check authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    console.log(`[Auth] ${req.method} ${req.path} - Auth check:`, req.isAuthenticated ? req.isAuthenticated() : "isAuthenticated not available");
    console.log(`[Auth] ${req.method} ${req.path} - Session ID:`, req.sessionID);
    console.log(`[Auth] ${req.method} ${req.path} - User:`, req.user ? req.user.username : "Not logged in");
    
    if (!req.isAuthenticated()) {
      console.log(`[Auth] ${req.method} ${req.path} - Authentication failed, redirecting to login`);
      return res.status(401).json({ 
        message: "Unauthorized", 
        detail: "Your session has expired or you are not logged in. Please log in again." 
      });
    }
    next();
  };

  // Retail Partners endpoints
  app.get("/api/retail-partners", requireAuth, async (req, res) => {
    const partners = await storage.getRetailPartnersByBrandId(req.user!.id);
    res.json(partners);
  });

  app.post("/api/retail-partners", requireAuth, async (req, res) => {
    try {
      const data = insertRetailPartnerSchema.parse({
        ...req.body,
        brandId: req.user!.id
      });
      
      const partner = await storage.createRetailPartner(data);
      res.status(201).json(partner);
    } catch (error) {
      res.status(400).json({ message: "Invalid data", error });
    }
  });

  app.get("/api/retail-partners/:id", requireAuth, async (req, res) => {
    const partner = await storage.getRetailPartner(parseInt(req.params.id));
    if (!partner) {
      return res.status(404).json({ message: "Partner not found" });
    }
    
    if (partner.brandId !== req.user!.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    res.json(partner);
  });

  app.patch("/api/retail-partners/:id", requireAuth, async (req, res) => {
    const partner = await storage.getRetailPartner(parseInt(req.params.id));
    if (!partner) {
      return res.status(404).json({ message: "Partner not found" });
    }
    
    if (partner.brandId !== req.user!.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    try {
      const updatedPartner = await storage.updateRetailPartner(parseInt(req.params.id), req.body);
      res.json(updatedPartner);
    } catch (error) {
      res.status(400).json({ message: "Invalid data", error });
    }
  });

  // Social Accounts endpoints
  app.get("/api/social-accounts", requireAuth, async (req, res) => {
    const partners = await storage.getRetailPartnersByBrandId(req.user!.id);
    const partnerIds = partners.map(p => p.id);
    
    const accounts = await storage.getSocialAccountsByPartnerIds(partnerIds);
    res.json(accounts);
  });

  app.post("/api/social-accounts", requireAuth, async (req, res) => {
    const partner = await storage.getRetailPartner(req.body.partnerId);
    if (!partner || partner.brandId !== req.user!.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    try {
      const data = insertSocialAccountSchema.parse(req.body);
      const account = await storage.createSocialAccount(data);
      res.status(201).json(account);
    } catch (error) {
      res.status(400).json({ message: "Invalid data", error });
    }
  });

  // Content Posts endpoints
  app.get("/api/content-posts", requireAuth, async (req, res) => {
    const posts = await storage.getContentPostsByBrandId(req.user!.id);
    res.json(posts);
  });

  app.post("/api/content-posts", requireAuth, async (req, res) => {
    try {
      const data = insertContentPostSchema.parse({
        ...req.body,
        brandId: req.user!.id
      });
      
      const post = await storage.createContentPost(data);
      
      // If post assignments are included
      if (req.body.partners && Array.isArray(req.body.partners)) {
        for (const partnerId of req.body.partners) {
          await storage.createPostAssignment({
            postId: post.id,
            partnerId,
            customFooter: req.body.customFooter || null,
            customTags: req.body.customTags || null
          });
        }
      }
      
      res.status(201).json(post);
    } catch (error) {
      res.status(400).json({ message: "Invalid data", error });
    }
  });

  app.get("/api/content-posts/:id", requireAuth, async (req, res) => {
    const post = await storage.getContentPost(parseInt(req.params.id));
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    
    if (post.brandId !== req.user!.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    // Get assignments for this post
    const assignments = await storage.getPostAssignmentsByPostId(post.id);
    res.json({ ...post, assignments });
  });

  app.patch("/api/content-posts/:id", requireAuth, async (req, res) => {
    const post = await storage.getContentPost(parseInt(req.params.id));
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    
    if (post.brandId !== req.user!.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    try {
      const updatedPost = await storage.updateContentPost(parseInt(req.params.id), req.body);
      res.json(updatedPost);
    } catch (error) {
      res.status(400).json({ message: "Invalid data", error });
    }
  });

  // Analytics endpoints
  app.get("/api/analytics", requireAuth, async (req, res) => {
    const partners = await storage.getRetailPartnersByBrandId(req.user!.id);
    const partnerIds = partners.map(p => p.id);
    
    const posts = await storage.getContentPostsByBrandId(req.user!.id);
    const postIds = posts.map(p => p.id);
    
    const analytics = await storage.getAnalyticsByPostAndPartnerIds(postIds, partnerIds);
    res.json(analytics);
  });

  // Summary statistics for dashboard
  app.get("/api/dashboard-stats", requireAuth, async (req, res) => {
    // Get counts for quick stats
    const activePosts = await storage.getActivePostCount(req.user!.id);
    const partnerCount = await storage.getRetailPartnerCount(req.user!.id);
    const scheduledPosts = await storage.getScheduledPostCount(req.user!.id);
    const totalEngagements = await storage.getTotalEngagements(req.user!.id);
    
    // Get most recent partners
    const recentPartners = await storage.getRecentPartners(req.user!.id, 3);
    
    // Get partner stats by status
    const partnerStats = await storage.getPartnerStatsByStatus(req.user!.id);
    
    // Get performance metrics
    const performanceMetrics = await storage.getPerformanceMetrics(req.user!.id);
    
    // Get upcoming posts
    const upcomingPosts = await storage.getUpcomingPosts(req.user!.id, 3);
    
    // Get recent activity
    const recentActivity = await storage.getRecentActivity(req.user!.id, 4);
    
    res.json({
      quickStats: {
        activePosts,
        partnerCount,
        scheduledPosts,
        totalEngagements
      },
      recentPartners,
      partnerStats,
      performanceMetrics,
      upcomingPosts,
      recentActivity
    });
  });

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
