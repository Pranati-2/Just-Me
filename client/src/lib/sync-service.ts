import { 
  QueuedAction, 
  getSyncQueue, 
  markQueueItemSynced, 
  incrementQueueItemAttempts,
  deleteOfflineItem,
  clearSyncedQueueItems,
  stores
} from './offline-storage';
import { apiRequest } from './queryClient';
import { Note, JournalEntry, Document, Post } from '@shared/schema';

// Define valid store types
type StoreType = keyof typeof stores;

// Maximum number of sync attempts before giving up
const MAX_SYNC_ATTEMPTS = 5;

// Interface for function return value
interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

// Main function to process the sync queue
export async function processQueue(): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    synced: 0,
    failed: 0,
    errors: []
  };

  // Get all unsynced items from the queue
  const queue = await getSyncQueue();
  
  if (queue.length === 0) {
    return result;
  }
  
  // Process each item in the queue
  for (const item of queue) {
    try {
      // Skip items that have exceeded the max attempts
      if (item.attempts >= MAX_SYNC_ATTEMPTS) {
        result.failed++;
        result.errors.push(`Item ${item.id} exceeded maximum sync attempts`);
        continue;
      }

      // Increment the attempt counter
      await incrementQueueItemAttempts(item.id);

      // Handle the action based on the type and entity
      let success = false;
      
      switch (item.action) {
        case 'create':
          success = await handleCreate(item);
          break;
        case 'update':
          success = await handleUpdate(item);
          break;
        case 'delete':
          success = await handleDelete(item);
          break;
      }

      if (success) {
        // Mark as synced if successful
        await markQueueItemSynced(item.id);
        result.synced++;
      } else {
        result.failed++;
        result.errors.push(`Failed to sync ${item.action} for ${item.entity} ${item.data.id}`);
      }
    } catch (error) {
      result.failed++;
      result.errors.push(`Error syncing ${item.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Update the overall success status
  result.success = result.failed === 0;
  
  // Clean up old synced items
  await clearSyncedQueueItems();
  
  return result;
}

// Handle CREATE actions
async function handleCreate(item: QueuedAction): Promise<boolean> {
  const { entity, data } = item;
  
  try {
    switch (entity) {
      case 'note': {
        const response = await apiRequest('POST', '/api/notes', data);
        const serverItem = await response.json();
        // If the local ID was temporary, we may need to update references
        if (data._offline && data.id !== serverItem.id) {
          // Here we could update any local references to the old ID
        }
        return response.ok;
      }
      case 'journal': {
        const response = await apiRequest('POST', '/api/journal', data);
        const serverItem = await response.json();
        return response.ok;
      }
      case 'document': {
        const response = await apiRequest('POST', '/api/documents', data);
        const serverItem = await response.json();
        return response.ok;
      }
      case 'post': {
        const response = await apiRequest('POST', `/api/posts/${data.platform}`, data);
        const serverItem = await response.json();
        return response.ok;
      }
      default:
        return false;
    }
  } catch (error) {
    console.error(`Error in handleCreate for ${entity}:`, error);
    return false;
  }
}

// Handle UPDATE actions
async function handleUpdate(item: QueuedAction): Promise<boolean> {
  const { entity, data } = item;
  
  try {
    const id = data.id;
    
    switch (entity) {
      case 'note': {
        const response = await apiRequest('PATCH', `/api/notes/${id}`, data);
        return response.ok;
      }
      case 'journal': {
        const response = await apiRequest('PATCH', `/api/journal/${id}`, data);
        return response.ok;
      }
      case 'document': {
        const response = await apiRequest('PATCH', `/api/documents/${id}`, data);
        return response.ok;
      }
      case 'post': {
        const response = await apiRequest('PATCH', `/api/posts/${data.platform}/${id}`, data);
        return response.ok;
      }
      default:
        return false;
    }
  } catch (error) {
    console.error(`Error in handleUpdate for ${entity}:`, error);
    return false;
  }
}

// Handle DELETE actions
async function handleDelete(item: QueuedAction): Promise<boolean> {
  const { entity, data } = item;
  
  try {
    const id = data.id;
    
    // Map entity name to store key
    const storeMap: Record<string, StoreType> = {
      'note': 'notes',
      'journal': 'journals',
      'document': 'documents',
      'post': 'posts'
    };
    
    const storeKey = storeMap[entity];
    if (storeKey) {
      // Remove from local storage regardless of server sync success
      await deleteOfflineItem(storeKey, id);
    }
    
    switch (entity) {
      case 'note': {
        const response = await apiRequest('DELETE', `/api/notes/${id}`);
        return response.ok;
      }
      case 'journal': {
        const response = await apiRequest('DELETE', `/api/journal/${id}`);
        return response.ok;
      }
      case 'document': {
        const response = await apiRequest('DELETE', `/api/documents/${id}`);
        return response.ok;
      }
      case 'post': {
        const response = await apiRequest('DELETE', `/api/posts/${data.platform}/${id}`);
        return response.ok;
      }
      default:
        return false;
    }
  } catch (error) {
    console.error(`Error in handleDelete for ${entity}:`, error);
    return false;
  }
}