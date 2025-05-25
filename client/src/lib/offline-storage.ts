import localForage from 'localforage';

// Set up indexedDB stores
const stores = {
  notes: localForage.createInstance({
    name: 'socialHub',
    storeName: 'notes'
  }),
  journals: localForage.createInstance({
    name: 'socialHub',
    storeName: 'journals'
  }),
  documents: localForage.createInstance({
    name: 'socialHub',
    storeName: 'documents'
  }),
  posts: localForage.createInstance({
    name: 'socialHub',
    storeName: 'posts'
  }),
  queue: localForage.createInstance({
    name: 'socialHub',
    storeName: 'syncQueue'
  }),
  userCache: localForage.createInstance({
    name: 'socialHub',
    storeName: 'userCache'
  })
};

// General type for all data items with a unique ID
interface OfflineItem {
  id?: number;
  [key: string]: any;
}

// Interface for queued actions
export interface QueuedAction {
  id: string;
  entity: 'note' | 'journal' | 'document' | 'post';
  action: 'create' | 'update' | 'delete';
  timestamp: number;
  data: any;
  synced: boolean;
  attempts: number;
}

// Save item to offline storage
export async function saveOfflineItem<T extends OfflineItem>(
  storeType: keyof typeof stores, 
  item: T
): Promise<T> {
  if (!item.id) {
    // For new items without an ID, generate a temporary one
    // Real ID will be assigned when synced
    item.id = Date.now();
  }
  
  // Mark item as being stored offline
  const offlineItem = {
    ...item,
    _offline: true,
    _lastModified: Date.now()
  };
  
  await stores[storeType].setItem(String(item.id), offlineItem);
  return offlineItem as T;
}

// Get item from offline storage
export async function getOfflineItem<T>(
  storeType: keyof typeof stores,
  id: number | string
): Promise<T | null> {
  return stores[storeType].getItem(String(id));
}

// Get all items from a specific store
export async function getAllOfflineItems<T>(
  storeType: keyof typeof stores
): Promise<T[]> {
  const items: T[] = [];
  
  await stores[storeType].iterate((value: T) => {
    items.push(value);
  });
  
  return items;
}

// Delete item from offline storage
export async function deleteOfflineItem(
  storeType: keyof typeof stores,
  id: number | string
): Promise<boolean> {
  await stores[storeType].removeItem(String(id));
  return true;
}

// Add action to sync queue
export async function addToSyncQueue(action: Omit<QueuedAction, 'id' | 'timestamp' | 'synced' | 'attempts'>): Promise<QueuedAction> {
  const queueItem: QueuedAction = {
    id: `${action.entity}_${action.action}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    timestamp: Date.now(),
    synced: false,
    attempts: 0,
    ...action
  };
  
  await stores.queue.setItem(queueItem.id, queueItem);
  return queueItem;
}

// Get all items in the sync queue
export async function getSyncQueue(): Promise<QueuedAction[]> {
  const queue: QueuedAction[] = [];
  
  await stores.queue.iterate((value: QueuedAction) => {
    if (!value.synced) {
      queue.push(value);
    }
  });
  
  // Sort by timestamp to ensure actions are synced in the right order
  return queue.sort((a, b) => a.timestamp - b.timestamp);
}

// Mark a queued action as synced
export async function markQueueItemSynced(id: string): Promise<void> {
  const item = await stores.queue.getItem<QueuedAction>(id);
  if (item) {
    item.synced = true;
    await stores.queue.setItem(id, item);
  }
}

// Update a queued action's attempt count
export async function incrementQueueItemAttempts(id: string): Promise<void> {
  const item = await stores.queue.getItem<QueuedAction>(id);
  if (item) {
    item.attempts += 1;
    await stores.queue.setItem(id, item);
  }
}

// Clear synced items from the queue older than a certain time
export async function clearSyncedQueueItems(olderThanMs: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
  const cutoffTime = Date.now() - olderThanMs;
  
  await stores.queue.iterate((value: QueuedAction, key) => {
    if (value.synced && value.timestamp < cutoffTime) {
      stores.queue.removeItem(key);
    }
  });
}

// Cache user data for offline access
export async function cacheUserData(userData: any): Promise<void> {
  await stores.userCache.setItem('currentUser', {
    ...userData,
    _cachedAt: Date.now()
  });
}

// Get cached user data
export async function getCachedUserData(): Promise<any | null> {
  return stores.userCache.getItem('currentUser');
}

// Clear cached user data (e.g., on logout)
export async function clearCachedUserData(): Promise<void> {
  await stores.userCache.removeItem('currentUser');
}

// Export the stores for direct access if needed
export { stores };