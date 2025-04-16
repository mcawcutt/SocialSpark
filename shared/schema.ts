import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Users schema with expanded role system
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("brand"), // "admin", "brand", or "partner"
  planType: text("plan_type").default("standard"), // "standard" or "premium"
  parentId: integer("parent_id"), // For multi-brand management (child brands under a parent)
  createdAt: timestamp("created_at").defaultNow(),
});

// Define relations for the users table
export const usersRelations = relations(users, ({ one, many }) => ({
  parentUser: one(users, {
    fields: [users.parentId],
    references: [users.id],
    relationName: "parentChild",
  }),
  childUsers: many(users, { relationName: "parentChild" }),
  retailPartners: many(retailPartners, { relationName: "userPartners" }),
  brands: many(brands, { relationName: "userBrands" }),
}));

// Brands table for multiple brands per user
export const brands = pgTable("brands", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: integer("owner_id").notNull(), // References users.id
  logo: text("logo"),
  primaryColor: text("primary_color"),
  metadata: jsonb("metadata"), // Store additional brand data
  createdAt: timestamp("created_at").defaultNow(),
});

// Define relations for the brands table
export const brandsRelations = relations(brands, ({ one, many }) => ({
  owner: one(users, {
    fields: [brands.ownerId],
    references: [users.id],
    relationName: "userBrands",
  }),
  retailPartners: many(retailPartners, { relationName: "brandPartners" }),
  contentPosts: many(contentPosts, { relationName: "brandPosts" }),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  role: true,
  planType: true,
  parentId: true,
});

export const insertBrandSchema = createInsertSchema(brands).pick({
  name: true,
  ownerId: true,
  logo: true,
  primaryColor: true,
  metadata: true,
});

// Retail partners schema
export const retailPartners = pgTable("retail_partners", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  brandId: integer("brand_id").notNull(), // References brands.id
  userId: integer("user_id"), // For partner login, references users.id
  status: text("status").notNull().default("pending"), // "active", "pending", "inactive", "needs_attention"
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),
  address: text("address"),
  footerTemplate: text("footer_template"), // Default footer template for all posts
  metadata: jsonb("metadata"), // Store additional data like tags, categories, etc.
  createdAt: timestamp("created_at").defaultNow(),
  connectionDate: timestamp("connection_date"),
});

// Define relations for retail partners
export const retailPartnersRelations = relations(retailPartners, ({ one, many }) => ({
  brand: one(brands, {
    fields: [retailPartners.brandId],
    references: [brands.id],
    relationName: "brandPartners",
  }),
  user: one(users, {
    fields: [retailPartners.userId],
    references: [users.id],
    relationName: "userPartners",
  }),
  socialAccounts: many(socialAccounts, { relationName: "partnerAccounts" }),
  postAssignments: many(postAssignments, { relationName: "partnerPosts" }),
}));

export const insertRetailPartnerSchema = createInsertSchema(retailPartners).pick({
  name: true,
  brandId: true,
  userId: true,
  status: true,
  contactEmail: true,
  contactPhone: true,
  address: true,
  footerTemplate: true,
  metadata: true,
});

// Social accounts schema
export const socialAccounts = pgTable("social_accounts", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id").notNull(),
  platform: text("platform").notNull(), // "facebook", "instagram", "google"
  accountId: text("account_id").notNull(),
  accountName: text("account_name").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenExpiry: timestamp("token_expiry"),
  status: text("status").notNull().default("active"), // "active", "expired", "revoked"
  createdAt: timestamp("created_at").defaultNow(),
});

// Define relations for social accounts
export const socialAccountsRelations = relations(socialAccounts, ({ one }) => ({
  retailPartner: one(retailPartners, {
    fields: [socialAccounts.partnerId],
    references: [retailPartners.id],
    relationName: "partnerAccounts",
  }),
}));

export const insertSocialAccountSchema = createInsertSchema(socialAccounts).pick({
  partnerId: true,
  platform: true,
  accountId: true,
  accountName: true,
  accessToken: true,
  refreshToken: true,
  tokenExpiry: true,
});

// Content posts schema
export const contentPosts = pgTable("content_posts", {
  id: serial("id").primaryKey(),
  brandId: integer("brand_id").notNull(), // References brands.id
  creatorId: integer("creator_id").notNull(), // References users.id (who created the post)
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  platforms: text("platforms").array().notNull(), // ["facebook", "instagram", "google"]
  scheduledDate: timestamp("scheduled_date"),
  publishedDate: timestamp("published_date"),
  status: text("status").notNull().default("draft"), // "draft", "scheduled", "published", "automated"
  isEvergreen: boolean("is_evergreen").default(false),
  metadata: jsonb("metadata"), // Store additional data like tags, categories, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Define relations for content posts
export const contentPostsRelations = relations(contentPosts, ({ one, many }) => ({
  brand: one(brands, {
    fields: [contentPosts.brandId],
    references: [brands.id],
    relationName: "brandPosts",
  }),
  creator: one(users, {
    fields: [contentPosts.creatorId],
    references: [users.id],
  }),
  assignments: many(postAssignments, { relationName: "postAssignments" }),
}));

export const insertContentPostSchema = createInsertSchema(contentPosts).pick({
  brandId: true,
  creatorId: true,
  title: true,
  description: true,
  imageUrl: true,
  platforms: true,
  scheduledDate: true,
  status: true,
  isEvergreen: true,
  metadata: true,
});

// Post assignments schema (which posts to which partners)
export const postAssignments = pgTable("post_assignments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  partnerId: integer("partner_id").notNull(),
  customFooter: text("custom_footer"),
  customTags: text("custom_tags"),
  status: text("status").notNull().default("pending"), // "pending", "published", "failed"
  publishedUrl: text("published_url"),
  publishedDate: timestamp("published_date"),
  metadata: jsonb("metadata"), // Store additional data for evergreen posts
  createdAt: timestamp("created_at").defaultNow(),
});

// Define relations for post assignments
export const postAssignmentsRelations = relations(postAssignments, ({ one }) => ({
  post: one(contentPosts, {
    fields: [postAssignments.postId],
    references: [contentPosts.id],
    relationName: "postAssignments",
  }),
  partner: one(retailPartners, {
    fields: [postAssignments.partnerId],
    references: [retailPartners.id],
    relationName: "partnerPosts",
  }),
}));

export const insertPostAssignmentSchema = createInsertSchema(postAssignments).pick({
  postId: true,
  partnerId: true,
  customFooter: true,
  customTags: true,
  metadata: true,
});

// Analytics schema
export const analytics = pgTable("analytics", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  partnerId: integer("partner_id").notNull(),
  platform: text("platform").notNull(),
  impressions: integer("impressions").default(0),
  engagements: integer("engagements").default(0),
  clicks: integer("clicks").default(0),
  shares: integer("shares").default(0),
  likes: integer("likes").default(0),
  comments: integer("comments").default(0),
  date: timestamp("date").defaultNow(),
});

export const insertAnalyticsSchema = createInsertSchema(analytics).pick({
  postId: true,
  partnerId: true,
  platform: true,
  impressions: true,
  engagements: true,
  clicks: true,
  shares: true,
  likes: true,
  comments: true,
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type RetailPartner = typeof retailPartners.$inferSelect;
export type InsertRetailPartner = z.infer<typeof insertRetailPartnerSchema>;

export type SocialAccount = typeof socialAccounts.$inferSelect;
export type InsertSocialAccount = z.infer<typeof insertSocialAccountSchema>;

export type ContentPost = typeof contentPosts.$inferSelect;
export type InsertContentPost = z.infer<typeof insertContentPostSchema>;

export type PostAssignment = typeof postAssignments.$inferSelect;
export type InsertPostAssignment = z.infer<typeof insertPostAssignmentSchema>;

export type Analytics = typeof analytics.$inferSelect;
export type InsertAnalytics = z.infer<typeof insertAnalyticsSchema>;

// Media Library Schema
export const mediaLibrary = pgTable("media_library", {
  id: serial("id").primaryKey(),
  brandId: integer("brand_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type").notNull(),
  description: text("description"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMediaLibrarySchema = createInsertSchema(mediaLibrary).pick({
  brandId: true,
  name: true,
  fileUrl: true,
  fileType: true,
  description: true,
  tags: true,
});

export type MediaLibraryItem = typeof mediaLibrary.$inferSelect;
export type InsertMediaLibraryItem = z.infer<typeof insertMediaLibrarySchema>;
