import { createStore, get, set, del } from 'idb-keyval';
import { processQueue } from './sync-service';
import { 
  cacheUserData, 
  getCachedUserData, 
  stores 
} from './offline-storage';
import { queryClient } from './queryClient';
import { apiRequest } from './queryClient';

// Create a special store for device sync data
const syncMetadataStore = createStore('socialHub', 'deviceSync');

// Type definitions
interface DeviceSyncMetadata {
  deviceId: string;
  userId: number;
  lastSyncTimestamp: number;
  syncVersion: number;
}

interface SyncRecord {
  id: string;
  entityType: string;
  entityId: number;
  operation: 'create' | 'update' | 'delete';
  timestamp: number;
  data?: any;
  deviceId: string;
}

// Generate or retrieve the unique device ID
export async function getDeviceId(): Promise<string> {
  try {
    let deviceId = await get('deviceId', syncMetadataStore);
    
    if (!deviceId) {
      // Generate a new device ID if one doesn't exist
      deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
      await set('deviceId', deviceId, syncMetadataStore);
    }
    
    return deviceId;
  } catch (error) {
    console.error('Error getting device ID:', error);
    // Fallback to a temporary device ID if storage fails
    return 'temp_device_' + Date.now();
  }
}

// Get the last sync timestamp for this device
export async function getLastSyncTimestamp(): Promise<number> {
  try {
    const metadata = await get<DeviceSyncMetadata>('syncMetadata', syncMetadataStore);
    return metadata?.lastSyncTimestamp || 0;
  } catch (error) {
    console.error('Error getting last sync timestamp:', error);
    return 0;
  }
}

// Update the last sync timestamp
export async function updateLastSyncTimestamp(timestamp: number = Date.now()): Promise<void> {
  try {
    const metadata = await get<DeviceSyncMetadata>('syncMetadata', syncMetadataStore) || {
      deviceId: await getDeviceId(),
      userId: 0,
      lastSyncTimestamp: 0,
      syncVersion: 1
    };
    
    metadata.lastSyncTimestamp = timestamp;
    
    // Get current user ID from cached user data
    const userData = await getCachedUserData();
    if (userData && userData.id) {
      metadata.userId = userData.id;
    }
    
    await set('syncMetadata', metadata, syncMetadataStore);
  } catch (error) {
    console.error('Error updating sync timestamp:', error);
  }
}

// Record a sync operation
export async function recordSyncOperation(
  entityType: string,
  entityId: number,
  operation: 'create' | 'update' | 'delete',
  data?: any
): Promise<void> {
  try {
    const deviceId = await getDeviceId();
    const timestamp = Date.now();
    
    const syncRecord: SyncRecord = {
      id: `${entityType}_${entityId}_${operation}_${timestamp}`,
      entityType,
      entityId,
      operation,
      timestamp,
      data,
      deviceId
    };
    
    // Store the record in the sync log
    const syncLog = await get<SyncRecord[]>('syncLog', syncMetadataStore) || [];
    syncLog.push(syncRecord);
    
    // Keep only the last 1000 records to prevent excessive storage usage
    if (syncLog.length > 1000) {
      syncLog.sort((a, b) => b.timestamp - a.timestamp);
      syncLog.length = 1000;
    }
    
    await set('syncLog', syncLog, syncMetadataStore);
    
    // Update the last sync timestamp
    await updateLastSyncTimestamp(timestamp);
  } catch (error) {
    console.error('Error recording sync operation:', error);
  }
}

// Pull changes from the server
export async function pullChangesFromServer(): Promise<boolean> {
  try {
    const lastSyncTimestamp = await getLastSyncTimestamp();
    const deviceId = await getDeviceId();
    
    // Get changes from the server since our last sync
    const response = await apiRequest(
      'GET', 
      `/api/sync/changes?since=${lastSyncTimestamp}&deviceId=${deviceId}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to pull changes from server');
    }
    
    const changes = await response.json();
    
    // Apply each change locally
    for (const change of changes) {
      // Skip changes made by this device to avoid duplication
      if (change.deviceId === deviceId) {
        continue;
      }
      
      // Apply the change to local storage
      await applyChangeLocally(change);
    }
    
    // Update the last sync timestamp if there were any changes
    if (changes.length > 0) {
      // Find the most recent timestamp from the changes
      const latestTimestamp = Math.max(...changes.map((c: SyncRecord) => c.timestamp));
      await updateLastSyncTimestamp(latestTimestamp);
      
      // Invalidate the react-query cache to trigger refetching of affected data
      await invalidateRelevantQueries(changes);
    }
    
    return true;
  } catch (error) {
    console.error('Error pulling changes from server:', error);
    return false;
  }
}

// Push local changes to the server
export async function pushLocalChangesToServer(): Promise<boolean> {
  try {
    // First, process the local queue of pending changes
    const queueResult = await processQueue();
    
    if (!queueResult.success) {
      console.warn('Some items failed to sync:', queueResult.errors);
    }
    
    // Get the sync log of changes since the last successful sync
    const syncLog = await get<SyncRecord[]>('syncLog', syncMetadataStore) || [];
    const lastSyncTimestamp = await getLastSyncTimestamp();
    
    // Filter for changes that haven't been synced yet
    const changesToPush = syncLog.filter(record => record.timestamp > lastSyncTimestamp);
    
    if (changesToPush.length === 0) {
      return true; // Nothing to push
    }
    
    // Push changes to the server
    const response = await apiRequest('POST', '/api/sync/changes', {
      changes: changesToPush,
      deviceId: await getDeviceId()
    });
    
    if (!response.ok) {
      throw new Error('Failed to push changes to server');
    }
    
    // Update the last sync timestamp
    const currentTime = Date.now();
    await updateLastSyncTimestamp(currentTime);
    
    return true;
  } catch (error) {
    console.error('Error pushing changes to server:', error);
    return false;
  }
}

// Apply a change from another device to the local storage
async function applyChangeLocally(change: SyncRecord): Promise<void> {
  const { entityType, entityId, operation, data } = change;
  
  // Map entity types to store names
  const storeMap: Record<string, keyof typeof stores> = {
    'note': 'notes',
    'journal': 'journals',
    'document': 'documents',
    'post': 'posts'
  };
  
  const storeName = storeMap[entityType];
  
  if (!storeName) {
    console.error(`Unknown entity type: ${entityType}`);
    return;
  }
  
  try {
    const store = stores[storeName];
    
    switch (operation) {
      case 'create':
      case 'update':
        if (data) {
          // Update with the received data
          await store.setItem(String(entityId), {
            ...data,
            _synced: true,
            _syncedAt: Date.now()
          });
        }
        break;
        
      case 'delete':
        // Remove the item
        await store.removeItem(String(entityId));
        break;
    }
  } catch (error) {
    console.error(`Error applying change to ${entityType} ${entityId}:`, error);
  }
}

// Invalidate relevant React Query caches to trigger UI refreshes
async function invalidateRelevantQueries(changes: SyncRecord[]): Promise<void> {
  // Determine which entity types were affected - use an array instead of a Set
  const affectedEntities = Array.from(new Set(changes.map(change => change.entityType)));
  
  // Map entity types to query keys
  const queryKeyMap: Record<string, string[]> = {
    'note': ['/api/notes'],
    'journal': ['/api/journal'],
    'document': ['/api/documents'],
    'post': ['/api/posts']
  };
  
  // Invalidate the relevant query caches
  for (const entityType of affectedEntities) {
    const queryKeys = queryKeyMap[entityType];
    if (queryKeys) {
      for (const key of queryKeys) {
        await queryClient.invalidateQueries({ queryKey: [key] });
      }
    }
  }
}

// Main synchronization function that performs both pull and push
export async function synchronizeDevices(): Promise<{
  success: boolean;
  pullSuccess: boolean;
  pushSuccess: boolean;
  lastSyncTimestamp: number;
}> {
  try {
    // Pull changes from server first
    const pullSuccess = await pullChangesFromServer();
    
    // Then push local changes
    const pushSuccess = await pushLocalChangesToServer();
    
    const lastSyncTimestamp = await getLastSyncTimestamp();
    
    return {
      success: pullSuccess && pushSuccess,
      pullSuccess,
      pushSuccess,
      lastSyncTimestamp
    };
  } catch (error) {
    console.error('Error during device synchronization:', error);
    return {
      success: false,
      pullSuccess: false,
      pushSuccess: false,
      lastSyncTimestamp: await getLastSyncTimestamp()
    };
  }
}