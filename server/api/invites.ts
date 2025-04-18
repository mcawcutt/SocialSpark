import { Express, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '../storage';
import { z } from 'zod';
import { requireAuth, requireBrandOrAdmin } from '../middleware/auth';
import { sendInviteEmail } from '../services/email';

// Add 7 days to current date for invitation expiry
const getExpiryDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date;
};

// Validation schema for invite creation
const inviteSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  message: z.string().optional(),
});

// Interface for invites
interface Invite {
  token: string;
  email: string;
  name: string;
  brandId: number;
  expiresAt: Date;
}

// In-memory store for invites (replace with database storage later)
// Make it globally accessible for test routes
global.invites = global.invites || new Map<string, Invite>();
const invites = global.invites;

export function setupInviteRoutes(app: Express) {
  // Accept an invitation
  app.post('/api/invites/accept', async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'You must be logged in to accept an invitation' });
      }
      
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: 'Invitation token is required' });
      }
      
      const invite = invites.get(token);
      
      if (!invite) {
        return res.status(404).json({ message: 'Invitation not found' });
      }
      
      // Check if invitation has expired
      if (new Date() > invite.expiresAt) {
        return res.status(410).json({ message: 'Invitation has expired' });
      }
      
      // Create or update the relationship between brand and partner
      // For in-memory storage, we'll just verify that the connection is valid
      // and remove the invitation
      
      // In a production system, you would create a relationship in the database
      // between the brand and the retail partner
      
      // Remove the invitation after it's been accepted
      invites.delete(token);
      
      res.status(200).json({ 
        success: true,
        message: 'Invitation accepted successfully',
        brandId: invite.brandId
      });
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      res.status(500).json({ 
        message: 'Failed to accept invitation', 
        error: error.message 
      });
    }
  });
  // Create a new invitation
  app.post('/api/invites', requireBrandOrAdmin, async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validatedData = inviteSchema.parse(req.body);
      
      // Generate a unique token
      const token = uuidv4();
      
      // Create invite object
      const invite: Invite = {
        token,
        email: validatedData.email,
        name: validatedData.name,
        brandId: req.user?.brandId || 0,
        expiresAt: getExpiryDate(),
      };
      
      // Store the invitation
      invites.set(token, invite);
      
      // Send invitation email
      try {
        await sendInviteEmail({
          email: validatedData.email,
          name: validatedData.name,
          token,
          brandName: req.user?.name || 'Ignyt Brand',
          customMessage: validatedData.message,
        });
        
        res.status(201).json({ success: true, token });
      } catch (emailError: any) {
        console.error('Failed to send invitation email:', emailError);
        res.status(500).json({
          message: 'Invitation created but failed to send email',
          token,
          error: emailError.message
        });
      }
    } catch (error: any) {
      console.error('Error creating invitation:', error);
      res.status(400).json({ message: 'Invalid invitation data', error: error.message });
    }
  });
  
  // Verify an invitation token
  app.get('/api/invites/verify', async (req: Request, res: Response) => {
    const { token } = req.query;
    
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ valid: false, message: 'Invalid token' });
    }
    
    const invite = invites.get(token);
    
    if (!invite) {
      return res.status(404).json({ valid: false, message: 'Invitation not found' });
    }
    
    // Check if invitation has expired
    if (new Date() > invite.expiresAt) {
      return res.status(410).json({ valid: false, message: 'Invitation has expired' });
    }
    
    res.status(200).json({
      valid: true,
      invitation: {
        brandId: invite.brandId,
        email: invite.email,
        name: invite.name,
      }
    });
  });
  
  // Get all pending invitations for the current brand
  app.get('/api/invites', requireBrandOrAdmin, async (req: Request, res: Response) => {
    try {
      const brandId = req.user?.brandId;
      
      if (!brandId) {
        return res.status(400).json({ message: 'Brand ID is required' });
      }
      
      // Filter invitations by brandId
      const brandInvites = Array.from(invites.values())
        .filter(invite => invite.brandId === brandId)
        .map(invite => ({
          token: invite.token,
          email: invite.email,
          name: invite.name,
          expiresAt: invite.expiresAt.toISOString()
        }));
      
      res.status(200).json(brandInvites);
    } catch (error: any) {
      console.error('Error fetching invitations:', error);
      res.status(500).json({ message: 'Failed to fetch invitations', error: error.message });
    }
  });
  
  // Cancel an invitation
  app.delete('/api/invites/:token', requireBrandOrAdmin, async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const brandId = req.user?.brandId;
      
      if (!brandId) {
        return res.status(400).json({ message: 'Brand ID is required' });
      }
      
      const invite = invites.get(token);
      
      if (!invite) {
        return res.status(404).json({ message: 'Invitation not found' });
      }
      
      // Ensure the invite belongs to the current brand
      if (invite.brandId !== brandId) {
        return res.status(403).json({ message: 'You do not have permission to cancel this invitation' });
      }
      
      // Remove the invitation
      invites.delete(token);
      
      res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('Error cancelling invitation:', error);
      res.status(500).json({ message: 'Failed to cancel invitation', error: error.message });
    }
  });
}