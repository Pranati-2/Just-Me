import { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@/context/new-user-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import CheckoutButton from '@/components/checkout/checkout-button';
import { FaCamera, FaDatabase, FaCheck, FaTrash, FaDownload } from 'react-icons/fa';

export default function Profile() {
  const { user, updateUserProfile, isLoading: isUserLoading } = useUser();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [designation, setDesignation] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Function to load profile data from localStorage
  const loadProfileFromLocalStorage = useCallback(() => {
    try {
      const profileData = localStorage.getItem('userProfile');
      if (profileData) {
        const { displayName: storedName, username: storedUsername, 
                designation: storedDesignation, profilePicture: storedPic } = JSON.parse(profileData);
                
        // Only set values that exist
        if (storedName) setDisplayName(storedName);
        if (storedUsername) setUsername(storedUsername);
        if (storedDesignation) setDesignation(storedDesignation);
        if (storedPic) setProfilePicture(storedPic);
        
        // Set last saved time
        const savedTime = new Date();
        setLastSaved(savedTime);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      return false;
    }
  }, []);

  // Load user data when component mounts
  useEffect(() => {
    // First try to load from localStorage
    const loadedFromStorage = loadProfileFromLocalStorage();
    
    // If user is logged in, override with their data
    if (user) {
      if (user.displayName) setDisplayName(user.displayName);
      if (user.username) setUsername(user.username);
      if (user.designation) setDesignation(user.designation);
      if (user.profilePicture) setProfilePicture(user.profilePicture);
    }
    
    // Theme code removed
  }, [user, loadProfileFromLocalStorage]);

  // Function to save profile data to localStorage
  const saveToLocalStorage = useCallback(() => {
    try {
      const profileData = {
        displayName,
        username,
        designation,
        profilePicture,
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem('userProfile', JSON.stringify(profileData));
      
      // Update last saved time
      const now = new Date();
      setLastSaved(now);
      
      // Show saved indicator briefly
      setShowSavedIndicator(true);
      setTimeout(() => setShowSavedIndicator(false), 2000);
      
      return true;
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      return false;
    }
  }, [displayName, username, designation, profilePicture]);

  // Autosave function that handles debouncing (text fields only)
  const autosaveProfile = useCallback(async () => {
    try {
      setIsUpdating(true);
      
      if (user) {
        // If logged in, try to update via API
        try {
          // Only update text fields in autosave, not profile picture
          await updateUserProfile({
            displayName,
            username,
            designation
            // profile picture is intentionally excluded here
          });
        } catch (error) {
          console.error('Error auto-saving profile to server:', error);
          // Fall back to localStorage if API fails
          saveToLocalStorage();
        }
      } else {
        // If not logged in, just use localStorage
        saveToLocalStorage();
      }
      
      // Update last saved time (done for both paths)
      const now = new Date();
      setLastSaved(now);
      
      // Show saved indicator briefly
      setShowSavedIndicator(true);
      setTimeout(() => setShowSavedIndicator(false), 2000);
      
    } catch (error) {
      console.error('Error auto-saving profile:', error);
      toast({
        title: 'Auto-save failed',
        description: 'Failed to save your profile text. Changes will not be persisted.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  }, [user, displayName, username, designation, updateUserProfile, toast, saveToLocalStorage]);

  // Set up auto-save when text fields change (separate from profile picture)
  useEffect(() => {
    // Get the current saved values from localStorage for comparison
    let savedValues = { displayName: '', username: '', designation: '' };
    try {
      const savedData = localStorage.getItem('userProfile');
      if (savedData) {
        savedValues = JSON.parse(savedData);
      }
    } catch (error) {
      console.error('Error reading localStorage for comparison:', error);
    }
    
    // Check if any fields have changed from either user object or localStorage
    const hasChanges = user 
      ? (displayName !== (user.displayName || '') || 
         username !== (user.username || '') || 
         designation !== (user.designation || ''))
      : (displayName !== (savedValues.displayName || '') || 
         username !== (savedValues.username || '') || 
         designation !== (savedValues.designation || ''));
    
    if (hasChanges) {
      // Clear previous timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      // Set new timeout for autosave (3 seconds after user stops typing)
      autoSaveTimeoutRef.current = setTimeout(() => {
        // Only update text fields, not profile picture
        autosaveProfile();
      }, 3000);
    }
    
    // Cleanup function
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [user, displayName, username, designation, autosaveProfile]);

  // Manual save function (for the Save button)
  const handleProfileUpdate = async () => {
    // Clear any pending autosave
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }

    setIsUpdating(true);
    try {
      // Always save to localStorage first
      const profileData = {
        displayName,
        username,
        designation,
        profilePicture,
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem('userProfile', JSON.stringify(profileData));
      
      // If logged in, also try API
      if (user) {
        try {
          console.log('Updating profile picture:', profilePicture ? 'Present (optimized)' : 'none');
          
          await updateUserProfile({
            displayName,
            username,
            designation,
            profilePicture
          });
        } catch (error) {
          console.error('Error saving to API:', error);
          // Already saved to localStorage, so we'll just show a warning
          toast({
            title: 'Partially saved',
            description: 'Profile saved locally but not to the server.',
            variant: 'default',
          });
        }
      }
      
      // Show success regardless of API success (since localStorage worked)
      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      });
      
      const now = new Date();
      setLastSaved(now);
      setShowSavedIndicator(true);
      setTimeout(() => setShowSavedIndicator(false), 2000);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Update failed',
        description: 'Failed to update your profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const optimizeImageSize = (base64Image: string, maxWidth: number = 300): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions while maintaining aspect ratio
        if (width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = height * ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Get the resized image in base64 format with reduced quality (0.7)
        const optimizedImage = canvas.toDataURL('image/jpeg', 0.7);
        resolve(optimizedImage);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = base64Image;
    });
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Show loading toast
    toast({
      title: 'Processing image',
      description: 'Optimizing image size...',
    });

    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result) {
        try {
          // Optimize the image to reduce size
          const originalImage = event.target.result.toString();
          const optimizedImage = await optimizeImageSize(originalImage);
          setProfilePicture(optimizedImage);
          
          // Save the profile picture
          try {
            // Always update localStorage with new image
            const currentData = localStorage.getItem('userProfile');
            const profileData = currentData 
              ? JSON.parse(currentData) 
              : { displayName, username, designation };
              
            profileData.profilePicture = optimizedImage;
            profileData.lastUpdated = new Date().toISOString();
            
            localStorage.setItem('userProfile', JSON.stringify(profileData));
            
            // If user is logged in, also try API
            if (user) {
              try {
                // Only update the profile picture via API
                await updateUserProfile({
                  profilePicture: optimizedImage
                });
              } catch (error) {
                console.error('Error saving profile picture to server:', error);
                // Already saved to localStorage above
              }
            }
            
            // Show saved status regardless of API outcome
            const now = new Date();
            setLastSaved(now);
            setShowSavedIndicator(true);
            setTimeout(() => setShowSavedIndicator(false), 2000);
            
            // Show success toast
            toast({
              title: 'Profile picture updated',
              description: 'Your profile picture has been updated and saved.',
              variant: 'default',
            });
          } catch (error) {
            console.error('Error saving profile picture:', error);
            toast({
              title: 'Image ready but not saved',
              description: 'Image has been optimized but couldn\'t be saved to localStorage.',
              variant: 'destructive',
            });
          }
        } catch (error) {
          console.error('Error optimizing image:', error);
          toast({
            title: 'Error processing image',
            description: 'Failed to optimize the image. Please try a different one.',
            variant: 'destructive',
          });
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectProfilePicture = () => {
    fileInputRef.current?.click();
  };

  // Helper function to get initial from display name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  if (isUserLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-auto bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Your Profile</h1>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your profile information and sync it across all social platforms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center sm:flex-row sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 mb-4">
                <div className="relative">
                  <Avatar className="w-24 h-24 border-2 border-primary">
                    <AvatarImage src={profilePicture} alt={displayName} />
                    <AvatarFallback className="text-xl bg-primary text-white">
                      {getInitials(displayName || 'User')}
                    </AvatarFallback>
                  </Avatar>
                  <Button 
                    className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
                    onClick={handleSelectProfilePicture}
                  >
                    <FaCamera size={14} />
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                  />
                </div>
                <div className="flex-1 space-y-4 text-center sm:text-left">
                  <div>
                    <h3 className="text-xl font-semibold">{displayName || 'Set your display name'}</h3>
                    <p className="text-gray-500">{designation || 'Add your title or designation'}</p>
                  </div>
                  <p className="text-sm text-gray-600">
                    Your profile picture and information will be used across all social platforms in this app.
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="username"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="designation">Title / Designation</Label>
                  <Input
                    id="designation"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Software Engineer, Product Manager, etc."
                  />
                </div>
              </div>
              
              {/* Auto-save status indicator */}
              {lastSaved && (
                <div className="flex items-center justify-end text-sm text-gray-500 mt-2">
                  {showSavedIndicator && (
                    <div className="flex items-center text-green-600 mr-3">
                      <FaCheck className="mr-1" size={12} />
                      <span>Saved</span>
                    </div>
                  )}
                  <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between items-center">
              <div className="flex items-center">
                <CheckoutButton />
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <FaCheck className="mr-2 text-green-500" size={14} />
                Changes are saved automatically across all platforms
              </div>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Manage your account settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Local Storage</h4>
                  <p className="text-sm text-gray-500">Your data is stored locally on this device</p>
                </div>
                <Button 
                  variant="outline" 
                  className="flex items-center"
                  onClick={() => setIsDataModalOpen(true)}
                >
                  <FaDatabase className="mr-2" size={14} />
                  Manage Data
                </Button>
              </div>
              

            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Data Management Dialog */}
      <Dialog open={isDataModalOpen} onOpenChange={setIsDataModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Your Data</DialogTitle>
            <DialogDescription>
              Control how your data is stored and synchronized across the application.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Auto-Sync Data</h4>
                <p className="text-sm text-gray-500">Automatically sync data when online</p>
              </div>
              <Switch 
                id="auto-sync"
                defaultChecked={true}
                onCheckedChange={(checked) => {
                  // Save auto-sync preference to localStorage
                  localStorage.setItem('autoSync', JSON.stringify(checked));
                  toast({
                    title: checked ? 'Auto-sync enabled' : 'Auto-sync disabled',
                    description: checked 
                      ? 'Your data will automatically sync when online' 
                      : 'You will need to manually sync your data',
                  });
                }}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Export All Data</h4>
                <p className="text-sm text-gray-500">Download all your data as JSON</p>
              </div>
              <Button
                variant="outline"
                className="flex items-center"
                onClick={() => {
                  // Collect all data from localStorage
                  const data = {
                    profile: localStorage.getItem('userProfile') ? JSON.parse(localStorage.getItem('userProfile') || '{}') : null,
                    notes: localStorage.getItem('notes') ? JSON.parse(localStorage.getItem('notes') || '[]') : [],
                    journals: localStorage.getItem('journals') ? JSON.parse(localStorage.getItem('journals') || '[]') : [],
                    posts: localStorage.getItem('posts') ? JSON.parse(localStorage.getItem('posts') || '[]') : [],
                    // Add any other data stores you have
                  };
                  
                  // Create a download link
                  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
                  const downloadAnchorNode = document.createElement('a');
                  downloadAnchorNode.setAttribute("href", dataStr);
                  downloadAnchorNode.setAttribute("download", "social_hub_data.json");
                  document.body.appendChild(downloadAnchorNode); // Required for Firefox
                  downloadAnchorNode.click();
                  downloadAnchorNode.remove();
                  
                  toast({
                    title: 'Data exported',
                    description: 'Your data has been exported as JSON',
                  });
                }}
              >
                <FaDownload className="mr-2" size={14} />
                Export
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-red-600">Clear All Data</h4>
                <p className="text-sm text-gray-500">Delete all locally stored data</p>
              </div>
              <Button
                variant="destructive"
                className="flex items-center"
                onClick={() => {
                  if (confirm('Are you sure you want to clear all your data? This action cannot be undone.')) {
                    // Clear all data from localStorage except user preferences
                    const autoSync = localStorage.getItem('autoSync');
                    
                    localStorage.clear();
                    
                    // Restore preferences
                    if (autoSync) localStorage.setItem('autoSync', autoSync);
                    
                    toast({
                      title: 'Data cleared',
                      description: 'All your locally stored data has been deleted',
                      variant: 'destructive',
                    });
                    
                    // Close the dialog
                    setIsDataModalOpen(false);
                  }
                }}
              >
                <FaTrash className="mr-2" size={14} />
                Clear Data
              </Button>
            </div>
          </div>
          <DialogFooter className="sm:justify-end">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => setIsDataModalOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
