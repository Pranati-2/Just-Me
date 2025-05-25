import React from 'react';
import { useSyncContext } from '@/context/sync-context';
import { useNetworkStatus } from '@/context/network-status-context';
import { 
  RefreshCw, 
  CheckCircle2, 
  WifiOff, 
  AlertCircle,
  Laptop
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function SyncIndicator() {
  const { 
    isSyncing, 
    lastSyncTimestamp, 
    deviceId, 
    syncNow,
    timeSinceLastSync
  } = useSyncContext();
  const { isOnline, hasConnectivity } = useNetworkStatus();

  // Format the time since last sync
  const formatTimeSince = () => {
    if (!lastSyncTimestamp) return 'Never synced';
    
    if (timeSinceLastSync < 60) {
      return 'Just now';
    } else if (timeSinceLastSync < 3600) {
      const minutes = Math.floor(timeSinceLastSync / 60);
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    } else if (timeSinceLastSync < 86400) {
      const hours = Math.floor(timeSinceLastSync / 3600);
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    } else {
      const days = Math.floor(timeSinceLastSync / 86400);
      return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    }
  };

  // Get status color
  const getStatusColor = () => {
    if (!isOnline) return 'text-gray-400';
    if (isSyncing) return 'text-blue-500';
    if (!lastSyncTimestamp) return 'text-yellow-500';
    if (timeSinceLastSync < 300) return 'text-green-500'; // Less than 5 minutes
    if (timeSinceLastSync < 3600) return 'text-green-400'; // Less than 1 hour
    if (timeSinceLastSync < 86400) return 'text-yellow-500'; // Less than 1 day
    return 'text-red-500'; // More than 1 day
  };

  // Get status icon
  const StatusIcon = () => {
    if (!isOnline) return <WifiOff className="h-4 w-4" />;
    if (isSyncing) return <RefreshCw className={cn("h-4 w-4 animate-spin", getStatusColor())} />;
    if (!lastSyncTimestamp) return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    if (timeSinceLastSync < 3600) return <CheckCircle2 className={cn("h-4 w-4", getStatusColor())} />;
    return <RefreshCw className={cn("h-4 w-4", getStatusColor())} />;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => hasConnectivity && syncNow()}
            disabled={!hasConnectivity || isSyncing}
            className={cn(
              "inline-flex items-center gap-2 px-2 py-1 rounded text-xs",
              !hasConnectivity ? "cursor-not-allowed opacity-50" : "hover:bg-secondary cursor-pointer"
            )}
          >
            <StatusIcon />
            <span className="hidden md:inline text-xs">{isSyncing ? 'Syncing...' : 'Sync'}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="text-xs space-y-1 max-w-[200px]">
            <div className="font-semibold">Sync Status</div>
            <div className="flex items-center gap-1.5">
              <Laptop className="h-3.5 w-3.5" />
              <span className="truncate">Device: {deviceId?.slice(0, 8)}...</span>
            </div>
            <div>
              {!isOnline && <span className="text-gray-400">Offline mode</span>}
              {isOnline && (
                <>
                  {isSyncing && <span>Synchronizing data...</span>}
                  {!isSyncing && <span>Last synced: {formatTimeSince()}</span>}
                </>
              )}
            </div>
            {isOnline && !isSyncing && (
              <div className="text-xs text-gray-500 italic">
                Click to sync now
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}