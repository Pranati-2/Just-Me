import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { synchronizeDevices, getDeviceId } from '@/lib/device-sync';
import { useNetworkStatus } from './network-status-context';

interface SyncContextType {
  isInitializing: boolean;
  isSyncing: boolean;
  lastSyncTimestamp: number | null;
  deviceId: string | null;
  syncNow: () => Promise<void>;
  timeSinceLastSync: number;
}

const defaultContextValue: SyncContextType = {
  isInitializing: true,
  isSyncing: false,
  lastSyncTimestamp: null,
  deviceId: null,
  syncNow: async () => {},
  timeSinceLastSync: 0,
};

const SyncContext = createContext<SyncContextType>(defaultContextValue);

export function SyncProvider({ children }: { children: ReactNode }) {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<number | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [timeSinceLastSync, setTimeSinceLastSync] = useState(0);

  const { toast } = useToast();
  const { isOnline, hasConnectivity } = useNetworkStatus();

  // Initialize device ID
  useEffect(() => {
    const initialize = async () => {
      try {
        const id = await getDeviceId();
        setDeviceId(id);
      } catch (error) {
        console.error('Error initializing device ID:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initialize();
  }, []);

  // Sync when the app comes online
  useEffect(() => {
    if (hasConnectivity && !isInitializing && !isSyncing) {
      // Add slight delay to avoid immediate synchronization
      const timeoutId = setTimeout(() => {
        syncNow();
      }, 2000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [hasConnectivity, isInitializing]);

  // Regular sync timer
  useEffect(() => {
    if (!hasConnectivity || isInitializing) return;

    // Sync every 5 minutes
    const syncInterval = setInterval(() => {
      syncNow();
    }, 5 * 60 * 1000);

    return () => clearInterval(syncInterval);
  }, [hasConnectivity, isInitializing]);

  // Track time since last sync
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastSyncTimestamp) {
        const timeSince = Math.floor((Date.now() - lastSyncTimestamp) / 1000);
        setTimeSinceLastSync(timeSince);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastSyncTimestamp]);

  // Sync function
  const syncNow = async () => {
    if (isSyncing || !hasConnectivity) return;

    try {
      setIsSyncing(true);
      const result = await synchronizeDevices();
      
      setLastSyncTimestamp(result.lastSyncTimestamp);
      
      if (result.success) {
        // Sync was successful, but don't show a notification to avoid too many toasts
      } else {
        // Only show error notification if something went wrong
        toast({
          title: 'Sync Warning',
          description: 'Some changes could not be synchronized.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error during synchronization:', error);
      toast({
        title: 'Sync Error',
        description: 'Failed to synchronize changes.',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <SyncContext.Provider
      value={{
        isInitializing,
        isSyncing,
        lastSyncTimestamp,
        deviceId,
        syncNow,
        timeSinceLastSync,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export const useSyncContext = () => useContext(SyncContext);