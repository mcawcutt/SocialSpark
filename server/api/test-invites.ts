import { Express, Request, Response } from 'express';

// Simple endpoint to generate a test invitation link
import { v4 as uuidv4 } from 'uuid';

// Interface for invites (imported from invites.ts)
interface Invite {
  token: string;
  email: string;
  name: string;
  brandId: number;
  expiresAt: Date;
}

// Access the in-memory store from invites.ts
// For production, this would be a database operation
declare global {
  var invites: Map<string, Invite>;
}

// Create a ref to the global variable
let invitesStore: Map<string, Invite>;

// Add 7 days to current date for invitation expiry
const getExpiryDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date;
};

export function setupTestInviteRoutes(app: Express) {
  // Public test endpoint that doesn't require authentication
  app.get('/api/test-invites/generate', async (req: Request, res: Response) => {
    try {
      // Generate a test token
      const token = "test-invitation-" + Date.now().toString();
      
      // Create the invite URL
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://app.ignyt.com' 
        : 'http://localhost:5000';
      
      const inviteUrl = `${baseUrl}/accept-invite?token=${encodeURIComponent(token)}`;
      
      res.json({
        success: true,
        token,
        inviteUrl,
        message: "This is a test invitation link that can be used for development purposes."
      });
    } catch (error: any) {
      console.error('Error generating test invitation:', error);
      res.status(500).json({
        success: false,
        message: "Failed to generate test invitation",
        error: error.message
      });
    }
  });
  
  // Test endpoint to create a real invitation without authentication
  app.post('/api/test-invites/create', async (req: Request, res: Response) => {
    try {
      // Access the invites map from the server
      if (!global.invites) {
        // Create a new map if it doesn't exist yet
        global.invites = new Map<string, Invite>();
      }
      invitesStore = global.invites;
      
      const { name, email, brandId = 1 } = req.body;
      
      if (!name || !email) {
        return res.status(400).json({ 
          message: 'Name and email are required fields',
          example: {
            name: "Partner Name",
            email: "partner@example.com"
          }
        });
      }
      
      // Generate a unique token
      const token = uuidv4();
      
      // Create invite object
      const invite: Invite = {
        token,
        email,
        name,
        brandId,
        expiresAt: getExpiryDate(),
      };
      
      // Store the invitation
      invitesStore.set(token, invite);
      
      // Create the invite URL
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://app.ignyt.com' 
        : 'http://localhost:5000';
      
      const inviteUrl = `${baseUrl}/accept-invite?token=${encodeURIComponent(token)}`;
      
      res.status(201).json({ 
        success: true, 
        token,
        inviteUrl,
        message: "Test invitation created successfully. Use this URL to test the invitation flow."
      });
    } catch (error: any) {
      console.error('Error creating test invitation:', error);
      res.status(500).json({ 
        message: 'Failed to create test invitation', 
        error: error.message 
      });
    }
  });
}