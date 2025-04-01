import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

const LandingPage: React.FC = () => {
  const [_, navigate] = useLocation();
  
  // Check for redirect param (from OAuth)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirectTo = params.get('redirect');
    
    if (redirectTo === 'recommendations') {
      navigate('/recommendations');
      
      // Clean up URL
      if (window.history && window.history.replaceState) {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, [navigate]);
  
  const handleGetStarted = () => {
    navigate('/preferences');
  };

  return (
    <section className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to TripSync</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Intelligent trip planning powered by AI. We analyze your calendar and preferences to create personalized recommendations for your journey.
        </p>
      </div>
      
      <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
        <div className="md:flex">
          <div className="md:shrink-0">
            <div className="h-48 w-full object-cover md:h-full md:w-48 bg-primary/20"></div>
          </div>
          <div className="p-8">
            <div className="uppercase tracking-wide text-sm text-primary font-semibold">How It Works</div>
            <p className="mt-2 text-gray-600">
              1. Connect your calendar <br />
              2. Set your preferences and destination <br />
              3. Get AI-powered recommendations <br />
              4. Provide feedback to improve suggestions
            </p>
          </div>
        </div>
      </div>
      
      <div className="grid gap-8 md:grid-cols-3 mb-12">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-primary mb-2"><i className="fas fa-calendar-alt text-2xl"></i></div>
          <h3 className="text-lg font-semibold mb-2">Calendar Analysis</h3>
          <p className="text-gray-600">We analyze your calendar to find the perfect schedule that fits your existing commitments.</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-primary mb-2"><i className="fas fa-map-marker-alt text-2xl"></i></div>
          <h3 className="text-lg font-semibold mb-2">Smart Recommendations</h3>
          <p className="text-gray-600">Get personalized suggestions for restaurants, cafes, and events based on your preferences.</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-primary mb-2"><i className="fas fa-route text-2xl"></i></div>
          <h3 className="text-lg font-semibold mb-2">Optimized Itineraries</h3>
          <p className="text-gray-600">Receive efficient transportation recommendations between your scheduled activities.</p>
        </div>
      </div>
      
      <div className="text-center">
        <Button 
          onClick={handleGetStarted}
          className="px-6 py-6 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          Get Started
        </Button>
      </div>
    </section>
  );
};

export default LandingPage;
