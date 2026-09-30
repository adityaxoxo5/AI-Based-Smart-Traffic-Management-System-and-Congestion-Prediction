import json
import math
import requests
import numpy as np
from sklearn.cluster import DBSCAN

# In-memory cache for reverse geocoding
_GEOCODE_CACHE = {}


def reverse_geocode_area_name(lat, lon):
    """Fetch a real area or road name from OpenStreetMap."""
    cache_key = f"{round(lat, 3)}_{round(lon, 3)}"

    if cache_key in _GEOCODE_CACHE:
        return _GEOCODE_CACHE[cache_key]

    try:
        url = (
            "https://nominatim.openstreetmap.org/reverse"
            f"?format=json&lat={lat}&lon={lon}&zoom=15"
        )

        headers = {
            "User-Agent": "SmartTrafficSystem/2.0"
        }

        response = requests.get(
            url,
            headers=headers,
            timeout=5
        )

        if response.status_code == 200:
            data = response.json()
            address = data.get("address", {})

            road = (
                address.get("road")
                or address.get("suburb")
                or address.get("neighbourhood")
                or address.get("town")
                or address.get("city")
                or address.get("county")
            )

            if road:
                _GEOCODE_CACHE[cache_key] = road
                return road

    except requests.RequestException:
        pass

    fallback = (
        f"Area near {round(lat, 4)}, "
        f"{round(lon, 4)}"
    )

    _GEOCODE_CACHE[cache_key] = fallback
    return fallback


def generate_route_hotspots(
    start_lat=17.3850,
    start_lon=78.4867,
    dest_lat=17.4435,
    dest_lon=78.3772,
    route_coords=None
):
    """
    Apply DBSCAN to spatial points generated along a route.

    Note: These points are synthetic. This function does not
    identify real-world accident hotspots without incident data.
    """

    seed = int(
        abs(
            start_lat * 1000
            + dest_lon * 500
            + (len(route_coords) if route_coords else 0)
        )
    ) % 99999

    rng = np.random.RandomState(seed)

    # 1. Determine anchor points along the route
    if route_coords and len(route_coords) >= 6:

        n_anchors = min(
            8,
            max(4, len(route_coords) // 15)
        )

        indices = np.linspace(
            0,
            len(route_coords) - 1,
            n_anchors + 2,
            dtype=int
        )[1:-1]

        base_anchors = [
            route_coords[idx]
            for idx in indices
        ]

    else:
        n_anchors = 6

        dx = dest_lat - start_lat
        dy = dest_lon - start_lon

        total_dist = math.sqrt(dx**2 + dy**2)

        perp_lat = -dy / (total_dist + 1e-6)
        perp_lon = dx / (total_dist + 1e-6)

        base_anchors = []

        ratios = [
            0.15, 0.32, 0.48,
            0.65, 0.80, 0.92
        ]

        for r in ratios:
            curve = (
                math.sin(r * math.pi)
                * total_dist * 0.12
            )

            jitter = rng.uniform(-0.015, 0.015)

            anchor_lat = (
                start_lat
                + r * dx
                + perp_lat * (curve + jitter)
            )

            anchor_lon = (
                start_lon
                + r * dy
                + perp_lon * (curve + jitter)
            )

            base_anchors.append([
                anchor_lat,
                anchor_lon
            ])

    # 2. Configure DBSCAN
    dx = dest_lat - start_lat
    dy = dest_lon - start_lon

    total_dist = math.sqrt(dx**2 + dy**2)

    anchor_dist = max(
        0.01,
        total_dist / max(1, len(base_anchors))
    )

    eps_val = max(
        0.003,
        min(0.015, anchor_dist * 0.28)
    )

    spatial_spread = eps_val * 0.45

    # 3. Generate spatial points
    # The number of points is no longer fixed at 20 per anchor.
    # Point counts vary, but remain synthetic.
    spatial_points = []

    for anchor in base_anchors:

        num_points = rng.randint(8, 25)

        spread_lat = rng.uniform(
            spatial_spread * 0.7,
            spatial_spread * 1.3
        )

        spread_lon = rng.uniform(
            spatial_spread * 0.7,
            spatial_spread * 1.3
        )

        lats = rng.normal(
            anchor[0],
            spread_lat,
            num_points
        )

        lons = rng.normal(
            anchor[1],
            spread_lon,
            num_points
        )

        for lat, lon in zip(lats, lons):
            spatial_points.append([lat, lon])

    # 4. Add background spatial noise
    all_lats = [p[0] for p in base_anchors]
    all_lons = [p[1] for p in base_anchors]

    min_lat, max_lat = min(all_lats), max(all_lats)
    min_lon, max_lon = min(all_lons), max(all_lons)

    noise_count = rng.randint(5, 15)

    for _ in range(noise_count):
        spatial_points.append([
            rng.uniform(
                min_lat - spatial_spread,
                max_lat + spatial_spread
            ),
            rng.uniform(
                min_lon - spatial_spread,
                max_lon + spatial_spread
            )
        ])

    X_spatial = np.array(spatial_points)

    # 5. Run DBSCAN
    dbscan = DBSCAN(
        eps=eps_val,
        min_samples=6
    )

    labels = dbscan.fit_predict(X_spatial)

    clusters_output = []

    for cluster_id in sorted(set(labels)):

        # Ignore noise points
        if cluster_id == -1:
            continue

        cluster_mask = labels == cluster_id
        cluster_points = X_spatial[cluster_mask]

        center_lat = round(
            float(np.mean(cluster_points[:, 0])),
            5
        )

        center_lon = round(
            float(np.mean(cluster_points[:, 1])),
            5
        )

        area_name = reverse_geocode_area_name(
            center_lat,
            center_lon
        )

        clusters_output.append({
            "cluster_id": f"DBSCAN-{cluster_id + 1:02d}",
            "area_name": area_name,
            "center_lat": center_lat,
            "center_lon": center_lon,
            "point_count": int(len(cluster_points))
        })

    return clusters_output


if __name__ == "__main__":
    result = generate_route_hotspots()

    print(f"Generated {len(result)} spatial clusters:")
    print(json.dumps(result, indent=2))