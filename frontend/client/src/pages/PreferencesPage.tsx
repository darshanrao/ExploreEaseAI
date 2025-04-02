import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import CalendarConnect from '@/components/ui/calendar-connect';
import SpeechInputDialog from '@/components/ui/speech-input-dialog';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from "@/hooks/use-toast";
import { useLocation } from 'wouter';

const preferencesSchema = z.object({
  date_from: z.string().min(1, { message: "Start date is required" }),
  date_to: z.string().min(1, { message: "End date is required" }),
  location: z.string().min(2, { message: "Location is required" }),
  travel_style: z.string().min(1, { message: "Travel style is required" }),
  food_preference: z.string().min(1, { message: "Food preference is required" }),
  budget: z.string().min(1, { message: "Budget is required" }),
  transport_mode: z.string().min(1, { message: "Transport mode is required" }),
  time_preference: z.string().min(1, { message: "Time preference is required" }),
  activity_intensity: z.string().min(1, { message: "Activity intensity is required" }),
  interests: z.array(z.string()).min(1, { message: "Select at least one interest" }),
  custom_preferences: z.string().optional()
});

type PreferencesFormValues = z.infer<typeof preferencesSchema>;

const PreferencesPage: React.FC = () => {
  const [_, navigate] = useLocation();
  const [calendarConnected, setCalendarConnected] = useState(false);
  const { toast } = useToast();

  // Handle detected speech preferences
  const handlePreferencesDetected = (detectedPrefs: any) => {
    // Map detected values to form values
    if (detectedPrefs.destination) {
      form.setValue('location', detectedPrefs.destination);
    }
    
    if (detectedPrefs.startDate) {
      form.setValue('date_from', detectedPrefs.startDate);
    }
    
    if (detectedPrefs.endDate) {
      form.setValue('date_to', detectedPrefs.endDate);
    }
    
    if (detectedPrefs.interests && detectedPrefs.interests.length > 0) {
      form.setValue('interests', detectedPrefs.interests);
    }
    
    if (detectedPrefs.budget) {
      // Map budget values like "low", "medium", "high" to numeric scale 0-4
      const budgetMap: Record<string, string> = {
        'low': '0',
        'budget': '0',
        'affordable': '1',
        'medium': '2',
        'moderate': '2',
        'high': '3', 
        'luxury': '4',
        'expensive': '4'
      };
      
      const budgetValue = budgetMap[detectedPrefs.budget.toLowerCase()] || '2';
      form.setValue('budget', budgetValue);
    }
    
    if (detectedPrefs.travelStyle) {
      form.setValue('travel_style', detectedPrefs.travelStyle.toLowerCase());
    }
    
    if (detectedPrefs.activityIntensity) {
      form.setValue('activity_intensity', detectedPrefs.activityIntensity.toLowerCase());
    }
    
    toast({
      title: "Preferences Updated",
      description: "Your spoken preferences have been applied to the form.",
    });
  };

  const form = useForm<PreferencesFormValues>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      date_from: '',
      date_to: '',
      location: '',
      travel_style: 'cultural',
      food_preference: 'local cuisine',
      budget: '2', // Middle value on 0-4 scale
      transport_mode: 'public transport',
      time_preference: 'morning',
      activity_intensity: 'moderate',
      interests: [],
      custom_preferences: ''
    }
  });

  const onSubmit = async (data: PreferencesFormValues) => {
    try {
      await apiRequest('POST', '/api/preferences', data);
      navigate('/recommendations');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onCalendarConnected = (connected: boolean) => {
    setCalendarConnected(connected);
  };

  return (
    <section className="max-w-2xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Set Your Preferences</h2>
        <p className="text-gray-600">Help us understand what you're looking for in your trip.</p>
      </div>
      
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="mb-8 pb-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Calendar Integration</h3>
            <p className="text-gray-600 mb-4">Connect your Google Calendar to help us plan around your existing commitments.</p>
            
            <CalendarConnect onConnected={onCalendarConnected} />
          </div>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Trip Details</h3>
                  <SpeechInputDialog 
                    onPreferencesDetected={handlePreferencesDetected}
                    buttonText="Speak Your Trip Details"
                  />
                </div>
                
                <div className="grid gap-4 mb-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="date_from"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="date_to"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destination</FormLabel>
                      <FormControl>
                        <Input placeholder="City, Country" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Your Preferences</h3>
                
                <div className="grid gap-4 mb-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="travel_style"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Travel Style</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a travel style" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="cultural">Cultural</SelectItem>
                            <SelectItem value="adventure">Adventure</SelectItem>
                            <SelectItem value="relaxation">Relaxation</SelectItem>
                            <SelectItem value="luxury">Luxury</SelectItem>
                            <SelectItem value="budget">Budget</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="food_preference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Food Preference</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select food preference" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="local cuisine">Local Cuisine</SelectItem>
                            <SelectItem value="fine dining">Fine Dining</SelectItem>
                            <SelectItem value="street food">Street Food</SelectItem>
                            <SelectItem value="vegetarian">Vegetarian</SelectItem>
                            <SelectItem value="vegan">Vegan</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid gap-4 mb-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="budget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Budget Level (0-4)</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>Budget</span>
                              <span>Luxury</span>
                            </div>
                            <input 
                              type="range" 
                              min="0" 
                              max="4" 
                              step="1"
                              value={field.value}
                              onChange={(e) => field.onChange(e.target.value)}
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between px-1 text-sm">
                              <span>0</span>
                              <span>1</span>
                              <span>2</span>
                              <span>3</span>
                              <span>4</span>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="transport_mode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transport Mode</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select transport mode" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="public transport">Public Transport</SelectItem>
                            <SelectItem value="rental car">Rental Car</SelectItem>
                            <SelectItem value="walking">Walking</SelectItem>
                            <SelectItem value="biking">Biking</SelectItem>
                            <SelectItem value="guided tours">Guided Tours</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="time_preference"
                  render={({ field }) => (
                    <FormItem className="mb-4">
                      <FormLabel>Time Preference</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex space-x-4"
                        >
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <RadioGroupItem value="morning" />
                            </FormControl>
                            <FormLabel className="font-normal">Morning</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <RadioGroupItem value="afternoon" />
                            </FormControl>
                            <FormLabel className="font-normal">Afternoon</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <RadioGroupItem value="evening" />
                            </FormControl>
                            <FormLabel className="font-normal">Evening</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="activity_intensity"
                  render={({ field }) => (
                    <FormItem className="mb-4">
                      <FormLabel>Activity Intensity</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex space-x-4"
                        >
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <RadioGroupItem value="low" />
                            </FormControl>
                            <FormLabel className="font-normal">Low</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <RadioGroupItem value="moderate" />
                            </FormControl>
                            <FormLabel className="font-normal">Moderate</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <RadioGroupItem value="high" />
                            </FormControl>
                            <FormLabel className="font-normal">High</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="interests"
                  render={() => (
                    <FormItem className="mb-6">
                      <FormLabel>Interests</FormLabel>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {['Museums', 'Food', 'History', 'Art', 'Nature', 'Shopping', 'Nightlife', 'Architecture', 'Sports'].map((interest) => (
                          <FormField
                            key={interest}
                            control={form.control}
                            name="interests"
                            render={({ field }) => {
                              return (
                                <Label
                                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50"
                                  htmlFor={`interest-${interest}`}
                                >
                                  <input
                                    type="checkbox"
                                    id={`interest-${interest}`}
                                    className="mr-2"
                                    checked={field.value?.includes(interest)}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      return checked
                                        ? field.onChange([...field.value, interest])
                                        : field.onChange(field.value?.filter((value) => value !== interest));
                                    }}
                                  />
                                  {interest}
                                </Label>
                              );
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="custom_preferences"
                  render={({ field }) => (
                    <FormItem className="mb-4">
                      <FormLabel>Custom Preferences</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any additional preferences? E.g. 'I prefer indoor activities if it rains'" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  className="flex items-center"
                  onClick={() => navigate('/')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                  Back to Home
                </Button>
                <Button 
                  type="submit"
                  className="bg-primary text-white rounded-md hover:bg-primary/90"
                >
                  Generate Plan
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </section>
  );
};

export default PreferencesPage;
