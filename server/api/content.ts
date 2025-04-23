import { Express, Request, Response } from 'express';
import { storage } from '../storage';
import { ContentPost, InsertContentPost, InsertPostAssignment } from '@shared/schema';
import { z } from 'zod';

// Set up content-related API routes
export function setupContentRoutes(app: Express) {
  // Get all content posts
  app.get('/api/content-posts', async (req: Request, res: Response) => {
    try {
      const { brandId } = req.query;
      
      if (!brandId) {
        return res.status(400).json({ error: 'Brand ID is required' });
      }
      
      const brandIdNum = parseInt(brandId as string);
      if (isNaN(brandIdNum)) {
        return res.status(400).json({ error: 'Invalid brand ID' });
      }
      
      const posts = await storage.getContentPostsByBrandId(brandIdNum);
      res.json(posts);
    } catch (error) {
      console.error('Error fetching content posts:', error);
      res.status(500).json({ error: 'Failed to fetch content posts' });
    }
  });
  
  // Get evergreen content posts
  app.get('/api/content-posts/evergreen', async (req: Request, res: Response) => {
    try {
      const { brandId, demo } = req.query;
      
      // Check if this is a demo request
      const isDemoRequest = demo === 'true';
      
      if (!brandId && !isDemoRequest) {
        return res.status(400).json({ error: 'Brand ID is required for non-demo requests' });
      }
      
      let brandIdNum: number | undefined;
      
      if (brandId) {
        brandIdNum = parseInt(brandId as string);
        if (isNaN(brandIdNum)) {
          return res.status(400).json({ error: 'Invalid brand ID' });
        }
      }
      
      // If demo mode is requested, try to find the Dulux brand
      if (isDemoRequest && !brandIdNum) {
        console.log('[API] Demo mode requested for evergreen posts, searching for Dulux brand');
        const duluxBrand = await storage.getUserByUsername('dulux');
        
        if (duluxBrand) {
          console.log(`[API] Found Dulux brand with ID: ${duluxBrand.id}`);
          brandIdNum = duluxBrand.id;
        } else {
          // Fallback to demo user if Dulux not found
          console.log('[API] Dulux brand not found, falling back to demo user');
          const demoUser = await storage.getUserByUsername('demo');
          
          if (demoUser) {
            console.log(`[API] Found demo user with ID: ${demoUser.id}`);
            brandIdNum = demoUser.id;
          } else {
            return res.status(404).json({ error: 'No demo brands found' });
          }
        }
      }
      
      if (!brandIdNum) {
        return res.status(400).json({ error: 'Could not determine brand ID' });
      }
      
      console.log(`[API] Fetching evergreen posts for brandId: ${brandIdNum}`);
      const allPosts = await storage.getContentPostsByBrandId(brandIdNum);
      const evergreenPosts = allPosts.filter(post => post.isEvergreen);
      
      console.log(`[API] Found ${evergreenPosts.length} evergreen posts for brandId: ${brandIdNum}`);
      
      res.json(evergreenPosts);
    } catch (error) {
      console.error('Error fetching evergreen content:', error);
      res.status(500).json({ error: 'Failed to fetch evergreen content' });
    }
  });
  
  // Get a specific content post
  app.get('/api/content-posts/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID' });
      }
      
      const post = await storage.getContentPost(id);
      if (!post) {
        return res.status(404).json({ error: 'Content post not found' });
      }
      
      res.json(post);
    } catch (error) {
      console.error('Error fetching content post:', error);
      res.status(500).json({ error: 'Failed to fetch content post' });
    }
  });
  
  // Create a new content post
  app.post('/api/content-posts', async (req: Request, res: Response) => {
    try {
      const contentData = req.body;
      
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Extract metadata if it exists
      const { metadata, ...contentPostData } = contentData;
      
      // Get user ID for creator
      const creatorId = req.user!.id;
      const brandId = contentData.brandId || req.user!.brandId || req.user!.id;
      
      console.log(`[ContentAPI] Creating post for user ${req.user!.username} (${creatorId}), brandId=${brandId}`);
      
      // Validate basic content post data
      const result = z.object({
        brandId: z.number(),
        title: z.string(),
        description: z.string(),
        platforms: z.array(z.string()),
      }).safeParse({ ...contentPostData, brandId });
      
      if (!result.success) {
        console.error('[ContentAPI] Validation error:', result.error);
        return res.status(400).json({ error: 'Invalid content post data', details: result.error });
      }
      
      // Ensure proper date formatting for scheduledDate if it exists
      let postData = {
        ...contentPostData,
        brandId,
        creatorId
      };

      // Convert scheduledDate string to Date object if it exists
      if (postData.scheduledDate && typeof postData.scheduledDate === 'string') {
        postData.scheduledDate = new Date(postData.scheduledDate);
        console.log(`[ContentAPI] Converted scheduledDate string to Date: ${postData.scheduledDate}`);
      }
      
      // Create the content post with creator ID
      const post = await storage.createContentPost(postData as InsertContentPost);
      
      console.log(`[ContentAPI] Created post ${post.id} for brand ${brandId}`);
      
      // If we have metadata, add it to the post
      if (metadata) {
        await storage.updateContentPostMetadata(post.id, metadata);
        
        // Fetch the updated post with metadata
        const updatedPost = await storage.getContentPost(post.id);
        return res.status(201).json(updatedPost);
      }
      
      res.status(201).json(post);
    } catch (error) {
      console.error('Error creating content post:', error);
      res.status(500).json({ error: 'Failed to create content post' });
    }
  });
  
  // Update a content post
  app.patch('/api/content-posts/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID' });
      }
      
      const post = await storage.getContentPost(id);
      if (!post) {
        return res.status(404).json({ error: 'Content post not found' });
      }
      
      const { metadata, ...updateData } = req.body;
      
      // Ensure proper date formatting for scheduledDate if it exists
      if (updateData.scheduledDate && typeof updateData.scheduledDate === 'string') {
        updateData.scheduledDate = new Date(updateData.scheduledDate);
        console.log(`[ContentAPI] Converted update scheduledDate string to Date: ${updateData.scheduledDate}`);
      }
      
      // Update the content post
      const updatedPost = await storage.updateContentPost(id, updateData);
      
      // If we have metadata, update it
      if (metadata) {
        await storage.updateContentPostMetadata(id, metadata);
        
        // Fetch the updated post with metadata
        const finalPost = await storage.getContentPost(id);
        return res.json(finalPost);
      }
      
      res.json(updatedPost);
    } catch (error) {
      console.error('Error updating content post:', error);
      res.status(500).json({ error: 'Failed to update content post' });
    }
  });
  
  // Delete a content post
  app.delete('/api/content-posts/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID' });
      }
      
      const post = await storage.getContentPost(id);
      if (!post) {
        return res.status(404).json({ error: 'Content post not found' });
      }
      
      await storage.deleteContentPost(id);
      
      res.status(204).end();
    } catch (error) {
      console.error('Error deleting content post:', error);
      res.status(500).json({ error: 'Failed to delete content post' });
    }
  });
  
  // Schedule a content post
  app.post('/api/content-posts/:id/schedule', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID' });
      }
      
      const post = await storage.getContentPost(id);
      if (!post) {
        return res.status(404).json({ error: 'Content post not found' });
      }
      
      const { scheduledDate, partnerIds } = req.body;
      
      if (!scheduledDate) {
        return res.status(400).json({ error: 'Scheduled date is required' });
      }
      
      if (!partnerIds || !Array.isArray(partnerIds) || partnerIds.length === 0) {
        return res.status(400).json({ error: 'At least one partner ID is required' });
      }
      
      // Update post status to scheduled
      const updatedPost = await storage.updateContentPost(id, {
        status: 'scheduled',
        scheduledDate: new Date(scheduledDate)
      });
      
      // Create post assignments for each partner
      const assignments = [];
      for (const partnerId of partnerIds) {
        const assignment = await storage.createPostAssignment({
          postId: id,
          partnerId: partnerId,
          customFooter: req.body.customFooter,
          customTags: req.body.customTags
        });
        assignments.push(assignment);
      }
      
      res.json({
        post: updatedPost,
        assignments
      });
    } catch (error) {
      console.error('Error scheduling content post:', error);
      res.status(500).json({ error: 'Failed to schedule content post' });
    }
  });
  
  // Schedule an evergreen post for a specific date
  app.post('/api/content-posts/evergreen-schedule', async (req: Request, res: Response) => {
    try {
      const { brandId, scheduledDate, platforms, partnerIds } = req.body;
      
      if (!brandId || !scheduledDate || !platforms || !partnerIds) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }
      
      if (!Array.isArray(platforms) || platforms.length === 0) {
        return res.status(400).json({ error: 'At least one platform is required' });
      }
      
      if (!Array.isArray(partnerIds) || partnerIds.length === 0) {
        return res.status(400).json({ error: 'At least one partner ID is required' });
      }
      
      // Get all retail partners for this brand that match the selected partner IDs
      const allPartners = await storage.getRetailPartnersByBrandId(brandId);
      const selectedPartners = allPartners.filter(partner => partnerIds.includes(partner.id));
      
      if (selectedPartners.length === 0) {
        return res.status(404).json({ 
          error: 'No matching retail partners found',
          message: 'The selected partners could not be found or do not belong to this brand.'
        });
      }
      
      // Get all evergreen posts for this brand
      const allPosts = await storage.getContentPostsByBrandId(brandId);
      const evergreenPosts = allPosts.filter(post => 
        post.isEvergreen && 
        // Check if post supports all requested platforms
        platforms.every(platform => post.platforms.includes(platform))
      );
      
      if (evergreenPosts.length === 0) {
        return res.status(404).json({ 
          error: 'No matching evergreen content found',
          message: 'Create some evergreen content that supports the selected platforms first.'
        });
      }
      
      // Create a scheduled parent post for the evergreen content
      // Generate a more descriptive title based on date and platform
      const dateStr = new Date(scheduledDate).toLocaleDateString();
      const platformStr = platforms.join(', ');
      
      const parentPost = await storage.createContentPost({
        brandId,
        creatorId: brandId, // Use brandId as creatorId for demo purposes
        title: `Evergreen Content - ${dateStr}`,
        description: `Automated evergreen content for ${selectedPartners.length} partners on ${platformStr}`,
        platforms,
        status: 'scheduled',
        scheduledDate: new Date(scheduledDate),
        isEvergreen: true,
        metadata: {
          partnerCount: selectedPartners.length,
          isScheduledEvergreen: true
        }
      });
      
      // Store the results
      const results = {
        parentPost,
        assignments: [] as any[],
        partners: selectedPartners.length
      };
      
      // Get previous assignment history for all selected partners
      // We'll use this to avoid assigning the same post to a partner again
      const previousAssignments: Record<number, Set<number>> = {};
      
      // Initialize empty sets for each partner
      for (const partner of selectedPartners) {
        previousAssignments[partner.id] = new Set<number>();
      }
      
      // Find previous evergreen assignments
      const previousPosts = allPosts.filter(post => 
        post.isEvergreen && 
        post.status === 'scheduled' && 
        post.id !== parentPost.id
      );
      
      for (const post of previousPosts) {
        const assignments = await storage.getPostAssignmentsByPostId(post.id);
        
        for (const assignment of assignments) {
          // Only consider assignments for the selected partners
          if (partnerIds.includes(assignment.partnerId) && assignment.metadata) {
            try {
              const metadata = assignment.metadata as any;
              if (metadata.selectedEvergreenPostId) {
                // Add this post ID to the set of previously assigned posts for this partner
                if (!previousAssignments[assignment.partnerId]) {
                  previousAssignments[assignment.partnerId] = new Set<number>();
                }
                previousAssignments[assignment.partnerId].add(metadata.selectedEvergreenPostId);
              }
            } catch (e) {
              console.warn('Error parsing assignment metadata', e);
            }
          }
        }
      }
      
      // For each partner, select an evergreen post and create an assignment
      for (const partner of selectedPartners) {
        // Filter out posts that were recently assigned to this partner
        const previouslyAssignedIds = previousAssignments[partner.id];
        const availablePosts = evergreenPosts.filter(post => 
          !previouslyAssignedIds.has(post.id) || previouslyAssignedIds.size >= evergreenPosts.length
        );
        
        // If we've gone through all posts or there are no available posts, use all posts
        const postsToChooseFrom = availablePosts.length > 0 ? availablePosts : evergreenPosts;
        
        // Randomly select from available posts
        const randomIndex = Math.floor(Math.random() * postsToChooseFrom.length);
        const selectedPost = postsToChooseFrom[randomIndex];
        
        // Create assignment connecting the parent post, partner, and selected content
        const assignment = await storage.createPostAssignment({
          postId: parentPost.id,
          partnerId: partner.id,
          customFooter: null,
          customTags: null,
          metadata: {
            selectedEvergreenPostId: selectedPost.id,
            originalTitle: selectedPost.title,
            originalDescription: selectedPost.description,
            originalImageUrl: selectedPost.imageUrl
          }
        });
        
        results.assignments.push({
          assignment,
          selectedPost: {
            id: selectedPost.id,
            title: selectedPost.title
          },
          partner: {
            id: partner.id,
            name: partner.name
          }
        });
      }
      
      res.status(201).json(results);
    } catch (error) {
      console.error('Error scheduling evergreen post:', error);
      res.status(500).json({ error: 'Failed to schedule evergreen post' });
    }
  });
  
  // Get scheduled posts for calendar view
  app.get('/api/content-posts/calendar', async (req: Request, res: Response) => {
    try {
      const { brandId, startDate, endDate } = req.query;
      
      if (!brandId) {
        return res.status(400).json({ error: 'Brand ID is required' });
      }
      
      const brandIdNum = parseInt(brandId as string);
      if (isNaN(brandIdNum)) {
        return res.status(400).json({ error: 'Invalid brand ID' });
      }
      
      // Get all content posts for this brand
      const allPosts = await storage.getContentPostsByBrandId(brandIdNum);
      
      // Filter to only include scheduled or published posts
      let filteredPosts = allPosts.filter(post => 
        post.status === 'scheduled' || post.status === 'published'
      );
      
      // Apply date range filter if provided
      if (startDate && endDate) {
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        
        filteredPosts = filteredPosts.filter(post => {
          const postDate = post.scheduledDate || post.publishedDate;
          if (!postDate) return false;
          
          const date = new Date(postDate);
          return date >= start && date <= end;
        });
      }
      
      // For each post, get the assignment details
      const calendarEvents = await Promise.all(filteredPosts.map(async post => {
        const assignments = await storage.getPostAssignmentsByPostId(post.id);
        const partnerIds = assignments.map(a => a.partnerId);
        const partners = await storage.getRetailPartnersByIds(partnerIds);
        
        return {
          ...post,
          assignments,
          partnerCount: assignments.length,
          partners: partners.map(p => ({ id: p.id, name: p.name }))
        };
      }));
      
      res.json(calendarEvents);
    } catch (error) {
      console.error('Error fetching calendar posts:', error);
      res.status(500).json({ error: 'Failed to fetch calendar posts' });
    }
  });
  
  // Reschedule a post (used for drag and drop)
  app.post('/api/content-posts/:id/reschedule', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID' });
      }
      
      const { newDate } = req.body;
      if (!newDate) {
        return res.status(400).json({ error: 'New date is required' });
      }
      
      const post = await storage.getContentPost(id);
      if (!post) {
        return res.status(404).json({ error: 'Content post not found' });
      }
      
      // Update the post with the new scheduled date
      const updatedPost = await storage.updateContentPost(id, {
        scheduledDate: new Date(newDate),
        status: 'scheduled'
      });
      
      res.json(updatedPost);
    } catch (error) {
      console.error('Error rescheduling post:', error);
      res.status(500).json({ error: 'Failed to reschedule post' });
    }
  });
}