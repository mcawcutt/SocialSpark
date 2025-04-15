import { Strategy as FacebookStrategy } from 'passport-facebook';
import passport from 'passport';
import FB from 'fb';
import { Express, Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

// Initialize FB SDK with app credentials
export function initFacebook() {
  FB.options({
    appId: process.env.FACEBOOK_APP_ID,
    appSecret: process.env.FACEBOOK_APP_SECRET,
    version: 'v18.0' // Using the latest stable version as of 2025
  });
}

// Setup Facebook authentication strategy
export function setupFacebookAuth(app: Express) {
  // Configure Facebook strategy for Passport
  passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID!,
    clientSecret: process.env.FACEBOOK_APP_SECRET!,
    callbackURL: "/auth/facebook/callback",
    profileFields: ['id', 'displayName', 'email', 'photos']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('Facebook auth successful:', profile.id);
      
      // Store tokens for later use
      const expiresAt = refreshToken ? new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) : null; // Default to 60 days if refresh token exists
      
      // Check if this social account is already connected to a partner
      let socialAccount = await storage.getSocialAccountByPlatformId('facebook', profile.id);
      
      if (socialAccount) {
        // Update the existing account with new tokens
        console.log('Updating existing Facebook account');
        await storage.updateSocialAccount(socialAccount.id, {
          accessToken,
          refreshToken: refreshToken || null,
          tokenExpiry: expiresAt,
          status: 'active'
        });
      } else {
        // This is a new connection - we'll need to associate it with a retail partner
        // In a real-world scenario, we'd have the retail partner ID already in the session
        // For now, let's store the tokens in the session to be associated with a partner later
        console.log('New Facebook account connection');
      }
      
      // Return the profile and tokens to be used in subsequent callbacks
      return done(null, {
        id: profile.id,
        name: profile.displayName,
        email: profile.emails ? profile.emails[0].value : null,
        accessToken,
        refreshToken,
        tokenExpiry: expiresAt
      });
    } catch (error) {
      console.error('Error in Facebook authentication:', error);
      return done(error as Error);
    }
  }));
  
  // Facebook authentication routes
  app.get('/auth/facebook', passport.authenticate('facebook', {
    scope: ['email', 'pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'instagram_basic', 'instagram_content_publish']
  }));
  
  app.get('/auth/facebook/callback', 
    passport.authenticate('facebook', { failureRedirect: '/auth' }),
    (req: Request, res: Response) => {
      // Successful authentication, redirect to social accounts page
      res.redirect('/retail-partners/social-accounts');
    }
  );
  
  // API route to associate Facebook account with a retail partner
  app.post('/api/social-accounts/facebook/connect', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { partnerId, facebookPageId, facebookPageName } = req.body;
      
      if (!partnerId || !facebookPageId || !facebookPageName) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }
      
      // Get the partner
      const partner = await storage.getRetailPartner(partnerId);
      if (!partner) {
        return res.status(404).json({ error: 'Retail partner not found' });
      }
      
      // Get user's Facebook access token from session or request it again if needed
      const fbUser = req.user as any;
      if (!fbUser || !fbUser.accessToken) {
        return res.status(401).json({ error: 'No Facebook access token available' });
      }
      
      // Create a new social account record
      const socialAccount = await storage.createSocialAccount({
        partnerId,
        platform: 'facebook',
        accountId: facebookPageId,
        accountName: facebookPageName,
        accessToken: fbUser.accessToken,
        refreshToken: fbUser.refreshToken || null,
        tokenExpiry: fbUser.tokenExpiry,
        status: 'active'
      });
      
      res.status(201).json(socialAccount);
    } catch (error) {
      console.error('Error connecting Facebook account:', error);
      res.status(500).json({ error: 'Failed to connect Facebook account' });
    }
  });
}

// Middleware to check if user is authenticated
function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated' });
}

// Function to post content to Facebook Page
export async function postToFacebookPage(pageId: string, accessToken: string, message: string, imageUrl?: string) {
  try {
    FB.setAccessToken(accessToken);
    
    let postData: any = { message };
    
    // If an image is included, post it with the message
    if (imageUrl) {
      postData.url = imageUrl;
      
      const result = await new Promise((resolve, reject) => {
        FB.api(`/${pageId}/photos`, 'POST', postData, (response) => {
          if (!response || response.error) {
            reject(response ? response.error : 'Unknown error');
            return;
          }
          resolve(response);
        });
      });
      
      return result;
    } else {
      // Text-only post
      const result = await new Promise((resolve, reject) => {
        FB.api(`/${pageId}/feed`, 'POST', postData, (response) => {
          if (!response || response.error) {
            reject(response ? response.error : 'Unknown error');
            return;
          }
          resolve(response);
        });
      });
      
      return result;
    }
  } catch (error) {
    console.error('Error posting to Facebook:', error);
    throw error;
  }
}

// Function to schedule content to a Facebook Page
export async function scheduleToFacebookPage(pageId: string, accessToken: string, message: string, scheduledPublishTime: number, imageUrl?: string) {
  try {
    FB.setAccessToken(accessToken);
    
    let postData: any = { 
      message,
      published: false,
      scheduled_publish_time: scheduledPublishTime
    };
    
    // If an image is included, use photos endpoint
    if (imageUrl) {
      postData.url = imageUrl;
      
      const result = await new Promise((resolve, reject) => {
        FB.api(`/${pageId}/photos`, 'POST', postData, (response) => {
          if (!response || response.error) {
            reject(response ? response.error : 'Unknown error');
            return;
          }
          resolve(response);
        });
      });
      
      return result;
    } else {
      // Text-only post
      const result = await new Promise((resolve, reject) => {
        FB.api(`/${pageId}/feed`, 'POST', postData, (response) => {
          if (!response || response.error) {
            reject(response ? response.error : 'Unknown error');
            return;
          }
          resolve(response);
        });
      });
      
      return result;
    }
  } catch (error) {
    console.error('Error scheduling post to Facebook:', error);
    throw error;
  }
}

// Function to get Facebook Page insights/analytics
export async function getFacebookPageInsights(pageId: string, accessToken: string, metrics: string[], since: number, until: number) {
  try {
    FB.setAccessToken(accessToken);
    
    const result = await new Promise((resolve, reject) => {
      FB.api(
        `/${pageId}/insights`,
        'GET',
        {
          metric: metrics.join(','),
          period: 'day',
          since,
          until
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
    console.error('Error getting Facebook Page insights:', error);
    throw error;
  }
}