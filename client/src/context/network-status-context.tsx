import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

interface NetworkStatusContextType {
  isOnline: boolean;
  hasConnectivity: boolean;  // More robust check beyond just navigator.onLine
  lastOnline: Date | null;
  checkConnectivity: () => Promise<boolean>;
}

const defaultContextValue: NetworkStatusContextType = {
  isOnline: navigator.onLine,
  hasConnectivity: navigator.onLine,
  lastOnline: navigator.onLine ? new Date() : null,
  checkConnectivity: async () => false
};

const NetworkStatusContext = createContext<NetworkStatusContextType>(defaultContextValue);

export function NetworkStatusProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [hasConnectivity, setHasConnectivity] = useState<boolean>(navigator.onLine);
  const [lastOnline, setLastOnline] = useState<Date | null>(navigator.onLine ? new Date() : null);
  const { toast } = useToast();

  // Function to actively check connectivity by making a small network request
  const checkConnectivity = async (): Promise<boolean> => {
    try {
      // Try to fetch a tiny file to check real connectivity
      // We use a timestamp to prevent caching
      const response = await fetch(`/api/ping?_=${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      
      const newConnectivityState = response.ok;
      setHasConnectivity(newConnectivityState);
      
      if (newConnectivityState && !hasConnectivity) {
        toast({
          title: "Connected",
          description: "You're back online. Your changes will now sync.",
        });
      }
      
      return newConnectivityState;
    } catch (error) {
      setHasConnectivity(false);
      return false;
    }
  };

  // Setup listeners for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastOnline(new Date());
      checkConnectivity(); // Verify connectivity when online event fires
    };

    const handleOffline = () => {
      setIsOnline(false);
      setHasConnectivity(false);
      
      toast({
        title: "Offline Mode",
        description: "You're working offline. Changes will sync when you reconnect.",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial connectivity check
    checkConnectivity();

    // Set up periodic connectivity checks
    const intervalId = setInterval(() => {
      if (navigator.onLine) {
        checkConnectivity();
      }
    }, 30000); // Check every 30 seconds when we think we're online

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, []);

  // When we transition from offline to online (based on real connectivity),
  // show a notification and update the lastOnline time
  useEffect(() => {
    if (hasConnectivity && !isOnline) {
      setIsOnline(true);
      setLastOnline(new Date());
    }
  }, [hasConnectivity, isOnline]);

  return (
    <NetworkStatusContext.Provider value={{ isOnline, hasConnectivity, lastOnline, checkConnectivity }}>
      {children}
    </NetworkStatusContext.Provider>
  );
}

export const useNetworkStatus = () => useContext(NetworkStatusContext);