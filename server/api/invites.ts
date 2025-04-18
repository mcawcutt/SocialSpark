import { Express, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { sendPartnerInvitation } from '../services/email';
import crypto from 'crypto';

// Schema for validating invite request
const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  message: z.string().optional(),
  role: z.enum(['partner']).default('partner')
});

// Track invitations to prevent duplicate emails
const pendingInvites = new Map<string, {
  token: string;
  brandId: number;
  email: string;
  name: string;
  role: string;
  expiresAt: Date;
}>();

export function setupInviteRoutes(app: Express) {
  // Generate a shareable invite link with a token
  const generateInviteLink = (token: string, baseUrl: string): string => {
    return `${baseUrl}/invite?token=${token}`;
  };

  // Endpoint to send an invitation to a retail partner
  app.post('/api/invites', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      // Validate request body
      const inviteData = inviteSchema.parse(req.body);
      
      // Get the brand name for the current user
      let brandName = req.user.name;
      if (req.user.role === 'admin') {
        brandName = 'Ignyt Admin';
      }
      
      // Generate a unique token for this invitation
      const token = crypto.randomBytes(32).toString('hex');
      
      // Set expiration to 7 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      // Store the invitation details
      pendingInvites.set(token, {
        token,
        brandId: req.user.id,
        email: inviteData.email,
        name: inviteData.name,
        role: inviteData.role,
        expiresAt
      });
      
      // Generate the base URL based on the request
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers.host;
      const baseUrl = `${protocol}://${host}`;
      
      // Generate the invite link
      const inviteLink = generateInviteLink(token, baseUrl);
      
      // Send the invitation email
      const success = await sendPartnerInvitation(
        inviteData.email,
        brandName,
        inviteLink
      );
      
      if (success) {
        return res.status(200).json({
          message: 'Invitation sent successfully',
          email: inviteData.email,
          expires: expiresAt,
          token
        });
      } else {
        return res.status(500).json({
          message: 'Failed to send invitation email'
        });
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Invalid invitation data',
          errors: error.errors
        });
      }
      
      return res.status(500).json({
        message: 'Failed to process invitation request'
      });
    }
  });
  
  // Endpoint to verify and accept an invitation
  app.get('/api/invites/verify', async (req: Request, res: Response) => {
    const { token } = req.query;
    
    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        message: 'Invalid invitation token'
      });
    }
    
    const invitation = pendingInvites.get(token);
    
    if (!invitation) {
      return res.status(404).json({
        message: 'Invitation not found'
      });
    }
    
    // Check if the invitation has expired
    if (invitation.expiresAt < new Date()) {
      pendingInvites.delete(token);
      return res.status(410).json({
        message: 'Invitation has expired'
      });
    }
    
    // Return invitation details to be used during registration
    return res.status(200).json({
      email: invitation.email,
      name: invitation.name,
      role: invitation.role,
      brandId: invitation.brandId,
      token
    });
  });
  
  // Endpoint to list all active invitations for the current brand
  app.get('/api/invites', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const brandId = req.user.id;
    
    // Filter invitations by the current brand ID and remove expired ones
    const now = new Date();
    const invites = Array.from(pendingInvites.values())
      .filter(invite => invite.brandId === brandId && invite.expiresAt > now)
      .map(invite => ({
        email: invite.email,
        name: invite.name,
        role: invite.role,
        expiresAt: invite.expiresAt,
        token: invite.token
      }));
    
    return res.status(200).json(invites);
  });
  
  // Endpoint to cancel an invitation
  app.delete('/api/invites/:token', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const { token } = req.params;
    const invitation = pendingInvites.get(token);
    
    if (!invitation) {
      return res.status(404).json({
        message: 'Invitation not found'
      });
    }
    
    // Check if the current user has permission to cancel this invitation
    if (invitation.brandId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'You do not have permission to cancel this invitation'
      });
    }
    
    // Remove the invitation
    pendingInvites.delete(token);
    
    return res.status(200).json({
      message: 'Invitation cancelled successfully'
    });
  });
}