// React imports
import { useLocation } from 'wouter';
import { useUser } from '@/context/new-user-context';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  LogIn, 
  LogOut, 
  User, 
  CreditCard
} from 'lucide-react';

import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import { SyncIndicator } from '@/components/ui/sync-indicator';

export function NavigationBar() {
  const [location, navigate] = useLocation();
  const { user, isLoading, logout } = useUser();

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate('/');
    }
  };

  const navigateHome = () => {
    navigate('/');
  };

  const { toast } = useToast();
  
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
      
      // Show success toast notification
      toast({
        title: "Logged out successfully",
        description: "You have been securely logged out of your account",
      });
    } catch (error) {
      console.error('Logout error:', error);
      
      // Show error toast notification
      toast({
        title: "Error logging out",
        description: "There was a problem logging out. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <header className="flex items-center justify-between py-2 px-2 sm:px-4 border-b border-gray-200 bg-white shadow-sm max-w-full overflow-hidden">
      <div className="flex items-center space-x-1 min-w-0">
        <button 
          className="p-1 sm:p-2 text-gray-600 hover:text-gray-900 flex-shrink-0"
          onClick={handleBack}
          aria-label="Go back"
        >
          <i className="ri-arrow-left-line text-xl"></i>
        </button>
        <div className="flex items-center cursor-pointer truncate" onClick={navigateHome}>
          <span className="text-lg sm:text-2xl font-bold bg-gradient-to-br from-orange-500 to-red-600 bg-clip-text text-transparent truncate" style={{ 
            filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.15))'
          }}>JustMe</span>
        </div>
        <div className="ml-2">
          <SyncIndicator />
        </div>
      </div>
      
      <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
        <button 
          className="p-2 text-gray-600 hover:text-gray-900"
          onClick={navigateHome}
          aria-label="Home"
        >
          <i className="ri-home-4-line text-xl"></i>
        </button>
        
        {isLoading ? (
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        ) : user ? (
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage 
                      src={user?.profilePicture || ""} 
                      alt={user?.displayName || "User Profile"} 
                      className="object-cover"
                    />
                    <AvatarFallback className="text-xs bg-primary text-white">
                      {user?.displayName ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase() : user?.username?.substring(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500 border-2 border-white"></span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-medium">{user?.displayName || user?.username}</span>
                    <span className="text-xs text-muted-foreground">{user?.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/checkout')}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  <span>Subscription</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={async () => {
                    try {
                      await logout();
                      navigate('/login');
                      
                      // Show toast notification
                      toast({
                        title: "Logged out",
                        description: "You have successfully logged out.",
                      });
                    } catch (error) {
                      console.error('Logout error:', error);
                      
                      // Show error toast notification
                      toast({
                        title: "Error logging out",
                        description: "There was a problem logging out. Please try again.",
                        variant: "destructive"
                      });
                    }
                  }}
                  className="text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              className="hidden md:flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2 bg-white">
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign in</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Sign in options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/login')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Username & Password</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    try {
                      // Show toast notification
                      toast({
                        title: "Redirecting to Google...",
                        description: "Please wait while we redirect you to Google for authentication."
                      });
                      
                      // Direct to Google OAuth
                      window.location.href = '/api/auth/google';
                    } catch (error) {
                      // In case there's an issue with the OAuth setup
                      toast({
                        title: "OAuth Error",
                        description: "Google login is not configured properly. Please try regular login.",
                        variant: "destructive"
                      });
                      // Fallback to regular login
                      navigate('/login');
                    }
                  }}
                  className="flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" className="mr-2 h-4 w-4">
                    <path fill="#EA4335" d="M5.26620003,9.76452941 C5.26620003,9.18509362 5.34547146,8.62617888 5.48502286,8.08944741 L2.75319,8.08944741 C2.58415361,8.62486057 2.49177561,9.18846117 2.49177561,9.76452941 C2.49177561,10.3501715 2.58185561,10.9047196 2.74771143,11.4328554 L5.48205571,11.4328554 C5.34400571,10.8966269 5.26620003,10.3391927 5.26620003,9.76452941"></path>
                    <path fill="#FBBC05" d="M12.0004,5.78693569 C13.3585575,5.78693569 14.5730206,6.29709115 15.5,7.14460437 L17.7546719,4.88930864 C16.1459016,3.41649336 14.2607138,2.49179857 12.0004,2.49179857 C8.48352168,2.49179857 5.43029952,4.44792257 3.92358709,7.30036279 L6.65710571,10.0447142 C7.38303,7.61951954 9.49042,5.78693569 12.0004,5.78693569"></path>
                    <path fill="#4285F4" d="M12.0004,13.7525 C9.49115714,13.7525 7.38446286,11.9268286 6.6586,9.5 L3.92507143,12.2455 C5.43077143,15.0989286 8.48352168,17.0579429 12.0004,17.0579429 C14.1599571,17.0579429 16.0588571,16.2223857 17.4782714,14.8149429 L15.3769,12.5632857 C14.5758571,13.2787857 13.3964286,13.7525 12.0004,13.7525"></path>
                    <path fill="#34A853" d="M21.5082429,9.7645 C21.5082429,9.18494286 21.4315857,8.62514286 21.2920286,8.08942857 L12.0004286,8.08942857 L12.0004286,11.4328857 L17.3879,11.4328857 C17.1394857,12.6738857 16.4347714,13.5632857 15.3764,14.3187429 L17.4769143,16.5705 C19.3201,14.8968286 21.5082429,12.6738857 21.5082429,9.7645"></path>
                  </svg>
                  <span>Continue with Google</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button 
              variant="default" 
              size="sm"
              className="hidden md:flex items-center gap-2"
              onClick={() => navigate('/login')}
            >
              <LogIn className="h-4 w-4" />
              <span>Login</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
