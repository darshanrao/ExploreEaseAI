import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Recommendation } from '@shared/schema';

interface TripOverviewProps {
  recommendations: Recommendation[];
}

const TripOverview: React.FC<TripOverviewProps> = ({ recommendations }) => {
  // Group recommendations by day
  const recommendationsByDay = recommendations.reduce((acc, recommendation) => {
    if (!acc[recommendation.day]) {
      acc[recommendation.day] = [];
    }
    acc[recommendation.day].push(recommendation);
    return acc;
  }, {} as Record<number, Recommendation[]>);

  // Sort recommendations by time of day within each day
  const timeOrder = { 'morning': 0, 'afternoon': 1, 'evening': 2 };
  Object.keys(recommendationsByDay).forEach((day) => {
    recommendationsByDay[Number(day)].sort((a, b) => {
      return timeOrder[a.timeOfDay as keyof typeof timeOrder] - timeOrder[b.timeOfDay as keyof typeof timeOrder];
    });
  });

  // Get the background color for a recommendation type
  const getTypeBackgroundColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'cafe':
        return 'bg-blue-100';
      case 'restaurant':
        return 'bg-red-100';
      case 'attraction':
        return 'bg-purple-100';
      case 'event':
        return 'bg-orange-100';
      case 'outdoor':
        return 'bg-green-100';
      case 'shopping':
        return 'bg-yellow-100';
      default:
        return 'bg-gray-100';
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div id="trip-timeline" className="relative">
          {Object.keys(recommendationsByDay)
            .map(Number)
            .sort((a, b) => a - b)
            .map((day) => (
              <div key={day} className="flex items-stretch border-b border-gray-200 py-4 last:border-b-0">
                {/* Day markers */}
                <div className="flex-none w-16 text-center text-sm font-medium text-gray-500">
                  Day {day}
                </div>
                
                {/* Timeline slots */}
                <div className="flex-grow">
                  <div className="relative flex items-center h-8">
                    <div className="absolute inset-0 flex">
                      {recommendationsByDay[day].map((recommendation, index, arr) => {
                        const isFirst = index === 0;
                        const isLast = index === arr.length - 1;
                        
                        return (
                          <div
                            key={recommendation.id}
                            className={`w-1/3 ${getTypeBackgroundColor(recommendation.type)} ${isFirst ? 'rounded-l-md' : ''} ${isLast ? 'rounded-r-md' : ''} px-2 py-1 text-xs flex items-center`}
                          >
                            <span className="truncate">{recommendation.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TripOverview;
