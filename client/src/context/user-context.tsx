import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@shared/schema';
import { apiRequest, getQueryFn } from '@/lib/queryClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  refetchUser: () => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
  logout: () => Promise<void>;
}

const defaultContextValue: UserContextType = {
  user: null,
  isLoading: true,
  refetchUser: async () => {},
  updateUserProfile: async () => {},
  logout: async () => {},
};

const UserContext = createContext<UserContextType>(defaultContextValue);

// Create local storage user data
const createLocalUser = (data: any): User => {
  return {
    id: -1, // Use negative ID to indicate localStorage user
    username: data.username || 'local_user',
    email: 'local@example.com', // Mock email that won't be shown
    displayName: data.displayName || '',
    designation: data.designation || '',
    profilePicture: data.profilePicture || '',
    // Fields that are optional
    password: null,
    googleId: null,
    microsoftId: null,
    facebookId: null,
    provider: null,
    accessToken: null,
    refreshToken: null
  };
};

// Utility function to load profile from localStorage
function loadProfileFromLocalStorage(): User | null {
  try {
    const profileData = localStorage.getItem('userProfile');
    if (profileData) {
      const parsedData = JSON.parse(profileData);
      return createLocalUser(parsedData);
    }
  } catch (error) {
    console.error('Error loading profile from localStorage:', error);
  }
  return null;
}

export function UserProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [localUser, setLocalUser] = useState<Partial<User> | null>(null);
  
  // Load localStorage profile on mount
  useEffect(() => {
    const storedProfile = loadProfileFromLocalStorage();
    if (storedProfile) {
      setLocalUser(storedProfile as User);
    }
  }, []);
  
  // Use localStorage to track changes
  useEffect(() => {
    const handleStorageChange = () => {
      const storedProfile = loadProfileFromLocalStorage();
      if (storedProfile) {
        setLocalUser(storedProfile as User);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  const { data: serverUser, isLoading, refetch } = useQuery({
    queryKey: ['/api/auth/current-user'],
    queryFn: getQueryFn<User | null>({ on401: 'returnNull' }),
  });
  
  // Combine data - server user takes precedence
  const user = serverUser || (localUser as User | null);

  const refetchUser = async () => {
    await refetch();
  };

  // Helper to update localStorage profile
  const updateLocalStorageProfile = (data: Partial<User>) => {
    try {
      const existingData = localStorage.getItem('userProfile');
      const profileData = existingData ? JSON.parse(existingData) : {};
      
      // Update with new data
      const updatedData = { ...profileData, ...data, lastUpdated: new Date().toISOString() };
      localStorage.setItem('userProfile', JSON.stringify(updatedData));
      
      // Update local state
      const newLocalUser = loadProfileFromLocalStorage();
      if (newLocalUser) {
        setLocalUser(newLocalUser as User);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to update localStorage profile:', error);
      return false;
    }
  };

  const updateUserProfile = async (data: Partial<User>) => {
    // Always update localStorage first for persistence
    updateLocalStorageProfile(data);
    
    // Optimistically update the user data in the cache if logged in
    if (serverUser) {
      // Create a merged version of the current user with the new data
      const optimisticUser = { ...serverUser, ...data };
      
      // Update the cache immediately for a responsive UI
      queryClient.setQueryData(['/api/auth/current-user'], optimisticUser);
      
      try {
        // Make the actual API request
        await apiRequest('PATCH', '/api/auth/profile', data);
        
        // Refetch to ensure we have the latest data from the server
        await refetchUser();
      } catch (error) {
        // If the request fails, keep the localStorage update but log error
        console.error('Failed to update profile on server:', error);
        
        // Don't revert UI since we're still showing the localStorage data
        // but we need to throw for error handling upstream
        throw error;
      }
    } else {
      // If no server user exists yet, just keep the localStorage update
      // No need to make API requests that will fail
    }
  };

  const logout = async () => {
    try {
      await apiRequest('POST', '/api/auth/logout');
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/current-user'] });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <UserContext.Provider
      value={{
        user: user || null,
        isLoading,
        refetchUser,
        updateUserProfile,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);