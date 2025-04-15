import { 
  User, InsertUser, 
  RetailPartner, InsertRetailPartner,
  SocialAccount, InsertSocialAccount,
  ContentPost, InsertContentPost, 
  PostAssignment, InsertPostAssignment,
  Analytics, InsertAnalytics
} from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

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
  
  // Session store
  sessionStore: ReturnType<typeof createMemoryStore>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private retailPartners: Map<number, RetailPartner>;
  private socialAccounts: Map<number, SocialAccount>;
  private contentPosts: Map<number, ContentPost>;
  private postAssignments: Map<number, PostAssignment>;
  private analytics: Map<number, Analytics>;
  
  private userIdCounter: number;
  private partnerIdCounter: number;
  private accountIdCounter: number;
  private postIdCounter: number;
  private assignmentIdCounter: number;
  private analyticsIdCounter: number;
  
  sessionStore: ReturnType<typeof createMemoryStore>;

  constructor() {
    this.users = new Map();
    this.retailPartners = new Map();
    this.socialAccounts = new Map();
    this.contentPosts = new Map();
    this.postAssignments = new Map();
    this.analytics = new Map();
    
    this.userIdCounter = 1;
    this.partnerIdCounter = 1;
    this.accountIdCounter = 1;
    this.postIdCounter = 1;
    this.assignmentIdCounter = 1;
    this.analyticsIdCounter = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    // Seed a demo user
    this.createUser({
      username: "demo",
      password: "password", // Will be hashed by our auth.ts hashPassword function
      name: "Acme Brands",
      email: "demo@example.com",
      role: "brand",
      planType: "premium"
    });
    
    // Seed some demo data
    this.seedDemoData();
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
      (account) => account.platform === platform && account.accountId === platformId
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
  
  // Seed demo data for testing
  private seedDemoData() {
    // Create retail partners
    const partners = [
      { name: "Riverside Cycles", status: "active", contactEmail: "contact@riversidecycles.com", connectionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
      { name: "Outdoor Supply Co.", status: "active", contactEmail: "info@outdoorsupply.com", connectionDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
      { name: "Gear Shop Seattle", status: "active", contactEmail: "hello@gearshopseattle.com", connectionDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      { name: "Mountain View Sports", status: "pending", contactEmail: "sales@mountainviewsports.com" },
      { name: "Urban Bikes & Gear", status: "pending", contactEmail: "support@urbanbikes.com" },
      { name: "Lakeside Outfitters", status: "pending", contactEmail: "team@lakesideoutfitters.com" },
      { name: "Adventure World", status: "needs_attention", contactEmail: "contact@adventureworld.com" },
      { name: "Trail Blazers", status: "needs_attention", contactEmail: "help@trailblazers.com" },
      { name: "Vintage Cycles", status: "inactive", contactEmail: "info@vintagecycles.com" }
    ];
    
    partners.forEach(partner => {
      this.createRetailPartner({
        ...partner,
        brandId: 1,
        contactPhone: "555-123-4567",
        address: "123 Main St, Anytown, USA"
      });
    });
    
    // Create social accounts for active partners
    const platforms = ["facebook", "instagram", "google"];
    for (let i = 1; i <= 3; i++) {
      platforms.forEach(platform => {
        this.createSocialAccount({
          partnerId: i,
          platform,
          accountId: `account_${platform}_${i}`,
          accountName: `${partners[i-1].name} ${platform.charAt(0).toUpperCase() + platform.slice(1)}`,
          accessToken: "mock_access_token",
          refreshToken: "mock_refresh_token",
          tokenExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });
      });
    }
    
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
      let imageUrl = "https://placehold.co/600x400";
      
      if (postData.title === "10 Ways to Improve Your Cycling") {
        imageUrl = "/assets/image_1744731251867.png";
      } else if (postData.title === "Summer Gear Essentials") {
        imageUrl = "/assets/image_1744731657291.png";
      } else if (postData.title === "Limited Edition Hiking Boots") {
        imageUrl = "/assets/image_1744733659358.png";
      } else if (postData.title === "Weekend Flash Sale") {
        imageUrl = "/assets/image_1744364224836.png";
      }
      
      const createdPost: ContentPost = { 
        ...postData,
        brandId: 1,
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
    
    // Create post assignments
    for (let postId = 1; postId <= 4; postId++) {
      for (let partnerId = 1; partnerId <= 3; partnerId++) {
        this.createPostAssignment({
          postId,
          partnerId,
          customFooter: "Visit us at our store! Call 555-123-4567 #localbusiness",
          customTags: "#sale #discount #localdeals"
        });
      }
    }
    
    // Create analytics data
    for (let postId = 1; postId <= 4; postId++) {
      for (let partnerId = 1; partnerId <= 3; partnerId++) {
        const platforms = ["facebook", "instagram", "google"];
        
        platforms.forEach(platform => {
          const analyticsId = this.analyticsIdCounter++;
          const impressions = Math.floor(Math.random() * 1000) + 500;
          const engagements = Math.floor(impressions * (Math.random() * 0.1 + 0.05));
          const clicks = Math.floor(engagements * (Math.random() * 0.3 + 0.2));
          const likes = Math.floor(engagements * (Math.random() * 0.5 + 0.2));
          const shares = Math.floor(engagements * (Math.random() * 0.1 + 0.05));
          const comments = Math.floor(engagements * (Math.random() * 0.1 + 0.02));
          
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
            date: new Date(Date.now() - Math.floor(Math.random() * 10) * 24 * 60 * 60 * 1000)
          };
          
          this.analytics.set(analyticsId, analytics);
        });
      }
    }
  }
}

export const storage = new MemStorage();
