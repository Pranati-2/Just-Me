import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import bcrypt from 'bcrypt';
import { storage } from '../storage';
import { z } from 'zod';

// Define session data interface to extend Express.Session
declare module 'express-session' {
  interface SessionData {
    passport: {
      user: number;
    };
  }
}

export const authRouter = Router();

// Login with username/password
authRouter.post('/login', async (req: Request, res: Response) => {
  passport.authenticate('local', (err: any, user: any, info: any) => {
    if (err) {
      return res.status(500).json({ message: 'Authentication error', error: err.message });
    }
    
    if (!user) {
      return res.status(401).json({ message: info.message || 'Invalid credentials' });
    }
    
    req.logIn(user, (loginErr) => {
      if (loginErr) {
        return res.status(500).json({ message: 'Login error', error: loginErr.message });
      }
      
      // Don't send password in response
      const { password, ...userWithoutPassword } = user;
      return res.status(200).json({ 
        message: 'Login successful',
        user: userWithoutPassword
      });
    });
  })(req, res);
});

// Register a new user
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      username: z.string().min(3).max(30),
      email: z.string().email(),
      password: z.string().min(6),
      displayName: z.string().optional(),
    });
    
    const { username, email, password, displayName } = schema.parse(req.body);
    
    // Check if username already exists
    const existingUserByUsername = await storage.getUserByUsername(username);
    if (existingUserByUsername) {
      return res.status(400).json({ message: 'Username already in use' });
    }
    
    // Check if email already exists
    const existingUserByEmail = await storage.getUserByEmail(email);
    if (existingUserByEmail) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user
    const user = await storage.createUser({
      username,
      email,
      password: hashedPassword,
      displayName: displayName || username,
      profilePicture: null,
      designation: null,
      provider: 'local',
      googleId: null,
      microsoftId: null,
      facebookId: null,
      accessToken: null,
      refreshToken: null
    });
    
    // Auto-login
    req.logIn(user, (err) => {
      if (err) {
        return res.status(500).json({ message: 'Error during login after registration', error: err.message });
      }
      
      // Don't send password in response
      const { password, ...userWithoutPassword } = user;
      return res.status(201).json({ 
        message: 'Registration successful',
        user: userWithoutPassword
      });
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: error.errors 
      });
    }
    
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Error during registration process' 
    });
  }
});

// Get current user
authRouter.get('/current-user', (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    return res.status(200).json({ user: null });
  }
  
  // Don't send password in response
  const { password, ...userWithoutPassword } = req.user as any;
  res.status(200).json({ user: userWithoutPassword });
});

// Update user profile
authRouter.patch('/profile', async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'You must be logged in to update your profile' });
  }
  
  try {
    const schema = z.object({
      displayName: z.string().optional(),
      profilePicture: z.string().optional(),
      designation: z.string().optional(),
      email: z.string().email().optional(),
      username: z.string().optional(),
    });
    
    const updateData = schema.parse(req.body);
    const userId = (req.user as any).id;
    
    console.log('Profile update request for user ID:', userId);
    console.log('Profile picture included:', updateData.profilePicture ? 'Yes' : 'No'); 
    
    if (updateData.email) {
      // Check if email already in use by another user
      const existingUser = await storage.getUserByEmail(updateData.email);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ message: 'Email already in use by another account' });
      }
    }
    
    if (updateData.username) {
      // Check if username already in use by another user
      const existingUser = await storage.getUserByUsername(updateData.username);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ message: 'Username already in use by another account' });
      }
    }
    
    // Check if the profile data was correctly formed
    const updateDataKeys = Object.keys(updateData).filter(key => updateData[key as keyof typeof updateData] !== undefined);
    console.log('Fields being updated:', updateDataKeys.join(', '));
    
    const updatedUser = await storage.updateUser(userId, updateData);
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('User profile updated successfully');
    
    // Don't send password in response
    const { password, ...userWithoutPassword } = updatedUser;
    res.status(200).json({ 
      message: 'Profile updated successfully',
      user: userWithoutPassword
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: error.errors 
      });
    }
    
    console.error('Profile update error:', error);
    res.status(500).json({ 
      message: 'Error updating profile' 
    });
  }
});

// Login with Google OAuth
authRouter.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google OAuth callback
authRouter.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: '/login',
    failureMessage: true
  }),
  (req, res) => {
    // Successful authentication, redirect home
    res.redirect('/');
  }
);

// Logout
authRouter.post('/logout', (req: Request, res: Response) => {
  if (req.isAuthenticated()) {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: 'Error during logout', error: err.message });
      }
      
      // If using session store, destroy session
      if (req.session) {
        req.session.destroy((sessionErr) => {
          if (sessionErr) {
            console.error('Error destroying session:', sessionErr);
          }
          res.clearCookie('connect.sid');
          return res.status(200).json({ message: 'Logout successful' });
        });
      } else {
        res.status(200).json({ message: 'Logout successful' });
      }
    });
  } else {
    res.status(200).json({ message: 'No active session' });
  }
});

// Middleware to check if user is authenticated
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  
  res.status(401).json({ message: 'Unauthorized: Please log in to access this resource' });
}