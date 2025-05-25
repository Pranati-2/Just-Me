import { pool, withTransaction } from './database';
import type { IStorage } from './storage';
import { 
  User, InsertUser,
  Post, InsertPost,
  Note, InsertNote,
  JournalEntry, InsertJournalEntry,
  Document, InsertDocument
} from '@shared/schema';

export class PgStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0] || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || undefined;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const result = await pool.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
    return result.rows[0] || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const { 
      username, 
      password, 
      email,
      displayName, 
      profilePicture, 
      designation,
      googleId,
      microsoftId,
      facebookId,
      provider,
      accessToken,
      refreshToken
    } = user;
    
    const result = await pool.query(
      `INSERT INTO users (
        username, 
        password, 
        email,
        display_name, 
        profile_picture, 
        designation,
        google_id,
        microsoft_id,
        facebook_id,
        provider,
        access_token,
        refresh_token
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
      RETURNING *`,
      [
        username, 
        password, 
        email,
        displayName, 
        profilePicture, 
        designation,
        googleId,
        microsoftId,
        facebookId,
        provider,
        accessToken,
        refreshToken
      ]
    );
    return result.rows[0];
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    console.log(`PgStorage.updateUser: Updating user ID ${id}`);
    
    // Build dynamic query based on provided fields
    const fields: string[] = [];
    const values: any[] = [];
    let paramCounter = 1;
    
    // Map camelCase to snake_case
    const fieldMap: Record<string, string> = {
      username: 'username',
      password: 'password',
      email: 'email',
      displayName: 'display_name',
      profilePicture: 'profile_picture',
      designation: 'designation',
      googleId: 'google_id',
      microsoftId: 'microsoft_id',
      facebookId: 'facebook_id',
      provider: 'provider',
      accessToken: 'access_token',
      refreshToken: 'refresh_token'
    };

    // Profile picture size check and logging
    if (data.profilePicture) {
      console.log(`Profile picture received for update. Size: ${Math.round(data.profilePicture.length / 1024)}KB`);
      
      // Check for very large images that might cause issues (>2MB)
      if (data.profilePicture.length > 2 * 1024 * 1024) {
        console.warn('Profile picture too large! It should be optimized on the client side.');
      }
    }

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && fieldMap[key]) {
        fields.push(`${fieldMap[key]} = $${paramCounter}`);
        values.push(value);
        paramCounter++;
        
        // Log fields being updated (except don't log full profile picture data)
        if (key !== 'profilePicture') {
          console.log(`Updating field: ${key} = ${value}`);
        } else {
          console.log(`Updating field: ${key} = [base64 data]`);
        }
      }
    }

    if (fields.length === 0) {
      console.log('No fields to update');
      return this.getUser(id);
    }

    values.push(id);
    const query = `
      UPDATE users 
      SET ${fields.join(', ')}
      WHERE id = $${paramCounter} 
      RETURNING *
    `;

    try {
      const result = await pool.query(query, values);
      console.log(`User update successful. Rows affected: ${result.rowCount}`);
      return result.rows[0] || undefined;
    } catch (error) {
      console.error('Error updating user in database:', error);
      throw error;
    }
  }

  // Post methods
  async getPostsByUser(userId: number): Promise<Post[]> {
    const result = await pool.query('SELECT * FROM posts WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    return result.rows;
  }

  async getPostsByPlatform(userId: number, platform: string): Promise<Post[]> {
    const result = await pool.query(
      'SELECT * FROM posts WHERE user_id = $1 AND platform = $2 ORDER BY created_at DESC',
      [userId, platform]
    );
    return result.rows;
  }

  async createPost(post: InsertPost): Promise<Post> {
    const { userId, platform, content, formattedContent, mediaUrls } = post;
    const result = await pool.query(
      `INSERT INTO posts (user_id, platform, content, formatted_content, media_urls) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [userId, platform, content, formattedContent, mediaUrls]
    );
    return result.rows[0];
  }

  async updatePost(id: number, data: Partial<InsertPost>): Promise<Post | undefined> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCounter = 1;
    
    // Map camelCase to snake_case
    const fieldMap: Record<string, string> = {
      userId: 'user_id',
      platform: 'platform',
      content: 'content',
      formattedContent: 'formatted_content',
      mediaUrls: 'media_urls'
    };

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && fieldMap[key]) {
        fields.push(`${fieldMap[key]} = $${paramCounter}`);
        values.push(value);
        paramCounter++;
      }
    }

    if (fields.length === 0) {
      const result = await pool.query('SELECT * FROM posts WHERE id = $1', [id]);
      return result.rows[0] || undefined;
    }

    values.push(id);
    const query = `
      UPDATE posts 
      SET ${fields.join(', ')}
      WHERE id = $${paramCounter} 
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || undefined;
  }

  async deletePost(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM posts WHERE id = $1 RETURNING id', [id]);
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Note methods
  async getNotesByUser(userId: number): Promise<Note[]> {
    const result = await pool.query('SELECT * FROM notes WHERE user_id = $1 ORDER BY updated_at DESC', [userId]);
    return result.rows;
  }

  async getNoteById(id: number): Promise<Note | undefined> {
    const result = await pool.query('SELECT * FROM notes WHERE id = $1', [id]);
    return result.rows[0] || undefined;
  }

  async createNote(note: InsertNote): Promise<Note> {
    const { userId, title, content, formattedContent, tags, color } = note;
    const result = await pool.query(
      `INSERT INTO notes (user_id, title, content, formatted_content, tags, color) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [userId, title, content, formattedContent, tags, color]
    );
    return result.rows[0];
  }

  async updateNote(id: number, data: Partial<InsertNote>): Promise<Note | undefined> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCounter = 1;
    
    // Map camelCase to snake_case
    const fieldMap: Record<string, string> = {
      userId: 'user_id',
      title: 'title',
      content: 'content',
      formattedContent: 'formatted_content',
      tags: 'tags',
      color: 'color'
    };

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && fieldMap[key]) {
        fields.push(`${fieldMap[key]} = $${paramCounter}`);
        values.push(value);
        paramCounter++;
      }
    }

    if (fields.length === 0) {
      return this.getNoteById(id);
    }

    values.push(id);
    const query = `
      UPDATE notes 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $${paramCounter} 
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || undefined;
  }

  async deleteNote(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM notes WHERE id = $1 RETURNING id', [id]);
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Journal methods
  async getJournalEntriesByUser(userId: number): Promise<JournalEntry[]> {
    const result = await pool.query(
      'SELECT * FROM journal_entries WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  }

  async getJournalEntryById(id: number): Promise<JournalEntry | undefined> {
    const result = await pool.query('SELECT * FROM journal_entries WHERE id = $1', [id]);
    return result.rows[0] || undefined;
  }

  async createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry> {
    const { userId, title, content, formattedContent, date, mood, weather, location, tags } = entry;
    const result = await pool.query(
      `INSERT INTO journal_entries (user_id, title, content, formatted_content, date, mood, weather, location, tags) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [userId, title, content, formattedContent, date, mood, weather, location, tags]
    );
    return result.rows[0];
  }

  async updateJournalEntry(id: number, data: Partial<InsertJournalEntry>): Promise<JournalEntry | undefined> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCounter = 1;
    
    // Map camelCase to snake_case
    const fieldMap: Record<string, string> = {
      userId: 'user_id',
      title: 'title',
      content: 'content',
      formattedContent: 'formatted_content',
      date: 'date',
      mood: 'mood',
      weather: 'weather',
      location: 'location',
      tags: 'tags'
    };

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && fieldMap[key]) {
        fields.push(`${fieldMap[key]} = $${paramCounter}`);
        values.push(value);
        paramCounter++;
      }
    }

    if (fields.length === 0) {
      return this.getJournalEntryById(id);
    }

    values.push(id);
    const query = `
      UPDATE journal_entries 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $${paramCounter} 
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || undefined;
  }

  async deleteJournalEntry(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM journal_entries WHERE id = $1 RETURNING id', [id]);
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Document methods
  async getDocumentsByUser(userId: number): Promise<Document[]> {
    const result = await pool.query(
      'SELECT * FROM documents WHERE user_id = $1 ORDER BY updated_at DESC',
      [userId]
    );
    return result.rows;
  }

  async getDocumentById(id: number): Promise<Document | undefined> {
    const result = await pool.query('SELECT * FROM documents WHERE id = $1', [id]);
    return result.rows[0] || undefined;
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const { userId, title, content, formattedContent, category } = document;
    const result = await pool.query(
      `INSERT INTO documents (user_id, title, content, formatted_content, category) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [userId, title, content, formattedContent, category]
    );
    return result.rows[0];
  }

  async updateDocument(id: number, data: Partial<InsertDocument>): Promise<Document | undefined> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCounter = 1;
    
    // Map camelCase to snake_case
    const fieldMap: Record<string, string> = {
      userId: 'user_id',
      title: 'title',
      content: 'content',
      formattedContent: 'formatted_content',
      category: 'category'
    };

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && fieldMap[key]) {
        fields.push(`${fieldMap[key]} = $${paramCounter}`);
        values.push(value);
        paramCounter++;
      }
    }

    if (fields.length === 0) {
      return this.getDocumentById(id);
    }

    values.push(id);
    const query = `
      UPDATE documents 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $${paramCounter} 
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || undefined;
  }

  async deleteDocument(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM documents WHERE id = $1 RETURNING id', [id]);
    return result.rowCount ? result.rowCount > 0 : false;
  }
}