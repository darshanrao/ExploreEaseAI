from typing import Dict, Any, List, Optional
from datetime import datetime, date
import random

class AgentRunner:
    """
    Service to combine and run InfoAgent and MapAgent
    You will integrate your actual agent code here
    """
    
    def __init__(self):
        # Initialize agents
        self.locations_data = {
            "tokyo": self._tokyo_data(),
            "london": self._london_data(),
            "sydney": self._sydney_data(),
            "rome": self._rome_data(),
        }
        
    async def generate_recommendations(self, location: str, preferences: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Generate travel recommendations using your agents"""
        # This will be integrated with your InfoAgent and MapAgent
        
        # Normalize location name
        location_lower = location.lower()
        
        # Check if we have specific data for this location
        for key, data in self.locations_data.items():
            if key in location_lower:
                return data
        
        # For unknown locations, generate generic recommendations
        return self._generic_recommendations(location)
    
    def _generic_recommendations(self, location: str) -> List[Dict[str, Any]]:
        """Generate generic recommendations for an unknown location"""
        categories = ["Museum", "Restaurant", "Park", "Shopping", "Historical Site", "Entertainment"]
        reviews = [750, 1200, 950, 1100, 820, 1300]
        ratings = [4.3, 4.5, 4.7, 4.2, 4.8, 4.1]
        
        recommendations = []
        
        for i in range(6):
            category = categories[i % len(categories)]
            rating = ratings[i % len(ratings)]
            reviews_count = reviews[i % len(reviews)]
            
            recommendations.append({
                "id": i + 1,
                "title": f"{location} {category}",
                "description": f"Explore the best {category.lower()} options in {location}. This is a must-visit destination for travelers interested in {category.lower()}.",
                "location": f"{location} City Center",
                "category": category.lower(),
                "rating": rating,
                "review_count": reviews_count,
                "hours": "9:00 AM - 5:00 PM" if category != "Restaurant" else "11:00 AM - 10:00 PM"
            })
            
        return recommendations
    
    def _tokyo_data(self) -> List[Dict[str, Any]]:
        """Return Tokyo-specific recommendations"""
        return [
            {
                "id": 1,
                "title": "Meiji Shrine",
                "description": "Beautiful Shinto shrine dedicated to Emperor Meiji and Empress Shoken. Set in a tranquil forest with walking paths and traditional torii gates.",
                "location": "Shibuya, Tokyo",
                "category": "historical site",
                "rating": 4.7,
                "review_count": 15820,
                "hours": "Sunrise to Sunset"
            },
            {
                "id": 2,
                "title": "Tsukiji Outer Market",
                "description": "Famous market with numerous food stalls and restaurants offering the freshest seafood. Perfect for experiencing authentic Japanese cuisine.",
                "location": "Chuo, Tokyo",
                "category": "food",
                "rating": 4.6,
                "review_count": 12540,
                "hours": "5:00 AM - 2:00 PM"
            },
            {
                "id": 3,
                "title": "Shibuya Crossing",
                "description": "The world's busiest pedestrian crossing. This iconic intersection is surrounded by giant video screens and neon advertisements.",
                "location": "Shibuya, Tokyo",
                "category": "attraction",
                "rating": 4.5,
                "review_count": 18900,
                "hours": "Always open"
            },
            {
                "id": 4,
                "title": "Tokyo National Museum",
                "description": "Japan's oldest and largest museum, housing a comprehensive collection of art and artifacts from Japan and other Asian countries.",
                "location": "Taito, Tokyo",
                "category": "museum",
                "rating": 4.8,
                "review_count": 9870,
                "hours": "9:30 AM - 5:00 PM, Closed Mondays"
            },
            {
                "id": 5,
                "title": "Shinjuku Gyoen National Garden",
                "description": "Spacious park with French, English, and Japanese gardens. Beautiful cherry blossoms in spring and vibrant autumn colors in fall.",
                "location": "Shinjuku, Tokyo",
                "category": "outdoor",
                "rating": 4.8,
                "review_count": 13750,
                "hours": "9:00 AM - 4:30 PM, Closed Mondays"
            },
            {
                "id": 6,
                "title": "Robot Restaurant Show",
                "description": "Incredible entertainment venue featuring giant robots, dancers, lasers, and neon lights. A uniquely Tokyo experience not to be missed.",
                "location": "Shinjuku, Tokyo",
                "category": "entertainment",
                "rating": 4.3,
                "review_count": 7890,
                "hours": "Shows at 5:55 PM, 7:50 PM, 9:45 PM"
            }
        ]
    
    def _london_data(self) -> List[Dict[str, Any]]:
        """Return London-specific recommendations"""
        return [
            {
                "id": 1,
                "title": "Tower of London",
                "description": "Historic castle on the north bank of the River Thames. Home to the Crown Jewels and with a history spanning nearly 1,000 years.",
                "location": "Central London",
                "category": "historical site",
                "rating": 4.8,
                "review_count": 19750,
                "hours": "9:00 AM - 5:30 PM"
            },
            {
                "id": 2,
                "title": "British Museum",
                "description": "World-famous museum dedicated to human history, art, and culture. Houses over 8 million works from all continents.",
                "location": "Bloomsbury, London",
                "category": "museum",
                "rating": 4.9,
                "review_count": 21300,
                "hours": "10:00 AM - 5:30 PM"
            },
            {
                "id": 3,
                "title": "Borough Market",
                "description": "One of London's oldest food markets with a wide variety of foods from around the world. Great place for lunch and local specialties.",
                "location": "Southwark, London",
                "category": "food",
                "rating": 4.7,
                "review_count": 14560,
                "hours": "10:00 AM - 5:00 PM, Closed Sundays"
            },
            {
                "id": 4,
                "title": "London Eye",
                "description": "Giant Ferris wheel on the South Bank of the Thames. Offers breathtaking views of London's skyline.",
                "location": "South Bank, London",
                "category": "attraction",
                "rating": 4.6,
                "review_count": 17800,
                "hours": "11:00 AM - 6:00 PM"
            },
            {
                "id": 5,
                "title": "Hyde Park",
                "description": "One of London's largest parks, offering activities like boating, cycling, and horseback riding. Famous for Speaker's Corner.",
                "location": "Central London",
                "category": "outdoor",
                "rating": 4.8,
                "review_count": 16450,
                "hours": "5:00 AM - Midnight"
            },
            {
                "id": 6,
                "title": "West End Show",
                "description": "London's theater district offers world-class musicals and plays. A perfect evening entertainment option in the heart of the city.",
                "location": "West End, London",
                "category": "entertainment",
                "rating": 4.9,
                "review_count": 12300,
                "hours": "Shows typically at 7:30 PM"
            }
        ]
    
    def _sydney_data(self) -> List[Dict[str, Any]]:
        """Return Sydney-specific recommendations"""
        return [
            {
                "id": 1,
                "title": "Sydney Opera House",
                "description": "Iconic performing arts venue with its distinctive sail-shaped design. One of the most famous buildings in the world.",
                "location": "Bennelong Point, Sydney",
                "category": "attraction",
                "rating": 4.9,
                "review_count": 23400,
                "hours": "9:00 AM - 5:00 PM"
            },
            {
                "id": 2,
                "title": "Bondi Beach",
                "description": "Famous beach with golden sand and turquoise water. Popular for swimming, surfing, and the scenic Bondi to Coogee coastal walk.",
                "location": "Eastern Suburbs, Sydney",
                "category": "outdoor",
                "rating": 4.8,
                "review_count": 18900,
                "hours": "Always open"
            },
            {
                "id": 3,
                "title": "Taronga Zoo",
                "description": "Zoo with spectacular views of Sydney Harbor, home to over 4,000 animals including Australian native wildlife like koalas and kangaroos.",
                "location": "Mosman, Sydney",
                "category": "attraction",
                "rating": 4.7,
                "review_count": 15600,
                "hours": "9:30 AM - 5:00 PM"
            },
            {
                "id": 4,
                "title": "The Rocks",
                "description": "Historic area with cobblestone streets, Australia's oldest pubs, and weekend markets. Great for learning about Sydney's colonial history.",
                "location": "Sydney Harbour",
                "category": "historical site",
                "rating": 4.6,
                "review_count": 12800,
                "hours": "Always open, markets on weekends"
            },
            {
                "id": 5,
                "title": "Sydney Fish Market",
                "description": "The largest fish market in the Southern Hemisphere. Sample fresh seafood and enjoy waterfront dining.",
                "location": "Pyrmont, Sydney",
                "category": "food",
                "rating": 4.5,
                "review_count": 10500,
                "hours": "7:00 AM - 4:00 PM"
            },
            {
                "id": 6,
                "title": "Royal Botanic Garden",
                "description": "Beautiful garden oasis in the heart of Sydney with stunning harbor views, diverse plant collections, and Aboriginal heritage tours.",
                "location": "Sydney CBD",
                "category": "outdoor",
                "rating": 4.8,
                "review_count": 14200,
                "hours": "7:00 AM - Sunset"
            }
        ]
    
    def _rome_data(self) -> List[Dict[str, Any]]:
        """Return Rome-specific recommendations"""
        return [
            {
                "id": 1,
                "title": "Colosseum",
                "description": "Ancient amphitheater where gladiatorial contests and public spectacles were held. The largest amphitheater ever built.",
                "location": "Historic Center, Rome",
                "category": "historical site",
                "rating": 4.9,
                "review_count": 24500,
                "hours": "8:30 AM - 7:00 PM"
            },
            {
                "id": 2,
                "title": "Vatican Museums",
                "description": "Museums displaying works from the extensive collection of the Catholic Church, including the famous Sistine Chapel with Michelangelo's ceiling.",
                "location": "Vatican City, Rome",
                "category": "museum",
                "rating": 4.8,
                "review_count": 21800,
                "hours": "9:00 AM - 6:00 PM, Closed Sundays"
            },
            {
                "id": 3,
                "title": "Trevi Fountain",
                "description": "Baroque masterpiece and one of the most famous fountains in the world. Tradition says you should throw a coin over your shoulder to ensure a return to Rome.",
                "location": "Trevi, Rome",
                "category": "attraction",
                "rating": 4.7,
                "review_count": 19600,
                "hours": "Always open"
            },
            {
                "id": 4,
                "title": "Trastevere",
                "description": "Charming neighborhood with narrow cobbled streets, traditional trattorias, and lively nightlife. Perfect for authentic Roman dining experiences.",
                "location": "Trastevere, Rome",
                "category": "food",
                "rating": 4.8,
                "review_count": 15300,
                "hours": "Always open"
            },
            {
                "id": 5,
                "title": "Roman Forum",
                "description": "Sprawling ruins of ancient government buildings, temples, and public spaces. The center of Roman public life for centuries.",
                "location": "Historic Center, Rome",
                "category": "historical site",
                "rating": 4.7,
                "review_count": 17800,
                "hours": "8:30 AM - 7:00 PM"
            },
            {
                "id": 6,
                "title": "Villa Borghese Gardens",
                "description": "Large landscaped gardens housing the Borghese Gallery with works by Bernini, Caravaggio, and Raphael. Perfect for a relaxing afternoon.",
                "location": "Northern Rome",
                "category": "outdoor",
                "rating": 4.6,
                "review_count": 12700,
                "hours": "Dawn to Dusk"
            }
        ]
        
    async def save_preferences(self, preferences: Dict[str, Any]) -> bool:
        """Save user preferences using your agents"""
        # This will be integrated with your InfoAgent
        return True
        
    async def add_event_to_calendar(self, event_details: Dict[str, Any]) -> Dict[str, Any]:
        """Add event to Google Calendar using your agents"""
        # This will be integrated with your InfoAgent
        return {
            "success": True,
            "event_id": "dummy_event_id",
            "message": "Event would be created by your agents"
        }