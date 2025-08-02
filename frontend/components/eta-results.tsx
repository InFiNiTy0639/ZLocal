"use client";

import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  MapPin,
  Thermometer,
  Car,
  Calendar,
  TrendingUp,
  Hash,
} from "lucide-react";

interface ETAResultsProps {
  results: {
    id: number;
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
  };
}

const formatTime = (minutes: number) => {
  if (!isFinite(minutes) || minutes < 0) return "N/A";
  const hours = Math.floor(minutes / 60);
  const mins = Math.round((minutes % 60) * 10) / 10;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

const getTrafficVariant = (density: string) => {
  switch (density.toLowerCase()) {
    case "low":
      return "default";
    case "medium":
      return "secondary";
    case "high":
      return "destructive";
    case "jam":
      return "destructive";
    default:
      return "default";
  }
};

const getConfidenceColor = (confidence: number) => {
  if (!isFinite(confidence) || confidence < 0 || confidence > 1)
    return "text-gray-600";
  if (confidence >= 0.85) return "text-green-600";
  if (confidence >= 0.7) return "text-yellow-600";
  return "text-red-600";
};

export const ETAResults = memo(function ETAResults({
  results,
}: ETAResultsProps) {
  // Validate results
  const validatedResults = {
    id: typeof results.id === "number" && results.id > 0 ? results.id : 0,
    predicted_eta:
      isFinite(results.predicted_eta) && results.predicted_eta > 0
        ? results.predicted_eta
        : 0,
    google_eta:
      isFinite(results.google_eta) && results.google_eta > 0
        ? results.google_eta
        : 0,
    distance_km:
      isFinite(results.distance_km) && results.distance_km >= 0
        ? results.distance_km
        : 0,
    weather: {
      condition:
        typeof results.weather?.condition === "string"
          ? results.weather.condition
          : "unknown",
      temperature: isFinite(results.weather?.temperature)
        ? results.weather.temperature
        : 25,
    },
    traffic_density:
      typeof results.traffic_density === "string"
        ? results.traffic_density
        : "unknown",
    is_festival:
      typeof results.is_festival === "boolean" ? results.is_festival : false,
    confidence:
      isFinite(results.confidence) &&
      results.confidence >= 0 &&
      results.confidence <= 1
        ? results.confidence
        : 0,
    route_polyline:
      typeof results.route_polyline === "string" ? results.route_polyline : "",
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Clock className="h-5 w-5 text-gray-600" />
          <span className="font-semibold text-gray-900">
            Delivery Time Prediction
          </span>
        </div>

        {/* Mobile: Stack vertically, Desktop: Horizontal layout */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-6">
          {/* ETA Section */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="text-center p-3 md:p-4 bg-blue-50 rounded-lg min-w-[120px]">
              <div className="text-xl md:text-2xl font-bold text-blue-600">
                {formatTime(validatedResults.predicted_eta)}
              </div>
              <div className="text-xs md:text-sm text-blue-600 font-medium">
                Predicted Time
              </div>
            </div>
            <div className="text-center p-3 md:p-4 bg-gray-50 rounded-lg min-w-[120px]">
              <div className="text-xl md:text-2xl font-bold text-gray-600">
                {formatTime(validatedResults.google_eta)}
              </div>
              <div className="text-xs md:text-sm text-gray-600 font-medium">
                Google Maps
              </div>
            </div>
          </div>

          {/* Details Grid - Responsive layout */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-4 flex-1">
            {/* Distance */}
            <div className="flex flex-col items-center space-y-1 px-2 md:px-4 py-2 bg-gray-50 rounded-lg">
              <MapPin className="h-4 w-4 text-gray-600" />
              <span className="text-xs font-medium text-center">Distance</span>
              <span className="text-xs md:text-sm font-semibold">
                {validatedResults.distance_km.toFixed(2)} km
              </span>
            </div>

            {/* Weather */}
            <div className="flex flex-col items-center space-y-1 px-2 md:px-4 py-2 bg-blue-50 rounded-lg">
              <Thermometer className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-center">Weather</span>
              <div className="text-center">
                <div className="text-xs md:text-sm font-semibold">
                  {validatedResults.weather.temperature}°C
                </div>
                <div className="text-xs text-gray-600 capitalize truncate">
                  {validatedResults.weather.condition}
                </div>
              </div>
            </div>

            {/* Traffic */}
            <div className="flex flex-col items-center space-y-1 px-2 md:px-4 py-2 bg-gray-50 rounded-lg">
              <Car className="h-4 w-4 text-gray-600" />
              <span className="text-xs font-medium text-center mb-1">
                Traffic
              </span>
              <Badge
                variant={getTrafficVariant(validatedResults.traffic_density)}
                className="text-xs"
              >
                {validatedResults.traffic_density}
              </Badge>
            </div>

            {/* Festival Day */}
            <div className="flex flex-col items-center space-y-1 px-2 md:px-4 py-2 bg-gray-50 rounded-lg">
              <Calendar className="h-4 w-4 text-gray-600" />
              <span className="text-xs font-medium text-center mb-1">
                Festival
              </span>
              <Badge
                variant={
                  validatedResults.is_festival ? "destructive" : "secondary"
                }
                className="text-xs"
              >
                {validatedResults.is_festival ? "Yes" : "No"}
              </Badge>
            </div>
            <div className="flex flex-col items-center space-y-1 px-2 md:px-4 py-2 bg-gray-50 rounded-lg">
              <Hash className="h-4 w-4 text-gray-600" />
              <span className="text-xs font-medium text-center">
                Request ID
              </span>
              <span className="text-xs md:Text-sm font-semibold">
                {validatedResults.id || "N/A"}
              </span>
            </div>
            {/* Confidence */}
            <div className="flex flex-col items-center space-y-1 px-2 md:px-4 py-2 bg-gray-50 rounded-lg col-span-2 md:col-span-1">
              <TrendingUp className="h-4 w-4 text-gray-600" />
              <span className="text-xs font-medium text-center">
                Confidence
              </span>
              <span
                className={`text-xs md:text-sm font-semibold ${getConfidenceColor(
                  validatedResults.confidence
                )}`}
              >
                {(validatedResults.confidence * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs text-yellow-800">
            <strong>Note:</strong> ETA predictions consider real-time weather,
            traffic, and delivery person factors. Actual delivery times may vary
            based on unforeseen circumstances.
          </p>
        </div>
      </CardContent>
    </Card>
  );
});
