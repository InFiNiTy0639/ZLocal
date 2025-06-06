"use client";

import { useMemo, memo } from "react";
import { GoogleMap, Marker, Polyline } from "@react-google-maps/api";
import { MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGoogleMaps } from "@/components/google-maps-provider";

interface DeliveryMapProps {
  restaurantAddress: string;
  restaurantLat?: number;
  restaurantLng?: number;
  deliveryAddress: string;
  deliveryLat?: number;
  deliveryLng?: number;
  routePolyline?: string;
}

const containerStyle = {
  width: "100%",
  height: "100%",
};

export const DeliveryMap = memo(function DeliveryMap({
  restaurantAddress,
  restaurantLat,
  restaurantLng,
  deliveryAddress,
  deliveryLat,
  deliveryLng,
  routePolyline,
}: DeliveryMapProps) {
  const { isLoaded, loadError } = useGoogleMaps();

  const isValidCoord = (lat?: number, lng?: number) => {
    return (
      typeof lat === "number" &&
      typeof lng === "number" &&
      -90 <= lat &&
      lat <= 90 &&
      -180 <= lng &&
      lng <= 180 &&
      Math.abs(lat) >= 0.01 &&
      Math.abs(lng) >= 0.01
    );
  };

  const center = useMemo(() => {
    if (
      isValidCoord(restaurantLat, restaurantLng) &&
      isValidCoord(deliveryLat, deliveryLng)
    ) {
      return {
        lat: (restaurantLat! + deliveryLat!) / 2,
        lng: (restaurantLng! + deliveryLng!) / 2,
      };
    }
    return { lat: 28.6139, lng: 77.209 }; // Delhi default
  }, [restaurantLat, restaurantLng, deliveryLat, deliveryLng]);

  const path = useMemo(() => {
    if (routePolyline && isLoaded) {
      try {
        return google.maps.geometry.encoding.decodePath(routePolyline);
      } catch {
        return [];
      }
    }
    return [];
  }, [routePolyline, isLoaded]);

  if (loadError) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <div className="text-center bg-white p-8 rounded-md shadow-lg max-w-md">
          <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-3">Map Error</h3>
          <p className="text-gray-600 mb-4">
            Failed to load Google Maps: {loadError.message}
          </p>
        </div>
      </div>
    );
  }

  if (!restaurantAddress || !deliveryAddress) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <div className="text-center bg-white p-8 rounded-md shadow-lg max-w-md">
          <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-3">
            Route Planning Ready
          </h3>
          <p className="text-gray-600 mb-4">
            Enter restaurant and delivery locations to see the route and
            calculate ETA
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative bg-gray-100">
      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="bg-white rounded-md shadow-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900 flex items-center">
              <Navigation className="h-5 w-5 mr-2 text-blue-600" />
              Delivery Route
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (restaurantAddress && deliveryAddress) {
                  const url = `https://www.google.com/maps/dir/${encodeURIComponent(
                    restaurantAddress
                  )}/${encodeURIComponent(deliveryAddress)}`;
                  window.open(url, "_blank");
                }
              }}
            >
              Open in Google Maps
            </Button>
          </div>
          <div className="space-y-2 text-sm">
            {restaurantAddress && (
              <div className="flex items-start space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full mt-1 flex-shrink-0"></div>
                <div>
                  <div className="font-medium text-gray-900">Restaurant</div>
                  <div className="text-gray-600">{restaurantAddress}</div>
                </div>
              </div>
            )}
            {deliveryAddress && (
              <div className="flex items-start space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full mt-1 flex-shrink-0"></div>
                <div>
                  <div className="font-medium text-gray-900">
                    Delivery Location
                  </div>
                  <div className="text-gray-600">{deliveryAddress}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isLoaded && (
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={15} // Closer zoom for hyperlocal
        >
          {isValidCoord(restaurantLat, restaurantLng) && (
            <Marker
              position={{ lat: restaurantLat!, lng: restaurantLng! }}
              icon={{
                url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
                scaledSize: isLoaded ? new google.maps.Size(32, 32) : undefined,
              }}
              title="Pickup"
            />
          )}
          {isValidCoord(deliveryLat, deliveryLng) && (
            <Marker
              position={{ lat: deliveryLat!, lng: deliveryLng! }}
              icon={{
                url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
                scaledSize: isLoaded ? new google.maps.Size(32, 32) : undefined,
              }}
              title="Delivery"
            />
          )}
          {path.length > 0 && (
            <Polyline
              path={path}
              options={{
                strokeColor: "#006400",
                strokeOpacity: 0.8,
                strokeWeight: 4,
              }}
            />
          )}
        </GoogleMap>
      )}
    </div>
  );
});
