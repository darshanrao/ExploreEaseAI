import dotenv from 'dotenv';
dotenv.config();

// Determine the base URL for OAuth callbacks
let baseUrl = 'http://localhost:5000';

// If running in Replit
if (process.env.REPL_ID && process.env.REPL_SLUG) {
  // Replit uses HTTPS by default when deployed
  baseUrl = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
}

// FastAPI backend URL
const fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8000';

export const config = {
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  // Use the exact URI from Google OAuth configuration
  googleRedirectUri: 'http://127.0.0.1:5173/api/auth/google/callback',
  sessionSecret: process.env.SESSION_SECRET || 'trip-planner-session-secret',
  // Add FastAPI backend URL to config
  fastApiUrl
};