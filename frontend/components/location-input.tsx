"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Search, Navigation } from "lucide-react";
import { useGoogleMaps } from "@/components/google-maps-provider";
import { Autocomplete } from "@react-google-maps/api";

interface LocationInputProps {
  placeholder: string;
  onLocationSelect: (address: string) => void;
  value: string;
}

export function LocationInput({
  placeholder,
  onLocationSelect,
  value,
}: LocationInputProps) {
  const { isLoaded, loadError } = useGoogleMaps();
  const [inputValue, setInputValue] = useState(value);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      if (newValue.length >= 5) {
        onLocationSelect(newValue);
      }
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
      debounceTimeout.current = setTimeout(() => {
        if (newValue.trim().length >= 5) {
          setShowSuggestions(true);
        } else {
          setShowSuggestions(false);
        }
      }, 300);
    },
    [onLocationSelect]
  );
  const handlePlaceSelect = useCallback(() => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.formatted_address && place.formatted_address.length >= 5) {
        onLocationSelect(place.formatted_address);
        setInputValue(place.formatted_address);
        setShowSuggestions(false);
      }
    }
  }, [onLocationSelect]);

  const getCurrentLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode(
            {
              location: {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              },
            },
            (results, status) => {
              if (
                status === "OK" &&
                results &&
                results[0] &&
                results[0].formatted_address.length >= 5
              ) {
                const address = results[0].formatted_address;
                setInputValue(address);
                onLocationSelect(address);
              } else {
                // console.error("Geocoding failed or address too short");
                setInputValue("");
                onLocationSelect("");
              }
              setShowSuggestions(false);
            }
          );
        },
        (error) => {
          //   console.error("Error getting location:", error);
          setInputValue("");
          onLocationSelect("");
          setShowSuggestions(false);
        }
      );
    } else {
      //   console.error("Geolocation is not supported by this browser.");
      setInputValue("");
      onLocationSelect("");
      setShowSuggestions(false);
    }
  }, [onLocationSelect]);

  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  if (loadError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-600 text-sm">
          Google Maps failed to load: {loadError.message}
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
        <MapPin className="h-4 w-4" />
      </div>
      {isLoaded ? (
        <Autocomplete
          onLoad={(autocomplete) => {
            autocompleteRef.current = autocomplete;
            autocomplete.setOptions({
              componentRestrictions: { country: "in" },
            });
          }}
          onPlaceChanged={handlePlaceSelect}
        >
          <Input
            type="text"
            placeholder={placeholder}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => inputValue.length >= 5 && setShowSuggestions(true)}
            className="pl-10 pr-10"
          />
        </Autocomplete>
      ) : (
        <Input
          type="text"
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => inputValue.length >= 5 && setShowSuggestions(true)}
          className="pl-10 pr-10"
          disabled={true}
        />
      )}
      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
        <Search className="h-4 w-4" />
      </div>

      {showSuggestions && isLoaded && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          <div className="p-2 border-b border-gray-100">
            <Button
              variant="outline"
              size="sm"
              onClick={getCurrentLocation}
              className="w-full justify-start text-sm"
            >
              <Navigation className="h-4 w-4 mr-2" />
              Use Current Location
            </Button>
          </div>
        </div>
      )}

      {showSuggestions && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowSuggestions(false)}
        />
      )}
    </div>
  );
}
