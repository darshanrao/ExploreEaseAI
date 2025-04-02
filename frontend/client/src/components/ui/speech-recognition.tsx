import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Mic, StopCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpeechRecognitionProps {
  onSpeechResult: (text: string) => void;
  onClose: () => void;
  className?: string;
}

/**
 * Speech recognition component using the Web Speech API
 */
const SpeechRecognition: React.FC<SpeechRecognitionProps> = ({ 
  onSpeechResult, 
  onClose,
  className
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [soundLevel, setSoundLevel] = useState(0);
  
  // Reference to the Web Speech API
  const recognitionRef = useRef<any>(null);
  
  // Reference to interval for sound visualization
  const soundLevelInterval = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Check if browser supports Web Speech API
    if (!('webkitSpeechRecognition' in window) && 
        !('SpeechRecognition' in window)) {
      setIsSupported(false);
      setError('Speech recognition is not supported in your browser. Try Chrome, Edge, or Safari.');
      return;
    }
    
    // Initialize Web Speech API
    // Define the SpeechRecognition type to avoid TypeScript errors
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || 
                                (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognitionAPI();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';
    
    recognitionRef.current.onresult = (event: any) => {
      const current = event.resultIndex;
      const result = event.results[current];
      const transcriptValue = result[0].transcript;
      setTranscript(transcriptValue);
      
      // Simulate sound level based on speaking
      if (soundLevelInterval.current === null) {
        soundLevelInterval.current = setInterval(() => {
          setSoundLevel(Math.random() * 0.5 + 0.2); // Random value between 0.2 and 0.7
        }, 100);
      }
    };
    
    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setError(`Error: ${event.error}`);
      setIsListening(false);
      stopSoundVisualization();
    };
    
    recognitionRef.current.onend = () => {
      if (isListening) {
        // If still supposed to be listening, restart
        recognitionRef.current.start();
      } else {
        stopSoundVisualization();
      }
    };
    
    return () => {
      // Clean up
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      stopSoundVisualization();
    };
  }, []);
  
  const stopSoundVisualization = () => {
    if (soundLevelInterval.current) {
      clearInterval(soundLevelInterval.current);
      soundLevelInterval.current = null;
      setSoundLevel(0);
    }
  };
  
  const handleStartListening = () => {
    setError(null);
    setTranscript('');
    setIsListening(true);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        // If already started, ignore the error
        console.log('Recognition already started', err);
      }
    }
  };
  
  const handleStopListening = () => {
    setIsListening(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    stopSoundVisualization();
  };
  
  const handleAccept = () => {
    if (transcript.trim()) {
      onSpeechResult(transcript);
    }
    handleStopListening();
    onClose();
  };
  
  const handleCancel = () => {
    handleStopListening();
    onClose();
  };
  
  if (!isSupported) {
    return (
      <Card className={cn("w-full max-w-md mx-auto", className)}>
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">Speech Input</h3>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={onClose} className="w-full">Close</Button>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={cn("w-full max-w-md mx-auto", className)}>
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium">Speech Input</h3>
          <Button variant="ghost" size="icon" onClick={handleCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {error && <p className="text-red-500 mb-4">{error}</p>}
        
        <div className="relative mb-4 min-h-[100px] border rounded-md p-3 bg-gray-50">
          {transcript ? (
            <p>{transcript}</p>
          ) : (
            <p className="text-gray-400">
              {isListening ? "Listening... Speak now" : "Click the microphone to start speaking"}
            </p>
          )}
        </div>
        
        {/* Sound visualization */}
        {isListening && (
          <div className="flex justify-center items-center gap-1 h-8 mb-4">
            {[...Array(10)].map((_, i) => {
              const height = Math.random() * soundLevel * 100;
              return (
                <div 
                  key={i} 
                  className="w-1 bg-primary rounded-full transition-all duration-150"
                  style={{ height: `${height}%`, minHeight: '4px', maxHeight: '100%' }}
                ></div>
              );
            })}
          </div>
        )}
        
        <div className="flex gap-3 justify-center">
          {!isListening ? (
            <Button onClick={handleStartListening} className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              Start Speaking
            </Button>
          ) : (
            <Button onClick={handleStopListening} variant="default" className="flex items-center gap-2">
              <StopCircle className="h-4 w-4" />
              Stop
            </Button>
          )}
          
          {transcript && !isListening && (
            <div className="flex gap-3">
              <Button onClick={handleCancel} variant="destructive" className="flex items-center gap-2">
                Reject
              </Button>
              <Button onClick={handleAccept} variant="default" className="flex items-center gap-2">
                Accept
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SpeechRecognition;