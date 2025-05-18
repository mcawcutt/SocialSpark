import { Express, Request, Response } from "express";
import axios from "axios";
import { stringify } from "querystring";

export function setupFacebookOAuthRoutes(app: Express) {
  // Set up the Facebook Login URL
  app.get("/auth/facebook", (req: Request, res: Response) => {
    const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
    const redirectUri = "https://social-spark-mcawcutt.replit.app/auth/callback";
    
    // Store redirect URI in session for validation during callback
    req.session.facebookRedirectUri = redirectUri;
    
    const scopes = [
      "pages_manage_posts",
      "pages_show_list", 
      "pages_read_engagement", 
      "pages_manage_metadata", 
      "instagram_basic"
    ];
    
    const facebookAuthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=${encodeURIComponent(scopes.join(","))}`;
    
    console.log(`[FacebookOAuth] Redirecting to Facebook for authentication with scopes: ${scopes.join(", ")}`);
    res.redirect(facebookAuthUrl);
  });

  // Facebook OAuth callback handler
  app.get("/auth/callback", async (req: Request, res: Response) => {
    try {
      const { code } = req.query;
      const redirectUri = req.session.facebookRedirectUri;
      
      if (!code) {
        console.error("[FacebookOAuth] No code provided in callback");
        return res.status(400).send("Authentication failed: No code provided");
      }
      
      if (!redirectUri) {
        console.error("[FacebookOAuth] No redirect URI stored in session");
        return res.status(400).send("Authentication failed: Invalid session state");
      }
      
      console.log(`[FacebookOAuth] Received code from Facebook, exchanging for token`);
      
      // Exchange the code for an access token
      const tokenResponse = await axios.get(`https://graph.facebook.com/v19.0/oauth/access_token`, {
        params: {
          client_id: process.env.FACEBOOK_APP_ID,
          client_secret: process.env.FACEBOOK_APP_SECRET,
          redirect_uri: redirectUri,
          code: code
        }
      });
      
      const { access_token } = tokenResponse.data;
      
      if (!access_token) {
        console.error("[FacebookOAuth] Failed to get access token", tokenResponse.data);
        return res.status(500).send("Failed to authenticate with Facebook");
      }
      
      console.log(`[FacebookOAuth] Successfully obtained access token`);
      
      // Get user information
      const userResponse = await axios.get(`https://graph.facebook.com/v19.0/me`, {
        params: {
          access_token,
          fields: "id,name,email"
        }
      });
      
      console.log(`[FacebookOAuth] User info:`, userResponse.data);
      
      // Get pages the user manages
      const pagesResponse = await axios.get(`https://graph.facebook.com/v19.0/me/accounts`, {
        params: {
          access_token,
          fields: "name,id,access_token,category"
        }
      });
      
      console.log(`[FacebookOAuth] User pages:`, JSON.stringify(pagesResponse.data, null, 2));
      
      // Store the access token and pages in session
      // In a real app, you'd store this in a database associated with the user
      req.session.facebookAuth = {
        accessToken: access_token,
        profile: userResponse.data,
        pages: pagesResponse.data.data
      };
      
      // Render a success page
      return res.send(`
        <html>
          <head>
            <title>Facebook Connection Successful</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                text-align: center;
                margin: 50px;
                background-color: #f0f2f5;
              }
              .container {
                background-color: white;
                border-radius: 8px;
                padding: 40px;
                max-width: 600px;
                margin: 0 auto;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              }
              h1 {
                color: #1877f2;
              }
              p {
                font-size: 18px;
                line-height: 1.5;
                margin-bottom: 30px;
              }
              .button {
                background-color: #e03eb6;
                color: white;
                border: none;
                padding: 12px 24px;
                font-size: 16px;
                border-radius: 4px;
                text-decoration: none;
                display: inline-block;
                cursor: pointer;
              }
              .pages {
                text-align: left;
                margin-top: 30px;
                border-top: 1px solid #ddd;
                padding-top: 20px;
              }
              .page {
                margin-bottom: 15px;
                padding: 10px;
                border-radius: 4px;
                background-color: #f7f7f7;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Facebook Connection Successful!</h1>
              <p>Your Facebook account has been successfully connected. You can now manage posts for your pages.</p>
              
              <div class="pages">
                <h2>Your Facebook Pages:</h2>
                ${pagesResponse.data.data.map((page: any) => `
                  <div class="page">
                    <strong>${page.name}</strong> (${page.category || 'Page'})
                  </div>
                `).join('')}
              </div>
              
              <p>You can close this window and return to the application.</p>
              
              <a href="/" class="button">Return to Dashboard</a>
            </div>
          </body>
        </html>
      `);
      
    } catch (error) {
      console.error("[FacebookOAuth] Error during OAuth callback:", error);
      
      if (axios.isAxiosError(error)) {
        console.error("[FacebookOAuth] API Error:", error.response?.data);
      }
      
      return res.status(500).send(`
        <html>
          <head>
            <title>Facebook Connection Failed</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                text-align: center;
                margin: 50px;
                background-color: #f0f2f5;
              }
              .container {
                background-color: white;
                border-radius: 8px;
                padding: 40px;
                max-width: 600px;
                margin: 0 auto;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              }
              h1 {
                color: #dc3545;
              }
              p {
                font-size: 18px;
                line-height: 1.5;
                margin-bottom: 30px;
              }
              .button {
                background-color: #e03eb6;
                color: white;
                border: none;
                padding: 12px 24px;
                font-size: 16px;
                border-radius: 4px;
                text-decoration: none;
                display: inline-block;
                cursor: pointer;
              }
              .error {
                color: #dc3545;
                font-size: 14px;
                font-family: monospace;
                text-align: left;
                background-color: #f8f9fa;
                padding: 15px;
                border-radius: 4px;
                margin-top: 20px;
                max-height: 150px;
                overflow-y: auto;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Facebook Connection Failed</h1>
              <p>There was an error connecting your Facebook account. Please try again later.</p>
              
              <a href="/" class="button">Return to Dashboard</a>
              
              <div class="error">
                ${error.message || 'Unknown error occurred'}
              </div>
            </div>
          </body>
        </html>
      `);
    }
  });

  // Simple Facebook login page with a connect button
  app.get("/facebook-connect", (req: Request, res: Response) => {
    res.send(`
      <html>
        <head>
          <title>Connect with Facebook</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              margin: 50px;
              background-color: #f0f2f5;
            }
            .container {
              background-color: white;
              border-radius: 8px;
              padding: 40px;
              max-width: 600px;
              margin: 0 auto;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 {
              color: #1877f2;
              margin-bottom: 30px;
            }
            p {
              font-size: 18px;
              line-height: 1.5;
              margin-bottom: 30px;
            }
            .facebook-button {
              background-color: #1877f2;
              color: white;
              border: none;
              padding: 12px 24px;
              font-size: 16px;
              border-radius: 4px;
              text-decoration: none;
              display: inline-block;
              cursor: pointer;
            }
            .permissions {
              text-align: left;
              margin-top: 30px;
              border-top: 1px solid #ddd;
              padding-top: 20px;
            }
            .permission {
              margin-bottom: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Connect with Facebook</h1>
            <p>Connect your Facebook account to manage posts for your pages.</p>
            
            <a href="/auth/facebook" class="facebook-button">Connect with Facebook</a>
            
            <div class="permissions">
              <h3>Permissions Required:</h3>
              <div class="permission">
                <strong>pages_manage_posts</strong> - Allows the app to post content to your Pages
              </div>
              <div class="permission">
                <strong>pages_show_list</strong> - Shows a list of Pages you manage
              </div>
              <div class="permission">
                <strong>pages_read_engagement</strong> - Allows the app to read engagement metrics
              </div>
              <div class="permission">
                <strong>pages_manage_metadata</strong> - Allows the app to manage Page settings
              </div>
              <div class="permission">
                <strong>instagram_basic</strong> - Allows the app to access connected Instagram accounts
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
  });
}