import { 
  InsertUser, 
  User, 
  Preference, 
  InsertPreference, 
  Recommendation,
  InsertRecommendation,
  Feedback,
  InsertFeedback,
  CalendarEvent,
  InsertCalendarEvent
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Preferences methods
  savePreferences(preferences: InsertPreference): Promise<Preference>;
  getLatestPreferences(): Promise<Preference | undefined>;
  
  // Recommendations methods
  getRecommendations(): Promise<Recommendation[]>;
  createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation>;
  
  // Feedback methods
  saveRecommendationFeedback(recommendationId: number, feedback: Partial<InsertFeedback>): Promise<Feedback>;
  saveGeneralFeedback(feedback: string): Promise<void>;
  
  // Calendar events methods
  saveCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent>;
  getCalendarEvents(userId: number): Promise<CalendarEvent[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private preferences: Map<number, Preference>;
  private recommendations: Map<number, Recommendation>;
  private feedback: Map<number, Feedback>;
  private calendarEvents: Map<number, CalendarEvent>;
  private generalFeedback: string[];
  
  private currentUserId: number;
  private currentPreferenceId: number;
  private currentRecommendationId: number;
  private currentFeedbackId: number;
  private currentCalendarEventId: number;

  constructor() {
    this.users = new Map();
    this.preferences = new Map();
    this.recommendations = new Map();
    this.feedback = new Map();
    this.calendarEvents = new Map();
    this.generalFeedback = [];
    
    this.currentUserId = 1;
    this.currentPreferenceId = 1;
    this.currentRecommendationId = 1;
    this.currentFeedbackId = 1;
    this.currentCalendarEventId = 1;
    
    // Add some sample recommendations
    this.initSampleData();
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id, 
      googleId: null, 
      accessToken: null, 
      refreshToken: null, 
      tokenExpiresAt: null 
    };
    this.users.set(id, user);
    return user;
  }
  
  // Preferences methods
  async savePreferences(prefs: InsertPreference): Promise<Preference> {
    const id = this.currentPreferenceId++;
    const preferences: Preference = {
      ...prefs,
      id,
      userId: 1, // Default user ID for now
      createdAt: new Date(),
    };
    
    this.preferences.set(id, preferences);
    return preferences;
  }
  
  async getLatestPreferences(): Promise<Preference | undefined> {
    if (this.preferences.size === 0) {
      // Return default preferences for testing
      return {
        id: 0,
        userId: 1,
        startDate: "2023-05-15",
        endDate: "2023-05-22",
        destination: "Barcelona, Spain",
        interests: "Architecture, Food, Culture",
        locationTypes: ["restaurants", "cafes", "attractions", "events"],
        timePreferences: ["morning", "afternoon", "evening"],
        createdAt: new Date(),
      };
    }
    
    // Get the preference with the highest ID (most recent)
    const preferencesArray = Array.from(this.preferences.values());
    return preferencesArray.sort((a, b) => b.id - a.id)[0];
  }
  
  // Recommendations methods
  async getRecommendations(): Promise<Recommendation[]> {
    return Array.from(this.recommendations.values());
  }
  
  async createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation> {
    const id = this.currentRecommendationId++;
    const newRecommendation: Recommendation = {
      ...recommendation,
      id,
      userId: 1, // Default user ID for now
      createdAt: new Date(),
    };
    
    this.recommendations.set(id, newRecommendation);
    return newRecommendation;
  }
  
  // Feedback methods
  async saveRecommendationFeedback(recommendationId: number, feedbackData: Partial<InsertFeedback>): Promise<Feedback> {
    const id = this.currentFeedbackId++;
    const feedback: Feedback = {
      id,
      userId: 1, // Default user ID for now
      recommendationId,
      type: feedbackData.type || "like",
      comment: feedbackData.comment || null,
      createdAt: new Date(),
    };
    
    this.feedback.set(id, feedback);
    return feedback;
  }
  
  async saveGeneralFeedback(feedbackText: string): Promise<void> {
    this.generalFeedback.push(feedbackText);
  }
  
  // Calendar events methods
  async saveCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent> {
    const id = this.currentCalendarEventId++;
    const calendarEvent: CalendarEvent = {
      id,
      userId: 1, // Default user ID for now
      createdAt: new Date(),
      title: event.title,
      startTime: event.startTime,
      endTime: event.endTime,
      eventId: event.eventId,
      description: event.description || null,
      location: event.location || null,
    };
    
    this.calendarEvents.set(id, calendarEvent);
    return calendarEvent;
  }
  
  async getCalendarEvents(userId: number): Promise<CalendarEvent[]> {
    return Array.from(this.calendarEvents.values())
      .filter(event => event.userId === userId);
  }
  
  // Initialize sample data
  private initSampleData() {
    // Sample recommendations
    const sampleRecommendations: Partial<Recommendation>[] = [
      {
        id: this.currentRecommendationId++,
        userId: 1,
        preferenceId: 1,
        name: "La Taza de Café",
        type: "Café",
        day: 1,
        timeOfDay: "morning",
        rating: "4.8",
        reviewCount: 120,
        distance: "1.2 km from your hotel",
        openingHours: "Open 7:00 AM - 8:00 PM",
        description: "A charming café with excellent pastries and traditional Spanish coffee. Perfect for a relaxed morning.",
        metadata: {},
        createdAt: new Date(),
      },
      {
        id: this.currentRecommendationId++,
        userId: 1,
        preferenceId: 1,
        name: "Sagrada Familia",
        type: "Attraction",
        day: 1,
        timeOfDay: "afternoon",
        rating: "4.9",
        reviewCount: 2000,
        distance: "3.5 km from previous location",
        openingHours: "Tours available 10:00 AM - 5:00 PM",
        description: "Antoni Gaudí's unfinished masterpiece. We recommend the guided tour to understand its unique architecture.",
        metadata: {},
        createdAt: new Date(),
      },
      {
        id: this.currentRecommendationId++,
        userId: 1,
        preferenceId: 1,
        name: "El Jardín de Tapas",
        type: "Restaurant",
        day: 1,
        timeOfDay: "evening",
        rating: "4.7",
        reviewCount: 350,
        distance: "1.8 km from previous location",
        openingHours: "Open 6:00 PM - 11:30 PM",
        description: "Authentic Spanish tapas in a cozy setting. Popular with locals and highly rated for their patatas bravas.",
        metadata: {},
        createdAt: new Date(),
      },
      {
        id: this.currentRecommendationId++,
        userId: 1,
        preferenceId: 1,
        name: "Park Güell",
        type: "Outdoor",
        day: 2,
        timeOfDay: "morning",
        rating: "4.6",
        reviewCount: 800,
        distance: "4.0 km from your hotel",
        openingHours: "Open 8:00 AM - 6:30 PM",
        description: "Another Gaudí masterpiece with beautiful mosaics and panoramic views of the city. Arrive early to avoid crowds.",
        metadata: {},
        createdAt: new Date(),
      },
      {
        id: this.currentRecommendationId++,
        userId: 1,
        preferenceId: 1,
        name: "La Rambla",
        type: "Shopping",
        day: 2,
        timeOfDay: "afternoon",
        rating: "4.3",
        reviewCount: 1200,
        distance: "3.2 km from previous location",
        openingHours: "Shops open 10:00 AM - 9:00 PM",
        description: "Famous pedestrian street with shops, restaurants and street performers. Don't miss La Boqueria market nearby.",
        metadata: {},
        createdAt: new Date(),
      },
      {
        id: this.currentRecommendationId++,
        userId: 1,
        preferenceId: 1,
        name: "Flamenco Show",
        type: "Event",
        day: 2,
        timeOfDay: "evening",
        rating: "4.8",
        reviewCount: 320,
        distance: "1.5 km from previous location",
        openingHours: "Shows at 7:00 PM and 9:00 PM",
        description: "Traditional Spanish dance performance with dinner option available. Booking in advance is recommended.",
        metadata: {},
        createdAt: new Date(),
      },
    ];
    
    // Add sample recommendations to the map
    sampleRecommendations.forEach(recommendation => {
      if (recommendation.id) {
        this.recommendations.set(recommendation.id, recommendation as Recommendation);
      }
    });
  }
}

export const storage = new MemStorage();
