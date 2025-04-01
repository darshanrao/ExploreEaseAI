import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import CalendarConnect from '@/components/ui/calendar-connect';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from "@/hooks/use-toast";
import { useLocation } from 'wouter';

const preferencesSchema = z.object({
  startDate: z.string().min(1, { message: "Start date is required" }),
  endDate: z.string().min(1, { message: "End date is required" }),
  destination: z.string().min(3, { message: "Destination is required" }),
  interests: z.string().optional(),
  locationTypes: z.array(z.string()).min(1, { message: "Select at least one location type" }),
  timePreferences: z.array(z.string()).min(1, { message: "Select at least one time preference" })
});

type PreferencesFormValues = z.infer<typeof preferencesSchema>;

const PreferencesPage: React.FC = () => {
  const [_, navigate] = useLocation();
  const [calendarConnected, setCalendarConnected] = useState(false);
  const { toast } = useToast();

  const form = useForm<PreferencesFormValues>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      startDate: '',
      endDate: '',
      destination: '',
      interests: '',
      locationTypes: [],
      timePreferences: []
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
                <h3 className="text-lg font-medium text-gray-900 mb-4">Trip Details</h3>
                
                <div className="grid gap-4 mb-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="destination"
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
                
                <FormField
                  control={form.control}
                  name="interests"
                  render={({ field }) => (
                    <FormItem className="mb-4">
                      <FormLabel>Interests</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="E.g. outdoor activities, historical sites, local cuisine..." 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="locationTypes"
                  render={() => (
                    <FormItem className="mb-6">
                      <FormLabel>Location Types</FormLabel>
                      <div className="flex flex-wrap gap-2">
                        {['restaurants', 'cafes', 'attractions', 'events'].map((type) => (
                          <FormField
                            key={type}
                            control={form.control}
                            name="locationTypes"
                            render={({ field }) => {
                              return (
                                <Label
                                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50"
                                  htmlFor={`location-type-${type}`}
                                >
                                  <Checkbox
                                    id={`location-type-${type}`}
                                    className="mr-2"
                                    checked={field.value?.includes(type)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, type])
                                        : field.onChange(field.value?.filter((value) => value !== type));
                                    }}
                                  />
                                  {type.charAt(0).toUpperCase() + type.slice(1)}
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
                  name="timePreferences"
                  render={() => (
                    <FormItem className="mb-6">
                      <FormLabel>Time Preferences</FormLabel>
                      <div className="flex flex-wrap gap-2">
                        {['morning', 'afternoon', 'evening'].map((time) => (
                          <FormField
                            key={time}
                            control={form.control}
                            name="timePreferences"
                            render={({ field }) => {
                              return (
                                <Label
                                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50"
                                  htmlFor={`time-pref-${time}`}
                                >
                                  <Checkbox
                                    id={`time-pref-${time}`}
                                    className="mr-2"
                                    checked={field.value?.includes(time)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, time])
                                        : field.onChange(field.value?.filter((value) => value !== time));
                                    }}
                                  />
                                  {time.charAt(0).toUpperCase() + time.slice(1)}
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
