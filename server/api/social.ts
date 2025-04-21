import { Express, Request, Response } from "express";
import { createFacebookPost, getFacebookPages, getFacebookUserInfo } from "../facebook";
import { storage } from "../storage";
import { ContentPost, SocialAccount } from "@shared/schema";
import { requireAuth } from "../middleware";

export function setupSocialRoutes(app: Express) {
  // Get all social accounts for a specific retail partner
  app.get('/api/social-accounts/:partnerId', requireAuth, async (req: Request, res: Response) => {
    try {
      const partnerId = parseInt(req.params.partnerId);
      if (isNaN(partnerId)) {
        return res.status(400).json({ message: "Invalid partner ID" });
      }

      // Check if the user has access to this partner
      const partner = await storage.getRetailPartner(partnerId);
      if (!partner) {
        return res.status(404).json({ message: "Partner not found" });
      }

      // Verify access - users can only view partners belonging to their brand
      // Admin users can view any partner
      if (
        req.user.role !== 'admin' && 
        req.user.role === 'brand' && 
        partner.brandId !== req.user.brandId
      ) {
        return res.status(403).json({ message: "Access denied" });
      }

      const socialAccounts = await storage.getSocialAccountsByPartnerId(partnerId);
      res.json(socialAccounts);
    } catch (error) {
      console.error("Error fetching social accounts:", error);
      res.status(500).json({ message: "Error fetching social accounts", error: String(error) });
    }
  });

  // Post content to Facebook
  app.post('/api/social/facebook/post', requireAuth, async (req: Request, res: Response) => {
    try {
      const { postId, partnerId, customMessage } = req.body;

      if (!postId || !partnerId) {
        return res.status(400).json({ message: "Post ID and partner ID are required" });
      }

      // Get the content post
      const post = await storage.getContentPost(parseInt(postId));
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      // Check if the user has access to this post
      if (
        req.user.role !== 'admin' && 
        req.user.role === 'brand' && 
        post.brandId !== req.user.brandId
      ) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get the partner
      const partner = await storage.getRetailPartner(parseInt(partnerId));
      if (!partner) {
        return res.status(404).json({ message: "Partner not found" });
      }

      // Get Facebook social account for this partner
      const socialAccounts = await storage.getSocialAccountsByPartnerId(partner.id);
      const facebookAccount = socialAccounts.find(account => account.platform === 'facebook');

      if (!facebookAccount) {
        return res.status(404).json({ message: "Facebook account not found for this partner" });
      }

      if (!facebookAccount.accessToken) {
        return res.status(400).json({ message: "Facebook account has no access token" });
      }

      // Get the Facebook pages this account has access to
      const pages = await getFacebookPages(facebookAccount.accessToken);
      
      if (!pages || pages.length === 0) {
        return res.status(404).json({ message: "No Facebook pages found for this account" });
      }

      // Use the first page for now, in a real app you'd let the user choose
      const page = pages[0];

      // Create the message
      const message = customMessage || post.description;
      
      // If the post has an image, use it
      const result = await createFacebookPost(
        page.id,
        message,
        post.imageUrl,
        page.access_token
      );

      // Create a post assignment to track this
      const assignment = await storage.createPostAssignment({
        postId: post.id,
        partnerId: partner.id,
        metadata: {
          facebookPostId: result.id,
          pageId: page.id,
          pageName: page.name
        }
      });

      // Update the assignment with the published URL and status
      await storage.updatePostAssignment(assignment.id, {
        status: "published",
        publishedUrl: result.post_url,
        publishedDate: new Date()
      });

      res.status(201).json({
        message: "Post published to Facebook successfully",
        postId: result.id,
        postUrl: result.post_url,
        assignment
      });
    } catch (error) {
      console.error("Error posting to Facebook:", error);
      res.status(500).json({ message: "Error posting to Facebook", error: String(error) });
    }
  });

  // Get Facebook pages for an account
  app.get('/api/social/facebook/pages/:accountId', requireAuth, async (req: Request, res: Response) => {
    try {
      const accountId = parseInt(req.params.accountId);
      if (isNaN(accountId)) {
        return res.status(400).json({ message: "Invalid account ID" });
      }

      const socialAccount = await storage.getSocialAccount(accountId);
      if (!socialAccount) {
        return res.status(404).json({ message: "Social account not found" });
      }

      // Verify access
      const partner = await storage.getRetailPartner(socialAccount.partnerId);
      if (!partner) {
        return res.status(404).json({ message: "Partner not found" });
      }

      if (
        req.user.role !== 'admin' && 
        req.user.role === 'brand' && 
        partner.brandId !== req.user.brandId
      ) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (socialAccount.platform !== 'facebook') {
        return res.status(400).json({ message: "This account is not a Facebook account" });
      }

      if (!socialAccount.accessToken) {
        return res.status(400).json({ message: "This account has no access token" });
      }

      const pages = await getFacebookPages(socialAccount.accessToken);
      res.json(pages);
    } catch (error) {
      console.error("Error fetching Facebook pages:", error);
      res.status(500).json({ message: "Error fetching Facebook pages", error: String(error) });
    }
  });

  // Get Facebook user info
  app.get('/api/social/facebook/me', requireAuth, async (req: Request, res: Response) => {
    try {
      // If we have a Facebook access token in the session, use it
      if (req.session.facebookAuth?.accessToken) {
        const userInfo = await getFacebookUserInfo(req.session.facebookAuth.accessToken);
        return res.json(userInfo);
      }
      
      // Otherwise return an error
      res.status(404).json({ message: "No Facebook authentication found in session" });
    } catch (error) {
      console.error("Error fetching Facebook user info:", error);
      res.status(500).json({ message: "Error fetching Facebook user info", error: String(error) });
    }
  });
}