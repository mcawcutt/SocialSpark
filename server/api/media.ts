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
      console.log(`Found ${media.length} media items for demo`);
      res.json(media);
    } catch (error) {
      console.error('Error fetching demo media:', error);
      res.status(500).send("Failed to fetch demo media");
    }
  });
  
  // Get all media items for the current brand
  app.get('/api/media', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }
    
    const brandId = req.user.id;
    const media = await storage.getMediaByBrandId(brandId);
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
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }
    
    try {
      // Validate the request body
      const brandId = req.user.id;
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
    if (!req.isAuthenticated()) {
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
    
    // Check if the media item belongs to the current brand
    if (mediaItem.brandId !== req.user.id) {
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
    if (!req.isAuthenticated()) {
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
    
    // Check if the media item belongs to the current brand
    if (mediaItem.brandId !== req.user.id) {
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