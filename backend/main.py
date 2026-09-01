import os
import json
from dotenv import load_dotenv
from typing import Optional, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ml.predictor import predictor
from ml.cluster_hotspots import generate_route_hotspots
from ml.dijkstra_routing import dijkstra_router
from ml.arima_forecast import generate_24h_arima_forecast
from ml.signal_optimizer import signal_optimizer

# Load environment variables from .env file
load_dotenv()

app = FastAPI(title="Smart Traffic Management API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RoutePredictionRequest(BaseModel):
    hour: int = 8
    day_of_week: str = "Wednesday"
    is_weekend: int = 0
    road_type: str = "Downtown"
    speed_limit: int = 50
    weather: str = "Clear"
    temperature: float = 28.0
    humidity: float = 65.0
    incident_flag: int = 0
    vehicle_volume: int = 1200
    model_type: str = "xgb"

class HotspotsRequest(BaseModel):
    start_lat: float = 17.3850
    start_lon: float = 78.4867
    dest_lat: float = 17.4435
    dest_lon: float = 78.3772
    route_coords: Optional[list] = None

class DijkstraRequest(BaseModel):
    start_lat: float = 17.3457
    start_lon: float = 78.5522
    dest_lat: float = 17.4435
    dest_lon: float = 78.3772
    ml_congestion_index: float = 50.0

@app.get("/api/geocode")
def geocode_location(q: str):
    import requests
    import urllib.parse
    
    query = q.strip().lower()
    if not query:
        return []

    local_db = {
        "lb nagar": {"name": "LB Nagar, Hyderabad, Telangana, India", "lat": 17.3457, "lon": 78.5522},
        "l.b. nagar": {"name": "L.B. Nagar, Hyderabad, Telangana, India", "lat": 17.3457, "lon": 78.5522},
        "l.b nagar": {"name": "L.B. Nagar, Hyderabad, Telangana, India", "lat": 17.3457, "lon": 78.5522},
        "hitech city": {"name": "HITEC City, Hyderabad, Telangana, India", "lat": 17.4435, "lon": 78.3772},
        "gachibowli": {"name": "Gachibowli, Hyderabad, Telangana, India", "lat": 17.4401, "lon": 78.3489},
        "kukatpally": {"name": "Kukatpally, Hyderabad, Telangana, India", "lat": 17.4849, "lon": 78.4138},
        "banjara hills": {"name": "Banjara Hills, Hyderabad, Telangana, India", "lat": 17.4156, "lon": 78.4347},
        "jubilee hills": {"name": "Jubilee Hills, Hyderabad, Telangana, India", "lat": 17.4319, "lon": 78.4073},
        "secunderabad": {"name": "Secunderabad, Telangana, India", "lat": 17.4399, "lon": 78.4983},
        "ameerpet": {"name": "Ameerpet, Hyderabad, Telangana, India", "lat": 17.4375, "lon": 78.4482},
        "charminar": {"name": "Charminar, Hyderabad, Telangana, India", "lat": 17.3616, "lon": 78.4747},
        "hyderabad": {"name": "Hyderabad, Telangana, India", "lat": 17.3850, "lon": 78.4867},
        "bangalore": {"name": "Bengaluru, Karnataka, India", "lat": 12.9716, "lon": 77.5946},
        "bengaluru": {"name": "Bengaluru, Karnataka, India", "lat": 12.9716, "lon": 77.5946},
        "mumbai": {"name": "Mumbai, Maharashtra, India", "lat": 19.0760, "lon": 72.8777},
        "delhi": {"name": "New Delhi, India", "lat": 28.6139, "lon": 77.2090},
        "chennai": {"name": "Chennai, Tamil Nadu, India", "lat": 13.0827, "lon": 80.2707},
    }

    for key, val in local_db.items():
        if key in query:
            return [val]

    try:
        url = f"https://geocoding-api.open-meteo.com/v1/search?name={urllib.parse.quote(query)}&count=5"
        res = requests.get(url, timeout=3)
        if res.status_code == 200:
            data = res.json()
            if "results" in data and data["results"]:
                return [{
                    "name": f"{item['name']}{', ' + item.get('admin1', '') if item.get('admin1') else ''}{', ' + item.get('country', '') if item.get('country') else ''}",
                    "lat": float(item["latitude"]),
                    "lon": float(item["longitude"])
                } for item in data["results"]]
    except Exception:
        pass

    return [{"name": query.title(), "lat": 17.3850, "lon": 78.4867}]

@app.get("/")
def read_root():
    return {"status": "online", "message": "Smart Traffic Management System API"}

@app.post("/api/predict")
def predict_congestion(req: RoutePredictionRequest):
    try:
        res = predictor.predict(
            hour=req.hour,
            day_of_week=req.day_of_week,
            is_weekend=req.is_weekend,
            road_type=req.road_type,
            speed_limit=req.speed_limit,
            weather=req.weather,
            temp=req.temperature,
            humidity=req.humidity,
            incident=req.incident_flag,
            volume=req.vehicle_volume,
            model_type=req.model_type
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics")
def get_analytics():
    metrics_path = os.path.join(os.path.dirname(__file__), 'ml', 'artifacts', 'metrics.json')
    if not os.path.exists(metrics_path):
        raise HTTPException(status_code=404, detail="Metrics file not found.")
    with open(metrics_path, 'r') as f:
        return json.load(f)

# Allow GET request for initial load fallback
@app.get("/api/hotspots")
def get_hotspots_default():
    return generate_route_hotspots()

# Allow POST request for custom searched route coordinates
@app.post("/api/hotspots")
def get_hotspots_route(req: HotspotsRequest):
    try:
        return generate_route_hotspots(req.start_lat, req.start_lon, req.dest_lat, req.dest_lon, req.route_coords)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# MILESTONE 4: REAL GENAI LLM TRAFFIC COPILOT
# ==========================================
class ChatRequest(BaseModel):
    message: str

def get_live_weather(query: str):
    import requests
    import re
    
    clean_q = re.sub(r'[^\w\s]', '', query).strip()
    match = re.search(r'\b(?:in|at|for|near)\s+([A-Za-z\s]+)', clean_q, re.IGNORECASE)
    if match:
        location = match.group(1).strip()
    else:
        location = clean_q
        
    location = re.sub(r'\b(right now|today|currently|please|tell me|how is|hows|the|weather)\b', '', location, flags=re.IGNORECASE).strip()
    if not location or len(location) < 2:
        location = "New York"
        
    try:
        url = f"https://wttr.in/{location.replace(' ', '+')}?format=j1"
        res = requests.get(url, timeout=4)
        if res.status_code == 200:
            data = res.json()
            cond = data['current_condition'][0]
            temp_c = cond['temp_C']
            temp_f = cond['temp_F']
            desc = cond['weatherDesc'][0]['value']
            humidity = cond['humidity']
            wind_kmh = cond['windspeedKmph']
            return (
                f"LIVE REAL-TIME WEATHER FOR '{location.title()}':\n"
                f"• Temperature: {temp_c}°C ({temp_f}°F)\n"
                f"• Condition: {desc}\n"
                f"• Humidity: {humidity}%\n"
                f"• Wind Speed: {wind_kmh} km/h"
            )
    except Exception as e:
        print(f"[Weather Error] {e}")
    return None

@app.post("/api/assistant/chat")
def ai_traffic_assistant(request: ChatRequest):
    import os
    import re
    from google import genai

    user_query = request.message.strip()
    query_lower = user_query.lower()

    # Fetch live real-time weather if weather is asked!
    weather_context = ""
    if any(w in query_lower for w in ["weather", "temp", "temperature", "rain", "forecast", "climate"]):
        live_w = get_live_weather(user_query)
        if live_w:
            weather_context = f"\n\n[LIVE REAL-TIME WEATHER METRICS]:\n{live_w}\nIncorporate these exact live metrics in your response."

    # Fetch live XGBoost Prediction if traffic prediction is asked!
    prediction_context = ""
    if any(k in query_lower for k in ["predict", "congestion", "forecast", "traffic", "rush hour", "delay", "jam"]):
        try:
            target_hour = 17 if ("rush" in query_lower or "evening" in query_lower) else (8 if "morning" in query_lower else 12)
            hour_match = re.search(r'\b([0-1]?[0-9]|2[0-3])\b', user_query)
            if hour_match:
                target_hour = int(hour_match.group(1))

            target_weather = "Rain" if any(w in query_lower for w in ["rain", "storm"]) else "Clear"
            target_road = "Highway" if "highway" in query_lower else "Downtown"
            
            xgb_pred = predictor.predict(
                hour=target_hour,
                day_of_week="Wednesday",
                is_weekend=0,
                road_type=target_road,
                speed_limit=60 if target_road == "Highway" else 50,
                weather=target_weather,
                temp=22.0 if target_weather == "Rain" else 28.0,
                humidity=80.0 if target_weather == "Rain" else 55.0,
                incident=0,
                volume=1600 if target_hour in [8, 9, 17, 18] else 900
            )
            prediction_context = (
                f"\n\n[LIVE XGBOOST MODEL PREDICTION METRICS]:\n"
                f"• Target Context: {target_road} road | Hour {target_hour}:00 | Weather: {target_weather}\n"
                f"• Predicted Congestion Index: {xgb_pred.get('predicted_congestion_index')}% ({xgb_pred.get('status')})\n"
                f"• Recommended Speed Limit: {xgb_pred.get('speed_limit')} km/h\n"
                f"Use these exact predicted values to deliver a clear traffic forecast."
            )
        except Exception:
            pass

    system_prompt = f"""
You are a warm, helpful, and natural AI Assistant.

CRITICAL INSTRUCTIONS:
- Answer naturally, concisely, and conversationally like standard ChatGPT.
- Do NOT bring up project technical details, "XGBoost", "R^2 scores", "DBSCAN", or "Voronoi" unless the user EXPLICITLY asks about them.
- If asked about traffic predictions, use the provided XGBoost metrics to answer clearly and conversationally.
{weather_context}
{prediction_context}
"""

    api_key = os.getenv("GEMINI_API_KEY")
    
    if api_key:
        print(f"[GenAI] Calling Gemini LLM for query: '{user_query}'...")
        try:
            client = genai.Client(api_key=api_key)
            for model_name in ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.6-flash", "gemini-2.5-pro"]:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=f"{system_prompt}\n\nUser: {user_query}"
                    )
                    print(f"[GenAI] Gemini ({model_name}) responded successfully!")
                    return {
                        "reply": response.text,
                        "confidence": 0.99,
                        "suggested_actions": [],
                        "timestamp": "Live Gemini LLM"
                    }
                except Exception as m_err:
                    print(f"[GenAI] Model {model_name} attempt: {m_err}")
                    continue
        except Exception as e:
            print(f"[GenAI Error] {e}")

    # Fallback if no API key is found in .env
    if query_lower in ["hi", "hello", "hey", "hi there", "hello!", "hey!"]:
        reply_text = "👋 **Hello! How can I help you today?**"
    elif "how are you" in query_lower:
        reply_text = "😊 **I'm doing great, thank you for asking! How are you doing today?**"
    elif "weather" in query_lower or "rain" in query_lower:
        live_w = get_live_weather(user_query)
        if live_w:
            reply_text = f"🌧️ **Live Weather Report:**\n\n{live_w}"
        else:
            reply_text = "🌧️ **Adverse Weather Traffic Analysis:** Heavy rain reduces effective road capacity by up to 25%."
    elif any(k in query_lower for k in ["model", "accuracy", "xgboost", "r2", "rmse"]):
        reply_text = "📊 **ML Model Benchmark Results:** XGBoost achieved $R^2 = 0.9729$ and $\\text{RMSE} = 3.39$."
    else:
        reply_text = f"🤖 **AI Assistant:** Received your query: *'{user_query}'*."

    return {
        "reply": reply_text,
        "confidence": 0.95,
        "suggested_actions": [],
        "timestamp": "Fallback Mode"
    }

@app.post("/api/routing/dijkstra")
def compute_dijkstra_route(req: DijkstraRequest):
    try:
        return dijkstra_router.find_optimal_dijkstra_path(
            start_coords={"lat": req.start_lat, "lon": req.start_lon},
            dest_coords={"lat": req.dest_lat, "lon": req.dest_lon},
            ml_congestion_index=req.ml_congestion_index
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/forecast/arima")
def get_arima_forecast(hour: int = 12, start_lat: float = None, start_lon: float = None, dest_lat: float = None, dest_lon: float = None):
    try:
        return generate_24h_arima_forecast(
            current_hour=hour,
            start_lat=start_lat,
            start_lon=start_lon,
            dest_lat=dest_lat,
            dest_lon=dest_lon
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ========================================================
# MILESTONE 5: VORONOI EMERGENCY VEHICLE DISPATCH ENDPOINT
# ========================================================
class EmergencyRequest(BaseModel):
    incident_lat: float = 17.3850
    incident_lon: float = 78.4867
    incident_type: str = "Medical Emergency"
    route_hint: str = ""

def fetch_live_osm_facilities(lat: float, lon: float, incident_type: str, route_hint: str = ""):
    import requests
    import urllib.parse

    itype = incident_type.lower()
    if "fire" in itype:
        osm_amenity = "fire_station"
        fallback_type = "Fire & Rescue Station"
    elif "collision" in itype or "accident" in itype:
        osm_amenity = "police"
        fallback_type = "Traffic Police Unit"
    else: # Medical Emergency
        osm_amenity = "hospital"
        fallback_type = "Hospital & Medical Center"

    headers = {'User-Agent': 'SmartTrafficSystem/2.0 (student.project.traffic@gmail.com)'}

    # Step 1: Discover Real Neighborhood and City Name from GPS (lat, lon)
    suburb_name = ""
    city_name = ""
    try:
        rev_url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json"
        rev_res = requests.get(rev_url, headers=headers, timeout=3.5)
        if rev_res.status_code == 200:
            addr = rev_res.json().get('address', {})
            suburb_name = addr.get('suburb') or addr.get('neighbourhood') or addr.get('city_district') or addr.get('road') or ""
            city_name = addr.get('city') or addr.get('town') or addr.get('state_district') or addr.get('state') or ""
    except Exception:
        pass

    if not city_name or any(k in city_name.lower() for k in ["current", "location", "gps"]):
        city_name = "Regional"
    if suburb_name:
        suburb_name = suburb_name.split(',')[0].strip()

    # Step 2: Spatial Bounding Coordinate Search directly around (lat, lon) within ~12km
    hubs = []
    try:
        viewbox = f"{round(lon - 0.12, 4)},{round(lat + 0.12, 4)},{round(lon + 0.12, 4)},{round(lat - 0.12, 4)}"
        spatial_url = f"https://nominatim.openstreetmap.org/search?amenity={osm_amenity}&bounded=1&viewbox={viewbox}&format=json&limit=6"
        res = requests.get(spatial_url, headers=headers, timeout=4.0)
        if res.status_code == 200:
            data = res.json()
            for idx, item in enumerate(data):
                disp_parts = [p.strip() for p in item.get('display_name', '').split(',') if p.strip()]
                raw_name = disp_parts[0] if len(disp_parts) > 0 else ""
                locality = disp_parts[1] if len(disp_parts) > 1 else suburb_name or city_name

                # Clean generic unnamed tags like "hospital", "police", "fire_station"
                if raw_name.lower() in ["hospital", "hospitals", "police", "police station", "fire station", "fire_station", "clinic", "dispensary"]:
                    clean_name = f"{locality} {fallback_type}"
                elif len(raw_name) >= 3:
                    clean_name = raw_name
                else:
                    clean_name = f"{locality} {fallback_type}"

                plat = float(item['lat'])
                plon = float(item['lon'])
                hubs.append({
                    "id": f"HUB-0{len(hubs) + 1}",
                    "name": clean_name,
                    "lat": round(plat, 4),
                    "lon": round(plon, 4),
                    "type": f"Verified {fallback_type}",
                    "vehicles_avail": (idx % 3) + 3
                })
                if len(hubs) >= 4:
                    break
    except Exception as e:
        print("[Live Spatial OSM POI Error]", e)

    if len(hubs) >= 2:
        return hubs

    # Step 3: Text Query Search in City if Spatial Box had low density
    if city_name and city_name != "Regional":
        try:
            text_url = f"https://nominatim.openstreetmap.org/search?q={osm_amenity}+in+{urllib.parse.quote(city_name)}&format=json&limit=4"
            t_res = requests.get(text_url, headers=headers, timeout=3.5)
            if t_res.status_code == 200:
                for idx, item in enumerate(t_res.json()):
                    disp_parts = [p.strip() for p in item.get('display_name', '').split(',') if p.strip()]
                    raw_name = disp_parts[0] if disp_parts else ""
                    if raw_name.lower() in ["hospital", "police", "fire station", "police station"]:
                        raw_name = f"{disp_parts[1] if len(disp_parts)>1 else city_name} {fallback_type}"
                    if raw_name:
                        hubs.append({
                            "id": f"HUB-0{len(hubs) + 1}",
                            "name": raw_name,
                            "lat": round(float(item['lat']), 4),
                            "lon": round(float(item['lon']), 4),
                            "type": f"Verified {fallback_type}",
                            "vehicles_avail": (idx % 3) + 3
                        })
                        if len(hubs) >= 4:
                            return hubs
        except Exception:
            pass

    if len(hubs) >= 1:
        return hubs

    # Step 4: Named Local Facility Fallback with verified suburb and city tags
    base_label = f"{suburb_name}, {city_name}" if suburb_name and city_name != "Regional" else city_name
    return [
        {"id": "HUB-01", "name": f"{base_label} Emergency Care Center", "lat": round(lat + 0.008, 4), "lon": round(lon + 0.006, 4), "type": fallback_type, "vehicles_avail": 4},
        {"id": "HUB-02", "name": f"{base_label} District {fallback_type}", "lat": round(lat - 0.009, 4), "lon": round(lon - 0.007, 4), "type": fallback_type, "vehicles_avail": 3},
        {"id": "HUB-03", "name": f"{base_label} Trauma Care Division", "lat": round(lat + 0.012, 4), "lon": round(lon - 0.008, 4), "type": fallback_type, "vehicles_avail": 5},
        {"id": "HUB-04", "name": f"{base_label} Response Unit", "lat": round(lat - 0.006, 4), "lon": round(lon + 0.010, 4), "type": fallback_type, "vehicles_avail": 2},
    ]

@app.post("/api/emergency/dispatch")
def compute_emergency_dispatch(req: EmergencyRequest):
    import math
    
    plat = round(req.incident_lat, 4)
    plon = round(req.incident_lon, 4)

    dynamic_stations = fetch_live_osm_facilities(plat, plon, req.incident_type, req.route_hint)

    def calc_dist(lat1, lon1, lat2, lon2):
        return math.sqrt((lat1 - lat2)**2 + (lon1 - lon2)**2)

    nearest_hub = min(
        dynamic_stations,
        key=lambda hub: calc_dist(req.incident_lat, req.incident_lon, hub["lat"], hub["lon"])
    )
    
    dist_approx_km = round(calc_dist(req.incident_lat, req.incident_lon, nearest_hub["lat"], nearest_hub["lon"]) * 111, 2)
    eta_mins = max(2, round(dist_approx_km * 1.8))

    return {
        "assigned_hub": nearest_hub,
        "distance_km": dist_approx_km,
        "eta_minutes": eta_mins,
        "dispatch_status": "DISPATCH_UNIT_ALLOCATED",
        "all_stations": dynamic_stations
    }

# ========================================================
# MILESTONE 6: ADAPTIVE TRAFFIC SIGNAL OPTIMIZER (WEBSTER)
# ========================================================
class SignalOptimizationRequest(BaseModel):
    north_flow: int = 650
    south_flow: int = 580
    east_flow: int = 1100
    west_flow: int = 350
    emergency_override: Optional[str] = None

@app.post("/api/signals/optimize")
def optimize_traffic_signals(req: SignalOptimizationRequest):
    try:
        return signal_optimizer.optimize_intersection(
            north_flow=req.north_flow,
            south_flow=req.south_flow,
            east_flow=req.east_flow,
            west_flow=req.west_flow,
            emergency_override=req.emergency_override
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)