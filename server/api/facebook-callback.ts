import { Router } from 'express';
import axios from 'axios';

const router = Router();

// Facebook App credentials - should be stored in environment variables in production
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const REDIRECT_URI = 'https://social-spark-mcawcutt.replit.app/api/facebook-callback';

/**
 * Facebook OAuth callback handler
 * Exchanges the authorization code for an access token
 * Then fetches the list of pages the user manages
 */
// Change the route to root '/' since we'll mount it properly in routes.ts
router.get('/', async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      console.error('No code provided in Facebook callback');
      return res.status(400).send('Authorization code missing');
    }
    
    console.log('[Facebook OAuth] Received code from Facebook:', code);
    
    // Exchange code for access token
    console.log('[Facebook OAuth] Exchanging code for access token...');
    const tokenUrl = `https://graph.facebook.com/v17.0/oauth/access_token?client_id=${FACEBOOK_APP_ID}&redirect_uri=${REDIRECT_URI}&client_secret=${FACEBOOK_APP_SECRET}&code=${code}`;
    console.log('[Facebook OAuth] Token URL:', tokenUrl);
    
    const tokenResponse = await axios.get(tokenUrl);
    
    if (!tokenResponse.data.access_token) {
      console.error('[Facebook OAuth] No access token in response:', tokenResponse.data);
      return res.status(500).send('Failed to get access token from Facebook');
    }
    
    const { access_token, expires_in } = tokenResponse.data;
    console.log('[Facebook OAuth] Received access token:', access_token);
    console.log('[Facebook OAuth] Token expires in:', expires_in, 'seconds');
    
    // Get user's pages
    console.log('[Facebook OAuth] Fetching user pages...');
    const pagesUrl = `https://graph.facebook.com/me/accounts?access_token=${access_token}`;
    console.log('[Facebook OAuth] Pages URL:', pagesUrl);
    
    const pagesResponse = await axios.get(pagesUrl);
    console.log('[Facebook OAuth] User pages:', JSON.stringify(pagesResponse.data, null, 2));
    
    // Get user info
    console.log('[Facebook OAuth] Getting user info...');
    const userResponse = await axios.get(`https://graph.facebook.com/me?access_token=${access_token}&fields=id,name,email`);
    console.log('[Facebook OAuth] User info:', userResponse.data);
    
    // Store relevant user and pages data in session for potential future use
    if (req.session) {
      req.session.facebookAuth = {
        profile: userResponse.data,
        accessToken: access_token,
        pages: pagesResponse.data.data
      };
    }
    
    // On success, redirect to the success page
    res.redirect('/facebook-success');
    
  } catch (error) {
    console.error('[Facebook OAuth] Error in Facebook callback:', error);
    
    // Detailed error logging
    if (error.response) {
      console.error('[Facebook OAuth] Error response data:', error.response.data);
      console.error('[Facebook OAuth] Error response status:', error.response.status);
    }
    
    // Pass the error message in the URL for detailed error page
    const errorMessage = encodeURIComponent(error.message || 'Facebook authentication failed');
    res.redirect(`/facebook-error-details?message=${errorMessage}`);
  }
});

export default router;