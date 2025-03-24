import { pgTable, text, serial, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User types
export const userTypes = ["CARE_SEEKER", "CARE_PROVIDER"] as const;
export type UserType = typeof userTypes[number];

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  phoneNumber: text("phone_number"),
  fullName: text("full_name"),
  userType: text("user_type").$type<UserType>(),
  profileImageUrl: text("profile_image_url"),
  isVerified: boolean("is_verified").default(false),
  rating: real("rating"),
  totalReviews: integer("total_reviews").default(0),
  hourlyRate: real("hourly_rate"),
  bio: text("bio"),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  rating: true,
  totalReviews: true,
  createdAt: true
});

// Care request model
export const careRequests = pgTable("care_requests", {
  id: serial("id").primaryKey(),
  userSeekerId: integer("user_seeker_id").notNull(),
  userProviderId: integer("user_provider_id"),
  requestDescription: text("request_description").notNull(),
  requestSummary: text("request_summary"),
  requestDetails: text("request_details"),
  status: text("status").notNull().default("PENDING"),
  duration: integer("duration"), // in minutes
  estimatedCost: real("estimated_cost"),
  location: text("location"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  createdAt: timestamp("created_at").defaultNow(),
  scheduledFor: timestamp("scheduled_for")
});

export const insertCareRequestSchema = createInsertSchema(careRequests).omit({
  id: true, 
  createdAt: true,
  userProviderId: true,
  status: true
});

// Provider status model for tracking availability and location
export const providerStatus = pgTable("provider_status", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  isOnline: boolean("is_online").default(false),
  latitude: real("latitude"),
  longitude: real("longitude"),
  lastUpdated: timestamp("last_updated").defaultNow()
});

export const insertProviderStatusSchema = createInsertSchema(providerStatus).omit({
  id: true,
  lastUpdated: true
});

// Provider services
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description")
});

export const providerServices = pgTable("provider_services", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull(),
  serviceId: integer("service_id").notNull()
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCareRequest = z.infer<typeof insertCareRequestSchema>;
export type CareRequest = typeof careRequests.$inferSelect;

export type InsertProviderStatus = z.infer<typeof insertProviderStatusSchema>;
export type ProviderStatus = typeof providerStatus.$inferSelect;
