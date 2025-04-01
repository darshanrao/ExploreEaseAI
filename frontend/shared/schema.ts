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
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  destination: text("destination").notNull(),
  interests: text("interests"),
  locationTypes: text("location_types").array().notNull(),
  timePreferences: text("time_preferences").array().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

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
  openingHours: text("opening_hours").notNull(),
  description: text("description").notNull(),
  metadata: json("metadata"),
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
  userId: true,
  createdAt: true,
});

export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({
  id: true,
  userId: true,
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
