import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import bcrypt from 'bcrypt';
import { storage } from '../storage';
import { Express } from 'express';
import session from 'express-session';
import { User } from '@shared/schema';

export function configurePassport(app: Express) {
  // Configure session
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'your-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      },
    })
  );

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Local Strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // First check if the input is a username
        let user = await storage.getUserByUsername(username);
        
        // If not found by username, check if it's an email
        if (!user) {
          user = await storage.getUserByEmail(username);
        }

        if (!user) {
          return done(null, false, { message: 'Invalid username or email' });
        }

        // Check if user has a password (some might be OAuth-only)
        if (!user.password) {
          return done(null, false, { 
            message: 'This account does not have a password. Please login with the provider you used to create the account.' 
          });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: 'Invalid password' });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  // Configure Google Strategy if keys are available
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: '/auth/google/callback',
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Check if user already exists
            let user = await storage.getUserByGoogleId(profile.id);

            if (user) {
              // Update tokens
              user = await storage.updateUser(user.id, {
                accessToken,
                refreshToken: refreshToken || user.refreshToken,
              });
              return done(null, user);
            }

            // Create a new user
            const email = profile.emails && profile.emails[0] ? profile.emails[0].value : '';
            
            // Check if user exists with this email but no googleId
            const existingUser = await storage.getUserByEmail(email);
            if (existingUser) {
              // Link Google account to existing account
              const updatedUser = await storage.updateUser(existingUser.id, {
                googleId: profile.id,
                accessToken,
                refreshToken,
                provider: existingUser.provider ? `${existingUser.provider},google` : 'google',
              });
              return done(null, updatedUser);
            }

            // Create a new user
            const newUser = await storage.createUser({
              username: `google_${profile.id}`, // Generate a unique username
              email,
              password: null, // No password for OAuth users
              displayName: profile.displayName || email.split('@')[0],
              profilePicture: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
              googleId: profile.id,
              provider: 'google',
              accessToken,
              refreshToken,
              designation: null,
              microsoftId: null,
              facebookId: null
            });

            return done(null, newUser);
          } catch (error) {
            return done(error as Error);
          }
        }
      )
    );
  }

  // Serialize user for session storage
  passport.serializeUser((user, done) => {
    done(null, (user as User).id);
  });

  // Deserialize user from session storage
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
}