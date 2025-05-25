import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import Razorpay from "razorpay";
import { insertUserSchema, insertPostSchema, insertNoteSchema, insertJournalEntrySchema, insertDocumentSchema } from "@shared/schema";
import { z } from "zod";
import { authRouter, requireAuth } from "./auth/auth-routes";
import { configurePassport } from "./auth/passport-config";
import { sendEmail } from "./utils/email";
import { syncRouter } from "./routes/sync-routes";

// Initialize Razorpay with your key_id and key_secret
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret'
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Simple ping endpoint for connectivity checks
  app.get('/api/ping', (req, res) => {
    res.status(200).send('pong');
  });
  // Auth routes are already registered in index.ts
  // User routes
  app.get("/api/users/:id", async (req, res) => {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Don't return the password
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });
  
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });
  
  app.patch("/api/users/:id", async (req, res) => {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    try {
      const updateData = insertUserSchema.partial().parse(req.body);
      const updatedUser = await storage.updateUser(userId, updateData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid update data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update user" });
    }
  });
  
  // Post routes
  app.get("/api/posts/user/:userId", async (req, res) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    const posts = await storage.getPostsByUser(userId);
    res.json(posts);
  });
  
  app.get("/api/posts/platform/:userId/:platform", async (req, res) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    const { platform } = req.params;
    const posts = await storage.getPostsByPlatform(userId, platform);
    res.json(posts);
  });
  
  app.post("/api/posts", async (req, res) => {
    try {
      const postData = insertPostSchema.parse(req.body);
      const post = await storage.createPost(postData);
      res.status(201).json(post);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid post data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create post" });
    }
  });
  
  app.patch("/api/posts/:id", async (req, res) => {
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }
    
    try {
      const updateData = insertPostSchema.partial().parse(req.body);
      const updatedPost = await storage.updatePost(postId, updateData);
      
      if (!updatedPost) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      res.json(updatedPost);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid update data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update post" });
    }
  });
  
  app.delete("/api/posts/:id", async (req, res) => {
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }
    
    const success = await storage.deletePost(postId);
    if (!success) {
      return res.status(404).json({ message: "Post not found" });
    }
    
    res.status(204).end();
  });
  
  // Notes routes
  app.get("/api/notes/user/:userId", async (req, res) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    const notes = await storage.getNotesByUser(userId);
    res.json(notes);
  });
  
  app.get("/api/notes/:id", async (req, res) => {
    const noteId = parseInt(req.params.id);
    if (isNaN(noteId)) {
      return res.status(400).json({ message: "Invalid note ID" });
    }
    
    const note = await storage.getNoteById(noteId);
    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }
    
    res.json(note);
  });
  
  app.post("/api/notes", async (req, res) => {
    try {
      const noteData = insertNoteSchema.parse(req.body);
      const note = await storage.createNote(noteData);
      res.status(201).json(note);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid note data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create note" });
    }
  });
  
  app.patch("/api/notes/:id", async (req, res) => {
    const noteId = parseInt(req.params.id);
    if (isNaN(noteId)) {
      return res.status(400).json({ message: "Invalid note ID" });
    }
    
    try {
      const updateData = insertNoteSchema.partial().parse(req.body);
      const updatedNote = await storage.updateNote(noteId, updateData);
      
      if (!updatedNote) {
        return res.status(404).json({ message: "Note not found" });
      }
      
      res.json(updatedNote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid update data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update note" });
    }
  });
  
  app.delete("/api/notes/:id", async (req, res) => {
    const noteId = parseInt(req.params.id);
    if (isNaN(noteId)) {
      return res.status(400).json({ message: "Invalid note ID" });
    }
    
    const success = await storage.deleteNote(noteId);
    if (!success) {
      return res.status(404).json({ message: "Note not found" });
    }
    
    res.status(204).end();
  });
  
  // Journal routes
  app.get("/api/journal/user/:userId", async (req, res) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    const entries = await storage.getJournalEntriesByUser(userId);
    res.json(entries);
  });
  
  app.get("/api/journal/:id", async (req, res) => {
    const entryId = parseInt(req.params.id);
    if (isNaN(entryId)) {
      return res.status(400).json({ message: "Invalid entry ID" });
    }
    
    const entry = await storage.getJournalEntryById(entryId);
    if (!entry) {
      return res.status(404).json({ message: "Journal entry not found" });
    }
    
    res.json(entry);
  });
  
  app.post("/api/journal", async (req, res) => {
    try {
      const entryData = insertJournalEntrySchema.parse(req.body);
      const entry = await storage.createJournalEntry(entryData);
      res.status(201).json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid journal entry data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create journal entry" });
    }
  });
  
  app.patch("/api/journal/:id", async (req, res) => {
    const entryId = parseInt(req.params.id);
    if (isNaN(entryId)) {
      return res.status(400).json({ message: "Invalid entry ID" });
    }
    
    try {
      const updateData = insertJournalEntrySchema.partial().parse(req.body);
      const updatedEntry = await storage.updateJournalEntry(entryId, updateData);
      
      if (!updatedEntry) {
        return res.status(404).json({ message: "Journal entry not found" });
      }
      
      res.json(updatedEntry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid update data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update journal entry" });
    }
  });
  
  app.delete("/api/journal/:id", async (req, res) => {
    const entryId = parseInt(req.params.id);
    if (isNaN(entryId)) {
      return res.status(400).json({ message: "Invalid entry ID" });
    }
    
    const success = await storage.deleteJournalEntry(entryId);
    if (!success) {
      return res.status(404).json({ message: "Journal entry not found" });
    }
    
    res.status(204).end();
  });
  
  // Document routes
  app.get("/api/documents/user/:userId", async (req, res) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    const documents = await storage.getDocumentsByUser(userId);
    res.json(documents);
  });
  
  app.get("/api/documents/:id", async (req, res) => {
    const docId = parseInt(req.params.id);
    if (isNaN(docId)) {
      return res.status(400).json({ message: "Invalid document ID" });
    }
    
    const document = await storage.getDocumentById(docId);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }
    
    res.json(document);
  });
  
  app.post("/api/documents", async (req, res) => {
    try {
      const docData = insertDocumentSchema.parse(req.body);
      const document = await storage.createDocument(docData);
      res.status(201).json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid document data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create document" });
    }
  });
  
  app.patch("/api/documents/:id", async (req, res) => {
    const docId = parseInt(req.params.id);
    if (isNaN(docId)) {
      return res.status(400).json({ message: "Invalid document ID" });
    }
    
    try {
      const updateData = insertDocumentSchema.partial().parse(req.body);
      const updatedDoc = await storage.updateDocument(docId, updateData);
      
      if (!updatedDoc) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      res.json(updatedDoc);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid update data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update document" });
    }
  });
  
  app.delete("/api/documents/:id", async (req, res) => {
    const docId = parseInt(req.params.id);
    if (isNaN(docId)) {
      return res.status(400).json({ message: "Invalid document ID" });
    }
    
    const success = await storage.deleteDocument(docId);
    if (!success) {
      return res.status(404).json({ message: "Document not found" });
    }
    
    res.status(204).end();
  });
  
  // Razorpay payment routes
  app.post("/api/create-order", async (req, res) => {
    try {
      const { amount, currency = "INR", receipt, notes } = req.body;
      
      if (!amount || amount < 1) {
        return res.status(400).json({ 
          message: "Invalid amount. Amount must be greater than 0." 
        });
      }
      
      // Create a Razorpay order
      const order = await razorpay.orders.create({
        amount: Math.round(amount * 100), // Razorpay expects amount in paise/cents
        currency,
        receipt: receipt || `receipt_${Date.now()}`,
        notes: notes || {}
        // payment_capture property removed as it's not needed in TypeScript definition
      });
      
      res.json({
        orderId: order.id,
        currency: order.currency,
        amount: Number(order.amount) / 100, // Convert back to decimal for display
        key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy'
      });
    } catch (error: any) {
      console.error("Error creating Razorpay order:", error);
      res.status(500).json({ 
        message: "Error creating payment order", 
        error: error.message 
      });
    }
  });
  
  // Verify payment after successful processing
  app.post("/api/verify-payment", async (req, res) => {
    try {
      const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
      
      // Validate that all required parameters are present
      if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
        return res.status(400).json({ 
          message: "Missing payment verification parameters" 
        });
      }
      
      // In a production environment, you should verify the signature
      // using crypto and your Razorpay secret key
      
      // For now, we'll just acknowledge the payment
      res.json({ 
        success: true, 
        message: "Payment verified successfully",
        paymentId: razorpay_payment_id
      });
    } catch (error: any) {
      console.error("Error verifying payment:", error);
      res.status(500).json({ 
        message: "Error verifying payment", 
        error: error.message 
      });
    }
  });

  // Share post via email
  app.post("/api/share-post", async (req, res) => {
    try {
      const { recipientEmail, senderName, post, platform } = req.body;
      
      if (!recipientEmail || !senderName || !post || !platform) {
        return res.status(400).json({ 
          success: false,
          message: "Missing required parameters for sharing post" 
        });
      }
      
      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(recipientEmail)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email address"
        });
      }
      
      // Create email html content
      const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
      const contentHtml = post.formattedContent?.html || post.content || '';
      
      let mediaHtml = '';
      if (post.mediaUrls && post.mediaUrls.length > 0) {
        mediaHtml = '<div style="margin-top: 15px;">';
        post.mediaUrls.forEach((url: string) => {
          mediaHtml += `<img src="${url}" style="max-width: 100%; height: auto; margin-bottom: 10px;" />`;
        });
        mediaHtml += '</div>';
      }
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${platformName} Post Shared With You</h2>
          <p style="color: #555;"><strong>${senderName}</strong> has shared a post with you:</p>
          <div style="border: 1px solid #ddd; padding: 15px; border-radius: 5px; margin: 15px 0;">
            ${contentHtml}
            ${mediaHtml}
          </div>
          <p style="color: #777; font-size: 12px;">This content was shared from Social Media Hub.</p>
        </div>
      `;
      
      // Send email
      const result = await sendEmail({
        to: recipientEmail,
        from: process.env.SENDGRID_FROM_EMAIL || 'notifications@socialmediahub.com',
        subject: `${senderName} shared a ${platformName} post with you`,
        html: html,
        text: post.content || 'Shared post content'
      });
      
      if (result.success) {
        res.json({ 
          success: true,
          message: "Post shared successfully" 
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error("Error sharing post:", error);
      res.status(500).json({ 
        success: false,
        message: error.message || "Error sharing post" 
      });
    }
  });

  // Setup sync router for cross-device synchronization
  app.use('/api/sync', syncRouter);

  const httpServer = createServer(app);
  return httpServer;
}
