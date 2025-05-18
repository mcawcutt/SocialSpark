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
      console.error('No code provided in callback');
      return res.status(400).send('Authorization code missing');
    }
    
    console.log('Received code from Facebook:', code);
    
    // Exchange code for access token
    const tokenResponse = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        client_id: FACEBOOK_APP_ID,
        client_secret: FACEBOOK_APP_SECRET,
        redirect_uri: REDIRECT_URI,
        code: code
      }
    });
    
    const { access_token, expires_in } = tokenResponse.data;
    console.log('Received access token:', access_token);
    console.log('Token expires in:', expires_in, 'seconds');
    
    // Exchange short-lived token for long-lived token
    const longLivedTokenResponse = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: FACEBOOK_APP_ID,
        client_secret: FACEBOOK_APP_SECRET,
        fb_exchange_token: access_token
      }
    });
    
    const longLivedToken = longLivedTokenResponse.data.access_token;
    const longTokenExpiry = longLivedTokenResponse.data.expires_in;
    
    console.log('Exchanged for long-lived token:', longLivedToken);
    console.log('Long-lived token expires in:', longTokenExpiry, 'seconds');
    
    // Get user info
    const userResponse = await axios.get('https://graph.facebook.com/v18.0/me', {
      params: {
        access_token: longLivedToken,
        fields: 'id,name,email'
      }
    });
    
    console.log('User info:', userResponse.data);
    
    // Get user's pages
    const pagesResponse = await axios.get('https://graph.facebook.com/v18.0/me/accounts', {
      params: {
        access_token: longLivedToken
      }
    });
    
    console.log('User pages:', JSON.stringify(pagesResponse.data, null, 2));
    
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
        </body>
      </html>
    `);
    
  } catch (error) {
    console.error('Error in Facebook callback:', error);
    
    // Detailed error logging
    if (error.response) {
      console.error('Error response data:', error.response.data);
      console.error('Error response status:', error.response.status);
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
        </body>
      </html>
    `);
  }
});

export default router;