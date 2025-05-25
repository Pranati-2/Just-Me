/**
 * Utility functions for managing draft content in localStorage
 */

// Define a prefix for all draft keys to avoid potential conflicts
const DRAFT_PREFIX = 'social_hub_draft_';

// Key formats:
// - Platform drafts: social_hub_draft_platform_{platformName}
// - Notes drafts: social_hub_draft_note_{noteId} (or 'new' for new notes)
// - Journal drafts: social_hub_draft_journal_{entryId} (or 'new' for new entries)
// - Document drafts: social_hub_draft_doc_{docId} (or 'new' for new documents)

/**
 * Save a content draft to localStorage
 * @param type The type of content ('platform', 'note', 'journal', 'doc')
 * @param id The identifier for the content (platform name, content id, or 'new')
 * @param content The content to save
 */
export const saveDraft = (type: string, id: string | number, content: string): void => {
  if (!content) return; // Don't save empty content
  
  const key = `${DRAFT_PREFIX}${type}_${id}`;
  try {
    localStorage.setItem(key, content);
  } catch (error) {
    console.error('Error saving draft to localStorage:', error);
  }
};

/**
 * Retrieve a content draft from localStorage
 * @param type The type of content ('platform', 'note', 'journal', 'doc')
 * @param id The identifier for the content (platform name, content id, or 'new')
 * @returns The saved draft content or an empty string if not found
 */
export const getDraft = (type: string, id: string | number): string => {
  const key = `${DRAFT_PREFIX}${type}_${id}`;
  try {
    const draft = localStorage.getItem(key);
    return draft || '';
  } catch (error) {
    console.error('Error retrieving draft from localStorage:', error);
    return '';
  }
};

/**
 * Clear a specific draft from localStorage after it's been saved or discarded
 * @param type The type of content ('platform', 'note', 'journal', 'doc')
 * @param id The identifier for the content (platform name, content id, or 'new')
 */
export const clearDraft = (type: string, id: string | number): void => {
  const key = `${DRAFT_PREFIX}${type}_${id}`;
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing draft from localStorage:', error);
  }
};

/**
 * Clear all drafts from localStorage (useful on logout)
 */
export const clearAllDrafts = (): void => {
  try {
    // Get all keys from localStorage
    const keys = Object.keys(localStorage);
    
    // Filter out the keys that start with the draft prefix
    const draftKeys = keys.filter(key => key.startsWith(DRAFT_PREFIX));
    
    // Remove each draft key
    draftKeys.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Error clearing all drafts from localStorage:', error);
  }
};

/**
 * Function to automatically save drafts with debouncing
 * This returns a function that can be used in an effect dependency
 * @param type The type of content ('platform', 'note', 'journal', 'doc')
 * @param id The identifier for the content (platform name, content id, or 'new')
 * @param content The content to save
 * @param delay The debounce delay in milliseconds (default: 1000ms)
 * @returns A cleanup function for useEffect
 */
export const useAutosave = (
  type: string, 
  id: string | number, 
  content: string, 
  delay: number = 1000
): () => void => {
  const timeoutRef = setTimeout(() => {
    if (content) {
      saveDraft(type, id, content);
    }
  }, delay);
  
  // Return cleanup function for useEffect
  return () => clearTimeout(timeoutRef);
};