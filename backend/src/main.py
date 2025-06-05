from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from math import radians, sin, cos, sqrt, asin
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
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
    allow_origins=["http://localhost:3000"],
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

geocode_cache = TTLCache(maxsize=1000, ttl=3600)  # Cache for 1 hour
directions_cache = TTLCache(maxsize=1000, ttl=3600)
weather_cache = TTLCache(maxsize=1000, ttl=3600)

try:
    model = joblib.load("model/xgb_model.pkl")
    preprocessor = joblib.load("model/preprocessor.pkl")
    logger.info("Model and preprocessor loaded successfully")
except Exception as e:
    logger.warning(f"ML model not found:{e}")
    model = None
    preprocessor = None
    