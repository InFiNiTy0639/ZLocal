from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from math import radians, sin, cos, sqrt, asin
from pydantic import BaseModel
from typing import Optional, Dict, Any
import googlemaps  # type: ignore
from geopy.geocoders import Nominatim
from cachetools import TTLCache
import requests
import os
import numpy as np
import pandas as pd
import joblib
from datetime import datetime
import logging
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="DeliveryETA", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://zlocal.vercel.app/"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")

if not GOOGLE_MAPS_API_KEY:
    logger.warning("GOOGLE_MAPS_API_KEY not set")
    gmaps = None

else:
    try:
        gmaps = googlemaps.Client(key=GOOGLE_MAPS_API_KEY)
        gmaps.geocode("Delhi, India")
        logger.info("Google maps api initialized successfully")
    except Exception as e:
        logger.warning(f"Google maps api initialization failed:{e}")
        gmaps = None

geolocator = Nominatim(user_agent="delivery_eta")

# Cache for geocoding, directions, and weather data
geocode_cache = TTLCache(maxsize=1000, ttl=3600)  # Cache for 1 hour
directions_cache = TTLCache(maxsize=1000, ttl=3600)
weather_cache = TTLCache(maxsize=1000, ttl=3600)


# Load the ML model and preprocessor
try:
    model = joblib.load("models/xgb_model.pkl")
    preprocessor = joblib.load("models/preprocessor.pkl")
    logger.info("Model and preprocessor loaded successfully")
except Exception as e:
    logger.warning(f"ML model/Preprocessor not found:{e}")
    model = None
    preprocessor = None


# Pydantic models for request and response
class ETARequest(BaseModel):
    restaurant_address: str
    delivery_address: str
    delivery_person_age: int
    delivery_person_rating: float
    vehicle_type: str 
    vehicle_condition: int 
    multiple_deliveries: int
    order_time: Optional[str] = None

class ETAResponse(BaseModel):
    predicted_eta: float
    google_eta: float
    distance_km: float
    weather: Dict[str, Any]
    traffic_density: str
    is_festival: bool
    recommendations: Optional[list[str]] = None
    confidence: float
    route_polyline: str
    restaurant_lat: float
    restaurant_lng: float
    delivery_lat: float
    delivery_lng: float


# Festival dates
FESTIVAL_DATES = {
  "2025-01-01": "New Year's Day",
  "2025-01-14": "Makar Sankranti / Pongal",
  "2025-01-26": "Republic Day",
  "2025-02-26": "Maha Shivaratri",
  "2025-03-14": "Holi",
  "2025-03-31": "Eid al-Fitr",
  "2025-04-10": "Mahavir Jayanti",
  "2025-04-18": "Good Friday",
  "2025-05-12": "Buddha Purnima",
  "2025-06-07": "Eid al-Adha (Bakrid)",
  "2025-07-06": "Muharram",
  "2025-08-15": "Independence Day",
  "2025-08-16": "Janmashtami",
  "2025-09-05": "Milad-un-Nabi",
  "2025-10-02": "Gandhi Jayanti",
  "2025-10-20": "Diwali",
  "2025-11-05": "Guru Nanak Jayanti",
  "2025-12-25": "Christmas"
}

# geocode_address function to get latitude and longitude from addres
def geocode_address(address: str) -> tuple[float, float]:
    if not address or len(address.strip()) < 5:
        logger.error(f"Invalid address: {address}")
        raise HTTPException(status_code=400, detail=f"Invalid address: {address}")
    
    cache_key = address.lower()
    if cache_key in geocode_cache:
        return geocode_cache[cache_key]
    
    if gmaps:
        try:
            result = gmaps.geocode(address)
            if not result:
                raise ValueError("No geocoding results")
            location = result[0]["geometry"]["location"]
            lat, lng = location["lat"], location["lng"]
            if not (-90 <= lat <= 90 and -180 <= lng <= 180) or (abs(lat) < 0.01 and abs(lng) < 0.01):
                raise ValueError(f"Invalid coordinates: ({lat}, {lng})")
            geocode_cache[cache_key] = (lat, lng)
            logger.info(f"Geocoded {address} to ({lat}, {lng})")
            return lat, lng
        except Exception as e:
            logger.warning(f"Google Maps geocoding failed for {address}: {e}")
    
    try:
        location = geolocator.geocode(address, timeout=5) # type: ignore
        if not location:
            raise ValueError(f"Geopy returned no results for {address}")
        lat, lng = location.latitude, location.longitude # type: ignore
        if not (-90 <= lat <= 90 and -180 <= lng <= 180) or (abs(lat) < 0.01 and abs(lng) < 0.01):
            raise ValueError(f"Invalid coordinates: ({lat}, {lng})")
        geocode_cache[cache_key] = (lat, lng)
        logger.info(f"Geopy geocoded {address} to ({lat}, {lng})")
        return lat, lng
    except Exception as e:
        logger.error(f"Geopy geocoding failed for {address}: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to geocode address: {address}")

# Function to calculate distance using Haversine formula
def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    lat1, lng1, lat2, lng2 = map(radians, [lat1, lng1, lat2, lng2])
    dlng = lng2 - lng1
    dlat = lat2 - lat1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlng/2)**2
    c = 2 * asin(sqrt(a))
    r = 6371  # Earth's radius in km
    return c * r

# Function to get Google Directions with caching
def get_google_directions(origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float) -> Dict[str, Any]:
    cache_key = f"{origin_lat},{origin_lng}:{dest_lat},{dest_lng}"
    if cache_key in directions_cache:
        return directions_cache[cache_key]
    
    if not gmaps:
        distance = calculate_distance(origin_lat, origin_lng, dest_lat, dest_lng)
        result = {"distance_km": distance, "duration_minutes": distance * 3, "polyline": ""}
        directions_cache[cache_key] = result
        return result
    
    try:
        directions = gmaps.directions(
            origin=(origin_lat, origin_lng),
            destination=(dest_lat, dest_lng),
            mode="driving",
            departure_time="now",
            traffic_model="best_guess"
        )
        if not directions:
            raise ValueError("No directions found")
        route = directions[0]["legs"][0]
        result = {
            "distance_km": route["distance"]["value"] / 1000,
            "duration_minutes": route["duration_in_traffic"]["value"] / 60,
            "polyline": directions[0]["overview_polyline"]["points"]
        }
        directions_cache[cache_key] = result
        logger.info(f"Directions retrieved: {result['distance_km']} km, {result['duration_minutes']} min")
        return result
    except Exception as e:
        logger.warning(f"Google Directions API failed: {e}")
        distance = calculate_distance(origin_lat, origin_lng, dest_lat, dest_lng)
        result = {"distance_km": distance, "duration_minutes": distance * 3, "polyline": ""}
        directions_cache[cache_key] = result
        return result

# Function to get weather data with caching
def get_weather_data(lat: float, lng: float) -> Dict[str, Any]:
    cache_key = f"{lat},{lng}"
    if cache_key in weather_cache:
        return weather_cache[cache_key]
    
    if not OPENWEATHER_API_KEY:
        logger.warning("OPENWEATHER_API_KEY not set")
        result = {"condition": "sunny", "temperature": 25, "humidity": 60, "wind_speed": 5}
        weather_cache[cache_key] = result
        return result
    
    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {"lat": lat, "lon": lng, "appid": OPENWEATHER_API_KEY, "units": "metric"}
    
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        condition = data["weather"][0]["main"].lower()
        condition_map = {
            "clear": "sunny",
            "clouds": "cloudy",
            "rain": "stormy",
            "snow": "stormy",
            "mist": "fog",
            "haze": "fog",
            "fog": "fog",
            "thunderstorm": "stormy",
            "drizzle": "stormy"
        }
        result = {
            "condition": condition_map.get(condition, "sunny"),
            "temperature": data["main"]["temp"],
            "humidity": data["main"]["humidity"],
            "wind_speed": data["wind"].get("speed", 0)
        }
        weather_cache[cache_key] = result
        logger.info(f"Weather retrieved: {result['condition']}, {result['temperature']}°C")
        return result
    except Exception as e:
        logger.warning(f"OpenWeatherMap API error: {e}")
        result = {"condition": "sunny", "temperature": 25, "humidity": 60, "wind_speed": 5}
        weather_cache[cache_key] = result
        return result

# Function to calculate traffic density based on Google duration and expected speed
def calculate_traffic_density(distance_km: float, google_duration: float) -> str:
    expected_speed = 15  # Adjusted for hyperlocal
    expected_duration = (distance_km / expected_speed) * 60
    if expected_duration == 0:
        return "low"
    delay_ratio = google_duration / expected_duration
    if delay_ratio < 1.2:
        return "low"
    elif delay_ratio < 1.5:
        return "medium"
    elif delay_ratio < 2.0:
        return "high"
    else:
        return "jam"


# Function to check if today is a festival day
def is_festival_day() -> bool:
    today = datetime.now().strftime("%Y-%m-%d")
    return today in FESTIVAL_DATES


# Function to predict ETA using ML model
def predict_eta_ml(
    request: ETARequest, weather: Dict[str, Any], traffic_density: str, distance_km: float,
    restaurant_lat: float, restaurant_lng: float, delivery_lat: float, delivery_lng: float
) -> tuple[float, float]:
    if model is None or preprocessor is None:
        base_time = distance_km * 3
        weather_factor = 1.3 if weather["condition"] in ["stormy", "fog"] else 1.0
        traffic_factor = {"low": 1.0, "medium": 1.2, "high": 1.4, "jam": 1.6}[traffic_density]
        festival_factor = 1.3 if is_festival_day() else 1.0
        vehicle_factor = {"bicycle": 1.3, "scooter": 1.1, "bike": 1.0}[request.vehicle_type.lower()]
        condition_factor = 1.0 + (3 - request.vehicle_condition) * 0.1
        age_factor = 1.0 + max(0, (request.delivery_person_age - 30)) * 0.01
        rating_factor = 1.0 - (request.delivery_person_rating - 3) * 0.05
        predicted_eta = base_time * weather_factor * traffic_factor * festival_factor * vehicle_factor * condition_factor * age_factor * rating_factor
        logger.info(f"Fallback ETA: {predicted_eta:.1f} minutes")
        return max(1, min(predicted_eta, 60)), 0.6  
    
    # Extract temporal features
    hour_of_day = 12  
    day_of_week = 2  
    if request.order_time:
        try:
            dt = datetime.fromisoformat(request.order_time.replace("Z", "+00:00"))
            hour_of_day = dt.hour
            day_of_week = dt.weekday()
        except ValueError:
            logger.warning(f"Invalid order_time format: {request.order_time}")
    
    try:
        input_data = pd.DataFrame({
            "Delivery_person_Age": [request.delivery_person_age],
            "Delivery_person_Ratings": [request.delivery_person_rating],
            "Weather_conditions": [weather["condition"]],
            "Road_traffic_density": [traffic_density],
            "Vehicle_condition": [request.vehicle_condition],
            "Type_of_vehicle": [request.vehicle_type.lower()],
            "multiple_deliveries": [request.multiple_deliveries],
            "Festival": ["yes" if is_festival_day() else "no"],
            "City_area": ["metropolitan"],
            "distance_km": [distance_km],
            "hour_of_day": [hour_of_day],
            "day_of_week": [day_of_week]
        })
        input_prepared = preprocessor.transform(input_data)
        prediction = model.predict(input_prepared)[0]
        confidence = 0.9 if abs(prediction - distance_km * 3) < 5 else 0.7
        logger.info(f"ML Predicted ETA: {prediction:.1f} minutes")
        return max(1, min(prediction, 60)), confidence  # Min 1 min, max 60 min
    except Exception as e:
        logger.error(f"ML prediction error: {e}")
        base_time = distance_km * 3
        logger.info(f"Fallback ETA (after ML error): {base_time:.1f} minutes")
        return max(1, min(base_time, 60)), 0.6

# FastAPI routes
@app.get("/")
async def root():
    return {"message": "DeliveryETA API is running", "status": "healthy"}


# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "preprocessor_loaded": preprocessor is not None,
        "timestamp": datetime.now().isoformat()
    }

# ETA endpoint 
@app.post("/predict-eta", response_model=ETAResponse)
async def predict_eta(request: ETARequest):
    try:
        # Geocode addresses
        restaurant_lat, restaurant_lng = geocode_address(request.restaurant_address)
        delivery_lat, delivery_lng = geocode_address(request.delivery_address)
        
        # Validate inputs
        if not (-90 <= restaurant_lat <= 90 and -180 <= restaurant_lng <= 180):
            raise HTTPException(status_code=400, detail="Invalid pickup coordinates")
        if not (-90 <= delivery_lat <= 90 and -180 <= delivery_lng <= 180):
            raise HTTPException(status_code=400, detail="Invalid delivery coordinates")
        if request.vehicle_condition not in [0, 1, 2, 3]:
            raise HTTPException(status_code=400, detail="Vehicle condition must be 0-3")
        if request.vehicle_type.lower() not in ["bicycle", "scooter", "bike"]:
            raise HTTPException(status_code=400, detail="Invalid vehicle type")
        if request.multiple_deliveries < 0:
            raise HTTPException(status_code=400, detail="Multiple deliveries must be non-negative")
        
        # Get directions
        directions = get_google_directions(restaurant_lat, restaurant_lng, delivery_lat, delivery_lng)
        if directions["distance_km"] > 20:
            raise HTTPException(status_code=400, detail="Distance exceeds hyperlocal limit (20 km)")
        
        # Get weather
        weather = get_weather_data((restaurant_lat + delivery_lat) / 2, (restaurant_lng + delivery_lng) / 2)
        
        # Calculate traffic density
        traffic_density = calculate_traffic_density(directions["distance_km"], directions["duration_minutes"])
        
        # Predict ETA
        predicted_eta, confidence = predict_eta_ml(
            request, weather, traffic_density, directions["distance_km"],
            restaurant_lat, restaurant_lng, delivery_lat, delivery_lng
        )
        
        # Adjust confidence
        eta_diff = abs(predicted_eta - directions["duration_minutes"])
        if directions["duration_minutes"] > 0:
            confidence = max(0.6, min(0.95, confidence - (eta_diff / (directions["distance_km"] * 6))))
        else:
            confidence = 0.6 # fallback when distance is zero
            
        # Prepare recommendations based on weather and traffic
        recommendations = []
        if weather["condition"] in ["stormy", "fog"]:
            recommendations.append("Consider delaying delivery due to adverse weather conditions.")
        if traffic_density in ["high", "jam"]:
            recommendations.append("Expect delays due to heavy traffic; consider alternative routes.")
        
        return ETAResponse(
            predicted_eta=predicted_eta,
            google_eta=directions["duration_minutes"],
            distance_km=round(directions["distance_km"], 2),
            weather={"condition": weather["condition"], "temperature": weather["temperature"]},
            traffic_density=traffic_density,
            is_festival=is_festival_day(),
            confidence=round(confidence, 2),
            route_polyline=directions["polyline"],
            restaurant_lat=restaurant_lat,
            restaurant_lng=restaurant_lng,
            delivery_lat=delivery_lat,
            delivery_lng=delivery_lng,
            recommendations=recommendations if recommendations else None
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error predicting ETA: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

if  __name__ == "__main__":
    import uvicorn
    uvicorn.run(app,host="0.0.0.0",port=8000)