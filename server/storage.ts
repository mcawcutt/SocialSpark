import { 
  User, InsertUser, 
  RetailPartner, InsertRetailPartner,
  SocialAccount, InsertSocialAccount,
  ContentPost, InsertContentPost, 
  PostAssignment, InsertPostAssignment,
  Analytics, InsertAnalytics,
  MediaLibraryItem, InsertMediaLibraryItem,
  users, retailPartners, socialAccounts, contentPosts, postAssignments, analytics, mediaLibrary
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, and, inArray, desc, sql, or, isNull, lt, gte } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsersByRole(role: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User>;

  // Retail Partner operations
  getRetailPartner(id: number): Promise<RetailPartner | undefined>;
  getRetailPartnersByBrandId(brandId: number): Promise<RetailPartner[]>;
  createRetailPartner(retailPartner: InsertRetailPartner): Promise<RetailPartner>;
  updateRetailPartner(id: number, data: Partial<RetailPartner>): Promise<RetailPartner>;
  getRetailPartnerCount(brandId: number): Promise<number>;
  getRecentPartners(brandId: number, limit: number): Promise<RetailPartner[]>;
  getPartnerStatsByStatus(brandId: number): Promise<Record<string, number>>;
  
  // Social Account operations
  getSocialAccount(id: number): Promise<SocialAccount | undefined>;
  getSocialAccountsByPartnerIds(partnerIds: number[]): Promise<SocialAccount[]>;
  getSocialAccountsByPartnerId(partnerId: number): Promise<SocialAccount[]>;
  getSocialAccountByPlatformId(platform: string, platformId: string): Promise<SocialAccount | undefined>;
  createSocialAccount(socialAccount: InsertSocialAccount): Promise<SocialAccount>;
  updateSocialAccount(id: number, data: Partial<SocialAccount>): Promise<SocialAccount>;
  deleteSocialAccount(id: number): Promise<void>;
  
  // Content Post operations
  getContentPost(id: number): Promise<ContentPost | undefined>;
  getContentPostsByBrandId(brandId: number): Promise<ContentPost[]>;
  getRetailPartnersByIds(ids: number[]): Promise<RetailPartner[]>;
  createContentPost(contentPost: InsertContentPost): Promise<ContentPost>;
  updateContentPost(id: number, data: Partial<ContentPost>): Promise<ContentPost>;
  updateContentPostMetadata(id: number, metadata: any): Promise<void>;
  deleteContentPost(id: number): Promise<void>;
  getActivePostCount(brandId: number): Promise<number>;
  getScheduledPostCount(brandId: number): Promise<number>;
  getUpcomingPosts(brandId: number, limit: number): Promise<ContentPost[]>;
  
  // Post Assignment operations
  getPostAssignment(id: number): Promise<PostAssignment | undefined>;
  getPostAssignmentsByPostId(postId: number): Promise<PostAssignment[]>;
  createPostAssignment(postAssignment: InsertPostAssignment): Promise<PostAssignment>;
  
  // Analytics operations
  getAnalyticsByPostAndPartnerIds(postIds: number[], partnerIds: number[]): Promise<Analytics[]>;
  getTotalEngagements(brandId: number): Promise<number>;
  getPerformanceMetrics(brandId: number): Promise<any>;
  
  // Activity operations
  getRecentActivity(brandId: number, limit: number): Promise<any[]>;
  
  // Media Library operations
  getMediaItem(id: number): Promise<MediaLibraryItem | undefined>;
  getMediaByBrandId(brandId: number): Promise<MediaLibraryItem[]>;
  createMediaItem(mediaItem: InsertMediaLibraryItem): Promise<MediaLibraryItem>;
  updateMediaItem(id: number, data: Partial<MediaLibraryItem>): Promise<MediaLibraryItem>;
  deleteMediaItem(id: number): Promise<void>;
  getMediaByTags(brandId: number, tags: string[]): Promise<MediaLibraryItem[]>;
  
  // Session store
  sessionStore: any; // Using any type to avoid circular references
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private retailPartners: Map<number, RetailPartner>;
  private socialAccounts: Map<number, SocialAccount>;
  private contentPosts: Map<number, ContentPost>;
  private postAssignments: Map<number, PostAssignment>;
  private analytics: Map<number, Analytics>;
  private mediaLibraryItems: Map<number, MediaLibraryItem>;
  
  private userIdCounter: number;
  private partnerIdCounter: number;
  private accountIdCounter: number;
  private postIdCounter: number;
  private assignmentIdCounter: number;
  private analyticsIdCounter: number;
  private mediaIdCounter: number;
  
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.retailPartners = new Map();
    this.socialAccounts = new Map();
    this.contentPosts = new Map();
    this.postAssignments = new Map();
    this.analytics = new Map();
    this.mediaLibraryItems = new Map();
    
    this.userIdCounter = 1;
    this.partnerIdCounter = 1;
    this.accountIdCounter = 1;
    this.postIdCounter = 1;
    this.assignmentIdCounter = 1;
    this.analyticsIdCounter = 1;
    this.mediaIdCounter = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    // Initialize data with proper error handling
    this.initializeData();
  }
  
  // Initialize data with proper error handling
  private initializeData() {
    // Run async initialization in the background
    this.createOrPreserveDemoUser()
      .then(() => this.seedDemoDataIfNeeded())
      .catch(err => console.error("Error initializing data:", err));
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }
  
  async getUsersByRole(role: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.role === role
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: now
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, data: Partial<User>): Promise<User> {
    const user = await this.getUser(id);
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }
    
    const updatedUser = { ...user, ...data };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Retail Partner operations
  async getRetailPartner(id: number): Promise<RetailPartner | undefined> {
    return this.retailPartners.get(id);
  }

  async getRetailPartnersByBrandId(brandId: number): Promise<RetailPartner[]> {
    return Array.from(this.retailPartners.values()).filter(
      (partner) => partner.brandId === brandId,
    );
  }

  async createRetailPartner(insertPartner: InsertRetailPartner): Promise<RetailPartner> {
    const id = this.partnerIdCounter++;
    const now = new Date();
    const partner: RetailPartner = { 
      ...insertPartner, 
      id,
      createdAt: now,
      connectionDate: insertPartner.status === 'active' ? now : undefined
    };
    this.retailPartners.set(id, partner);
    return partner;
  }

  async updateRetailPartner(id: number, data: Partial<RetailPartner>): Promise<RetailPartner> {
    const partner = await this.getRetailPartner(id);
    if (!partner) {
      throw new Error("Partner not found");
    }
    
    // If status is changing to active, set connection date
    if (data.status === 'active' && partner.status !== 'active') {
      data.connectionDate = new Date();
    }
    
    const updatedPartner = { ...partner, ...data };
    this.retailPartners.set(id, updatedPartner);
    return updatedPartner;
  }
  
  async getRetailPartnerCount(brandId: number): Promise<number> {
    return (await this.getRetailPartnersByBrandId(brandId)).length;
  }
  
  async getRecentPartners(brandId: number, limit: number): Promise<RetailPartner[]> {
    return Array.from(this.retailPartners.values())
      .filter(p => p.brandId === brandId)
      .sort((a, b) => {
        // Sort by connection date (most recent first)
        const dateA = a.connectionDate ? new Date(a.connectionDate).getTime() : 0;
        const dateB = b.connectionDate ? new Date(b.connectionDate).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, limit);
  }
  
  async getPartnerStatsByStatus(brandId: number): Promise<Record<string, number>> {
    const partners = await this.getRetailPartnersByBrandId(brandId);
    const stats: Record<string, number> = {
      active: 0,
      pending: 0,
      inactive: 0,
      needs_attention: 0
    };
    
    partners.forEach(partner => {
      stats[partner.status] = (stats[partner.status] || 0) + 1;
    });
    
    return stats;
  }

  // Social Account operations
  async getSocialAccount(id: number): Promise<SocialAccount | undefined> {
    return this.socialAccounts.get(id);
  }

  async getSocialAccountsByPartnerIds(partnerIds: number[]): Promise<SocialAccount[]> {
    return Array.from(this.socialAccounts.values()).filter(
      (account) => partnerIds.includes(account.partnerId),
    );
  }
  
  async getSocialAccountsByPartnerId(partnerId: number): Promise<SocialAccount[]> {
    return Array.from(this.socialAccounts.values()).filter(
      (account) => account.partnerId === partnerId
    );
  }
  
  async getSocialAccountByPlatformId(platform: string, platformId: string): Promise<SocialAccount | undefined> {
    return Array.from(this.socialAccounts.values()).find(
      (account) => account.platform === platform && account.platformId === platformId
    );
  }
  
  async updateSocialAccount(id: number, data: Partial<SocialAccount>): Promise<SocialAccount> {
    const account = await this.getSocialAccount(id);
    if (!account) {
      throw new Error(`Social account with ID ${id} not found`);
    }
    
    const updatedAccount = { ...account, ...data };
    this.socialAccounts.set(id, updatedAccount);
    
    return updatedAccount;
  }
  
  async deleteSocialAccount(id: number): Promise<void> {
    const exists = this.socialAccounts.has(id);
    if (!exists) {
      throw new Error(`Social account with ID ${id} not found`);
    }
    
    this.socialAccounts.delete(id);
  }

  async createSocialAccount(insertAccount: InsertSocialAccount): Promise<SocialAccount> {
    const id = this.accountIdCounter++;
    const now = new Date();
    const account: SocialAccount = { 
      ...insertAccount, 
      id,
      createdAt: now,
      status: "active"
    };
    this.socialAccounts.set(id, account);
    return account;
  }

  // Content Post operations
  async getContentPost(id: number): Promise<ContentPost | undefined> {
    return this.contentPosts.get(id);
  }

  async getContentPostsByBrandId(brandId: number): Promise<ContentPost[]> {
    return Array.from(this.contentPosts.values()).filter(
      (post) => post.brandId === brandId,
    );
  }
  
  async getRetailPartnersByIds(ids: number[]): Promise<RetailPartner[]> {
    return Array.from(this.retailPartners.values()).filter(
      (partner) => ids.includes(partner.id)
    );
  }

  async createContentPost(insertPost: InsertContentPost): Promise<ContentPost> {
    const id = this.postIdCounter++;
    const now = new Date();
    const post: ContentPost = { 
      ...insertPost, 
      id,
      createdAt: now,
      updatedAt: now,
      publishedDate: undefined
    };
    this.contentPosts.set(id, post);
    return post;
  }

  async updateContentPost(id: number, data: Partial<ContentPost>): Promise<ContentPost> {
    const post = await this.getContentPost(id);
    if (!post) {
      throw new Error("Post not found");
    }
    
    const now = new Date();
    const updatedPost = { 
      ...post, 
      ...data,
      updatedAt: now
    };
    
    this.contentPosts.set(id, updatedPost);
    return updatedPost;
  }
  
  async updateContentPostMetadata(id: number, metadata: any): Promise<void> {
    const post = await this.getContentPost(id);
    if (!post) {
      throw new Error("Post not found");
    }
    
    // In a real implementation with a database, we would store metadata in a JSONB column
    // For our in-memory implementation, we'll add it directly to the post object
    const updatedPost = { 
      ...post,
      metadata: metadata,
      updatedAt: new Date()
    };
    
    this.contentPosts.set(id, updatedPost);
  }
  
  async deleteContentPost(id: number): Promise<void> {
    const exists = this.contentPosts.has(id);
    if (!exists) {
      throw new Error(`Content post with ID ${id} not found`);
    }
    
    // Delete the content post
    this.contentPosts.delete(id);
    
    // Also delete any associated assignments
    const assignments = await this.getPostAssignmentsByPostId(id);
    for (const assignment of assignments) {
      this.postAssignments.delete(assignment.id);
    }
  }
  
  async getActivePostCount(brandId: number): Promise<number> {
    const posts = await this.getContentPostsByBrandId(brandId);
    return posts.filter(p => p.status === 'published' || p.status === 'scheduled').length;
  }
  
  async getScheduledPostCount(brandId: number): Promise<number> {
    const posts = await this.getContentPostsByBrandId(brandId);
    return posts.filter(p => p.status === 'scheduled').length;
  }
  
  async getUpcomingPosts(brandId: number, limit: number): Promise<ContentPost[]> {
    const now = new Date();
    return Array.from(this.contentPosts.values())
      .filter(p => p.brandId === brandId && p.status === 'scheduled' && p.scheduledDate && new Date(p.scheduledDate) > now)
      .sort((a, b) => {
        // Sort by scheduled date (earliest first)
        const dateA = a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0;
        const dateB = b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0;
        return dateA - dateB;
      })
      .slice(0, limit);
  }

  // Post Assignment operations
  async getPostAssignment(id: number): Promise<PostAssignment | undefined> {
    return this.postAssignments.get(id);
  }

  async getPostAssignmentsByPostId(postId: number): Promise<PostAssignment[]> {
    return Array.from(this.postAssignments.values()).filter(
      (assignment) => assignment.postId === postId,
    );
  }

  async createPostAssignment(insertAssignment: InsertPostAssignment): Promise<PostAssignment> {
    const id = this.assignmentIdCounter++;
    const now = new Date();
    const assignment: PostAssignment = { 
      ...insertAssignment, 
      id,
      status: "pending",
      publishedUrl: undefined,
      publishedDate: undefined,
      createdAt: now
    };
    this.postAssignments.set(id, assignment);
    return assignment;
  }
  
  async updatePostAssignment(id: number, data: Partial<PostAssignment>): Promise<PostAssignment> {
    const assignment = await this.getPostAssignment(id);
    if (!assignment) {
      throw new Error(`Post assignment with ID ${id} not found`);
    }
    
    const updatedAssignment = { ...assignment, ...data };
    this.postAssignments.set(id, updatedAssignment);
    
    return updatedAssignment;
  }

  // Analytics operations
  async getAnalyticsByPostAndPartnerIds(postIds: number[], partnerIds: number[]): Promise<Analytics[]> {
    // First get all assignments for these posts & partners
    const relevantAssignments = Array.from(this.postAssignments.values()).filter(
      (assignment) => postIds.includes(assignment.postId) && partnerIds.includes(assignment.partnerId)
    );
    
    // Then get analytics for those assignments
    return Array.from(this.analytics.values()).filter(
      (analytic) => relevantAssignments.some(a => a.postId === analytic.postId && a.partnerId === analytic.partnerId)
    );
  }
  
  async getTotalEngagements(brandId: number): Promise<number> {
    const posts = await this.getContentPostsByBrandId(brandId);
    const postIds = posts.map(p => p.id);
    
    const partners = await this.getRetailPartnersByBrandId(brandId);
    const partnerIds = partners.map(p => p.id);
    
    const analytics = await this.getAnalyticsByPostAndPartnerIds(postIds, partnerIds);
    return analytics.reduce((sum, item) => sum + item.engagements, 0);
  }
  
  async getPerformanceMetrics(brandId: number): Promise<any> {
    // This would calculate performance metrics based on analytics data
    // For demo purposes, return mock data
    return {
      engagementRate: {
        current: 4.2,
        previous: 3.4,
        change: 0.8
      },
      clickThroughRate: {
        current: 2.8,
        previous: 2.5,
        change: 0.3
      },
      audienceGrowth: {
        current: 5.7,
        previous: 4.5,
        change: 1.2
      }
    };
  }
  
  // Activity operations
  async getRecentActivity(brandId: number, limit: number): Promise<any[]> {
    const activities = [];
    
    // Get published posts
    const posts = await this.getContentPostsByBrandId(brandId);
    const publishedPosts = posts
      .filter(p => p.publishedDate)
      .sort((a, b) => {
        const dateA = a.publishedDate ? new Date(a.publishedDate).getTime() : 0;
        const dateB = b.publishedDate ? new Date(b.publishedDate).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, limit);
      
    // Add published posts to activities
    for (const post of publishedPosts) {
      const assignments = await this.getPostAssignmentsByPostId(post.id);
      activities.push({
        type: 'post_published',
        title: post.title,
        timestamp: post.publishedDate,
        details: {
          partnerCount: assignments.length
        }
      });
    }
    
    // Get partner connections
    const partners = await this.getRetailPartnersByBrandId(brandId);
    const recentConnections = partners
      .filter(p => p.connectionDate)
      .sort((a, b) => {
        const dateA = a.connectionDate ? new Date(a.connectionDate).getTime() : 0;
        const dateB = b.connectionDate ? new Date(b.connectionDate).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, limit);
      
    // Add partner connections to activities
    for (const partner of recentConnections) {
      activities.push({
        type: 'partner_connected',
        title: partner.name,
        timestamp: partner.connectionDate,
        details: {}
      });
    }
    
    // Sort by timestamp (most recent first) and limit
    return activities
      .sort((a, b) => {
        const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, limit);
  }
  
  // Media Library operations
  async getMediaItem(id: number): Promise<MediaLibraryItem | undefined> {
    return this.mediaLibraryItems.get(id);
  }

  async getMediaByBrandId(brandId: number): Promise<MediaLibraryItem[]> {
    return Array.from(this.mediaLibraryItems.values()).filter(
      (item) => item.brandId === brandId
    );
  }

  async createMediaItem(mediaItem: InsertMediaLibraryItem): Promise<MediaLibraryItem> {
    const id = this.mediaIdCounter++;
    const now = new Date();
    const item: MediaLibraryItem = {
      ...mediaItem,
      id,
      createdAt: now
    };
    this.mediaLibraryItems.set(id, item);
    return item;
  }

  async updateMediaItem(id: number, data: Partial<MediaLibraryItem>): Promise<MediaLibraryItem> {
    const item = await this.getMediaItem(id);
    if (!item) {
      throw new Error(`Media item with ID ${id} not found`);
    }
    
    const updatedItem = { ...item, ...data };
    this.mediaLibraryItems.set(id, updatedItem);
    return updatedItem;
  }

  async deleteMediaItem(id: number): Promise<void> {
    const exists = this.mediaLibraryItems.has(id);
    if (!exists) {
      throw new Error(`Media item with ID ${id} not found`);
    }
    
    this.mediaLibraryItems.delete(id);
  }

  async getMediaByTags(brandId: number, tags: string[]): Promise<MediaLibraryItem[]> {
    if (tags.length === 0) {
      return this.getMediaByBrandId(brandId);
    }
    
    return Array.from(this.mediaLibraryItems.values()).filter(
      (item) => {
        if (item.brandId !== brandId) return false;
        
        // If the item has no tags, it doesn't match
        if (!item.tags || item.tags.length === 0) return false;
        
        // Check if any of the requested tags match this item's tags
        return tags.some(tag => item.tags!.includes(tag));
      }
    );
  }

  // Helper method to create or preserve an existing demo user
  private async createOrPreserveDemoUser() {
    // Check if admin user already exists
    const existingAdminUser = await this.getUserByUsername("admin");
    
    if (!existingAdminUser) {
      // Create the admin user if it doesn't exist
      console.log("Creating new admin user...");
      await this.createUser({
        username: "admin",
        password: "Ignyt456#", // Will be hashed by our auth.ts hashPassword function
        name: "Ignyt Admin",
        email: "admin@ignyt.com",
        role: "admin",
        planType: "premium"
      });
    } else {
      console.log(`Admin user already exists with name: ${existingAdminUser.name}`);
    }
    
    // Check if Dulux brand already exists
    const existingDuluxUser = await this.getUserByUsername("dulux");
    
    if (!existingDuluxUser) {
      // Create the Dulux brand if it doesn't exist
      console.log("Creating Dulux brand user...");
      await this.createUser({
        username: "dulux",
        password: "Dulux123#", // Will be hashed by our auth.ts hashPassword function
        name: "Dulux Paints",
        email: "dulux@example.com",
        role: "brand",
        planType: "premium",
        logo: "/uploads/demo-logo.png",
        active: true
      });
    } else {
      console.log(`Dulux brand user already exists with ID: ${existingDuluxUser.id}`);
    }
  }
  
  // Seed demo data for the demo and Dulux users
  private async seedDemoDataIfNeeded() {
    // We're only keeping the Dulux brand
    const duluxUser = await this.getUserByUsername("dulux");
    
    if (!duluxUser) {
      console.log("Dulux user not found, skipping Dulux data seeding.");
      return;
    }
    
    // Check for existing Dulux evergreen posts
    const duluxPosts = Array.from(this.contentPosts.values())
      .filter(post => post.brandId === duluxUser.id && post.isEvergreen);
    
    if (duluxPosts.length === 0) {
      console.log("No existing evergreen posts found for Dulux brand, seeding Dulux data...");
      
      // Check if we already have retail partners for Dulux
      const existingDuluxPartners = Array.from(this.retailPartners.values())
        .filter(partner => partner.brandId === duluxUser.id);
      
      if (existingDuluxPartners.length === 0) {
        console.log("No existing partners found for Dulux brand, creating partners first...");
        // Create a few partners for Dulux
        this.seedDuluxPartners(duluxUser.id);
      }
      
      // Create evergreen posts for Dulux
      this.seedDuluxEvergreen(duluxUser.id);
      
      // Create media items for Dulux
      this.seedDuluxMedia(duluxUser.id);
    } else {
      console.log(`Found ${duluxPosts.length} existing evergreen posts for Dulux brand, skipping Dulux data seeding.`);
    }
  }

  // Seed demo data for testing - only for the demo user
  private seedDemoData(brandId: number) {
    // Create demo media library items
    console.log('Creating demo media library items...');
    const demoMediaItems = [
      {
        name: "Outdoor Adventure Photo",
        description: "A beautiful landscape image for outdoor brands",
        fileUrl: "/uploads/demo-outdoor.png", 
        fileType: "image/png",
        tags: ["Outdoor", "Hiking", "Landscape"]
      },
      {
        name: "Mountain Biking Promo",
        description: "Perfect for cycling related posts",
        fileUrl: "/uploads/demo-biking.png",
        fileType: "image/png",
        tags: ["Biking", "Outdoor", "Action"]
      },
      {
        name: "Brand Logo",
        description: "Company logo for branded posts",
        fileUrl: "/uploads/demo-logo.png",
        fileType: "image/png",
        tags: ["Logo", "Branding", "Official"]
      }
    ];
    
    // Add the media items to storage
    demoMediaItems.forEach(item => {
      this.createMediaItem({
        brandId, // Use the provided brandId
        name: item.name,
        description: item.description,
        fileUrl: item.fileUrl,
        fileType: item.fileType,
        tags: item.tags
      });
    });
    
    // Create retail partners with metadata including tags
    const partners = [
      { 
        name: "Riverside Cycles", 
        status: "active", 
        contactEmail: "contact@riversidecycles.com", 
        connectionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        metadata: { tags: ["Outdoor", "Bikes", "Urban"] }
      },
      { 
        name: "Outdoor Supply Co.", 
        status: "active", 
        contactEmail: "info@outdoorsupply.com", 
        connectionDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        metadata: { tags: ["Outdoor", "Camping", "Hiking"] }
      },
      { 
        name: "Gear Shop Seattle", 
        status: "active", 
        contactEmail: "hello@gearshopseattle.com", 
        connectionDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        metadata: { tags: ["Urban", "Gear", "Premium"] }
      },
      { 
        name: "Mountain View Sports", 
        status: "pending", 
        contactEmail: "sales@mountainviewsports.com",
        metadata: { tags: ["Mountain", "Sports", "Local"] }
      },
      { 
        name: "Urban Bikes & Gear", 
        status: "pending", 
        contactEmail: "support@urbanbikes.com",
        metadata: { tags: ["Urban", "Bikes", "Commuting"] }
      },
      { 
        name: "Lakeside Outfitters", 
        status: "pending", 
        contactEmail: "team@lakesideoutfitters.com",
        metadata: { tags: ["Lake", "Fishing", "Outdoor"] }
      },
      { 
        name: "Adventure World", 
        status: "needs_attention", 
        contactEmail: "contact@adventureworld.com",
        metadata: { tags: ["Adventure", "Sports", "Family"] }
      },
      { 
        name: "Trail Blazers", 
        status: "needs_attention", 
        contactEmail: "help@trailblazers.com",
        metadata: { tags: ["Hiking", "Trails", "Outdoor"] }
      },
      { 
        name: "Vintage Cycles", 
        status: "inactive", 
        contactEmail: "info@vintagecycles.com",
        metadata: { tags: ["Vintage", "Classic", "Bikes"] }
      },
      // New partners
      { 
        name: "Mountain Peak Gear", 
        status: "active", 
        contactEmail: "info@mountainpeakgear.com", 
        connectionDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        metadata: { tags: ["Mountain", "Climbing", "Premium"] }
      },
      { 
        name: "City Cycles", 
        status: "active", 
        contactEmail: "support@citycycles.com", 
        connectionDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        metadata: { tags: ["Urban", "City", "Bikes"] }
      },
      { 
        name: "Outdoor Adventures", 
        status: "active", 
        contactEmail: "contact@outdooradventures.com", 
        connectionDate: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
        metadata: { tags: ["Outdoor", "Adventures", "Tours"] }
      },
      { 
        name: "Trail Supply Co.", 
        status: "active", 
        contactEmail: "hello@trailsupply.com", 
        connectionDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
        metadata: { tags: ["Hiking", "Trails", "Equipment"] }
      },
      { 
        name: "River Run Outfitters", 
        status: "active", 
        contactEmail: "sales@riverrun.com", 
        connectionDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        metadata: { tags: ["River", "Kayaking", "Gear"] }
      },
      { 
        name: "Summit Gear", 
        status: "pending", 
        contactEmail: "info@summitgear.com",
        metadata: { tags: ["Mountain", "Summit", "Climbing"] }
      },
      { 
        name: "Valley Bikes", 
        status: "pending", 
        contactEmail: "help@valleybikes.com",
        metadata: { tags: ["Valley", "Bikes", "Local"] }
      },
      { 
        name: "Forest Trail Shop", 
        status: "needs_attention", 
        contactEmail: "service@foresttrail.com",
        metadata: { tags: ["Forest", "Hiking", "Camping"] }
      },
      { 
        name: "Lake City Sports", 
        status: "inactive", 
        contactEmail: "support@lakecitysports.com",
        metadata: { tags: ["Lake", "Sports", "Seasonal"] }
      },
      { 
        name: "Downtown Cycles", 
        status: "inactive", 
        contactEmail: "info@downtowncycles.com",
        metadata: { tags: ["Urban", "Downtown", "Bikes"] }
      }
    ];
    
    // Explicitly create each partner with metadata correctly preserved
    partners.forEach(partner => {
      const { metadata, ...partnerData } = partner;
      
      this.createRetailPartner({
        ...partnerData,
        brandId,
        contactPhone: "555-123-4567",
        address: "123 Main St, Anytown, USA",
        metadata: metadata
      });
    });
    
    // Create social accounts for all active partners
    const platforms = ["facebook", "instagram", "google"];
    
    // Get all active partner IDs - we know the first 9 are the original partners
    // and the active ones are indices 0, 1, 2, 9, 10, 11, 12, 13
    const activePartnerIndices = [0, 1, 2, 9, 10, 11, 12, 13];
    
    // Loop through and create social accounts
    activePartnerIndices.forEach(index => {
      const partnerId = index + 1; // Partner IDs are 1-based
      platforms.forEach(platform => {
        this.createSocialAccount({
          partnerId,
          platform,
          accountId: `account_${platform}_${partnerId}`,
          accountName: `${partners[index].name} ${platform.charAt(0).toUpperCase() + platform.slice(1)}`,
          accessToken: "mock_access_token",
          refreshToken: "mock_refresh_token",
          tokenExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });
      });
    });
    
    // Create content posts
    const posts = [
      { 
        title: "Summer Sale Announcement", 
        description: "Seasonal promotion for summer products with 20% discount.", 
        platforms: ["facebook", "instagram"],
        status: "scheduled", 
        scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      },
      { 
        title: "New Product Teaser", 
        description: "Get a sneak peek at our upcoming fall collection.", 
        platforms: ["instagram"],
        status: "draft"
      },
      { 
        title: "Weekly Tip", 
        description: "Maintenance tips to keep your gear in top condition.", 
        platforms: ["facebook", "instagram", "google"],
        status: "automated", 
        isEvergreen: true,
        scheduledDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        metadata: {
          tags: ["maintenance", "tips", "care"],
          category: "Tips & Advice"
        }
      },
      { 
        title: "Spring Collection", 
        description: "Our spring collection is now available in all stores.", 
        platforms: ["facebook", "instagram", "google"],
        status: "published", 
        publishedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        title: "10 Ways to Improve Your Cycling",
        description: "Discover tips from the pros on how to improve your cycling technique and endurance.",
        platforms: ["facebook", "instagram"],
        status: "draft",
        isEvergreen: true,
        metadata: {
          tags: ["cycling", "tips", "fitness"],
          category: "Tips & Advice"
        }
      },
      {
        title: "Summer Gear Essentials",
        description: "Don't leave for your summer adventures without these essential items that will make your outdoor experience better than ever!",
        platforms: ["facebook", "instagram", "google"],
        status: "draft",
        isEvergreen: true,
        metadata: {
          tags: ["summer", "gear", "essentials"],
          category: "Seasonal"
        }
      },
      {
        title: "Limited Edition Hiking Boots",
        description: "Our new limited edition hiking boots are crafted for the serious adventurer. With enhanced grip and waterproof technology, these boots are ready for any terrain.",
        platforms: ["facebook", "instagram"],
        status: "draft",
        isEvergreen: true,
        metadata: {
          tags: ["hiking", "boots", "premium"],
          category: "Product Highlights"
        }
      },
      {
        title: "Weekend Flash Sale",
        description: "This weekend only! Get 30% off all outdoor apparel. Visit your local store or shop online.",
        platforms: ["facebook", "instagram", "google"],
        status: "draft",
        isEvergreen: true,
        metadata: {
          tags: ["sale", "discount", "weekend"],
          category: "Promotions"
        }
      },
      {
        title: "New Bike Maintenance Service",
        description: "Introducing our premium bike maintenance service. Keep your bike in top condition year-round with our expert technicians.",
        platforms: ["facebook", "instagram", "google"],
        status: "draft",
        isEvergreen: true,
        metadata: {
          tags: ["bike", "maintenance", "service"],
          category: "Product Highlights"
        }
      },
      {
        title: "Industry Trends 2025",
        description: "Explore the latest trends in outdoor gear and technology that are shaping the industry in 2025 and beyond.",
        platforms: ["facebook", "instagram"],
        status: "draft",
        isEvergreen: true,
        metadata: {
          tags: ["trends", "industry", "2025"],
          category: "Industry News"
        }
      }
    ];
    
    // Manually create posts to handle metadata properly
    for (const post of posts) {
      const { metadata, ...postData } = post as any;
      
      // Create the post
      const id = this.postIdCounter++;
      const now = new Date();
      
      // Assign specific images to certain posts to replace placeholders
      let imageUrl = "/uploads/demo-logo.png"; // Default image
      
      if (postData.title === "10 Ways to Improve Your Cycling") {
        imageUrl = "/uploads/demo-biking.png";
      } else if (postData.title === "Summer Gear Essentials") {
        imageUrl = "/uploads/demo-outdoor.png";
      } else if (postData.title === "Limited Edition Hiking Boots") {
        imageUrl = "/uploads/demo-logo.png";
      } else if (postData.title === "Weekend Flash Sale") {
        imageUrl = "/uploads/demo-biking.png";
      } else if (postData.title === "New Bike Maintenance Service") {
        imageUrl = "/uploads/demo-outdoor.png";
      } else if (postData.title === "Industry Trends 2025") {
        imageUrl = "/uploads/demo-logo.png";
      }
      
      // Skip media creation for default image
      const mediaTitle = postData.title.length > 30 
        ? postData.title.substring(0, 30) + "..." 
        : postData.title;
      
      // Create media item only if it doesn't already exist
      if (!Array.from(this.mediaLibraryItems.values()).some(item => 
          item.name === `Image for "${mediaTitle}"` && 
          item.fileUrl === imageUrl)
      ) {
        console.log(`Creating demo media item for "${mediaTitle}" with URL: ${imageUrl}`);
        
        this.createMediaItem({
          brandId,
          name: `Image for "${mediaTitle}"`,
          fileUrl: imageUrl,
          fileType: "image/png",
          description: `Media asset for ${postData.title}`,
          tags: metadata?.tags || []
        });
      }
      
      const createdPost: ContentPost = { 
        ...postData,
        brandId,
        imageUrl, 
        id,
        createdAt: now,
        updatedAt: now,
        publishedDate: null,
        metadata: metadata || null,
        scheduledDate: postData.scheduledDate || null,
        isEvergreen: postData.isEvergreen || false,
        status: postData.status || "draft"
      };
      
      // Save the post
      this.contentPosts.set(id, createdPost);
    }
    
    // Create post assignments for all active partners
    // Active partner indices are [0, 1, 2, 9, 10, 11, 12, 13]
    const activePartnerIds = activePartnerIndices.map(idx => idx + 1);
    
    // Assign posts to all active partners
    for (let postId = 1; postId <= 6; postId++) {
      for (const partnerId of activePartnerIds) {
        // Customize footer text based on the partner
        const partnerName = partners[partnerId - 1].name;
        this.createPostAssignment({
          postId,
          partnerId,
          customFooter: `Visit ${partnerName} today! Call 555-123-4567 #localbusiness #${partnerName.toLowerCase().replace(/\s+/g, '')}`,
          customTags: "#outdoor #deals #quality"
        });
      }
    }
    
    // Create analytics data for all active partners
    for (let postId = 1; postId <= 6; postId++) {
      // For each active partner
      for (const partnerId of activePartnerIds) {
        const platforms = ["facebook", "instagram", "google"];
        
        platforms.forEach(platform => {
          // Generate varied engagement metrics based on partner
          // More established partners (earlier in the list) get higher engagement
          const partnerMultiplier = partnerId <= 3 ? 1.2 : 0.9; // Older partners have better metrics
          
          const analyticsId = this.analyticsIdCounter++;
          const impressions = Math.floor((Math.random() * 1000 + 500) * partnerMultiplier);
          const engagements = Math.floor(impressions * (Math.random() * 0.1 + 0.05) * partnerMultiplier);
          const clicks = Math.floor(engagements * (Math.random() * 0.3 + 0.2));
          const likes = Math.floor(engagements * (Math.random() * 0.5 + 0.2));
          const shares = Math.floor(engagements * (Math.random() * 0.1 + 0.05));
          const comments = Math.floor(engagements * (Math.random() * 0.1 + 0.02));
          
          // Create more recent analytics for better timeline representation
          const daysAgo = Math.floor(Math.random() * 10);
          
          const analytics: Analytics = {
            id: analyticsId,
            postId,
            partnerId,
            platform,
            impressions,
            engagements,
            clicks,
            shares,
            likes,
            comments,
            date: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
          };
          
          this.analytics.set(analyticsId, analytics);
        });
      }
    }
  }
  // Seed retail partners for Dulux brand
  private seedDuluxPartners(brandId: number) {
    console.log(`Creating retail partners for Dulux brand (ID: ${brandId})...`);
    const duluxPartners = [
      { 
        name: "Dulux Design Studio", 
        status: "active", 
        contactEmail: "design@duluxstudio.com", 
        connectionDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        metadata: { tags: ["Premium", "Design", "Urban"] }
      },
      { 
        name: "Color Zone Paint Shop", 
        status: "active", 
        contactEmail: "info@colorzone.com", 
        connectionDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        metadata: { tags: ["Retail", "Paint", "Home"] }
      },
      { 
        name: "Paint Perfection", 
        status: "active", 
        contactEmail: "hello@paintperfection.com", 
        connectionDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        metadata: { tags: ["Premium", "Paint", "Professional"] }
      },
      { 
        name: "Designer Paints", 
        status: "pending", 
        contactEmail: "sales@designerpaints.com",
        metadata: { tags: ["Designer", "Premium", "Specialty"] }
      },
      { 
        name: "Urban Home Supplies", 
        status: "pending", 
        contactEmail: "support@urbanhome.com",
        metadata: { tags: ["Urban", "Home", "Retail"] }
      }
    ];
    
    // Create the partners
    duluxPartners.forEach(partner => {
      const { metadata, ...partnerData } = partner;
      
      this.createRetailPartner({
        ...partnerData,
        brandId,
        contactPhone: "555-987-6543",
        address: "456 Design Blvd, Paintsville, USA",
        metadata: metadata
      });
    });
    
    // Create social accounts for active partners
    const platforms = ["facebook", "instagram", "google"];
    
    // Active partner indices are 0, 1, 2
    for (let partnerId = 1; partnerId <= 3; partnerId++) {
      platforms.forEach(platform => {
        this.createSocialAccount({
          partnerId: this.partnerIdCounter - (5 - partnerId + 1), // Calculate correct partner ID
          platform,
          platformId: `dulux_${platform}_${partnerId}`,
          platformUsername: `${duluxPartners[partnerId-1].name} ${platform.charAt(0).toUpperCase() + platform.slice(1)}`,
          accessToken: "mock_access_token",
          refreshToken: "mock_refresh_token",
          tokenExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });
      });
    }
  }
  
  // Seed evergreen posts for Dulux brand
  private seedDuluxEvergreen(brandId: number) {
    console.log(`Creating evergreen posts for Dulux brand (ID: ${brandId})...`);
    
    // First, create some media items for Dulux
    this.seedDuluxMedia(brandId);
    const duluxEvergreen = [
      {
        title: "Paint Color of the Month",
        description: "Each month we feature a different color from our collection. This month we're showcasing Aquamarine Breeze, perfect for creating a calming atmosphere in any room.",
        platforms: ["facebook", "instagram", "google"],
        status: "draft",
        isEvergreen: true,
        metadata: {
          tags: ["color", "inspiration", "monthly"],
          category: "Product Highlights"
        }
      },
      {
        title: "Weekend DIY Painting Project",
        description: "Transform your space with this simple weekend DIY project. Our step-by-step guide makes it easy to achieve professional results.",
        platforms: ["facebook", "instagram"],
        status: "draft",
        isEvergreen: true,
        metadata: {
          tags: ["DIY", "weekend", "project"],
          category: "Tips & Advice"
        }
      },
      {
        title: "Seasonal Color Trends",
        description: "Discover this season's hottest color trends from Dulux. From bold statement walls to subtle accents, find the perfect colors for your home refresh.",
        platforms: ["facebook", "instagram", "google"],
        status: "draft",
        isEvergreen: true,
        metadata: {
          tags: ["trends", "seasonal", "color"],
          category: "Seasonal"
        }
      },
      {
        title: "Pro Painting Tips",
        description: "Get professional results with these expert tips from our color consultants. Learn the secrets to perfect edges, even coverage, and flawless finishes.",
        platforms: ["facebook", "instagram"],
        status: "draft",
        isEvergreen: true,
        metadata: {
          tags: ["tips", "professional", "painting"],
          category: "Tips & Advice"
        }
      },
      {
        title: "Color Matching Services",
        description: "Did you know we can match any color? Bring in your fabric, tile, or inspiration photo and we'll create the perfect custom color for your project.",
        platforms: ["facebook", "instagram", "google"],
        status: "draft",
        isEvergreen: true,
        metadata: {
          tags: ["service", "custom", "matching"],
          category: "Product Highlights"
        }
      },
      {
        title: "Introducing Dulux Weathershield",
        description: "Our premium exterior paint is designed to withstand the harshest weather conditions while maintaining its vibrant color and finish for years.",
        platforms: ["facebook", "instagram", "google"],
        status: "draft",
        isEvergreen: true,
        metadata: {
          tags: ["exterior", "weatherproof", "premium"],
          category: "Product Highlights"
        }
      },
      {
        title: "Transform Your Space in a Day",
        description: "You don't need a full renovation to refresh your space. A new coat of paint can transform any room in just one day with these quick techniques.",
        platforms: ["facebook", "instagram"],
        status: "draft",
        isEvergreen: true,
        metadata: {
          tags: ["transformation", "quick", "refresh"],
          category: "Tips & Advice"
        }
      }
    ];
    
    // Create the evergreen posts
    for (const post of duluxEvergreen) {
      const { metadata, ...postData } = post;
      
      // Create the post
      const id = this.postIdCounter++;
      const now = new Date();
      
      const createdPost: ContentPost = { 
        ...postData,
        brandId,
        creatorId: brandId, // Set the creator as the brand owner
        imageUrl: "/uploads/demo-logo.png", 
        id,
        createdAt: now,
        updatedAt: now,
        publishedDate: null,
        metadata: metadata || null,
        scheduledDate: null,
        isEvergreen: true,
        status: "draft"
      };
      
      // Save the post
      this.contentPosts.set(id, createdPost);
      
      // Log it
      console.log(`Created evergreen post '${post.title}' for Dulux brand`);
    }
  }
  
  // Seed media items for Dulux brand
  private seedDuluxMedia(brandId: number) {
    console.log(`Creating media library items for Dulux brand (ID: ${brandId})...`);
    
    // Create media items specific to Dulux's paint business
    const duluxMediaItems = [
      {
        name: "Color Chart - Spring Collection",
        description: "Complete color chart for our Spring 2025 collection",
        fileUrl: "/uploads/demo-logo.png", 
        fileType: "image/png",
        tags: ["Color Chart", "Spring", "Collection"]
      },
      {
        name: "Interior Inspiration - Modern Living Room",
        description: "Modern living room design using our premium paints",
        fileUrl: "/uploads/demo-outdoor.png",
        fileType: "image/png",
        tags: ["Interior", "Living Room", "Modern"]
      },
      {
        name: "Exterior House Showcase",
        description: "Beautiful exterior finish with our weatherproof paint",
        fileUrl: "/uploads/demo-biking.png",
        fileType: "image/png",
        tags: ["Exterior", "House", "Weatherproof"]
      },
      {
        name: "Dulux Brand Logo",
        description: "Official Dulux brand logo for marketing materials",
        fileUrl: "/uploads/demo-logo.png",
        fileType: "image/png",
        tags: ["Logo", "Brand", "Marketing"]
      },
      {
        name: "Kitchen Transformation",
        description: "Before and after kitchen transformation using Dulux products",
        fileUrl: "/uploads/demo-outdoor.png",
        fileType: "image/png",
        tags: ["Kitchen", "Transformation", "Before After"]
      },
      {
        name: "Commercial Project Showcase",
        description: "Large commercial office space painted with Dulux commercial line",
        fileUrl: "/uploads/demo-biking.png",
        fileType: "image/png",
        tags: ["Commercial", "Office", "Project"]
      },
      {
        name: "How-to Application Guide",
        description: "Step-by-step guide on proper paint application techniques",
        fileUrl: "/uploads/demo-logo.png",
        fileType: "image/png",
        tags: ["Guide", "Application", "How-to"]
      },
      {
        name: "Color Psychology Infographic",
        description: "Infographic explaining color psychology for interior design",
        fileUrl: "/uploads/demo-outdoor.png",
        fileType: "image/png",
        tags: ["Infographic", "Psychology", "Design"]
      }
    ];
    
    // Add the media items to storage
    duluxMediaItems.forEach((item, index) => {
      this.createMediaItem({
        brandId,
        name: item.name,
        description: item.description,
        fileUrl: item.fileUrl,
        fileType: item.fileType,
        tags: item.tags
      });
      
      console.log(`Creating Dulux media item for "${item.name.substring(0, 30)}${item.name.length > 30 ? '...' : ''}" with URL: ${item.fileUrl}`);
    });
  }
}

export class DatabaseStorage implements IStorage {
  sessionStore: ReturnType<typeof connectPg>;

  constructor() {
    // Initialize the session store with PostgreSQL
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
      tableName: 'sessions'
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    
    if (!updatedUser) {
      throw new Error(`User with ID ${id} not found`);
    }
    
    return updatedUser;
  }

  // Retail Partner operations
  async getRetailPartner(id: number): Promise<RetailPartner | undefined> {
    const [partner] = await db.select().from(retailPartners).where(eq(retailPartners.id, id));
    return partner;
  }

  async getRetailPartnersByBrandId(brandId: number): Promise<RetailPartner[]> {
    return await db
      .select()
      .from(retailPartners)
      .where(eq(retailPartners.brandId, brandId));
  }

  async createRetailPartner(insertPartner: InsertRetailPartner): Promise<RetailPartner> {
    const [partner] = await db.insert(retailPartners).values(insertPartner).returning();
    return partner;
  }

  async updateRetailPartner(id: number, data: Partial<RetailPartner>): Promise<RetailPartner> {
    const [updatedPartner] = await db
      .update(retailPartners)
      .set(data)
      .where(eq(retailPartners.id, id))
      .returning();
    
    if (!updatedPartner) {
      throw new Error(`Retail partner with ID ${id} not found`);
    }
    
    return updatedPartner;
  }

  async getRetailPartnerCount(brandId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(retailPartners)
      .where(eq(retailPartners.brandId, brandId));
    
    return result[0]?.count || 0;
  }

  async getRecentPartners(brandId: number, limit: number): Promise<RetailPartner[]> {
    return await db
      .select()
      .from(retailPartners)
      .where(eq(retailPartners.brandId, brandId))
      .orderBy(desc(retailPartners.connectionDate))
      .limit(limit);
  }

  async getPartnerStatsByStatus(brandId: number): Promise<Record<string, number>> {
    const results = await db
      .select({
        status: retailPartners.status,
        count: sql<number>`count(*)`
      })
      .from(retailPartners)
      .where(eq(retailPartners.brandId, brandId))
      .groupBy(retailPartners.status);
    
    const stats: Record<string, number> = {
      active: 0,
      pending: 0,
      inactive: 0,
      needs_attention: 0
    };
    
    results.forEach(result => {
      stats[result.status] = result.count;
    });
    
    return stats;
  }

  // Social Account operations
  async getSocialAccount(id: number): Promise<SocialAccount | undefined> {
    const [account] = await db.select().from(socialAccounts).where(eq(socialAccounts.id, id));
    return account;
  }

  async getSocialAccountsByPartnerIds(partnerIds: number[]): Promise<SocialAccount[]> {
    return await db
      .select()
      .from(socialAccounts)
      .where(inArray(socialAccounts.partnerId, partnerIds));
  }

  async getSocialAccountsByPartnerId(partnerId: number): Promise<SocialAccount[]> {
    return await db
      .select()
      .from(socialAccounts)
      .where(eq(socialAccounts.partnerId, partnerId));
  }

  async getSocialAccountByPlatformId(platform: string, platformId: string): Promise<SocialAccount | undefined> {
    const [account] = await db
      .select()
      .from(socialAccounts)
      .where(
        and(
          eq(socialAccounts.platform, platform),
          eq(socialAccounts.platformId, platformId)
        )
      );
    
    return account;
  }

  async createSocialAccount(insertAccount: InsertSocialAccount): Promise<SocialAccount> {
    const [account] = await db
      .insert(socialAccounts)
      .values({
        ...insertAccount,
        status: "active"
      })
      .returning();
    
    return account;
  }

  async updateSocialAccount(id: number, data: Partial<SocialAccount>): Promise<SocialAccount> {
    const [updatedAccount] = await db
      .update(socialAccounts)
      .set(data)
      .where(eq(socialAccounts.id, id))
      .returning();
    
    if (!updatedAccount) {
      throw new Error(`Social account with ID ${id} not found`);
    }
    
    return updatedAccount;
  }

  async deleteSocialAccount(id: number): Promise<void> {
    await db
      .delete(socialAccounts)
      .where(eq(socialAccounts.id, id));
  }

  // Content Post operations
  async getContentPost(id: number): Promise<ContentPost | undefined> {
    const [post] = await db.select().from(contentPosts).where(eq(contentPosts.id, id));
    return post;
  }

  async getContentPostsByBrandId(brandId: number): Promise<ContentPost[]> {
    return await db
      .select()
      .from(contentPosts)
      .where(eq(contentPosts.brandId, brandId));
  }

  async createContentPost(insertPost: InsertContentPost): Promise<ContentPost> {
    const [post] = await db
      .insert(contentPosts)
      .values({
        ...insertPost,
        updatedAt: new Date()
      })
      .returning();
    
    return post;
  }

  async updateContentPost(id: number, data: Partial<ContentPost>): Promise<ContentPost> {
    const [updatedPost] = await db
      .update(contentPosts)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(contentPosts.id, id))
      .returning();
    
    if (!updatedPost) {
      throw new Error(`Content post with ID ${id} not found`);
    }
    
    return updatedPost;
  }

  async updateContentPostMetadata(id: number, metadata: any): Promise<void> {
    await db
      .update(contentPosts)
      .set({
        metadata,
        updatedAt: new Date()
      })
      .where(eq(contentPosts.id, id));
  }

  async deleteContentPost(id: number): Promise<void> {
    await db
      .delete(contentPosts)
      .where(eq(contentPosts.id, id));
  }

  async getActivePostCount(brandId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(contentPosts)
      .where(
        and(
          eq(contentPosts.brandId, brandId),
          eq(contentPosts.status, 'scheduled')
        )
      );
    
    return result[0]?.count || 0;
  }

  async getScheduledPostCount(brandId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(contentPosts)
      .where(
        and(
          eq(contentPosts.brandId, brandId),
          eq(contentPosts.status, 'scheduled')
        )
      );
    
    return result[0]?.count || 0;
  }

  async getUpcomingPosts(brandId: number, limit: number): Promise<ContentPost[]> {
    const now = new Date();
    
    return await db
      .select()
      .from(contentPosts)
      .where(
        and(
          eq(contentPosts.brandId, brandId),
          eq(contentPosts.status, 'scheduled'),
          gte(contentPosts.scheduledDate, now)
        )
      )
      .orderBy(contentPosts.scheduledDate)
      .limit(limit);
  }

  // Post Assignment operations
  async getPostAssignment(id: number): Promise<PostAssignment | undefined> {
    const [assignment] = await db
      .select()
      .from(postAssignments)
      .where(eq(postAssignments.id, id));
    
    return assignment;
  }

  async getPostAssignmentsByPostId(postId: number): Promise<PostAssignment[]> {
    return await db
      .select()
      .from(postAssignments)
      .where(eq(postAssignments.postId, postId));
  }

  async createPostAssignment(insertAssignment: InsertPostAssignment): Promise<PostAssignment> {
    const [assignment] = await db
      .insert(postAssignments)
      .values(insertAssignment)
      .returning();
    
    return assignment;
  }

  // Analytics operations
  async getAnalyticsByPostAndPartnerIds(postIds: number[], partnerIds: number[]): Promise<Analytics[]> {
    return await db
      .select()
      .from(analytics)
      .where(
        and(
          inArray(analytics.postId, postIds),
          inArray(analytics.partnerId, partnerIds)
        )
      );
  }

  async getTotalEngagements(brandId: number): Promise<number> {
    // First get posts for this brand
    const brandPosts = await this.getContentPostsByBrandId(brandId);
    const postIds = brandPosts.map(post => post.id);
    
    if (postIds.length === 0) {
      return 0;
    }
    
    // Then get total engagements
    const result = await db
      .select({ 
        total: sql<number>`sum(${analytics.engagements})` 
      })
      .from(analytics)
      .where(inArray(analytics.postId, postIds));
    
    return result[0]?.total || 0;
  }

  async getPerformanceMetrics(brandId: number): Promise<any> {
    // This would calculate performance metrics based on analytics data
    // For demo purposes, return mock data in the format expected by dashboard
    return {
      engagementRate: {
        current: 4.2,
        previous: 3.4,
        change: 0.8
      },
      clickThroughRate: {
        current: 2.8,
        previous: 2.5,
        change: 0.3
      },
      audienceGrowth: {
        current: 5.7,
        previous: 4.5,
        change: 1.2
      }
    };
  }

  // Activity operations - this would be more complex in a real implementation
  async getRecentActivity(brandId: number, limit: number): Promise<any[]> {
    // Get recent posts
    const recentPosts = await db
      .select()
      .from(contentPosts)
      .where(eq(contentPosts.brandId, brandId))
      .orderBy(desc(contentPosts.createdAt))
      .limit(limit);
    
    // Convert to activity items
    return recentPosts.map(post => ({
      type: 'post_created',
      entityId: post.id,
      entityType: 'post',
      title: post.title,
      date: post.createdAt,
      metadata: {
        postStatus: post.status
      }
    }));
  }

  // Media Library operations
  async getMediaItem(id: number): Promise<MediaLibraryItem | undefined> {
    const [item] = await db
      .select()
      .from(mediaLibrary)
      .where(eq(mediaLibrary.id, id));
    
    return item;
  }

  async getMediaByBrandId(brandId: number): Promise<MediaLibraryItem[]> {
    return await db
      .select()
      .from(mediaLibrary)
      .where(eq(mediaLibrary.brandId, brandId))
      .orderBy(desc(mediaLibrary.createdAt));
  }

  async createMediaItem(item: InsertMediaLibraryItem): Promise<MediaLibraryItem> {
    const [mediaItem] = await db
      .insert(mediaLibrary)
      .values(item)
      .returning();
    
    return mediaItem;
  }

  async updateMediaItem(id: number, data: Partial<MediaLibraryItem>): Promise<MediaLibraryItem> {
    const [updatedItem] = await db
      .update(mediaLibrary)
      .set(data)
      .where(eq(mediaLibrary.id, id))
      .returning();
    
    if (!updatedItem) {
      throw new Error(`Media item with ID ${id} not found`);
    }
    
    return updatedItem;
  }

  async deleteMediaItem(id: number): Promise<void> {
    await db
      .delete(mediaLibrary)
      .where(eq(mediaLibrary.id, id));
  }

  async getMediaByTags(brandId: number, tags: string[]): Promise<MediaLibraryItem[]> {
    // This is a simplistic approach - in a real implementation you'd need a more
    // sophisticated query to check array containment
    return await db
      .select()
      .from(mediaLibrary)
      .where(eq(mediaLibrary.brandId, brandId));
      // Filter post-query for tag matches
      // We'd do this better with SQL in a real implementation
  }

  // Implementation for retrieving retail partners by IDs
  async getRetailPartnersByIds(ids: number[]): Promise<RetailPartner[]> {
    if (ids.length === 0) return [];
    
    return await db
      .select()
      .from(retailPartners)
      .where(inArray(retailPartners.id, ids));
  }
}

// Use DatabaseStorage instead of MemStorage
export const storage = new DatabaseStorage();
