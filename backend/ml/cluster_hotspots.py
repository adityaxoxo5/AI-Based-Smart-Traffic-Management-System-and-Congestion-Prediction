import os
import json
import requests
import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN

def reverse_geocode_area_name(lat, lon):
    """Fetches real physical street/highway name from OpenStreetMap."""
    try:
        url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}&zoom=14"
        headers = {'User-Agent': 'SmartTrafficSystem/1.0'}
        response = requests.get(url, headers=headers, timeout=3)
        if response.status_code == 200:
            data = response.json()
            address = data.get('address', {})
            road = address.get('road') or address.get('suburb') or address.get('city') or address.get('county')
            if road:
                return f"{road} Corridor"
    except Exception:
        pass
    return f"Highway Sector [{round(lat, 2)}°, {round(lon, 2)}°]"

def generate_route_hotspots(start_lat=51.5074, start_lon=-0.1278, dest_lat=48.8566, dest_lon=2.3522):
    """
    Generates 6-7 spatial accident clusters along the specific route trajectory
    and runs DBSCAN to identify hazard zones with real area names.
    """
    np.random.seed(42)
    
    # 6 Waypoints along driving corridor
    ratios = [0.15, 0.30, 0.45, 0.60, 0.75, 0.88]
    waypoints = [
        (start_lat * (1 - r) + dest_lat * r, start_lon * (1 - r) + dest_lon * r)
        for r in ratios
    ]
    
    accidents = []
    for waypt in waypoints:
        num_pt = np.random.randint(25, 40)
        lats = np.random.normal(waypt[0], 0.015, num_pt)
        lons = np.random.normal(waypt[1], 0.015, num_pt)
        for lat, lon in zip(lats, lons):
            accidents.append([lat, lon])
            
    X_spatial = np.array(accidents)
    
    dbscan = DBSCAN(eps=0.025, min_samples=5)
    labels = dbscan.fit_predict(X_spatial)
    
    clusters_output = []
    unique_labels = set(labels)
    
    for cluster_id in unique_labels:
        if cluster_id == -1:
            continue
            
        cluster_mask = (labels == cluster_id)
        cluster_points = X_spatial[cluster_mask]
        
        center_lat = round(float(np.mean(cluster_points[:, 0])), 5)
        center_lon = round(float(np.mean(cluster_points[:, 1])), 5)
        count = int(np.sum(cluster_mask))
        
        severity = 'Critical' if count > 35 else ('High' if count > 20 else 'Medium')
        area_name = reverse_geocode_area_name(center_lat, center_lon)
        
        clusters_output.append({
            'cluster_id': f'DBSCAN-{cluster_id + 1:02d}',
            'area_name': area_name,
            'center_lat': center_lat,
            'center_lon': center_lon,
            'incident_count': count,
            'risk_level': severity
        })
        
    return clusters_output

if __name__ == '__main__':
    res = generate_route_hotspots()
    print("✅ Generated Route-Specific Hotspots:")
    print(json.dumps(res, indent=2))