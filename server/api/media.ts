import { Request, Response } from "express";
import { Express } from "express";
import { storage } from "../storage";
import { insertMediaLibrarySchema } from "@shared/schema";
import { z } from "zod";

export function setupMediaRoutes(app: Express) {
  // Demo route for media library - does not require authentication
  app.get('/api/demo/media', async (req: Request, res: Response) => {
    console.log('Fetching demo media library items');
    try {
      // Use brand ID 1 for demo content
      const media = await storage.getMediaByBrandId(1);
      
      // Normalize file paths - ensure all URLs use /uploads/ for consistent access
      const normalizedMedia = media.map(item => {
        // Fix any path issues to ensure consistent access
        let fileUrl = item.fileUrl;
        
        // Ensure paths start with a slash
        if (fileUrl && !fileUrl.startsWith('/')) {
          fileUrl = '/' + fileUrl;
        }
        
        // For demo purposes, force all assets to use /uploads/ paths with demo files
        if (fileUrl && fileUrl.includes('/assets/')) {
          const parts = fileUrl.split('/');
          const filename = parts[parts.length - 1];
          
          // Map specific known assets to our demo files
          if (filename.includes('1744731251867') || filename.includes('cycling')) {
            fileUrl = '/uploads/demo-biking.png';
          } else if (filename.includes('1744731657291') || filename.includes('gear') || filename.includes('summer')) {
            fileUrl = '/uploads/demo-outdoor.png';
          } else {
            fileUrl = '/uploads/demo-logo.png';
          }
        }
        
        return { ...item, fileUrl };
      });
      
      console.log(`Found ${normalizedMedia.length} media items for demo (normalized URLs)`);
      res.json(normalizedMedia);
    } catch (error) {
      console.error('Error fetching demo media:', error);
      res.status(500).send("Failed to fetch demo media");
    }
  });
  
  // Get all media items for the current brand
  app.get('/api/media', async (req: Request, res: Response) => {
    // Allow demo access with query parameter
    const isDemoMode = req.query.demo === 'true';
    
    if (!isDemoMode && !req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }
    
    // Special case for brand users to ensure data isolation
    // Each brand should only see their own media items
    if (req.isAuthenticated() && req.user?.role === 'brand') {
      const media = await storage.getMediaByBrandId(req.user.id);
      console.log(`Found ${media.length} media items for brand user ${req.user.id}`);
      return res.json(media);
    }
    
    // Use demo brand ID for demo mode, or for unauthenticated users
    if (isDemoMode || !req.isAuthenticated()) {
      // Check if we want to specifically use Dulux brand by checking for a query param
      const useSpecificBrand = req.query.brand === 'dulux';
      
      if (useSpecificBrand) {
        // Get the Dulux brand (usually ID 3)
        console.log('Demo mode requested for Dulux brand media');
        const duluxBrand = await storage.getUserByUsername('dulux');
        
        if (duluxBrand) {
          console.log(`Found Dulux brand with ID: ${duluxBrand.id}`);
          const media = await storage.getMediaByBrandId(duluxBrand.id);
          console.log(`Found ${media.length} media items for Dulux brand in demo mode`);
          return res.json(media);
        } else {
          console.log('Could not find Dulux brand, falling back to default demo brand');
        }
      }
      
      // Default demo brand (usually ID 1)
      const media = await storage.getMediaByBrandId(1);
      console.log(`Found ${media.length} media items in demo mode`);
      return res.json(media);
    }
    
    // For other users (admin), you could show all or a specific subset
    const brandId = req.query.brandId ? parseInt(req.query.brandId as string, 10) : 1;
    const media = await storage.getMediaByBrandId(brandId);
    console.log(`Found ${media.length} media items for brandId ${brandId} in admin mode`);
    res.json(media);
  });
  
  // Get media items by tags
  app.get('/api/media/tags', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }
    
    const brandId = req.user.id;
    const tags = req.query.tags ? (req.query.tags as string).split(',') : [];
    const media = await storage.getMediaByTags(brandId, tags);
    res.json(media);
  });
  
  // Get a specific media item
  app.get('/api/media/:id', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }
    
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).send("Invalid ID format");
    }
    
    const mediaItem = await storage.getMediaItem(id);
    if (!mediaItem) {
      return res.status(404).send("Media item not found");
    }
    
    // Check if the media item belongs to the current brand
    if (mediaItem.brandId !== req.user.id) {
      return res.status(403).send("Unauthorized access");
    }
    
    res.json(mediaItem);
  });
  
  // Create a new media item
  app.post('/api/media', async (req: Request, res: Response) => {
    // Allow demo access with query parameter
    const isDemoMode = req.query.demo === 'true';
    
    if (!isDemoMode && !req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }
    
    try {
      // Validate the request body
      // Use demo brand ID for demo mode, otherwise use authenticated user's brand ID
      const brandId = isDemoMode ? 1 : (req.user?.id || 1);
      const mediaData = insertMediaLibrarySchema.parse({
        ...req.body,
        brandId
      });
      
      // Create the media item
      const createdMedia = await storage.createMediaItem(mediaData);
      res.status(201).json(createdMedia);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid media item data",
          errors: error.errors,
        });
      }
      
      console.error("Error creating media item:", error);
      res.status(500).send("Failed to create media item");
    }
  });
  
  // Update a media item
  app.patch('/api/media/:id', async (req: Request, res: Response) => {
    // Allow demo access with query parameter
    const isDemoMode = req.query.demo === 'true';
    
    if (!isDemoMode && !req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }
    
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).send("Invalid ID format");
    }
    
    // Check if the media item exists
    const mediaItem = await storage.getMediaItem(id);
    if (!mediaItem) {
      return res.status(404).send("Media item not found");
    }
    
    // In demo mode, allow updating any media with brandId=1
    // Otherwise check if media belongs to the current brand
    if (!isDemoMode && mediaItem.brandId !== req.user?.id) {
      return res.status(403).send("Unauthorized access");
    }
    
    try {
      // Update the media item
      const updatedMedia = await storage.updateMediaItem(id, req.body);
      res.json(updatedMedia);
    } catch (error) {
      console.error("Error updating media item:", error);
      res.status(500).send("Failed to update media item");
    }
  });
  
  // Delete a media item
  app.delete('/api/media/:id', async (req: Request, res: Response) => {
    // Allow demo access with query parameter
    const isDemoMode = req.query.demo === 'true';
    
    if (!isDemoMode && !req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }
    
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).send("Invalid ID format");
    }
    
    // Check if the media item exists
    const mediaItem = await storage.getMediaItem(id);
    if (!mediaItem) {
      return res.status(404).send("Media item not found");
    }
    
    // In demo mode, allow deletion of any media with brandId=1
    // Otherwise check if media belongs to the current brand
    if (!isDemoMode && mediaItem.brandId !== req.user?.id) {
      return res.status(403).send("Unauthorized access");
    }
    
    try {
      // Delete the media item
      await storage.deleteMediaItem(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting media item:", error);
      res.status(500).send("Failed to delete media item");
    }
  });
}