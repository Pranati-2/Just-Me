import { useCallback } from 'react';
import { recordSyncOperation } from '@/lib/device-sync';
import { useSyncContext } from '@/context/sync-context'; 

interface UseSyncDataOptions {
  entityType: 'note' | 'journal' | 'document' | 'post';
  autoSync?: boolean;
}

/**
 * Hook to integrate synchronization with CRUD operations.
 * This ensures that operations are recorded for cross-device sync.
 */
export function useSyncData({ entityType, autoSync = true }: UseSyncDataOptions) {
  const { syncNow } = useSyncContext();

  /**
   * Record a create operation for synchronization
   */
  const recordCreate = useCallback(async (id: number, data: any) => {
    await recordSyncOperation(entityType, id, 'create', data);
    if (autoSync) {
      await syncNow();
    }
  }, [entityType, autoSync, syncNow]);

  /**
   * Record an update operation for synchronization
   */
  const recordUpdate = useCallback(async (id: number, data: any) => {
    await recordSyncOperation(entityType, id, 'update', data);
    if (autoSync) {
      await syncNow();
    }
  }, [entityType, autoSync, syncNow]);

  /**
   * Record a delete operation for synchronization
   */
  const recordDelete = useCallback(async (id: number) => {
    await recordSyncOperation(entityType, id, 'delete', { id });
    if (autoSync) {
      await syncNow();
    }
  }, [entityType, autoSync, syncNow]);

  return {
    recordCreate,
    recordUpdate,
    recordDelete,
    syncNow,
  };
}