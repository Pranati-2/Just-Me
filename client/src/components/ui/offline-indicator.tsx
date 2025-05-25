import React, { useState, useEffect } from 'react';
import { useNetworkStatus } from '@/context/network-status-context';
import { getSyncQueue, QueuedAction } from '@/lib/offline-storage';
import { processQueue } from '@/lib/sync-service';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  Wifi, 
  WifiOff, 
  Check, 
  RefreshCw, 
  AlertCircle,
  Clock
} from 'lucide-react';

export default function OfflineIndicator() {
  const { isOnline, hasConnectivity, checkConnectivity } = useNetworkStatus();
  const [pendingItems, setPendingItems] = useState<number>(0);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncResult, setSyncResult] = useState<{ synced: number, failed: number } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check for pending items in sync queue
    const checkSyncQueue = async () => {
      try {
        const queue = await getSyncQueue();
        setPendingItems(queue.length);
      } catch (error) {
        console.error('Error checking sync queue:', error);
      }
    };

    checkSyncQueue();

    // Set up periodic checking
    const intervalId = setInterval(checkSyncQueue, 10000);
    return () => clearInterval(intervalId);
  }, []);

  // Try to sync when coming back online
  useEffect(() => {
    if (hasConnectivity && pendingItems > 0 && !syncing) {
      handleSync();
    }
  }, [hasConnectivity, pendingItems, syncing]);

  const handleSync = async () => {
    if (!hasConnectivity) {
      toast({
        title: "No Connection",
        description: "Please check your internet connection and try again.",
        variant: "destructive",
      });
      return;
    }

    if (syncing) return;

    setSyncing(true);
    try {
      const result = await processQueue();
      
      setSyncResult({
        synced: result.synced,
        failed: result.failed
      });
      
      // Update the pending items count
      const queue = await getSyncQueue();
      setPendingItems(queue.length);
      
      // Show a toast with the results
      if (result.success) {
        toast({
          title: "Sync Complete",
          description: `Successfully synced ${result.synced} item${result.synced !== 1 ? 's' : ''}.`,
        });
      } else {
        toast({
          title: "Sync Incomplete",
          description: `Synced ${result.synced} item${result.synced !== 1 ? 's' : ''}, but ${result.failed} failed.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Sync Error",
        description: "An error occurred while syncing. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
      
      // Clear the sync result after a few seconds
      setTimeout(() => {
        setSyncResult(null);
      }, 5000);
    }
  };

  // If we're online and have no pending items, don't show anything
  if (hasConnectivity && pendingItems === 0 && !syncResult) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-lg p-3 flex items-center space-x-2 border border-gray-200">
        {!hasConnectivity ? (
          <>
            <WifiOff size={16} className="text-red-500" />
            <span className="text-sm font-medium text-gray-700">Offline</span>
          </>
        ) : (
          <>
            <Wifi size={16} className="text-green-500" />
            <span className="text-sm font-medium text-gray-700">Online</span>
          </>
        )}
        
        {pendingItems > 0 && (
          <div className="flex items-center ml-2">
            <Clock size={16} className="text-amber-500 mr-1" />
            <span className="text-sm text-gray-600">{pendingItems} pending</span>
            
            {hasConnectivity && !syncing && (
              <Button 
                size="sm" 
                variant="ghost" 
                className="ml-1 p-1 h-auto" 
                onClick={handleSync}
                title="Sync now"
              >
                <RefreshCw size={14} className="text-blue-500" />
              </Button>
            )}
          </div>
        )}
        
        {syncing && (
          <div className="flex items-center ml-2">
            <RefreshCw size={16} className="text-blue-500 animate-spin mr-1" />
            <span className="text-sm text-gray-600">Syncing...</span>
          </div>
        )}
        
        {syncResult && (
          <div className="flex items-center ml-2">
            {syncResult.failed === 0 ? (
              <Check size={16} className="text-green-500 mr-1" />
            ) : (
              <AlertCircle size={16} className="text-amber-500 mr-1" />
            )}
            <span className="text-sm text-gray-600">
              {syncResult.synced} synced
              {syncResult.failed > 0 && `, ${syncResult.failed} failed`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}