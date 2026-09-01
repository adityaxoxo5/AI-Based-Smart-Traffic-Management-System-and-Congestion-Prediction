import os
import json
import math
import requests
import numpy as np
from sklearn.cluster import DBSCAN

# In-memory cache for reverse geocoding to avoid rate-limits
_GEOCODE_CACHE = {}

def reverse_geocode_area_name(lat, lon):
    """Fetches real physical street, interchange, or district name from OSM/Nominatim."""
    cache_key = f"{round(lat, 3)}_{round(lon, 3)}"
    if cache_key in _GEOCODE_CACHE:
        return _GEOCODE_CACHE[cache_key]

    try:
        url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}&zoom=15"
        headers = {'User-Agent': 'SmartTrafficSystem/2.0 (student.project.traffic@gmail.com)'}
        response = requests.get(url, headers=headers, timeout=2.5)
        if response.status_code == 200:
            data = response.json()
            address = data.get('address', {})
            road = address.get('road') or address.get('suburb') or address.get('neighbourhood') or address.get('town') or address.get('city') or address.get('county')
            if road:
                formatted = f"{road} Junction" if not any(w in road.lower() for w in ['road', 'highway', 'expressway', 'avenue', 'street', 'corridor', 'junction']) else road
                _GEOCODE_CACHE[cache_key] = formatted
                return formatted
    except Exception:
        pass

    fallback = f"Corridor Sector ({round(lat, 2)}°N, {round(lon, 2)}°E)"
    _GEOCODE_CACHE[cache_key] = fallback
    return fallback

def generate_route_hotspots(start_lat=17.3850, start_lon=78.4867, dest_lat=17.4435, dest_lon=78.3772, route_coords=None):
    """
    Runs DBSCAN Unsupervised Density-Based Clustering on spatial incident coordinates.
    Clusters follow the actual winding road polyline / natural highway trajectory
    with realistic lateral dispersion, interchange bottlenecks, and intersection scatters.
    """
    # Deterministic yet route-unique seed
    seed = int(abs(start_lat * 1000 + dest_lon * 500 + (len(route_coords) if route_coords else 0))) % 99999
    rng = np.random.RandomState(seed)

    # 1. Determine base anchor points along the route
    if route_coords and len(route_coords) >= 6:
        # Sample points along the actual driving road polyline
        n_anchors = min(8, max(4, len(route_coords) // 15))
        indices = np.linspace(0, len(route_coords) - 1, n_anchors + 2, dtype=int)[1:-1]
        base_anchors = [route_coords[idx] for idx in indices]
    else:
        # Generate naturally curved corridor waypoints (sine/cosine lateral curvature)
        n_anchors = 6
        dx = dest_lat - start_lat
        dy = dest_lon - start_lon
        total_dist = math.sqrt(dx**2 + dy**2)
        
        # Perpendicular vector for realistic highway curve & interchange branching
        perp_lat = -dy / (total_dist + 1e-6)
        perp_lon = dx / (total_dist + 1e-6)
        
        base_anchors = []
        ratios = [0.15, 0.32, 0.48, 0.65, 0.80, 0.92]
        for idx, r in enumerate(ratios):
            # Curved road offset with varying lateral displacement
            curve = math.sin(r * math.pi) * (total_dist * 0.12)
            jitter = rng.uniform(-0.015, 0.015)
            anchor_lat = start_lat + r * dx + perp_lat * (curve + jitter)
            anchor_lon = start_lon + r * dy + perp_lon * (curve + jitter)
            base_anchors.append([anchor_lat, anchor_lon])

    dx = dest_lat - start_lat
    dy = dest_lon - start_lon
    total_dist = math.sqrt(dx**2 + dy**2)
    anchor_dist = max(0.01, total_dist / max(1, len(base_anchors)))
    eps_val = max(0.003, min(0.015, anchor_dist * 0.28))
    spatial_spread = eps_val * 0.45

    # 2. Synthesize multi-density incident point cloud around junctions / bottlenecks
    accidents = []
    for i, anchor in enumerate(base_anchors):
        num_incidents = rng.randint(18, 42)
        spread_lat = rng.uniform(spatial_spread * 0.7, spatial_spread * 1.3)
        spread_lon = rng.uniform(spatial_spread * 0.7, spatial_spread * 1.3)
        
        # 2D Gaussian spatial dispersion
        lats = rng.normal(anchor[0], spread_lat, num_incidents)
        lons = rng.normal(anchor[1], spread_lon, num_incidents)
        for la, lo in zip(lats, lons):
            accidents.append([la, lo])

    # Add background noise incidents across the bounding area
    all_lats = [a[0] for a in base_anchors]
    all_lons = [a[1] for a in base_anchors]
    min_lat, max_lat = min(all_lats), max(all_lats)
    min_lon, max_lon = min(all_lons), max(all_lons)
    
    n_noise = rng.randint(8, 18)
    for _ in range(n_noise):
        accidents.append([
            rng.uniform(min_lat - spatial_spread, max_lat + spatial_spread),
            rng.uniform(min_lon - spatial_spread, max_lon + spatial_spread)
        ])

    X_spatial = np.array(accidents)

    # 3. Fit DBSCAN Density-Based Spatial Clustering of Applications with Noise
    dbscan = DBSCAN(eps=eps_val, min_samples=6)
    labels = dbscan.fit_predict(X_spatial)

    clusters_output = []
    unique_labels = sorted(list(set(labels)))

    for cluster_id in unique_labels:
        if cluster_id == -1:
            # Skip unclustered outlier noise
            continue

        cluster_mask = (labels == cluster_id)
        cluster_points = X_spatial[cluster_mask]
        
        center_lat = round(float(np.mean(cluster_points[:, 0])), 5)
        center_lon = round(float(np.mean(cluster_points[:, 1])), 5)
        count = int(np.sum(cluster_mask))

        severity = 'Critical' if count >= 38 else ('High' if count >= 22 else 'Medium')
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
    print(f"Generated {len(res)} clusters:")
    print(json.dumps(res, indent=2))