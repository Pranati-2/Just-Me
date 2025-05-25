import React from 'react';
import LoginForm from '@/components/auth/login-form';
import { useLocation } from 'wouter';
import { useUser } from '@/context/new-user-context';

export default function Login() {
  const { user, isLoading } = useUser();
  const [, setLocation] = useLocation();

  // Redirect if already logged in
  React.useEffect(() => {
    if (user && !isLoading) {
      setLocation('/');
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-b from-background to-secondary/10">
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </div>
  );
}