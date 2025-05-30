## Fetch Weather_script
import requests

def get_weather_status(lat, lon, api_key):
    url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={api_key}"
    
    try:
        response = requests.get(url)
        response.raise_for_status() 
        data = response.json()
        
        weather_main = data['weather'][0]['main']
        wind_speed = data['wind']['speed']
        humidity = data['main']['humidity']

        # Custom Conditions
        if weather_main == 'Clear':
            condition = 'Sunny'
        elif weather_main == 'Rain':
            condition = 'Stormy'
        elif wind_speed > 10:
            condition = 'Sandstorms'
        elif 7 <= wind_speed <= 10:
            condition = 'Windy'
        elif humidity > 90:
            condition = 'Fog'
        else:
            condition = 'Cloudy'
        
        print(f"Location: {data.get('name', 'Unknown')}, Country: {data['sys']['country']}")
        print(f"Weather Description: {data['weather'][0]['description']}")
        print(f"Temperature (K): {data['main']['temp']}")
        print(f"Humidity: {humidity}%")
        print(f"Wind Speed: {wind_speed} m/s")
        print(f"Custom Condition: {condition}")
        
        return condition

    except requests.RequestException as e:
        print(f"Error fetching weather data: {e}")
        return None

# Example usage
if __name__ == "__main__":
   
    latitude = 42.7952
    longitude = 105.0324
    api_key = "d291444e97e56fde4c386a80f8b925d4"

    get_weather_status(latitude, longitude, api_key)
