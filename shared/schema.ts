import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password"),  // Can be null for OAuth users
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  profilePicture: text("profile_picture"),
  designation: text("designation"),
  // OAuth fields
  googleId: text("google_id").unique(),
  microsoftId: text("microsoft_id").unique(),
  facebookId: text("facebook_id").unique(),
  provider: text("provider"), // "local", "google", "microsoft", "facebook"
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  platform: text("platform").notNull(), // twitter, linkedin, facebook, etc.
  content: text("content").notNull(),
  formattedContent: jsonb("formatted_content").$type<{ 
    html?: string;
    videoUrl?: string;
    embedUrl?: string;
    title?: string;
    userName?: string;
    userDesignation?: string;
    userProfilePic?: string;
  }>(), // Stores formatting and rich content info including user profile data
  mediaUrls: text("media_urls").array(),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  formattedContent: jsonb("formatted_content").$type<{ html?: string }>(),
  tags: text("tags").array(),
  color: text("color"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const journalEntries = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  formattedContent: jsonb("formatted_content").$type<{ html?: string }>(),
  date: timestamp("date").defaultNow().notNull(),
  mood: text("mood"),
  weather: text("weather"),
  location: text("location"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  formattedContent: jsonb("formatted_content").$type<{ html?: string }>(),
  category: text("category"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  displayName: true,
  profilePicture: true,
  designation: true,
  googleId: true,
  microsoftId: true,
  facebookId: true,
  provider: true,
  accessToken: true,
  refreshToken: true,
});

export const insertPostSchema = createInsertSchema(posts).pick({
  userId: true,
  platform: true,
  content: true,
  formattedContent: true,
  mediaUrls: true,
  tags: true,
});

export const insertNoteSchema = createInsertSchema(notes).pick({
  userId: true,
  title: true,
  content: true,
  formattedContent: true,
  tags: true,
  color: true,
});

export const insertJournalEntrySchema = createInsertSchema(journalEntries).pick({
  userId: true,
  title: true,
  content: true,
  formattedContent: true,
  date: true,
  mood: true,
  weather: true,
  location: true,
  tags: true,
});

export const insertDocumentSchema = createInsertSchema(documents).pick({
  userId: true,
  title: true,
  content: true,
  formattedContent: true,
  category: true,
  tags: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;

export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Note = typeof notes.$inferSelect;

export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type JournalEntry = typeof journalEntries.$inferSelect;

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
