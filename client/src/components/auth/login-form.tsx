import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

const loginFormSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function LoginForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [, setLocation] = useLocation();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/auth/login', values);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }
      
      toast({
        title: 'Success',
        description: 'Logged in successfully!',
      });
      
      setLocation('/');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An error occurred during login',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    try {
      // Show a loading toast
      toast({
        title: "Redirecting to Google...",
        description: "You'll be redirected to Google for authentication."
      });
      
      // Redirect to Google OAuth endpoint
      window.location.href = '/api/auth/google';
    } catch (error) {
      // In case there's an issue with the OAuth redirect
      toast({
        title: "OAuth Error",
        description: "Google login is not configured properly. Please try regular login instead.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
        <CardDescription>
          Sign in to access your social media dashboard
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Enter your password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </Form>
        
        <div className="mt-6 flex items-center">
          <Separator className="flex-grow" />
          <span className="mx-2 text-sm text-muted-foreground">OR</span>
          <Separator className="flex-grow" />
        </div>
        
        <div className="mt-4 space-y-3">
          <Button 
            variant="outline" 
            className="w-full flex items-center justify-center gap-2 border-2 hover:bg-gray-50"
            onClick={handleGoogleLogin}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" className="w-5 h-5">
              <path fill="#EA4335" d="M5.26620003,9.76452941 C5.26620003,9.18509362 5.34547146,8.62617888 5.48502286,8.08944741 L2.75319,8.08944741 C2.58415361,8.62486057 2.49177561,9.18846117 2.49177561,9.76452941 C2.49177561,10.3501715 2.58185561,10.9047196 2.74771143,11.4328554 L5.48205571,11.4328554 C5.34400571,10.8966269 5.26620003,10.3391927 5.26620003,9.76452941"></path>
              <path fill="#FBBC05" d="M12.0004,5.78693569 C13.3585575,5.78693569 14.5730206,6.29709115 15.5,7.14460437 L17.7546719,4.88930864 C16.1459016,3.41649336 14.2607138,2.49179857 12.0004,2.49179857 C8.48352168,2.49179857 5.43029952,4.44792257 3.92358709,7.30036279 L6.65710571,10.0447142 C7.38303,7.61951954 9.49042,5.78693569 12.0004,5.78693569"></path>
              <path fill="#4285F4" d="M12.0004,13.7525 C9.49115714,13.7525 7.38446286,11.9268286 6.6586,9.5 L3.92507143,12.2455 C5.43077143,15.0989286 8.48352168,17.0579429 12.0004,17.0579429 C14.1599571,17.0579429 16.0588571,16.2223857 17.4782714,14.8149429 L15.3769,12.5632857 C14.5758571,13.2787857 13.3964286,13.7525 12.0004,13.7525"></path>
              <path fill="#34A853" d="M21.5082429,9.7645 C21.5082429,9.18494286 21.4315857,8.62514286 21.2920286,8.08942857 L12.0004286,8.08942857 L12.0004286,11.4328857 L17.3879,11.4328857 C17.1394857,12.6738857 16.4347714,13.5632857 15.3764,14.3187429 L17.4769143,16.5705 C19.3201,14.8968286 21.5082429,12.6738857 21.5082429,9.7645"></path>
            </svg>
            Continue with Google
          </Button>
          
          <div className="text-xs text-center text-gray-500">
            Google Sign-In provides a secure way to log in with your Google account credentials.
            <br />No password to remember, and your information stays secure.
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          Don't have an account? Contact your administrator
        </p>
      </CardFooter>
    </Card>
  );
}