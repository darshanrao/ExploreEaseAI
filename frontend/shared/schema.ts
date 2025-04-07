import { pgTable, text, serial, integer, timestamp, json, type PgArray } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  googleId: text("google_id").unique(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
});

// Preferences table
export const preferences = pgTable("preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  date_from: text("date_from").notNull(),
  date_to: text("date_to").notNull(),
  location: text("location").notNull(),
  travel_style: text("travel_style").notNull(),
  food_preference: text("food_preference").notNull(),
  budget: text("budget").notNull(),
  transport_mode: text("transport_mode").notNull(),
  time_preference: text("time_preference").notNull(),
  activity_intensity: text("activity_intensity").notNull(),
  interests: text("interests").array().notNull(),
  custom_preferences: text("custom_preferences"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Define the metadata structure for recommendations
export type RecommendationMetadata = {
  image_reference?: string;
  attraction_type?: string;
  vicinity?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
};

// Recommendations table
export const recommendations = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  preferenceId: integer("preference_id").references(() => preferences.id),
  name: text("name").notNull(),
  type: text("type").notNull(),
  day: integer("day").notNull(),
  timeOfDay: text("time_of_day").notNull(),
  rating: text("rating").notNull(),
  reviewCount: integer("review_count").notNull(),
  distance: text("distance").notNull(),
  location: text("location"),
  openingHours: text("opening_hours").notNull(),
  description: text("description").notNull(),
  metadata: json("metadata").$type<RecommendationMetadata>(), // Specify the type for metadata
  createdAt: timestamp("created_at").defaultNow(),
});

// Feedback table
export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  recommendationId: integer("recommendation_id").references(() => recommendations.id),
  type: text("type").notNull(), // 'like' or 'dislike'
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Calendar events table
export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  eventId: text("event_id").notNull(), // Renamed from googleEventId
  title: text("title").notNull(), // Renamed from summary
  description: text("description"), // Added description
  startTime: timestamp("start_time").notNull(), // Renamed from start
  endTime: timestamp("end_time").notNull(), // Renamed from end
  location: text("location"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Define Zod schemas for insertion
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  googleId: true,
  accessToken: true,
  refreshToken: true,
  tokenExpiresAt: true,
});

export const insertPreferenceSchema = createInsertSchema(preferences).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertRecommendationSchema = createInsertSchema(recommendations).omit({
  id: true,
  createdAt: true,
});

export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({
  id: true,
  createdAt: true,
});

// Define types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertPreference = z.infer<typeof insertPreferenceSchema>;
export type Preference = typeof preferences.$inferSelect;

export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type Recommendation = typeof recommendations.$inferSelect;

export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedback.$inferSelect;

export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type CalendarEvent = typeof calendarEvents.$inferSelect;

// Google OAuth token type
export type GoogleToken = {
  access_token: string;
  id_token: string;
  expires_at: number;
};

// New types for itinerary data from backend agent
export type ItineraryPoint = {
  type: string; // Accept any type string (start, attraction, food, etc.)
  time: string;
  end_time?: string;
  location: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  description: string;
  rating?: number;
  
  // Additional fields for enhanced display
  attraction_type?: string;      // Type of attraction (restaurant, museum, etc.)
  vicinity?: string;            // Human-readable address/vicinity
  image_reference?: string;     // Reference to an image
};

export type Itinerary = ItineraryPoint[];
