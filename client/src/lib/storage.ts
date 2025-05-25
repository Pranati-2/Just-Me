import localforage from 'localforage';
import { type User, type Post, type Note, type JournalEntry, type Document } from '@shared/schema';

// Initialize localForage instances for different data types
const userStorage = localforage.createInstance({ name: 'users' });
const postStorage = localforage.createInstance({ name: 'posts' });
const noteStorage = localforage.createInstance({ name: 'notes' });
const journalStorage = localforage.createInstance({ name: 'journals' });
const documentStorage = localforage.createInstance({ name: 'documents' });

// Helper function to generate unique IDs
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// Default user data
const defaultUser: User = {
  id: 1,
  username: 'default_user',
  password: 'password',
  displayName: 'User',
  designation: 'Social Media User',
  profilePicture: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?ixlib=rb-1.2.1&auto=format&fit=crop&w=120&q=80'
};

// User related functions
export const getUser = async (): Promise<User> => {
  let user = await userStorage.getItem<User>('currentUser');
  if (!user) {
    // Initialize with default user if none exists
    await userStorage.setItem('currentUser', defaultUser);
    user = defaultUser;
  }
  return user;
};

export const updateUser = async (userData: Partial<User>): Promise<User> => {
  const currentUser = await getUser();
  const updatedUser = { ...currentUser, ...userData };
  await userStorage.setItem('currentUser', updatedUser);
  return updatedUser;
};

// Posts related functions
export const getPosts = async (platform: string): Promise<Post[]> => {
  const posts = await postStorage.getItem<Post[]>(platform) || [];
  return posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const createPost = async (platform: string, post: Omit<Post, 'id' | 'createdAt'>): Promise<Post> => {
  const posts = await getPosts(platform);
  const newPost: Post = {
    ...post,
    id: posts.length > 0 ? Math.max(...posts.map(p => p.id)) + 1 : 1,
    createdAt: new Date()
  };
  
  const updatedPosts = [newPost, ...posts];
  await postStorage.setItem(platform, updatedPosts);
  return newPost;
};

export const updatePost = async (platform: string, postId: number, updates: Partial<Post>): Promise<Post | null> => {
  const posts = await getPosts(platform);
  const postIndex = posts.findIndex(p => p.id === postId);
  
  if (postIndex === -1) return null;
  
  const updatedPost = { ...posts[postIndex], ...updates };
  posts[postIndex] = updatedPost;
  
  await postStorage.setItem(platform, posts);
  return updatedPost;
};

export const deletePost = async (platform: string, postId: number): Promise<boolean> => {
  const posts = await getPosts(platform);
  const updatedPosts = posts.filter(p => p.id !== postId);
  
  if (updatedPosts.length === posts.length) return false;
  
  await postStorage.setItem(platform, updatedPosts);
  return true;
};

// Notes related functions
export const getNotes = async (): Promise<Note[]> => {
  const notes = await noteStorage.getItem<Note[]>('notes') || [];
  return notes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

export const getNote = async (noteId: number): Promise<Note | null> => {
  const notes = await getNotes();
  return notes.find(n => n.id === noteId) || null;
};

export const createNote = async (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note> => {
  const notes = await getNotes();
  const now = new Date();
  const newNote: Note = {
    ...note,
    id: notes.length > 0 ? Math.max(...notes.map(n => n.id)) + 1 : 1,
    createdAt: now,
    updatedAt: now
  };
  
  const updatedNotes = [newNote, ...notes];
  await noteStorage.setItem('notes', updatedNotes);
  return newNote;
};

export const updateNote = async (noteId: number, updates: Partial<Note>): Promise<Note | null> => {
  const notes = await getNotes();
  const noteIndex = notes.findIndex(n => n.id === noteId);
  
  if (noteIndex === -1) return null;
  
  const updatedNote = { 
    ...notes[noteIndex], 
    ...updates, 
    updatedAt: new Date() 
  };
  notes[noteIndex] = updatedNote;
  
  await noteStorage.setItem('notes', notes);
  return updatedNote;
};

export const deleteNote = async (noteId: number): Promise<boolean> => {
  const notes = await getNotes();
  const updatedNotes = notes.filter(n => n.id !== noteId);
  
  if (updatedNotes.length === notes.length) return false;
  
  await noteStorage.setItem('notes', updatedNotes);
  return true;
};

// Journal related functions
export const getJournalEntries = async (): Promise<JournalEntry[]> => {
  const entries = await journalStorage.getItem<JournalEntry[]>('entries') || [];
  return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getJournalEntry = async (entryId: number): Promise<JournalEntry | null> => {
  const entries = await getJournalEntries();
  return entries.find(e => e.id === entryId) || null;
};

export const createJournalEntry = async (entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<JournalEntry> => {
  const entries = await getJournalEntries();
  const now = new Date();
  const newEntry: JournalEntry = {
    ...entry,
    id: entries.length > 0 ? Math.max(...entries.map(e => e.id)) + 1 : 1,
    createdAt: now,
    updatedAt: now
  };
  
  const updatedEntries = [newEntry, ...entries];
  await journalStorage.setItem('entries', updatedEntries);
  return newEntry;
};

export const updateJournalEntry = async (entryId: number, updates: Partial<JournalEntry>): Promise<JournalEntry | null> => {
  const entries = await getJournalEntries();
  const entryIndex = entries.findIndex(e => e.id === entryId);
  
  if (entryIndex === -1) return null;
  
  const updatedEntry = { 
    ...entries[entryIndex], 
    ...updates, 
    updatedAt: new Date() 
  };
  entries[entryIndex] = updatedEntry;
  
  await journalStorage.setItem('entries', entries);
  return updatedEntry;
};

export const deleteJournalEntry = async (entryId: number): Promise<boolean> => {
  const entries = await getJournalEntries();
  const updatedEntries = entries.filter(e => e.id !== entryId);
  
  if (updatedEntries.length === entries.length) return false;
  
  await journalStorage.setItem('entries', updatedEntries);
  return true;
};

// Document related functions
export const getDocuments = async (): Promise<Document[]> => {
  const documents = await documentStorage.getItem<Document[]>('documents') || [];
  return documents.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

export const getDocument = async (docId: number): Promise<Document | null> => {
  const documents = await getDocuments();
  return documents.find(d => d.id === docId) || null;
};

export const createDocument = async (document: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>): Promise<Document> => {
  const documents = await getDocuments();
  const now = new Date();
  const newDocument: Document = {
    ...document,
    id: documents.length > 0 ? Math.max(...documents.map(d => d.id)) + 1 : 1,
    createdAt: now,
    updatedAt: now
  };
  
  const updatedDocuments = [newDocument, ...documents];
  await documentStorage.setItem('documents', updatedDocuments);
  return newDocument;
};

export const updateDocument = async (docId: number, updates: Partial<Document>): Promise<Document | null> => {
  const documents = await getDocuments();
  const docIndex = documents.findIndex(d => d.id === docId);
  
  if (docIndex === -1) return null;
  
  const updatedDocument = { 
    ...documents[docIndex], 
    ...updates, 
    updatedAt: new Date() 
  };
  documents[docIndex] = updatedDocument;
  
  await documentStorage.setItem('documents', documents);
  return updatedDocument;
};

export const deleteDocument = async (docId: number): Promise<boolean> => {
  const documents = await getDocuments();
  const updatedDocuments = documents.filter(d => d.id !== docId);
  
  if (updatedDocuments.length === documents.length) return false;
  
  await documentStorage.setItem('documents', updatedDocuments);
  return true;
};
