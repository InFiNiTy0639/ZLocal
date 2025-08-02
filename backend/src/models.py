from sqlalchemy import Column, Integer, Float, String, DateTime, Boolean
from sqlalchemy.sql import func
from .database import Base

class DeliveryETA(Base):
    __tablename__ = "delivery_eta"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_address = Column(String)
    delivery_address = Column(String)
    delivery_person_age = Column(Integer)
    delivery_person_rating = Column(Float)
    vehicle_type = Column(String)
    vehicle_condition = Column(Integer)
    multiple_deliveries = Column(Integer)
    order_time = Column(DateTime, nullable=True)
    predicted_eta = Column(Float)
    google_eta = Column(Float)
    distance_km = Column(Float)
    weather_condition = Column(String)
    weather_temperature = Column(Float)
    traffic_density = Column(String)
    is_festival = Column(Boolean)
    confidence = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())