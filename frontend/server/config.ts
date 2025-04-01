import dotenv from 'dotenv';
dotenv.config();

export const config = {
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleRedirectUri: 'http://127.0.0.1:5173/api/auth/google/callback',
  sessionSecret: process.env.SESSION_SECRET || 'trip-planner-session-secret'
};