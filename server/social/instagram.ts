import FB from 'fb';
import { Express, Request, Response } from 'express';
import { storage } from '../storage';

// Initialize Instagram (uses same FB SDK)
export function initInstagram() {
  // Instagram uses the same FB SDK with the same credentials
  // This function is here for semantic clarity in the code
  FB.options({
    appId: process.env.FACEBOOK_APP_ID,
    appSecret: process.env.FACEBOOK_APP_SECRET,
    version: 'v18.0' // Using the latest stable version as of 2025
  });
}

// Setup Instagram API routes
export function setupInstagramRoutes(app: Express) {
  // API route to get connected Instagram accounts for a Facebook Page
  app.get('/api/social-accounts/instagram/accounts', async (req: Request, res: Response) => {
    try {
      const { pageId, accessToken } = req.query;
      
      if (!pageId || !accessToken) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }
      
      FB.setAccessToken(accessToken as string);
      
      // Get the Instagram account associated with this Facebook Page
      const result = await new Promise((resolve, reject) => {
        FB.api(
          `/${pageId}`,
          'GET',
          { fields: 'instagram_business_account' },
          (response) => {
            if (!response || response.error) {
              reject(response ? response.error : 'Unknown error');
              return;
            }
            resolve(response);
          }
        );
      });
      
      res.json(result);
    } catch (error) {
      console.error('Error getting Instagram accounts:', error);
      res.status(500).json({ error: 'Failed to get Instagram accounts' });
    }
  });
  
  // API route to associate Instagram account with a retail partner
  app.post('/api/social-accounts/instagram/connect', async (req: Request, res: Response) => {
    try {
      const { 
        partnerId, 
        facebookPageId, 
        instagramAccountId, 
        instagramAccountName,
        accessToken 
      } = req.body;
      
      if (!partnerId || !facebookPageId || !instagramAccountId || !accessToken) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }
      
      // Get the partner
      const partner = await storage.getRetailPartner(partnerId);
      if (!partner) {
        return res.status(404).json({ error: 'Retail partner not found' });
      }
      
      // Create a new social account record
      const socialAccount = await storage.createSocialAccount({
        partnerId,
        platform: 'instagram',
        accountId: instagramAccountId,
        accountName: instagramAccountName || 'Instagram Business Account',
        accessToken,
        refreshToken: null, // Instagram uses long-lived tokens from Facebook
        tokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
        status: 'active'
      });
      
      res.status(201).json(socialAccount);
    } catch (error) {
      console.error('Error connecting Instagram account:', error);
      res.status(500).json({ error: 'Failed to connect Instagram account' });
    }
  });
}

// Function to post to Instagram
export async function postToInstagram(instagramAccountId: string, accessToken: string, caption: string, imageUrl: string) {
  try {
    FB.setAccessToken(accessToken);
    
    // First, upload the image and get the container ID
    const container = await new Promise((resolve, reject) => {
      FB.api(
        `/${instagramAccountId}/media`,
        'POST',
        {
          image_url: imageUrl,
          caption
        },
        (response) => {
          if (!response || response.error) {
            reject(response ? response.error : 'Unknown error');
            return;
          }
          resolve(response);
        }
      );
    });
    
    // Use the container ID to publish the content
    const result = await new Promise((resolve, reject) => {
      FB.api(
        `/${instagramAccountId}/media_publish`,
        'POST',
        { creation_id: (container as any).id },
        (response) => {
          if (!response || response.error) {
            reject(response ? response.error : 'Unknown error');
            return;
          }
          resolve(response);
        }
      );
    });
    
    return result;
  } catch (error) {
    console.error('Error posting to Instagram:', error);
    throw error;
  }
}

// Function to get Instagram business account insights
export async function getInstagramInsights(instagramAccountId: string, accessToken: string, metric: string, period: string) {
  try {
    FB.setAccessToken(accessToken);
    
    const result = await new Promise((resolve, reject) => {
      FB.api(
        `/${instagramAccountId}/insights`,
        'GET',
        {
          metric,
          period
        },
        (response) => {
          if (!response || response.error) {
            reject(response ? response.error : 'Unknown error');
            return;
          }
          resolve(response);
        }
      );
    });
    
    return result;
  } catch (error) {
    console.error('Error getting Instagram insights:', error);
    throw error;
  }
}