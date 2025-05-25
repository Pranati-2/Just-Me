import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { User } from "@shared/schema";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { cacheUserData, getCachedUserData, clearCachedUserData } from "@/lib/offline-storage";

// Define profile data structure used in localStorage
interface LocalUserProfile {
  displayName?: string | null;
  username?: string | null;
  designation?: string | null;
  profilePicture?: string | null;
  lastUpdated?: string;
}

// Define the context interface
interface UserContextType {
  user: User | null;
  isLoading: boolean;
  refetchUser: () => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
  logout: () => Promise<void>;
}

// Default context value
const defaultContextValue: UserContextType = {
  user: null,
  isLoading: true,
  refetchUser: async () => {},
  updateUserProfile: async () => {},
  logout: async () => {},
};

// Create context
const UserContext = createContext<UserContextType>(defaultContextValue);

// Save profile data to localStorage
function saveProfileToLocalStorage(data: Partial<LocalUserProfile>): void {
  try {
    const existingData = localStorage.getItem('userProfile');
    const profileData = existingData ? JSON.parse(existingData) : {};
    
    // Update with new data
    const updatedData = { 
      ...profileData, 
      ...data, 
      lastUpdated: new Date().toISOString() 
    };
    localStorage.setItem('userProfile', JSON.stringify(updatedData));
  } catch (error) {
    console.error('Failed to save profile to localStorage:', error);
  }
}

// Load profile data from localStorage
function loadProfileFromLocalStorage(): LocalUserProfile | null {
  try {
    const profileData = localStorage.getItem('userProfile');
    if (profileData) {
      return JSON.parse(profileData);
    }
  } catch (error) {
    console.error('Error loading profile from localStorage:', error);
  }
  return null;
}

// Provider component
export function UserProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [localProfile, setLocalProfile] = useState<LocalUserProfile | null>(null);
  
  // Load localStorage profile on mount
  useEffect(() => {
    const storedProfile = loadProfileFromLocalStorage();
    if (storedProfile) {
      setLocalProfile(storedProfile);
    }
  }, []);
  
  // Listen for localStorage changes (for cross-tab syncing)
  useEffect(() => {
    const handleStorageChange = () => {
      const storedProfile = loadProfileFromLocalStorage();
      if (storedProfile) {
        setLocalProfile(storedProfile);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  // Fetch user from server
  const { data: serverUser, isLoading, refetch } = useQuery({
    queryKey: ['/api/auth/current-user'],
    queryFn: getQueryFn<User | null>({ on401: 'returnNull' }),
  });
  
  // Cache user data when it changes
  useEffect(() => {
    if (serverUser) {
      cacheUserData(serverUser);
    }
  }, [serverUser]);
  
  // Create composite user object merging server data with local profile
  // For logged in users, server data + local profile where server is empty
  // For non-logged in users, use local profile data only
  const user = serverUser 
    ? {
        ...serverUser,
        // Apply local storage values if server fields are empty
        displayName: serverUser.displayName || localProfile?.displayName || '',
        designation: serverUser.designation || localProfile?.designation || '',
        profilePicture: serverUser.profilePicture || localProfile?.profilePicture || '',
      }
    : localProfile  // If not logged in but has local profile
      ? {
          // Create a minimal user object with local data
          id: -1,
          username: localProfile.username || 'local_user',
          email: 'anonymous@example.com',  // Placeholder that won't be displayed
          displayName: localProfile.displayName || '',
          designation: localProfile.designation || '',
          profilePicture: localProfile.profilePicture || '',
          password: null,
          googleId: null,
          microsoftId: null,
          facebookId: null,
          provider: null,
          accessToken: null,
          refreshToken: null
        } as User
      : null;  // No profile data at all

  // Reload user data from server
  const refetchUser = async () => {
    await refetch();
  };

  // Update user profile
  const updateUserProfile = async (data: Partial<User>) => {
    // Always update localStorage first for maximum persistence
    const localData: LocalUserProfile = {
      displayName: data.displayName !== undefined ? data.displayName : undefined,
      username: data.username !== undefined ? data.username : undefined,
      designation: data.designation !== undefined ? data.designation : undefined,
      profilePicture: data.profilePicture !== undefined ? data.profilePicture : undefined
    };
    
    // Save to localStorage with non-undefined values
    saveProfileToLocalStorage(localData);
    
    // Update local state
    setLocalProfile(prev => {
      const updatedProfile = prev ? {...prev} : {};
      
      // Only update fields that have actual values
      if (data.displayName !== undefined) updatedProfile.displayName = data.displayName;
      if (data.username !== undefined) updatedProfile.username = data.username;
      if (data.designation !== undefined) updatedProfile.designation = data.designation;
      if (data.profilePicture !== undefined) updatedProfile.profilePicture = data.profilePicture;
      
      return updatedProfile;
    });
    
    console.log('Updated profile with:', data, 'Local profile now:', localProfile);
    
    // If logged in, update server profile too
    if (serverUser) {
      // Optimistically update cache - apply user update to existing user object
      const optimisticUser = { ...serverUser, ...data };
      queryClient.setQueryData(['/api/auth/current-user'], optimisticUser);
      
      try {
        // Actual API request
        await apiRequest('PATCH', '/api/auth/profile', data);
        await refetchUser();
      } catch (error) {
        console.error('Failed to update profile on server:', error);
        // No need to revert UI since localStorage is source of truth
        throw error;
      }
    }
  };

  // Logout user
  const logout = async () => {
    try {
      // Call the server logout endpoint
      await apiRequest('POST', '/api/auth/logout');
      
      // Clear all drafts to avoid data leakage
      const { clearAllDrafts } = await import('@/lib/draft-utils');
      clearAllDrafts();
      
      // Clear cached user data in IndexedDB
      await clearCachedUserData();
      
      // Reset query cache to ensure no stale user data
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/current-user'] });
      
      // Reset any query data that might contain user-specific data
      await queryClient.invalidateQueries();
      
      // Force refetch to get the updated user state (should be null)
      await refetch();
      
      // Show success message
      const { toast } = await import('@/hooks/use-toast');
      toast({
        title: 'Logged out successfully',
        description: 'You have been securely logged out of your account'
      });
    } catch (error) {
      console.error('Logout failed:', error);
      
      // Show error message
      const { toast } = await import('@/hooks/use-toast');
      toast({
        title: 'Logout Error',
        description: 'There was a problem logging out. Please try again.',
        variant: 'destructive'
      });
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
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

// Hook to use the context
export const useUser = () => useContext(UserContext);