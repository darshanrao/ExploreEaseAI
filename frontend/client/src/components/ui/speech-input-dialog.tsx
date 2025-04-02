import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mic } from 'lucide-react';
import SpeechRecognition from '@/components/ui/speech-recognition';
import { useSpeechToTravel } from '@/hooks/use-speech-to-travel';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface SpeechInputDialogProps {
  onPreferencesDetected?: (preferences: any) => void;
  buttonClassName?: string;
  buttonText?: string;
}

const SpeechInputDialog: React.FC<SpeechInputDialogProps> = ({
  onPreferencesDetected,
  buttonClassName = '',
  buttonText = 'Speak Your Travel Plans'
}) => {
  const [open, setOpen] = useState(false);
  const [showSpeechInput, setShowSpeechInput] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const { processSpeech, preferences, isProcessing, error } = useSpeechToTravel();
  
  const handleSpeechResult = (speech: string) => {
    const result = processSpeech(speech);
    setShowSpeechInput(false);
    setShowResults(true);
    
    if (result && onPreferencesDetected) {
      onPreferencesDetected(result);
    }
  };
  
  const handleClose = () => {
    setShowSpeechInput(false);
    setShowResults(false);
    setOpen(false);
  };
  
  const handleDialogOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setShowSpeechInput(true);
      setShowResults(false);
    }
    setOpen(isOpen);
  };
  
  const capitalizeFirst = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };
  
  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        <Button className={buttonClassName} variant="outline">
          <Mic className="h-4 w-4 mr-2" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {showSpeechInput && (
          <>
            <DialogHeader>
              <DialogTitle>Voice Travel Planner</DialogTitle>
              <DialogDescription>
                Speak about your travel plans and we'll extract the details
              </DialogDescription>
            </DialogHeader>
            <SpeechRecognition 
              onSpeechResult={handleSpeechResult}
              onClose={() => setOpen(false)}
            />
          </>
        )}
        
        {showResults && (
          <>
            <DialogHeader>
              <DialogTitle>Here's What We Understood</DialogTitle>
              <DialogDescription>
                We've extracted the following travel preferences from your speech
              </DialogDescription>
            </DialogHeader>
            
            <div className="mt-4 space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {!error && Object.keys(preferences).length === 0 && (
                <Alert>
                  <AlertTitle>No preferences detected</AlertTitle>
                  <AlertDescription>
                    We couldn't extract specific travel preferences from your speech.
                    Try being more specific about destinations, dates, and interests.
                  </AlertDescription>
                </Alert>
              )}
              
              {preferences.destination && (
                <div>
                  <h4 className="font-medium mb-1">Destination</h4>
                  <p>{preferences.destination}</p>
                </div>
              )}
              
              {(preferences.startDate || preferences.endDate) && (
                <div>
                  <h4 className="font-medium mb-1">Travel Dates</h4>
                  <p>
                    {preferences.startDate && `From: ${preferences.startDate}`}
                    {preferences.startDate && preferences.endDate && ' — '}
                    {preferences.endDate && `To: ${preferences.endDate}`}
                  </p>
                </div>
              )}
              
              {preferences.interests && preferences.interests.length > 0 && (
                <div>
                  <h4 className="font-medium mb-1">Interests</h4>
                  <div className="flex flex-wrap gap-2">
                    {preferences.interests.map((interest, index) => (
                      <Badge key={index} variant="outline">{interest}</Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {(preferences.budget || preferences.travelStyle || preferences.activityIntensity) && (
                <div>
                  <h4 className="font-medium mb-1">Additional Preferences</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {preferences.budget && (
                      <li>Budget: {capitalizeFirst(preferences.budget)}</li>
                    )}
                    {preferences.travelStyle && (
                      <li>Travel Style: {capitalizeFirst(preferences.travelStyle)}</li>
                    )}
                    {preferences.activityIntensity && (
                      <li>Activity Level: {capitalizeFirst(preferences.activityIntensity)}</li>
                    )}
                  </ul>
                </div>
              )}
              
              <Separator />
              
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={handleClose}>
                  Try Again
                </Button>
                <Button onClick={handleClose}>
                  Use These Preferences
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SpeechInputDialog;