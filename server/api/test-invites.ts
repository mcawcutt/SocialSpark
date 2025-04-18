import { Express, Request, Response } from 'express';

// Simple endpoint to generate a test invitation link
export function setupTestInviteRoutes(app: Express) {
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
}