import { Router, Request, Response } from 'express';
import axios from 'axios';
import { db } from '../db';
import { retailPartners } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Get environment variables for Facebook integration
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;

// Create a router
const router = Router();

// Check if we have the required environment variables
if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
  console.warn('⚠️ Facebook App ID and/or App Secret are missing. Facebook integration will not work.');
}

/**
 * Generate a Facebook OAuth URL for a retail partner
 */
router.get('/oauth-url/:partnerId', async (req: Request, res: Response) => {
  try {
    const { partnerId } = req.params;

    // Convert partnerId to number
    const id = parseInt(partnerId, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid partner ID' });
    }

    // Check that the partner exists
    const partner = await db.select().from(retailPartners).where(eq(retailPartners.id, id)).limit(1);
    if (!partner || partner.length === 0) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    // Get the current host
    const protocol = req.get('x-forwarded-proto') || req.protocol;
    const host = req.get('host');

    // Create a redirect URL
    const redirectUri = `${protocol}://${host}/api/facebook-auth/callback`;
    
    // Store this in the session for later verification
    req.session.facebookRedirectUri = redirectUri;
    req.session.facebookPartnerId = id;

    // Define required permissions
    const permissions = [
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts',
      'instagram_basic',
      'pages_manage_metadata'
    ];

    // Create the OAuth URL
    const oauthUrl = new URL('https://www.facebook.com/v17.0/dialog/oauth');
    oauthUrl.searchParams.append('client_id', FACEBOOK_APP_ID);
    oauthUrl.searchParams.append('redirect_uri', redirectUri);
    oauthUrl.searchParams.append('state', partnerId); // Using partner ID as state for verification
    oauthUrl.searchParams.append('scope', permissions.join(','));
    
    // Return the OAuth URL
    res.json({ url: oauthUrl.toString() });
  } catch (error) {
    console.error('Error generating Facebook OAuth URL:', error);
    res.status(500).json({ error: 'Failed to generate OAuth URL' });
  }
});

/**
 * Handle the callback from Facebook OAuth
 */
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;
    
    // Validate the state (should match a partner ID)
    if (!state || !code) {
      return res.redirect('/error?message=Missing required OAuth parameters');
    }
    
    // Check the session for redirect URI
    const redirectUri = req.session.facebookRedirectUri;
    const partnerId = req.session.facebookPartnerId;
    
    if (!redirectUri || !partnerId) {
      return res.redirect('/error?message=Invalid OAuth session');
    }
    
    // Verify state matches the partner ID from session
    if (state !== partnerId.toString()) {
      return res.redirect('/error?message=State parameter mismatch');
    }
    
    // Exchange the code for an access token
    const tokenResponse = await axios.get('https://graph.facebook.com/v17.0/oauth/access_token', {
      params: {
        client_id: FACEBOOK_APP_ID,
        client_secret: FACEBOOK_APP_SECRET,
        redirect_uri: redirectUri,
        code
      }
    });
    
    const { access_token, expires_in } = tokenResponse.data;
    
    // Get a long-lived token (valid for 60 days)
    const longLivedTokenResponse = await axios.get('https://graph.facebook.com/v17.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: FACEBOOK_APP_ID,
        client_secret: FACEBOOK_APP_SECRET,
        fb_exchange_token: access_token
      }
    });
    
    const longLivedToken = longLivedTokenResponse.data.access_token;
    
    // Fetch user data to get the user ID
    const userResponse = await axios.get('https://graph.facebook.com/v17.0/me', {
      params: {
        access_token: longLivedToken
      }
    });
    
    const { id: facebookUserId, name: facebookUserName } = userResponse.data;
    
    // Fetch the user's Facebook Pages
    const pagesResponse = await axios.get(`https://graph.facebook.com/v17.0/${facebookUserId}/accounts`, {
      params: {
        access_token: longLivedToken
      }
    });
    
    const pages = pagesResponse.data.data || [];
    
    // For demo purposes, just create a session with this data
    // In a real app, you would save this to your database
    req.session.facebookAuth = {
      partnerId,
      userId: facebookUserId,
      userName: facebookUserName,
      accessToken: longLivedToken,
      pages: pages.map((page: any) => ({
        id: page.id,
        name: page.name,
        accessToken: page.access_token,
        category: page.category
      }))
    };
    
    // Redirect to the success page with the partner ID
    res.redirect(`/partner-connect-success?pid=${partnerId}`);
  } catch (error) {
    console.error('Error handling Facebook OAuth callback:', error);
    res.redirect('/error?message=Failed to complete Facebook authentication');
  }
});

/**
 * Get the Facebook Pages for the authenticated partner
 */
router.get('/pages', (req: Request, res: Response) => {
  const facebookAuth = req.session.facebookAuth;
  
  if (!facebookAuth) {
    return res.status(401).json({ error: 'No Facebook authentication found' });
  }
  
  res.json(facebookAuth.pages || []);
});

/**
 * Get the Instagram accounts linked to the partner's Facebook Pages
 */
router.get('/instagram-accounts', async (req: Request, res: Response) => {
  try {
    const facebookAuth = req.session.facebookAuth;
    
    if (!facebookAuth) {
      return res.status(401).json({ error: 'No Facebook authentication found' });
    }
    
    const instagramAccounts = [];
    
    // For each Facebook Page, fetch linked Instagram accounts
    for (const page of facebookAuth.pages) {
      try {
        const response = await axios.get(`https://graph.facebook.com/v17.0/${page.id}`, {
          params: {
            fields: 'instagram_business_account',
            access_token: page.accessToken
          }
        });
        
        if (response.data.instagram_business_account) {
          // Fetch Instagram account details
          const igResponse = await axios.get(`https://graph.facebook.com/v17.0/${response.data.instagram_business_account.id}`, {
            params: {
              fields: 'id,username,profile_picture_url',
              access_token: page.accessToken
            }
          });
          
          instagramAccounts.push({
            id: igResponse.data.id,
            username: igResponse.data.username,
            profilePicture: igResponse.data.profile_picture_url,
            linkedPageId: page.id,
            linkedPageName: page.name,
            accessToken: page.accessToken
          });
        }
      } catch (pageError) {
        console.error(`Error fetching Instagram account for page ${page.id}:`, pageError);
      }
    }
    
    res.json(instagramAccounts);
  } catch (error) {
    console.error('Error fetching Instagram accounts:', error);
    res.status(500).json({ error: 'Failed to fetch Instagram accounts' });
  }
});

// For testing: Clear Facebook auth session
router.post('/logout', (req: Request, res: Response) => {
  delete req.session.facebookAuth;
  res.json({ success: true });
});

export default router;