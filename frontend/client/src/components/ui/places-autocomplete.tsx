import React, { useState, useEffect, useRef } from 'react';
import { useLoadScript } from '@react-google-maps/api';
import { Input } from './input';
import { Loader } from 'lucide-react';

interface PlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const libraries: ("places")[] = ["places"];

export function PlacesAutocomplete({ 
  value, 
  onChange, 
  placeholder = "City, Country", 
  className 
}: PlacesAutocompleteProps) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: 'AIzaSyDhYFtRMNC0seqrK9EPDFpgOLPyuJrLVG8',
    libraries,
  });

  const [inputValue, setInputValue] = useState(value);
  const autoCompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    if (!isLoaded || !inputRef.current) return;
    
    autoCompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      types: ['(cities)'], // Restrict to cities only
      fields: ['name', 'geometry.location', 'place_id', 'formatted_address'],
    });

    autoCompleteRef.current.addListener('place_changed', () => {
      if (!autoCompleteRef.current) return;
      
      const place = autoCompleteRef.current.getPlace();
      
      if (place && place.formatted_address) {
        setInputValue(place.formatted_address);
        onChange(place.formatted_address);
      }
    });

    return () => {
      if (autoCompleteRef.current) {
        google.maps.event.clearInstanceListeners(autoCompleteRef.current);
      }
    };
  }, [isLoaded, onChange]);

  if (!isLoaded) {
    return (
      <div className="flex items-center border rounded-md px-3 py-2 min-h-10">
        <Loader className="w-4 h-4 animate-spin mr-2" />
        <span className="text-sm text-gray-500">Loading places...</span>
      </div>
    );
  }

  return (
    <Input
      ref={inputRef}
      type="text"
      placeholder={placeholder}
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      className={className}
    />
  );
}