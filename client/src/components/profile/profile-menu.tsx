import React, { useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useUser } from '@/context/new-user-context';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface ProfileMenuProps {
  onClose: () => void;
}

export default function ProfileMenu({ onClose }: ProfileMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();
  const { user, logout } = useUser();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    onClose();
  };

  const navigateTo = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <div 
      ref={ref}
      className="absolute right-0 top-full mt-2 w-60 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
    >
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center">
          <Avatar className="h-12 w-12 mr-3">
            <AvatarImage 
              src={user?.profilePicture || ""} 
              alt={user?.displayName || "User"} 
              className="object-cover"
            />
            <AvatarFallback className="bg-primary text-white">
              {user?.displayName ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase() : user?.username?.substring(0, 2).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{user?.displayName || user?.username}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
        </div>
      </div>

      <ul className="py-2">
        <li>
          <button 
            className="flex items-center px-4 py-2 w-full text-left hover:bg-gray-100"
            onClick={() => navigateTo('/profile')}
          >
            <span className="w-8">👤</span>
            <span>Profile</span>
          </button>
        </li>
        <li>
          <button 
            className="flex items-center px-4 py-2 w-full text-left hover:bg-gray-100"
            onClick={() => navigateTo('/checkout')}
          >
            <span className="w-8">💳</span>
            <span>Subscription</span>
          </button>
        </li>
        <li className="border-t border-gray-200 mt-2 pt-2">
          <button 
            className="flex items-center px-4 py-2 w-full text-left text-red-600 hover:bg-gray-100"
            onClick={handleLogout}
          >
            <span className="w-8">🚪</span>
            <span>Logout</span>
          </button>
        </li>
      </ul>
    </div>
  );
}