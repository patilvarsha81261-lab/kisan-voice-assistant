"""MCP Server for Real-Time Weather Forecasts using Open-Meteo API."""

import logging
from typing import Any, Dict, List
import httpx
from mcp.server.fastmcp import FastMCP

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("mcp_servers.weather")

# Initialize FastMCP Server
mcp = FastMCP("weather_server")

# Known Indian Agricultural Districts & Coordinates
KNOWN_LOCATIONS = {
    "kolhapur": {"lat": 16.7050, "lon": 74.2433, "name": "Kolhapur, Maharashtra"},
    "pune": {"lat": 18.5204, "lon": 73.8567, "name": "Pune, Maharashtra"},
    "sangli": {"lat": 16.8524, "lon": 74.5815, "name": "Sangli, Maharashtra"},
    "satara": {"lat": 17.6805, "lon": 74.0183, "name": "Satara, Maharashtra"},
    "solapur": {"lat": 17.6599, "lon": 75.9064, "name": "Solapur, Maharashtra"},
    "nashik": {"lat": 19.9975, "lon": 73.7898, "name": "Nashik, Maharashtra"},
    "nagpur": {"lat": 21.1458, "lon": 79.0882, "name": "Nagpur, Maharashtra"},
    "aurangabad": {"lat": 19.8762, "lon": 75.3433, "name": "Chhatrapati Sambhajinagar, Maharashtra"},
    "ahmednagar": {"lat": 19.0948, "lon": 74.7480, "name": "Ahilyanagar, Maharashtra"},
    "akola": {"lat": 20.7002, "lon": 77.0082, "name": "Akola, Maharashtra"},
    "amravati": {"lat": 20.9320, "lon": 77.7523, "name": "Amravati, Maharashtra"},
    "latur": {"lat": 18.4088, "lon": 76.5604, "name": "Latur, Maharashtra"},
}


async def geocode_location(location: str) -> Dict[str, Any]:
    """Find latitude and longitude for any place in India via Open-Meteo Geocoding API."""
    norm = location.strip().lower().replace("district", "").replace("city", "").strip()
    if norm in KNOWN_LOCATIONS:
        return KNOWN_LOCATIONS[norm]

    # Geocoding API lookup
    url = "https://geocoding-api.open-meteo.com/v1/search"
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            resp = await client.get(url, params={"name": location, "count": 1, "language": "en", "format": "json"})
            if resp.status_code == 200:
                data = resp.json()
                if "results" in data and len(data["results"]) > 0:
                    first = data["results"][0]
                    return {
                        "lat": first["latitude"],
                        "lon": first["longitude"],
                        "name": f"{first['name']}, {first.get('admin1', 'India')}",
                    }
        except Exception as e:
            logger.warning(f"Geocoding failed for {location}: {e}")

    # Fallback to Kolhapur if lookup fails
    return KNOWN_LOCATIONS["kolhapur"]


@mcp.tool()
async def get_weather_forecast(location: str, days: int = 3) -> Dict[str, Any]:
    """Fetch daily weather forecast including temperature, precipitation probability, and wind speed.

    Args:
        location: City or district name in India (e.g. 'Kolhapur', 'Pune', 'Sangli').
        days: Forecast horizon in days (1 to 7, default 3).

    Returns:
        Structured forecast dictionary with daily temperatures, rain chance, and wind.
    """
    days = max(1, min(days, 7))
    coords = await geocode_location(location)

    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": coords["lat"],
        "longitude": coords["lon"],
        "daily": [
            "temperature_2m_max",
            "temperature_2m_min",
            "precipitation_probability_max",
            "precipitation_sum",
            "wind_speed_10m_max",
        ],
        "timezone": "Asia/Kolkata",
        "forecast_days": days,
    }

    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        logger.error(f"Weather API error for {location}: {e}")
        return {
            "success": False,
            "error": f"Failed to retrieve weather for {location}: {str(e)}",
            "location": location,
        }

    daily = data.get("daily", {})
    forecast_days: List[Dict[str, Any]] = []

    for i in range(len(daily.get("time", []))):
        rain_prob = daily["precipitation_probability_max"][i]
        rain_sum = daily["precipitation_sum"][i]
        t_max = daily["temperature_2m_max"][i]
        t_min = daily["temperature_2m_min"][i]
        wind = daily["wind_speed_10m_max"][i]

        condition = "Dry / Clear"
        if rain_prob > 50 or rain_sum > 2.0:
            condition = "High chance of rain"
        elif rain_prob > 25:
            condition = "Light scattered showers possible"

        forecast_days.append({
            "date": daily["time"][i],
            "max_temperature_c": t_max,
            "min_temperature_c": t_min,
            "precipitation_probability_pct": rain_prob,
            "rainfall_mm": rain_sum,
            "wind_speed_kmh": wind,
            "condition": condition,
        })

    return {
        "success": True,
        "location": coords["name"],
        "forecast": forecast_days,
    }


if __name__ == "__main__":
    mcp.run()
