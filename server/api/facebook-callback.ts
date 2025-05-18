import { Router } from 'express';
import axios from 'axios';

const router = Router();

// Facebook App credentials - should be stored in environment variables in production
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const REDIRECT_URI = 'https://social-spark-mcawcutt.replit.app/api/facebook-auth/callback';

/**
 * Facebook OAuth callback handler
 * Exchanges the authorization code for an access token
 * Then fetches the list of pages the user manages
 */
router.get('/callback', async (req, res) => {
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
    
    // Display success page with the data (for development purposes only)
    res.send(`
      <html>
        <head>
          <title>Facebook OAuth Success</title>
          <style>
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              line-height: 1.5;
            }
            pre {
              background: #f5f5f5;
              padding: 15px;
              border-radius: 5px;
              overflow-x: auto;
            }
            .success-icon {
              color: #4CAF50;
              font-size: 48px;
              margin-bottom: 20px;
            }
            h1 {
              color: #333;
            }
            .container {
              text-align: center;
              margin-top: 50px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">✓</div>
            <h1>Facebook Authentication Successful</h1>
            <p>You have successfully authenticated with Facebook.</p>
            <p>Check the server console for the access token and page list.</p>
          </div>
          
          <h2>User Info:</h2>
          <pre>${JSON.stringify(userResponse.data, null, 2)}</pre>
          
          <h2>Pages:</h2>
          <pre>${JSON.stringify(pagesResponse.data, null, 2)}</pre>
          
          <div style="margin-top: 20px; padding: 15px; background-color: #e8f5e9; border-radius: 5px;">
            <h3 style="margin-top: 0;">Next Steps</h3>
            <p>
              You can now use the page access tokens to post to your Facebook Pages.
              These tokens are stored in the console logs for now.
            </p>
            <a href="/facebook-connect" style="display: inline-block; padding: 10px 15px; background-color: #1877F2; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">
              Return to Facebook Connect
            </a>
          </div>
        </body>
      </html>
    `);
    
  } catch (error) {
    console.error('[Facebook OAuth] Error in Facebook callback:', error);
    
    // Detailed error logging
    if (error.response) {
      console.error('[Facebook OAuth] Error response data:', error.response.data);
      console.error('[Facebook OAuth] Error response status:', error.response.status);
    }
    
    res.status(500).send(`
      <html>
        <head>
          <title>Facebook OAuth Error</title>
          <style>
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              line-height: 1.5;
            }
            pre {
              background: #f5f5f5;
              padding: 15px;
              border-radius: 5px;
              overflow-x: auto;
            }
            .error-icon {
              color: #f44336;
              font-size: 48px;
              margin-bottom: 20px;
            }
            h1 {
              color: #333;
            }
            .container {
              text-align: center;
              margin-top: 50px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error-icon">✗</div>
            <h1>Error Processing Facebook Authentication</h1>
            <p>There was an error processing your Facebook authentication.</p>
            <p>Please check the server logs for more details.</p>
          </div>
          
          <h2>Error:</h2>
          <pre>${error.message}</pre>
          
          <a href="/facebook-connect" style="display: block; text-align: center; margin-top: 20px; padding: 10px 15px; background-color: #f5f5f5; color: #333; text-decoration: none; border-radius: 5px; width: 200px; margin-left: auto; margin-right: auto;">
            Try Again
          </a>
        </body>
      </html>
    `);
  }
});

export default router;