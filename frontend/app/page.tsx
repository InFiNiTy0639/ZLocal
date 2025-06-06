"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Navigation, Star, Bike } from "lucide-react";
import { GoogleMapsProvider } from "@/components/google-maps-provider";
import { LocationInput } from "@/components/location-input";
import { DeliveryMap } from "@/components/delivery-map";
import { ETAResults } from "@/components/eta-results";

interface DeliveryFormData {
  restaurant_address: string;
  delivery_address: string;
  delivery_person_age: number;
  delivery_person_rating: number;
  vehicle_type: "bicycle" | "scooter" | "Bike";
  vehicle_condition: number;
  multiple_deliveries: number;
  order_time: string;
}

interface ETAResponse {
  predicted_eta: number;
  google_eta: number;
  distance_km: number;
  weather: {
    condition: string;
    temperature: number;
  };
  traffic_density: string;
  is_festival: boolean;
  confidence: number;
  route_polyline: string;
  restaurant_lat: number;
  restaurant_lng: number;
  delivery_lat: number;
  delivery_lng: number;
}

export default function DeliveryETAPage() {
  const [formData, setFormData] = useState<DeliveryFormData>({
    restaurant_address: "",
    delivery_address: "",
    delivery_person_age: 25,
    delivery_person_rating: 4.5,
    vehicle_type: "Bike",
    vehicle_condition: 2,
    multiple_deliveries: 1,
    order_time: new Date().toISOString(),
  });
  const [etaResults, setEtaResults] = useState<ETAResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLocationSelect = useCallback(
    (type: "restaurant" | "delivery", address: string) => {
      setFormData((prev) => ({ ...prev, [`${type}_address`]: address }));
    },
    []
  );

  const getCurrentLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prev) => ({
            ...prev,
            restaurant_address: `Current Location (${position.coords.latitude}, ${position.coords.longitude})`,
          }));
        },
        (err) => {
          setError("Unable to get current location: " + err.message);
        }
      );
    } else {
      setError("Geolocation is not supported by your browser");
    }
  }, []);

  const validateAddresses = (restaurant: string, delivery: string) => {
    if (!restaurant || !delivery) {
      return "Please select both restaurant and delivery locations";
    }
    if (restaurant.length < 5 || delivery.length < 5) {
      return "Addresses must be at least 5 characters long";
    }
    return null;
  };

  const calculateETA = useCallback(async () => {
    const addressError = validateAddresses(
      formData.restaurant_address,
      formData.delivery_address
    );
    if (addressError) {
      setError(addressError);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/predict-eta", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          restaurant_address: formData.restaurant_address,
          delivery_address: formData.delivery_address,
          delivery_person_age: formData.delivery_person_age,
          delivery_person_rating: formData.delivery_person_rating,
          vehicle_type: formData.vehicle_type,
          vehicle_condition: formData.vehicle_condition,
          multiple_deliveries: formData.multiple_deliveries,
          order_time: new Date().toISOString(),
        }),
      });
      console.log("API Response Status:", response.status);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to calculate ETA");
      }

      const results = await response.json();
      console.log("ETA Results:", results);
      setEtaResults(results);
    } catch (err) {
      console.error("Error calculating ETA:", err);
      if (err instanceof Error) {
        setError("Error calculating ETA: " + err.message);
      } else {
        setError("Error calculating ETA: " + String(err));
      }
    } finally {
      setIsLoading(false);
    }
  }, [formData]);

  const vehicleIcons = {
    Bike: Bike,
    scooter: Bike,
    bicycle: Bike,
  };

  return (
    <GoogleMapsProvider>
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-2">
                <Navigation className="h-8 w-8 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">
                  DeliveryETA
                </h1>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5" />
                    <span>ETA Optimizer</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="restaurant">Pickup Location</Label>
                    <LocationInput
                      placeholder="Choose origin location..."
                      onLocationSelect={(address) =>
                        handleLocationSelect("restaurant", address)
                      }
                      value={formData.restaurant_address}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={getCurrentLocation}
                      className="flex items-center space-x-2"
                    >
                      <Navigation className="h-4 w-4" />
                      <span>Use Current Location</span>
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="delivery">Delivery Location</Label>
                    <LocationInput
                      placeholder="Choose destination location..."
                      onLocationSelect={(address) =>
                        handleLocationSelect("delivery", address)
                      }
                      value={formData.delivery_address}
                    />
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900">
                      Delivery Person Details
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="age">Age</Label>
                        <Input
                          id="age"
                          type="number"
                          value={formData.delivery_person_age}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              delivery_person_age:
                                Number.parseInt(e.target.value) || 25,
                            }))
                          }
                          min="20"
                          max="50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rating">Rating</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id="rating"
                            type="number"
                            step="0.1"
                            value={formData.delivery_person_rating}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                delivery_person_rating:
                                  Number.parseFloat(e.target.value) || 4.5,
                              }))
                            }
                            min="1"
                            max="5"
                            className="form-control"
                          />
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-4 w-4 ${
                                  star <= formData.delivery_person_rating
                                    ? "text-yellow-400 fill-current"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900">
                      Vehicle Details
                    </h3>
                    <div className="space-y-2">
                      <Label htmlFor="vehicle_type">Vehicle Type</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {(["Bike", "scooter", "bicycle"] as const).map(
                          (type) => {
                            const Icon = vehicleIcons[type];
                            return (
                              <Button
                                key={type}
                                variant={
                                  formData.vehicle_type === type
                                    ? "default"
                                    : "outline"
                                }
                                onClick={() =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    vehicle_type: type,
                                  }))
                                }
                                className="flex items-center space-x-2 h-12"
                              >
                                <Icon className="h-4 w-4" />
                                <span className="capitalize">{type}</span>
                              </Button>
                            );
                          }
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="vehicle-condition">
                        Vehicle Condition
                      </Label>
                      <Select
                        value={formData.vehicle_condition.toString()}
                        onValueChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            vehicle_condition: Number.parseInt(value),
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select condition" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Worse (0)</SelectItem>
                          <SelectItem value="1">Poor (1)</SelectItem>
                          <SelectItem value="2">Average (2)</SelectItem>
                          <SelectItem value="3">Good (3)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="multiple-deliveries">
                        Multiple Deliveries
                      </Label>
                      <Input
                        id="multiple-deliveries"
                        type="number"
                        value={formData.multiple_deliveries}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            multiple_deliveries:
                              Number.parseInt(e.target.value) || 1,
                          }))
                        }
                        min="0"
                        max="5"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={calculateETA}
                    disabled={
                      isLoading ||
                      !formData.restaurant_address ||
                      !formData.delivery_address
                    }
                    className="w-full h-12 text-lg"
                  >
                    {isLoading ? "Calculating..." : "Calculate Delivery Time"}
                  </Button>

                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded">
                      <p className="text-red-600 text-sm">{error}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="lg:sticky lg:top-16">
              <Card className="h-[720px] mb-5">
                <CardContent className="p-0 h-full">
                  <DeliveryMap
                    restaurantAddress={formData.restaurant_address}
                    restaurantLat={etaResults?.restaurant_lat}
                    restaurantLng={etaResults?.restaurant_lng}
                    deliveryAddress={formData.delivery_address}
                    deliveryLat={etaResults?.delivery_lat}
                    deliveryLng={etaResults?.delivery_lng}
                    routePolyline={etaResults?.route_polyline}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
          {etaResults && <ETAResults results={etaResults} />}
        </div>
      </div>
    </GoogleMapsProvider>
  );
}
