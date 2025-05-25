import { 
  users, User, InsertUser, 
  posts, Post, InsertPost,
  notes, Note, InsertNote,
  journalEntries, JournalEntry, InsertJournalEntry,
  documents, Document, InsertDocument
} from "@shared/schema";


export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;
  
  // Post methods
  getPostsByUser(userId: number): Promise<Post[]>;
  getPostsByPlatform(userId: number, platform: string): Promise<Post[]>;
  createPost(post: InsertPost): Promise<Post>;
  updatePost(id: number, data: Partial<InsertPost>): Promise<Post | undefined>;
  deletePost(id: number): Promise<boolean>;
  
  // Notes methods
  getNotesByUser(userId: number): Promise<Note[]>;
  getNoteById(id: number): Promise<Note | undefined>;
  createNote(note: InsertNote): Promise<Note>;
  updateNote(id: number, data: Partial<InsertNote>): Promise<Note | undefined>;
  deleteNote(id: number): Promise<boolean>;
  
  // Journal methods
  getJournalEntriesByUser(userId: number): Promise<JournalEntry[]>;
  getJournalEntryById(id: number): Promise<JournalEntry | undefined>;
  createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry>;
  updateJournalEntry(id: number, data: Partial<InsertJournalEntry>): Promise<JournalEntry | undefined>;
  deleteJournalEntry(id: number): Promise<boolean>;
  
  // Document methods
  getDocumentsByUser(userId: number): Promise<Document[]>;
  getDocumentById(id: number): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, data: Partial<InsertDocument>): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private posts: Map<number, Post>;
  private notes: Map<number, Note>;
  private journalEntries: Map<number, JournalEntry>;
  private documents: Map<number, Document>;
  private userIdCounter: number;
  private postIdCounter: number;
  private noteIdCounter: number;
  private journalIdCounter: number;
  private documentIdCounter: number;

  constructor() {
    this.users = new Map();
    this.posts = new Map();
    this.notes = new Map();
    this.journalEntries = new Map();
    this.documents = new Map();
    this.userIdCounter = 1;
    this.postIdCounter = 1;
    this.noteIdCounter = 1;
    this.journalIdCounter = 1;
    this.documentIdCounter = 1;
    
    // Initialize with a demo user
    this.createUser({
      username: "demouser",
      email: "demo@example.com",
      password: "password",
      displayName: "Demo User",
      profilePicture: "/default-profile.jpg",
      designation: "Software Engineer",
      provider: "local"
    });
  }

  // User methods
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

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.googleId === googleId,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    // Ensure all required fields are properly set with default values if not provided
    const user: User = {
      id,
      username: insertUser.username,
      email: insertUser.email,
      password: insertUser.password || null,
      displayName: insertUser.displayName || null,
      profilePicture: insertUser.profilePicture || null,
      designation: insertUser.designation || null,
      googleId: insertUser.googleId || null,
      microsoftId: insertUser.microsoftId || null,
      facebookId: insertUser.facebookId || null,
      provider: insertUser.provider || 'local',
      accessToken: insertUser.accessToken || null,
      refreshToken: insertUser.refreshToken || null
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...data };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Post methods
  async getPostsByUser(userId: number): Promise<Post[]> {
    return Array.from(this.posts.values()).filter(post => post.userId === userId);
  }
  
  async getPostsByPlatform(userId: number, platform: string): Promise<Post[]> {
    return Array.from(this.posts.values())
      .filter(post => post.userId === userId && post.platform === platform);
  }
  
  async createPost(insertPost: InsertPost): Promise<Post> {
    const id = this.postIdCounter++;
    const now = new Date();
    
    // Type assertion to fix TypeScript error
    const formattedContent = insertPost.formattedContent ? {
      html: insertPost.formattedContent.html as string | undefined,
      videoUrl: insertPost.formattedContent.videoUrl as string | undefined,
      embedUrl: insertPost.formattedContent.embedUrl as string | undefined,
      title: insertPost.formattedContent.title as string | undefined
    } : null;
    
    const post: Post = { 
      id,
      userId: insertPost.userId,
      platform: insertPost.platform,
      content: insertPost.content,
      formattedContent,
      mediaUrls: insertPost.mediaUrls || null,
      createdAt: now
    };
    this.posts.set(id, post);
    return post;
  }
  
  async updatePost(id: number, data: Partial<InsertPost>): Promise<Post | undefined> {
    const post = this.posts.get(id);
    if (!post) return undefined;
    
    // Process formattedContent to ensure correct types
    let processedData: Partial<Post> = { ...data };
    
    if (data.formattedContent) {
      processedData.formattedContent = {
        html: data.formattedContent.html as string | undefined,
        videoUrl: data.formattedContent.videoUrl as string | undefined,
        embedUrl: data.formattedContent.embedUrl as string | undefined,
        title: data.formattedContent.title as string | undefined
      };
    }
    
    const updatedPost = { ...post, ...processedData };
    this.posts.set(id, updatedPost);
    return updatedPost;
  }
  
  async deletePost(id: number): Promise<boolean> {
    return this.posts.delete(id);
  }
  
  // Notes methods
  async getNotesByUser(userId: number): Promise<Note[]> {
    return Array.from(this.notes.values())
      .filter(note => note.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }
  
  async getNoteById(id: number): Promise<Note | undefined> {
    return this.notes.get(id);
  }
  
  async createNote(insertNote: InsertNote): Promise<Note> {
    const id = this.noteIdCounter++;
    const now = new Date();
    
    // Type assertion to fix TypeScript error
    const formattedContent = insertNote.formattedContent ? {
      html: insertNote.formattedContent.html as string | undefined
    } : null;
    
    const note: Note = { 
      id,
      userId: insertNote.userId,
      title: insertNote.title,
      content: insertNote.content,
      formattedContent,
      tags: insertNote.tags || null,
      color: insertNote.color || null,
      createdAt: now,
      updatedAt: now
    };
    this.notes.set(id, note);
    return note;
  }
  
  async updateNote(id: number, data: Partial<InsertNote>): Promise<Note | undefined> {
    const note = this.notes.get(id);
    if (!note) return undefined;
    
    // Process formattedContent to ensure correct types
    let processedData: Partial<Note> = { ...data };
    
    if (data.formattedContent) {
      processedData.formattedContent = {
        html: data.formattedContent.html as string | undefined
      };
    }
    
    const now = new Date();
    const updatedNote = { ...note, ...processedData, updatedAt: now };
    this.notes.set(id, updatedNote);
    return updatedNote;
  }
  
  async deleteNote(id: number): Promise<boolean> {
    return this.notes.delete(id);
  }
  
  // Journal methods
  async getJournalEntriesByUser(userId: number): Promise<JournalEntry[]> {
    return Array.from(this.journalEntries.values())
      .filter(entry => entry.userId === userId)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }
  
  async getJournalEntryById(id: number): Promise<JournalEntry | undefined> {
    return this.journalEntries.get(id);
  }
  
  async createJournalEntry(insertEntry: InsertJournalEntry): Promise<JournalEntry> {
    const id = this.journalIdCounter++;
    const now = new Date();
    
    // Type assertion to fix TypeScript error
    const formattedContent = insertEntry.formattedContent ? {
      html: insertEntry.formattedContent.html as string | undefined
    } : null;
    
    const entry: JournalEntry = { 
      id,
      userId: insertEntry.userId,
      title: insertEntry.title,
      content: insertEntry.content,
      date: insertEntry.date || now,
      formattedContent,
      tags: insertEntry.tags || null,
      mood: insertEntry.mood || null,
      weather: insertEntry.weather || null,
      location: insertEntry.location || null,
      createdAt: now,
      updatedAt: now
    };
    this.journalEntries.set(id, entry);
    return entry;
  }
  
  async updateJournalEntry(id: number, data: Partial<InsertJournalEntry>): Promise<JournalEntry | undefined> {
    const entry = this.journalEntries.get(id);
    if (!entry) return undefined;
    
    // Process formattedContent to ensure correct types
    let processedData: Partial<JournalEntry> = { ...data };
    
    if (data.formattedContent) {
      processedData.formattedContent = {
        html: data.formattedContent.html as string | undefined
      };
    }
    
    const now = new Date();
    const updatedEntry = { ...entry, ...processedData, updatedAt: now };
    this.journalEntries.set(id, updatedEntry);
    return updatedEntry;
  }
  
  async deleteJournalEntry(id: number): Promise<boolean> {
    return this.journalEntries.delete(id);
  }
  
  // Document methods
  async getDocumentsByUser(userId: number): Promise<Document[]> {
    return Array.from(this.documents.values())
      .filter(doc => doc.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }
  
  async getDocumentById(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }
  
  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.documentIdCounter++;
    const now = new Date();
    
    // Type assertion to fix TypeScript error
    const formattedContent = insertDocument.formattedContent ? {
      html: insertDocument.formattedContent.html as string | undefined
    } : null;
    
    const document: Document = { 
      id,
      userId: insertDocument.userId,
      title: insertDocument.title,
      content: insertDocument.content,
      formattedContent,
      category: insertDocument.category || null,
      createdAt: now,
      updatedAt: now
    };
    this.documents.set(id, document);
    return document;
  }
  
  async updateDocument(id: number, data: Partial<InsertDocument>): Promise<Document | undefined> {
    const document = this.documents.get(id);
    if (!document) return undefined;
    
    // Process formattedContent to ensure correct types
    let processedData: Partial<Document> = { ...data };
    
    if (data.formattedContent) {
      processedData.formattedContent = {
        html: data.formattedContent.html as string | undefined
      };
    }
    
    const now = new Date();
    const updatedDocument = { ...document, ...processedData, updatedAt: now };
    this.documents.set(id, updatedDocument);
    return updatedDocument;
  }
  
  async deleteDocument(id: number): Promise<boolean> {
    return this.documents.delete(id);
  }
}

import { PgStorage } from './pg-storage';

// Use PostgreSQL storage instead of in-memory storage
export const storage = new PgStorage();

// Fix for type issues: Define the correct expected output for formattedContent
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

// Utility function to safely cast formatted content to appropriate type
function safeFormattedContent<T>(content: any | null): T | null {
  if (content === null || content === undefined) return null;
  
  // Convert unknown types to their proper string types
  if (typeof content === 'object') {
    const result: any = {};
    for (const key in content) {
      if (Object.prototype.hasOwnProperty.call(content, key)) {
        const value = content[key];
        // Convert any non-null value to string if it's not already a string
        if (value !== null && value !== undefined) {
          result[key] = typeof value === 'string' ? value : String(value);
        } else {
          result[key] = value;
        }
      }
    }
    return result as T;
  }
  
  return content as T;
}
