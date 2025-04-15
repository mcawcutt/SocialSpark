import { Express } from 'express';
import { 
  initFacebook, 
  setupFacebookAuth, 
  postToFacebookPage, 
  scheduleToFacebookPage,
  getFacebookPageInsights
} from './facebook';
import {
  initInstagram,
  setupInstagramRoutes,
  postToInstagram,
  getInstagramInsights
} from './instagram';
import { storage } from '../storage';

// Initialize all social media services
export function initSocialMedia() {
  initFacebook();
  initInstagram();
}

// Setup all social media routes and auth strategies
export function setupSocialMediaRoutes(app: Express) {
  setupFacebookAuth(app);
  setupInstagramRoutes(app);
  
  // General API routes for social media
  setupGeneralSocialRoutes(app);
}

// Setup general social media routes
function setupGeneralSocialRoutes(app: Express) {
  // Get all social accounts for a partner
  app.get('/api/social-accounts/:partnerId', async (req, res) => {
    try {
      const partnerId = parseInt(req.params.partnerId);
      if (isNaN(partnerId)) {
        return res.status(400).json({ error: 'Invalid partner ID' });
      }
      
      const accounts = await storage.getSocialAccountsByPartnerId(partnerId);
      res.json(accounts);
    } catch (error) {
      console.error('Error fetching social accounts:', error);
      res.status(500).json({ error: 'Failed to fetch social accounts' });
    }
  });
  
  // Update a social account status
  app.patch('/api/social-accounts/:accountId', async (req, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      if (isNaN(accountId)) {
        return res.status(400).json({ error: 'Invalid account ID' });
      }
      
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }
      
      const account = await storage.updateSocialAccount(accountId, { status });
      res.json(account);
    } catch (error) {
      console.error('Error updating social account:', error);
      res.status(500).json({ error: 'Failed to update social account' });
    }
  });
  
  // Delete a social account
  app.delete('/api/social-accounts/:accountId', async (req, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      if (isNaN(accountId)) {
        return res.status(400).json({ error: 'Invalid account ID' });
      }
      
      await storage.deleteSocialAccount(accountId);
      res.status(204).end();
    } catch (error) {
      console.error('Error deleting social account:', error);
      res.status(500).json({ error: 'Failed to delete social account' });
    }
  });
  
  // Publish content to a social account
  app.post('/api/social-accounts/:accountId/publish', async (req, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      if (isNaN(accountId)) {
        return res.status(400).json({ error: 'Invalid account ID' });
      }
      
      const { message, imageUrl, scheduledTime } = req.body;
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }
      
      // Get the social account
      const account = await storage.getSocialAccount(accountId);
      if (!account) {
        return res.status(404).json({ error: 'Social account not found' });
      }
      
      // Different logic based on platform
      let result;
      if (account.platform === 'facebook') {
        if (scheduledTime) {
          // Schedule the post
          result = await scheduleToFacebookPage(
            account.accountId, 
            account.accessToken, 
            message, 
            Math.floor(new Date(scheduledTime).getTime() / 1000),
            imageUrl
          );
        } else {
          // Post immediately
          result = await postToFacebookPage(
            account.accountId, 
            account.accessToken, 
            message, 
            imageUrl
          );
        }
      } else if (account.platform === 'instagram') {
        if (!imageUrl) {
          return res.status(400).json({ error: 'Image URL is required for Instagram posts' });
        }
        
        // Instagram doesn't support scheduling through the API directly
        // For scheduled posts, we'd need to implement a job queue
        result = await postToInstagram(
          account.accountId,
          account.accessToken,
          message,
          imageUrl
        );
      } else {
        return res.status(400).json({ error: 'Unsupported platform' });
      }
      
      res.json(result);
    } catch (error) {
      console.error('Error publishing content:', error);
      res.status(500).json({ error: 'Failed to publish content' });
    }
  });
  
  // Get analytics for a social account
  app.get('/api/social-accounts/:accountId/analytics', async (req, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      if (isNaN(accountId)) {
        return res.status(400).json({ error: 'Invalid account ID' });
      }
      
      const { 
        metrics = 'page_impressions,page_engaged_users', 
        period = 'day',
        since = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60, // 30 days ago
        until = Math.floor(Date.now() / 1000) // now
      } = req.query;
      
      // Get the social account
      const account = await storage.getSocialAccount(accountId);
      if (!account) {
        return res.status(404).json({ error: 'Social account not found' });
      }
      
      // Different logic based on platform
      let result;
      if (account.platform === 'facebook') {
        result = await getFacebookPageInsights(
          account.accountId,
          account.accessToken,
          (metrics as string).split(','),
          parseInt(since as string),
          parseInt(until as string)
        );
      } else if (account.platform === 'instagram') {
        result = await getInstagramInsights(
          account.accountId,
          account.accessToken,
          metrics as string,
          period as string
        );
      } else {
        return res.status(400).json({ error: 'Unsupported platform' });
      }
      
      res.json(result);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  });
}