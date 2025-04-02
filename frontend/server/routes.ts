import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPreferenceSchema, insertFeedbackSchema, GoogleToken } from "@shared/schema";
import { z } from "zod";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { config } from "./config";
import { google } from "googleapis";
import { callFastApi } from "./fastapi-client";
import { getPlacesByInterests } from "./places-api";

// Extend Express Request type to include session
declare module 'express-session' {
  interface SessionData {
    googleToken?: GoogleToken;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up passport for Google OAuth
  passport.serializeUser((user: any, done) => {
    done(null, user);
  });

  passport.deserializeUser((user: any, done) => {
    done(null, user);
  });

  // Configure Google OAuth strategy
  passport.use(new GoogleStrategy({
    clientID: config.googleClientId,
    clientSecret: config.googleClientSecret,
    callbackURL: config.googleRedirectUri,
    scope: ['profile', 'email', 'https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events']
  }, (accessToken, refreshToken, profile, done) => {
    // Store tokens for later use
    const expiryDate = new Date().getTime() + 3600000; // 1 hour from now
    const user = {
      googleId: profile.id,
      email: profile.emails?.[0]?.value,
      name: profile.displayName,
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiryDate
      }
    };
    
    return done(null, user);
  }));
  // Google Auth API endpoints
  // Google OAuth routes for authorization
  app.get("/api/auth/google", 
    passport.authenticate("google", { 
      scope: ["profile", "email", "https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/calendar.events"],
      accessType: "offline",
      prompt: "consent"
    })
  );

  // Google OAuth callback route
  app.get("/api/auth/google/callback", 
    passport.authenticate("google", { failureRedirect: "/" }),
    (req, res) => {
      // Get the state parameter that contains the original path
      const state = req.query.state as string || '/preferences';
      
      // Successful authentication
      // Add a query parameter for the frontend to detect successful auth
      // Use absolute URL to ensure proper redirection
      console.log(`OAuth callback redirecting to: ${state}?auth_success=true`);
      res.redirect(`${req.protocol}://${req.headers.host}${state}?auth_success=true`);
    }
  );
  
  // For legacy code compatibility
  app.get("/api/auth/google/credentials", (req: Request, res: Response) => {
    // Return the credentials needed for OAuth
    res.json({
      apiKey: "",
      clientId: config.googleClientId,
    });
  });

  // For legacy code compatibility
  app.post("/api/auth/google/token", async (req: Request, res: Response) => {
    // This endpoint is kept for backward compatibility
    // New code should use the passport routes above
    res.status(200).json({ success: true });
  });

  app.get("/api/auth/google/status", (req: Request, res: Response) => {
    // Check if the user is authenticated with Google
    const authenticated = req.isAuthenticated();
    res.json({ authenticated, user: req.user });
  });

  // Calendar API endpoints
  app.get("/api/calendar/events-count", async (req: Request, res: Response) => {
    // Check if authenticated
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated with Google" });
    }

    try {
      // Get user and tokens from passport session
      const user = req.user as any;
      
      if (!user || !user.tokens) {
        return res.status(401).json({ error: "Google tokens not available" });
      }
      
      // Set up OAuth2 client with user's tokens
      const oauth2Client = new google.auth.OAuth2(
        config.googleClientId,
        config.googleClientSecret,
        config.googleRedirectUri
      );
      
      oauth2Client.setCredentials({
        access_token: user.tokens.access_token,
        refresh_token: user.tokens.refresh_token,
        expiry_date: user.tokens.expires_at
      });
      
      // Create Google Calendar API client
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      
      // Calculate date range for last 7 days
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      // Fetch events from the last 7 days
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: oneWeekAgo.toISOString(),
        timeMax: now.toISOString(),
        maxResults: 100,
        singleEvents: true,
        orderBy: 'startTime'
      });
      
      const events = response.data.items || [];
      
      // Return the count of events
      res.json({ count: events.length });
    } catch (error) {
      console.error('Failed to fetch calendar events count:', error);
      res.status(500).json({ error: "Failed to fetch calendar events count", count: 0 });
    }
  });

  app.get("/api/calendar/events", async (req: Request, res: Response) => {
    // Check if authenticated
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated with Google" });
    }
    
    const { timeMin, timeMax } = req.query;
    
    if (!timeMin || !timeMax) {
      return res.status(400).json({ error: "timeMin and timeMax parameters are required" });
    }

    try {
      // Get user and tokens from passport session
      const user = req.user as any;
      
      if (!user || !user.tokens) {
        return res.status(401).json({ error: "Google tokens not available" });
      }
      
      // Set up OAuth2 client with user's tokens
      const oauth2Client = new google.auth.OAuth2(
        config.googleClientId,
        config.googleClientSecret,
        config.googleRedirectUri
      );
      
      oauth2Client.setCredentials({
        access_token: user.tokens.access_token,
        refresh_token: user.tokens.refresh_token,
        expiry_date: user.tokens.expires_at
      });
      
      // Create Google Calendar API client
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      
      // Fetch events for the requested time range
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin as string,
        timeMax: timeMax as string,
        maxResults: 50,
        singleEvents: true,
        orderBy: 'startTime'
      });
      
      const events = response.data.items || [];
      
      // Return the events
      res.json({ events });
    } catch (error) {
      console.error('Failed to fetch calendar events:', error);
      res.status(500).json({ error: "Failed to fetch calendar events", events: [] });
    }
  });
  
  app.post("/api/calendar/export-trip", async (req: Request, res: Response) => {
    try {
      // Check authentication
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated with Google" });
      }

      const { recommendations, tripDetails } = req.body;
      const { destination, startDate, endDate } = tripDetails;
      
      if (!recommendations || !recommendations.length) {
        return res.status(400).json({ error: "No recommendations provided" });
      }
      
      // Get user and tokens from passport session
      const user = req.user as any;
      
      if (!user || !user.tokens) {
        return res.status(401).json({ error: "Google tokens not available" });
      }
      
      // Set up OAuth2 client with user's tokens
      const oauth2Client = new google.auth.OAuth2(
        config.googleClientId,
        config.googleClientSecret,
        config.googleRedirectUri
      );
      
      oauth2Client.setCredentials({
        access_token: user.tokens.access_token,
        refresh_token: user.tokens.refresh_token,
        expiry_date: user.tokens.expires_at
      });
      
      // Create Google Calendar API client
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      
      // Create calendar events for each recommendation
      const createdEvents = [];
      const start = new Date(startDate);
      
      for (const rec of recommendations) {
        // Calculate the event date based on the recommendation day number
        const eventDate = new Date(start);
        eventDate.setDate(eventDate.getDate() + (rec.day - 1)); // day is 1-based
        
        // Create time slots based on timeOfDay
        let startHour = 9; // Default to morning (9 AM)
        let endHour = 11;
        
        if (rec.timeOfDay === 'afternoon') {
          startHour = 13; // 1 PM
          endHour = 15; // 3 PM
        } else if (rec.timeOfDay === 'evening') {
          startHour = 18; // 6 PM
          endHour = 20; // 8 PM
        } else if (rec.timeOfDay === 'all-day') {
          startHour = 9; // 9 AM
          endHour = 18; // 6 PM
        }
        
        const eventStart = new Date(eventDate);
        eventStart.setHours(startHour, 0, 0);
        
        const eventEnd = new Date(eventDate);
        eventEnd.setHours(endHour, 0, 0);
        
        // Create the event in Google Calendar
        const location = rec.description.includes('Location:') ? 
          rec.description.split('Location:')[1].trim().split('\n')[0] : 
          `${rec.distance}, ${destination}`;
        
        try {
          // Create event in Google Calendar
          const event = {
            summary: `${rec.name} (${rec.type})`,
            description: rec.description,
            location: location,
            start: {
              dateTime: eventStart.toISOString(),
              timeZone: 'UTC'
            },
            end: {
              dateTime: eventEnd.toISOString(),
              timeZone: 'UTC'
            }
          };
          
          const googleEvent = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event
          });
          
          // Save event to our database for tracking
          const calendarEvent = await storage.saveCalendarEvent({
            userId: 1, // In a real app, use the authenticated user's ID
            title: event.summary,
            description: event.description || null,
            location: event.location || null,
            startTime: new Date(eventStart),
            endTime: new Date(eventEnd),
            eventId: googleEvent.data.id || `trip-${Date.now()}-${rec.id}`
          });
          
          createdEvents.push(calendarEvent);
        } catch (eventError) {
          console.error('Error creating Google Calendar event:', eventError);
          // Continue with the next event even if this one fails
        }
      }
      
      if (createdEvents.length === 0) {
        return res.status(500).json({ error: "Failed to create any calendar events" });
      }
      
      res.json({ 
        success: true, 
        message: `Added ${createdEvents.length} events to your Google Calendar`, 
        events: createdEvents 
      });
    } catch (error) {
      console.error('Failed to export trip to calendar:', error);
      res.status(500).json({ error: "Failed to export trip to calendar" });
    }
  });
  
  // Add a single event to Google Calendar
  app.post("/api/calendar/add-event", async (req: Request, res: Response) => {
    try {
      // Check authentication
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated with Google" });
      }
      
      // Validate request body
      const { title, description, start_time, end_time, location } = req.body;
      
      if (!title || !start_time || !end_time) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      // Get user and tokens from passport session
      const user = req.user as any;
      
      if (!user || !user.tokens) {
        return res.status(401).json({ error: "Google tokens not available" });
      }
      
      // Set up OAuth2 client with user's tokens
      const oauth2Client = new google.auth.OAuth2(
        config.googleClientId,
        config.googleClientSecret,
        config.googleRedirectUri
      );
      
      oauth2Client.setCredentials({
        access_token: user.tokens.access_token,
        refresh_token: user.tokens.refresh_token,
        expiry_date: user.tokens.expires_at
      });
      
      // Create Google Calendar API client
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      
      // Create event in Google Calendar
      const event = {
        summary: title,
        description: description || '',
        location: location || '',
        start: {
          dateTime: start_time,
          timeZone: 'UTC'
        },
        end: {
          dateTime: end_time,
          timeZone: 'UTC'
        }
      };
      
      const googleEvent = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event
      });
      
      // Save event to our database for tracking
      const calendarEvent = await storage.saveCalendarEvent({
        userId: 1, // In a real app, use the authenticated user's ID
        title: event.summary,
        description: event.description || null,
        location: event.location || null,
        startTime: new Date(start_time),
        endTime: new Date(end_time),
        eventId: googleEvent.data.id || `event-${Date.now()}`
      });
      
      res.json({
        success: true,
        message: "Event added to your Google Calendar",
        event: calendarEvent
      });
    } catch (error) {
      console.error('Failed to add event to calendar:', error);
      res.status(500).json({ error: "Failed to add event to calendar" });
    }
  });

  // Preferences API endpoint
  app.post("/api/preferences", async (req: Request, res: Response) => {
    try {
      const preferences = insertPreferenceSchema.parse(req.body);
      
      // In a real app, we would associate this with the user
      await storage.savePreferences(preferences);
      
      res.status(201).json({ success: true });
    } catch (error) {
      console.error("Error saving preferences:", error);
      res.status(400).json({ error: "Invalid preference data" });
    }
  });

  // Trip details API endpoint
  app.get("/api/trip-details", async (req: Request, res: Response) => {
    try {
      const preferences = await storage.getLatestPreferences();
      if (!preferences) {
        return res.status(404).json({ error: "No preferences found" });
      }
      
      res.json(preferences);
    } catch (error) {
      console.error("Error getting trip details:", error);
      res.status(500).json({ error: "Failed to get trip details" });
    }
  });

  // Recommendations API endpoint
  app.get("/api/recommendations", async (req: Request, res: Response) => {
    try {
      const recommendations = await storage.getRecommendations();
      res.json(recommendations);
    } catch (error) {
      console.error("Error getting recommendations:", error);
      res.status(500).json({ error: "Failed to get recommendations" });
    }
  });
  
  // Interest-based places API using Google Places API
  app.post("/api/places-by-interests", getPlacesByInterests);
  
  app.post("/api/places-by-interests-old", async (req: Request, res: Response) => {
    try {
      const { location, interests } = req.body;
      
      if (!location || !interests || !Array.isArray(interests)) {
        return res.status(400).json({ error: "Invalid request. Location and interests array are required." });
      }
      
      console.log("Received request for places in", location, "with interests:", interests);
      
      // Try to call FastAPI backend
      try {
        console.log("Calling FastAPI for place recommendations...");
        const fastApiResponse = await callFastApi('places-by-interests', 'POST', { 
          location, 
          interests 
        });
        
        if (fastApiResponse && fastApiResponse.recommendations && Array.isArray(fastApiResponse.recommendations)) {
          console.log("Successfully received recommendations from FastAPI");
          
          // Store the recommendations from FastAPI
          const storedRecommendations = [];
          for (const rec of fastApiResponse.recommendations) {
            try {
              const storedRec = await storage.createRecommendation({
                name: rec.title,
                description: rec.description,
                location: rec.location || rec.title,
                distance: rec.location || "City Center",
                type: rec.category,
                day: 1,
                timeOfDay: ["morning", "afternoon", "evening"][Math.floor(Math.random() * 3)],
                rating: rec.rating ? rec.rating.toString() : "4.5",
                reviewCount: 500 + Math.floor(Math.random() * 500),
                openingHours: "9:00 AM - 5:00 PM",
                userId: 1, // Default user ID
                preferenceId: 1 // Use the latest preference ID
              });
              
              storedRecommendations.push(storedRec);
            } catch (err) {
              console.error("Error storing FastAPI recommendation:", err);
            }
          }
          
          if (storedRecommendations.length > 0) {
            return res.json(storedRecommendations);
          }
        }
      } catch (fastApiError) {
        console.error("FastAPI error:", fastApiError);
        // Continue with fallback implementation if FastAPI call fails
      }
      
      // Generate fallback recommendations based on interests
      console.log("Using fallback recommendations for", location);
      const recommendations = [];
      
      // Map of interest types to sample places
      const interestPlaces: Record<string, any[]> = {
        "Food": [
          {
            title: `${location} Fine Dining`,
            description: `Enjoy delicious local cuisine at this popular restaurant in ${location}.`,
            location: `Downtown ${location}`,
            category: "Food",
            rating: 4.7,
            price_level: "$$$"
          },
          {
            title: `${location} Street Food`,
            description: `Try authentic street food at this famous market in ${location}.`,
            location: `Market District, ${location}`,
            category: "Food",
            rating: 4.5,
            price_level: "$"
          },
          {
            title: `${location} Cafe`,
            description: `Relax with coffee and pastries at this charming cafe.`,
            location: `Arts District, ${location}`,
            category: "Food",
            rating: 4.6,
            price_level: "$$"
          }
        ],
        "Shopping": [
          {
            title: `${location} Shopping Mall`,
            description: `The largest shopping center in ${location} with hundreds of stores.`,
            location: `Central ${location}`,
            category: "Shopping",
            rating: 4.4,
            price_level: "$$"
          },
          {
            title: `${location} Boutiques`,
            description: `Explore unique boutique shops in the fashion district.`,
            location: `Fashion District, ${location}`,
            category: "Shopping",
            rating: 4.3,
            price_level: "$$$"
          },
          {
            title: `${location} Market`,
            description: `Traditional market with local products and souvenirs.`,
            location: `Old Town, ${location}`,
            category: "Shopping",
            rating: 4.8,
            price_level: "$"
          }
        ],
        "Nature": [
          {
            title: `${location} Park`,
            description: `Beautiful urban park with walking paths and gardens.`,
            location: `North ${location}`,
            category: "Nature",
            rating: 4.9,
            price_level: "Free"
          },
          {
            title: `${location} Botanical Garden`,
            description: `Stunning collection of plants and flowers from around the world.`,
            location: `East ${location}`,
            category: "Nature",
            rating: 4.7,
            price_level: "$"
          },
          {
            title: `${location} Waterfront`,
            description: `Scenic waterfront area with amazing views.`,
            location: `South ${location}`,
            category: "Nature",
            rating: 4.6,
            price_level: "Free"
          }
        ],
        "Museums": [
          {
            title: `${location} History Museum`,
            description: `Learn about the rich history of ${location} at this comprehensive museum.`,
            location: `Museum District, ${location}`,
            category: "Museums",
            rating: 4.8,
            price_level: "$$"
          },
          {
            title: `${location} Art Gallery`,
            description: `Contemporary art from local and international artists.`,
            location: `Arts District, ${location}`,
            category: "Museums", 
            rating: 4.5,
            price_level: "$"
          },
          {
            title: `${location} Science Center`,
            description: `Interactive exhibits and fun learning experiences for all ages.`,
            location: `University District, ${location}`,
            category: "Museums",
            rating: 4.7,
            price_level: "$$"
          }
        ],
        "Nightlife": [
          {
            title: `${location} Nightclub`,
            description: `Popular nightclub with great music and atmosphere.`,
            location: `Downtown ${location}`,
            category: "Nightlife",
            rating: 4.4,
            price_level: "$$$"
          },
          {
            title: `${location} Jazz Bar`,
            description: `Intimate venue featuring live jazz music every night.`,
            location: `Music District, ${location}`,
            category: "Nightlife",
            rating: 4.6,
            price_level: "$$"
          },
          {
            title: `${location} Rooftop Bar`,
            description: `Enjoy drinks with spectacular views of the city.`,
            location: `High-rise District, ${location}`,
            category: "Nightlife",
            rating: 4.8,
            price_level: "$$$"
          }
        ],
      };
      
      // Add recommendations for each requested interest
      for (const interest of interests) {
        const interestKey = Object.keys(interestPlaces).find(
          key => key.toLowerCase() === interest.toLowerCase()
        ) || interest;
        
        if (interestPlaces[interestKey]) {
          recommendations.push(...interestPlaces[interestKey]);
        } else {
          // Generic recommendation if interest not found
          recommendations.push({
            title: `${location} ${interest} Attraction`,
            description: `Popular ${interest.toLowerCase()} destination in ${location}.`,
            location: `${location} City Center`,
            category: interest,
            rating: 4.5,
            price_level: "$$"
          });
        }
      }
      
      // Store recommendations in database
      const storedRecommendations = [];
      
      for (const rec of recommendations) {
        try {
          const storedRec = await storage.createRecommendation({
            name: rec.title,
            description: rec.description,
            location: rec.location || rec.title,
            distance: rec.location || "City Center",
            type: rec.category,
            day: 1,
            timeOfDay: ["morning", "afternoon", "evening"][Math.floor(Math.random() * 3)],
            rating: rec.rating ? rec.rating.toString() : "4.5",
            reviewCount: 500 + Math.floor(Math.random() * 500),
            openingHours: "9:00 AM - 5:00 PM",
            userId: 1, // Default user ID
            preferenceId: 1 // Use the latest preference ID
          });
          
          storedRecommendations.push(storedRec);
        } catch (err) {
          console.error("Error storing recommendation:", err);
        }
      }
      
      res.json(storedRecommendations);
    } catch (error) {
      console.error("Error processing places by interests:", error);
      res.status(500).json({ error: "Failed to get places by interests" });
    }
  });

  // Recommendation feedback API endpoint
  app.post("/api/recommendations/:id/feedback", async (req: Request, res: Response) => {
    const { id } = req.params;
    const feedbackSchema = z.object({
      type: z.enum(["like", "dislike"]),
    });

    try {
      const { type } = feedbackSchema.parse(req.body);
      
      await storage.saveRecommendationFeedback(parseInt(id), {
        recommendationId: parseInt(id),
        type,
      });
      
      res.status(201).json({ success: true });
    } catch (error) {
      console.error("Error saving feedback:", error);
      res.status(400).json({ error: "Invalid feedback data" });
    }
  });

  // Feedback API endpoint
  app.post("/api/feedback", async (req: Request, res: Response) => {
    const generalFeedbackSchema = z.object({
      feedback: z.string(),
    });

    try {
      const { feedback } = generalFeedbackSchema.parse(req.body);
      
      await storage.saveGeneralFeedback(feedback);
      
      res.status(201).json({ success: true });
    } catch (error) {
      console.error("Error saving general feedback:", error);
      res.status(400).json({ error: "Invalid feedback data" });
    }
  });

  // Adjust itinerary API endpoint
  app.post("/api/adjust-itinerary", async (req: Request, res: Response) => {
    try {
      // In a real app, this would adjust the recommendations based on feedback
      // For now, just return success
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error adjusting itinerary:", error);
      res.status(500).json({ error: "Failed to adjust itinerary" });
    }
  });

  // New recommendations API endpoint
  app.post("/api/new-recommendations", async (req: Request, res: Response) => {
    try {
      // In a real app, this would generate new recommendations
      // For now, just return success
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error generating new recommendations:", error);
      res.status(500).json({ error: "Failed to generate new recommendations" });
    }
  });
  
  // Generate destination-specific recommendations API endpoint
  app.post("/api/recommendations/generate", async (req: Request, res: Response) => {
    try {
      const { 
        destination, 
        travel_style, 
        food_preference, 
        budget, 
        transport_mode, 
        time_preference, 
        activity_intensity, 
        interests, 
        custom_preferences 
      } = req.body;
      
      if (!destination) {
        return res.status(400).json({ error: "Destination is required" });
      }
      
      // Try to call FastAPI backend first
      try {
        console.log("Calling FastAPI for recommendations...");
        const fastApiResult = await callFastApi('api/recommendations/generate', 'POST', { 
          location: destination,
          travel_style,
          food_preference,
          budget,
          transport_mode,
          time_preference,
          activity_intensity,
          interests,
          custom_preferences
        });
        
        // If we successfully get recommendations from FastAPI, return them
        if (fastApiResult && fastApiResult.recommendations && fastApiResult.recommendations.length > 0) {
          console.log("Successfully received recommendations from FastAPI");
          return res.json({ recommendations: fastApiResult.recommendations });
        }
      } catch (fastApiError) {
        console.error("Failed to get recommendations from FastAPI:", fastApiError);
        // Continue with the fallback implementation if FastAPI call fails
      }
      
      // Fallback: Generate recommendations based on the specific destination
      const destinationLower = destination.toLowerCase();
      let recommendations = [];
      
      // Los Angeles recommendations
      if (destinationLower.includes('los angeles') || destinationLower.includes('la')) {
        recommendations = [
          {
            name: "Hollywood Walk of Fame",
            type: "Attraction",
            day: 1,
            timeOfDay: "morning",
            rating: "4.5",
            reviewCount: 12500,
            distance: "Central Hollywood",
            openingHours: "Always open",
            description: "Iconic sidewalk featuring stars with names of celebrities. Great for photos and spotting your favorite stars. Location: Hollywood Boulevard, Los Angeles.",
          },
          {
            name: "Griffith Observatory",
            type: "Attraction",
            day: 1,
            timeOfDay: "afternoon",
            rating: "4.8",
            reviewCount: 8700,
            distance: "Griffith Park",
            openingHours: "12:00 PM - 10:00 PM",
            description: "Iconic observatory with planetarium shows and amazing views of LA and the Hollywood sign. Location: 2800 E Observatory Rd, Los Angeles."
          },
          {
            name: "Santa Monica Pier",
            type: "Outdoor",
            day: 1,
            timeOfDay: "evening",
            rating: "4.7",
            reviewCount: 10200,
            distance: "Santa Monica",
            openingHours: "Open 24 hours",
            description: "Iconic pier with an amusement park, restaurants, and beautiful sunset views over the Pacific Ocean. Location: 200 Santa Monica Pier, Santa Monica."
          },
          {
            name: "The Getty Center",
            type: "Museum",
            day: 2,
            timeOfDay: "morning",
            rating: "4.9",
            reviewCount: 7500,
            distance: "Brentwood",
            openingHours: "10:00 AM - 5:30 PM",
            description: "World-class art museum with impressive gardens and architecture offering panoramic views of LA. Location: 1200 Getty Center Dr, Los Angeles."
          },
          {
            name: "Venice Beach Boardwalk",
            type: "Outdoor",
            day: 2,
            timeOfDay: "afternoon",
            rating: "4.5",
            reviewCount: 9300,
            distance: "Venice",
            openingHours: "Always open",
            description: "Vibrant beach boardwalk known for street performers, quirky shops, and Muscle Beach outdoor gym. Location: Ocean Front Walk, Venice."
          },
          {
            name: "Universal Studios Hollywood",
            type: "Entertainment",
            day: 3,
            timeOfDay: "all-day",
            rating: "4.8",
            reviewCount: 15800,
            distance: "Universal City",
            openingHours: "9:00 AM - 10:00 PM",
            description: "Major movie-themed amusement park with thrilling rides, shows, and the famous studio tour. Location: 100 Universal City Plaza, Universal City."
          }
        ];
      } 
      // New York recommendations
      else if (destinationLower.includes('new york') || destinationLower.includes('nyc')) {
        recommendations = [
          {
            name: "Central Park",
            type: "Outdoor",
            day: 1,
            timeOfDay: "morning",
            rating: "4.9",
            reviewCount: 18700,
            distance: "Manhattan",
            openingHours: "6:00 AM - 1:00 AM",
            description: "Iconic urban park with walking paths, lakes, and attractions like Belvedere Castle and Strawberry Fields. Location: Central Manhattan, NYC."
          },
          {
            name: "Metropolitan Museum of Art",
            type: "Museum",
            day: 1,
            timeOfDay: "afternoon",
            rating: "4.8",
            reviewCount: 10500,
            distance: "Upper East Side",
            openingHours: "10:00 AM - 5:00 PM",
            description: "One of the world's greatest art museums with over 2 million works spanning 5,000 years. Location: 1000 5th Ave, New York."
          },
          {
            name: "Times Square",
            type: "Attraction",
            day: 1,
            timeOfDay: "evening",
            rating: "4.7",
            reviewCount: 22000,
            distance: "Midtown Manhattan",
            openingHours: "Always open",
            description: "Iconic commercial intersection known for bright lights, Broadway theaters, and the New Year's Eve ball drop. Location: Broadway & 7th Avenue, NYC."
          },
          {
            name: "Statue of Liberty & Ellis Island",
            type: "Attraction",
            day: 2,
            timeOfDay: "morning",
            rating: "4.8",
            reviewCount: 14200,
            distance: "New York Harbor",
            openingHours: "9:00 AM - 5:00 PM",
            description: "Historic monument and immigration museum. Ferry ride with spectacular views of Manhattan skyline. Location: Liberty Island, New York Harbor."
          },
          {
            name: "High Line",
            type: "Outdoor",
            day: 2,
            timeOfDay: "afternoon",
            rating: "4.8",
            reviewCount: 9800,
            distance: "Chelsea",
            openingHours: "7:00 AM - 10:00 PM",
            description: "Elevated linear park built on a former railway with gardens, art installations, and city views. Location: Gansevoort St to 34th St, New York."
          },
          {
            name: "Broadway Show",
            type: "Entertainment",
            day: 2,
            timeOfDay: "evening",
            rating: "4.9",
            reviewCount: 8500,
            distance: "Theater District",
            openingHours: "Shows typically at 7:00 PM or 8:00 PM",
            description: "World-class theatrical performances in New York's famous Theater District. Location: Various theaters near Times Square."
          }
        ];
      } 
      // Paris recommendations
      else if (destinationLower.includes('paris')) {
        recommendations = [
          {
            name: "Eiffel Tower",
            type: "Attraction",
            day: 1,
            timeOfDay: "morning",
            rating: "4.8",
            reviewCount: 22400,
            distance: "7th Arrondissement",
            openingHours: "9:00 AM - 11:45 PM",
            description: "Iconic iron lattice tower and Paris's most famous symbol. Offers breathtaking views from three levels. Location: Champ de Mars, 5 Avenue Anatole France."
          },
          {
            name: "Louvre Museum",
            type: "Museum",
            day: 1,
            timeOfDay: "afternoon",
            rating: "4.7",
            reviewCount: 18600,
            distance: "1st Arrondissement",
            openingHours: "9:00 AM - 6:00 PM, Closed Tuesdays",
            description: "World's largest art museum, home to thousands of works including the Mona Lisa and Venus de Milo. Location: Rue de Rivoli, 75001 Paris."
          },
          {
            name: "Seine River Dinner Cruise",
            type: "Entertainment",
            day: 1,
            timeOfDay: "evening",
            rating: "4.6",
            reviewCount: 7800,
            distance: "Various embarkation points",
            openingHours: "Cruises typically at 6:00 PM, 8:30 PM",
            description: "Romantic dinner cruise along the Seine with views of illuminated landmarks. Location: Port de la Bourdonnais, Paris."
          },
          {
            name: "Montmartre & Sacré-Cœur",
            type: "Attraction",
            day: 2,
            timeOfDay: "morning",
            rating: "4.9",
            reviewCount: 12300,
            distance: "18th Arrondissement",
            openingHours: "Basilica: 6:00 AM - 10:30 PM",
            description: "Historic hilltop district crowned by the white-domed Sacré-Cœur Basilica, offering panoramic city views. Location: 35 Rue du Chevalier de la Barre."
          },
          {
            name: "Champs-Élysées & Arc de Triomphe",
            type: "Shopping",
            day: 2,
            timeOfDay: "afternoon",
            rating: "4.7",
            reviewCount: 15200,
            distance: "8th Arrondissement",
            openingHours: "Arc: 10:00 AM - 10:30 PM",
            description: "Prestigious avenue with luxury shops, cafes, and theaters, leading to the magnificent Arc de Triomphe. Location: Avenue des Champs-Élysées."
          },
          {
            name: "Moulin Rouge Show",
            type: "Entertainment",
            day: 2,
            timeOfDay: "evening",
            rating: "4.5",
            reviewCount: 6900,
            distance: "Pigalle",
            openingHours: "Shows at 7:00 PM and 9:00 PM",
            description: "World-famous cabaret offering spectacular shows with elaborate costumes, dancing, and music. Location: 82 Boulevard de Clichy, 75018 Paris."
          }
        ];
      }
      // Default/other destinations
      else {
        recommendations = [
          {
            name: `${destination} Historical Tour`,
            type: "Tour",
            day: 1,
            timeOfDay: "morning",
            rating: "4.6",
            reviewCount: 860,
            distance: "City Center",
            openingHours: "9:00 AM - 12:00 PM",
            description: `Guided walking tour of ${destination}'s historical sites and landmarks. Learn about the rich history and culture of this fascinating destination.`
          },
          {
            name: `${destination} Local Market`,
            type: "Shopping",
            day: 1,
            timeOfDay: "afternoon",
            rating: "4.7",
            reviewCount: 720,
            distance: "Market District",
            openingHours: "8:00 AM - 6:00 PM",
            description: `Vibrant local market with fresh produce, crafts, and souvenirs. Immerse yourself in the authentic atmosphere of ${destination}.`
          },
          {
            name: `${destination} Cultural Show`,
            type: "Entertainment",
            day: 1,
            timeOfDay: "evening",
            rating: "4.8",
            reviewCount: 550,
            distance: "Arts District",
            openingHours: "Shows at 7:00 PM",
            description: `Traditional performance showcasing the unique cultural heritage of ${destination}. Features music, dance, and colorful costumes.`
          },
          {
            name: `${destination} National Museum`,
            type: "Museum",
            day: 2,
            timeOfDay: "morning",
            rating: "4.5",
            reviewCount: 920,
            distance: "Museum Quarter",
            openingHours: "10:00 AM - 5:00 PM",
            description: `Comprehensive museum featuring artifacts and exhibits about ${destination}'s history, art, and culture. Audioguides available in multiple languages.`
          },
          {
            name: `${destination} Natural Park`,
            type: "Outdoor",
            day: 2,
            timeOfDay: "afternoon",
            rating: "4.9",
            reviewCount: 1050,
            distance: "15 min from city center",
            openingHours: "8:00 AM - Sunset",
            description: `Beautiful natural area with walking trails, scenic viewpoints, and diverse wildlife. Perfect for photography and enjoying the outdoors.`
          },
          {
            name: `${destination} Culinary Experience`,
            type: "Food",
            day: 2,
            timeOfDay: "evening",
            rating: "4.8",
            reviewCount: 780,
            distance: "Dining District",
            openingHours: "6:00 PM - 10:00 PM",
            description: `Guided food tour featuring the best local cuisine ${destination} has to offer. Sample traditional dishes and learn about their historical significance.`
          }
        ];
      }
      
      // Add metadata and any other fields needed for the response
      const fullRecommendations = recommendations.map((rec, index) => ({
        ...rec,
        id: index + 1,
        userId: 1,
        preferenceId: 1,
        createdAt: new Date(),
        metadata: {}
      }));
      
      // Save the new recommendations so they're available for other APIs
      await Promise.all(fullRecommendations.map(rec => 
        storage.createRecommendation(rec)
      ));
      
      res.json({ recommendations: fullRecommendations });
    } catch (error) {
      console.error("Error generating destination recommendations:", error);
      res.status(500).json({ error: "Failed to generate recommendations for this destination" });
    }
  });

  // Get detailed itinerary with points, times and coordinates
  app.post("/api/itinerary", async (req: Request, res: Response) => {
    try {
      const { 
        location, 
        travel_style, 
        food_preference, 
        budget, 
        transport_mode, 
        time_preference, 
        activity_intensity, 
        interests, 
        custom_preferences,
        date_from,
        date_to
      } = req.body;
      
      if (!location) {
        return res.status(400).json({ error: "Location is required" });
      }
      
      // Set explicit content type to ensure JSON response
      res.setHeader('Content-Type', 'application/json');
      
      // Try to call FastAPI backend first for real itinerary data
      try {
        console.log("Calling FastAPI for itinerary data...");
        const fastApiResult = await callFastApi('api/itinerary', 'POST', { 
          location,
          travel_style,
          food_preference,
          budget,
          transport_mode,
          time_preference,
          activity_intensity,
          interests,
          custom_preferences,
          date_from,
          date_to
        });
        
        if (fastApiResult && Array.isArray(fastApiResult)) {
          return res.json(fastApiResult);
        }
        
        if (fastApiResult && fastApiResult.itinerary && Array.isArray(fastApiResult.itinerary)) {
          return res.json(fastApiResult.itinerary);
        }
      } catch (fastApiError) {
        console.error("FastAPI error when fetching itinerary:", fastApiError);
        // Continue with fallback implementation if FastAPI call fails
      }
      
      // Fallback: Generate a sample itinerary
      console.log("Using fallback itinerary data for", location);
      
      // Create a date object from the date_from parameter or use current date
      const startDate = date_from ? new Date(date_from) : new Date();
      
      // Format date in the required format (YYYY-MM-DD)
      const dateStr = startDate.toISOString().split('T')[0];
      
      // Fallback sample itinerary structure
      const sampleItinerary = [
        {
          "type": "start",
          "time": `${dateStr} 07:30`,
          "location": `${location} Recreation Center`,
          "coordinates": {
            "lat": 34.0243846,
            "lng": -118.2883821
          },
          "description": "Starting point"
        },
        {
          "type": "attraction",
          "time": `${dateStr} 08:30`,
          "end_time": `${dateStr} 10:30`,
          "location": `${location} Museum of Art`,
          "coordinates": {
            "lat": 34.0318736,
            "lng": -118.3769242
          },
          "description": `Visit the famous ${location} Museum of Art`,
          "rating": 5
        },
        {
          "type": "attraction",
          "time": `${dateStr} 11:00`,
          "end_time": `${dateStr} 13:00`,
          "location": `${location} Historical Garden`,
          "coordinates": {
            "lat": 34.0281362,
            "lng": -118.46802
          },
          "description": `Explore the beautiful ${location} Historical Garden`,
          "rating": 4.5
        },
        {
          "type": "attraction",
          "time": `${dateStr} 14:00`,
          "end_time": `${dateStr} 16:00`,
          "location": `${location} Shopping District`,
          "coordinates": {
            "lat": 34.0112345,
            "lng": -118.2345678
          },
          "description": `Shop at the popular ${location} Shopping District`,
          "rating": 4.2
        }
      ];
      
      // Return the JSON data with explicit JSON stringify to ensure proper formatting
      return res.send(JSON.stringify(sampleItinerary));
    } catch (error) {
      console.error("Error generating itinerary:", error);
      res.status(500).json({ error: "Failed to generate itinerary" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
