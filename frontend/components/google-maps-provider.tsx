"use client";

import { LoadScript } from "@react-google-maps/api";
import type React from "react";
import { createContext, useContext, useState } from "react";

interface GoogleMapsContextType {
  isLoaded: boolean;
  loadError: Error | null;
}

const GoogleMapsContext = createContext<GoogleMapsContextType>({
  isLoaded: false,
  loadError: null,
});

export const useGoogleMaps = () => useContext(GoogleMapsContext);

interface GoogleMapsProviderProps {
  children: React.ReactNode;
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-600 text-sm">Google Maps API key is missing</p>
      </div>
    );
  }

  return (
    <LoadScript
      googleMapsApiKey={GOOGLE_MAPS_API_KEY}
      libraries={["places", "maps", "geometry"]}
      onLoad={() => setIsLoaded(true)}
      onError={(error) => setLoadError(error)}
    >
      <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>
        {children}
      </GoogleMapsContext.Provider>
    </LoadScript>
  );
}
