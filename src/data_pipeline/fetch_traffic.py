import requests
import json
from datetime import datetime, timezone, timedelta

def trafficflow(source_lat,source_long,dest_lat,dest_long,api_key):

        departure_time = (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()
        URL = f'https://routes.googleapis.com/directions/v2:computeRoutes?key={api_key}'

        payload = {
            "origin": {
                "location": {
                    "latLng": {
                        "latitude": source_lat,
                        "longitude": source_long
                    }
                }
            },
            "destination": {
                "location": {
                    "latLng": {
                        "latitude": dest_lat,
                        "longitude": dest_long
                    }
                }
            },
            "routingPreference": "TRAFFIC_AWARE",
            "travelMode": "DRIVE",
            "departureTime": departure_time
        }
        
        headers = {
            "Content-Type": "application/json",
            "X-Goog-FieldMask": "routes.duration,routes.staticDuration"
        }
        
        response = requests.post(URL, headers=headers, data=json.dumps(payload))
        get = json.dumps(response.json(), indent=2)
        res = json.loads(get)
    
        
        route = res["routes"][0]
        duration_seconds = int(route["duration"].replace("s", ""))
        static_duration_seconds = int(route["staticDuration"].replace("s", ""))
    
        duration_min = duration_seconds//60
        static_duration_min = static_duration_seconds//60
    
        Road_traffic_density = ""
        ratio = duration_min/static_duration_min
    
        if ratio <= 1 :
          Road_traffic_density = "low"
        elif 1 < ratio <= 1.4 :
          Road_traffic_density = "moderate"
        elif 1.4 < ratio <= 1.6 :
          Road_traffic_density = "high"
        else:
          Road_traffic_density = "jam"
        
        return Road_traffic_density

    
