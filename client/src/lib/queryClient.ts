import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { addToSyncQueue, saveOfflineItem, getAllOfflineItems } from "./offline-storage";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Determine if we're online based on navigator.onLine
function isNavigatorOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

// Function to extract entity type from URL
function getEntityTypeFromUrl(url: string): 'note' | 'journal' | 'document' | 'post' | null {
  if (url.includes('/api/notes')) return 'note';
  if (url.includes('/api/journal')) return 'journal';
  if (url.includes('/api/documents')) return 'document';
  if (url.includes('/api/posts')) return 'post';
  return null;
}

// Function to determine store type from entity
function getStoreTypeFromEntity(entity: string): string {
  switch (entity) {
    case 'note': return 'notes';
    case 'journal': return 'journals';
    case 'document': return 'documents';
    case 'post': return 'posts';
    default: return '';
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Check if we're online
  if (!isNavigatorOnline()) {
    // We're offline - handle the request appropriately
    const entityType = getEntityTypeFromUrl(url);
    
    if (entityType) {
      const storeType = getStoreTypeFromEntity(entityType);
      
      // Queue the action for when we're back online
      await addToSyncQueue({
        entity: entityType,
        action: method === 'POST' ? 'create' : method === 'PATCH' ? 'update' : 'delete', 
        data: data || { id: url.split('/').pop() } // For DELETE requests, extract ID from URL
      });

      // For POST and PATCH, also save the data locally
      if (method === 'POST' || method === 'PATCH') {
        await saveOfflineItem(storeType as any, data as any);
      }
      
      // Return a fake successful response
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // If it's not a supported offline operation, throw error
    throw new Error('Cannot perform this operation while offline');
  }

  // We're online - proceed normally
  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    // Handle network errors or server errors
    if (error instanceof TypeError && error.message.includes('network request failed')) {
      // Network error (likely offline) - handle as offline
      const entityType = getEntityTypeFromUrl(url);
      
      if (entityType) {
        const storeType = getStoreTypeFromEntity(entityType);
        
        // Queue the action for when we're back online
        await addToSyncQueue({
          entity: entityType,
          action: method === 'POST' ? 'create' : method === 'PATCH' ? 'update' : 'delete', 
          data: data || { id: url.split('/').pop() }
        });
  
        // For POST and PATCH, also save the data locally
        if (method === 'POST' || method === 'PATCH') {
          await saveOfflineItem(storeType as any, data as any);
        }
        
        // Return a fake successful response
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Re-throw other errors
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    
    try {
      // Check if we're online before making the request
      if (!isNavigatorOnline()) {
        // We're offline - try to get data from offline storage
        const entityType = getEntityTypeFromUrl(url);
        
        if (entityType) {
          const storeType = getStoreTypeFromEntity(entityType);
          
          // If it's a collection endpoint (like /api/notes/user/:userId), 
          // return all items from that store
          if (url.includes('/user/')) {
            const items = await getAllOfflineItems(storeType as any);
            return items;
          } 
          
          // If it's a single item endpoint (/api/notes/:id), 
          // extract the ID and return that specific item
          else if (url.match(/\/api\/\w+\/\d+$/)) {
            const id = url.split('/').pop();
            const item = await getAllOfflineItems(storeType as any);
            return item.find((i: any) => String(i.id) === id) || null;
          }
        }
        
        // If we don't know how to handle this request offline, 
        // return empty results rather than failing
        if (url.includes('/api/')) {
          console.warn(`Offline: Unable to retrieve data for ${url}`);
          return Array.isArray(queryKey) ? [] : null;
        }
      }
      
      // We're online, proceed with normal fetch
      const res = await fetch(url, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      // If we get a network error, we're probably offline
      if (
        error instanceof TypeError && 
        (error.message.includes('network request failed') || error.message.includes('Failed to fetch'))
      ) {
        // Try to get data from offline storage
        const entityType = getEntityTypeFromUrl(url);
        
        if (entityType) {
          const storeType = getStoreTypeFromEntity(entityType);
          
          // If it's a collection endpoint (like /api/notes/user/:userId), 
          // return all items from that store
          if (url.includes('/user/')) {
            const items = await getAllOfflineItems(storeType as any);
            return items;
          } 
          
          // If it's a single item endpoint (/api/notes/:id), 
          // extract the ID and return that specific item
          else if (url.match(/\/api\/\w+\/\d+$/)) {
            const id = url.split('/').pop();
            const item = await getAllOfflineItems(storeType as any);
            return item.find((i: any) => String(i.id) === id) || null;
          }
        }
        
        // If we don't know how to handle this request offline, 
        // return empty results rather than failing
        if (url.includes('/api/')) {
          console.warn(`Offline: Unable to retrieve data for ${url}`);
          return url.includes('user/') ? [] : null;
        }
      }
      
      // Re-throw other errors
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
