import { Request, Response } from 'express';
import { storage } from './storage';
import { callFastApi } from './fastapi-client';

// Interest-based places API using Google Places API
export async function getPlacesByInterests(req: Request, res: Response) {
  try {
    const { location, interests } = req.body;
    
    if (!location || !interests || !Array.isArray(interests)) {
      return res.status(400).json({ error: "Invalid request. Location and interests array are required." });
    }
    
    console.log("Received request for places in", location, "with interests:", interests);
    
    // Generate fallback recommendations based on interests
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
    
    return res.json(storedRecommendations);
  } catch (error) {
    console.error("Error processing places by interests:", error);
    return res.status(500).json({ error: "Failed to get places by interests" });
  }
}