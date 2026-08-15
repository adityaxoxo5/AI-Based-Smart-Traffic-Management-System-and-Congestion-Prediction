import math
import heapq
import numpy as np

class MLWeightedDijkstraRouter:
    def __init__(self):
        pass

    def _haversine_dist(self, lat1, lon1, lat2, lon2):
        R = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    def find_optimal_dijkstra_path(self, start_coords, dest_coords, ml_congestion_index=50.0):
        """
        Executes Dijkstra Priority Queue Search dynamically between any two coordinates.
        Graph nodes are generated along a curved arc between start and destination,
        producing a realistic non-straight path on the map.
        """
        if not start_coords or not dest_coords:
            start_coords = {"lat": 17.3457, "lon": 78.5522}
            dest_coords = {"lat": 17.4435, "lon": 78.3772}

        s_lat, s_lon = start_coords['lat'], start_coords['lon']
        d_lat, d_lon = dest_coords['lat'], dest_coords['lon']

        # Total route distance to scale curvature
        total_km = self._haversine_dist(s_lat, s_lon, d_lat, d_lon)
        
        # Scale curvature proportionally to route distance
        # Short routes (10km) -> small curves, Long routes (500km) -> big curves
        curve_scale = min(max(total_km * 0.003, 0.005), 1.5)

        # Generate graph nodes along a curved arc
        num_nodes = 10
        dyn_nodes = {}
        
        # Perpendicular direction for curving away from the straight line
        dx = d_lat - s_lat
        dy = d_lon - s_lon
        # Perpendicular vector (rotated 90 degrees)
        perp_lat = -dy
        perp_lon = dx
        # Normalize perpendicular
        perp_len = math.sqrt(perp_lat**2 + perp_lon**2)
        if perp_len > 0:
            perp_lat /= perp_len
            perp_lon /= perp_len

        rng = np.random.RandomState(int(abs(s_lat * 100 + d_lon * 100)) % 9999)

        for i in range(num_nodes):
            t = i / (num_nodes - 1)

            if i == 0 or i == num_nodes - 1:
                # Start and end nodes are exact coordinates
                offset_lat = 0
                offset_lon = 0
            else:
                # Smooth arc using sine curve + random jitter for realistic path
                arc_offset = math.sin(t * math.pi) * curve_scale
                jitter = rng.uniform(-0.15, 0.15) * curve_scale
                offset_lat = perp_lat * (arc_offset + jitter)
                offset_lon = perp_lon * (arc_offset + jitter)

            n_lat = s_lat + t * (d_lat - s_lat) + offset_lat
            n_lon = s_lon + t * (d_lon - s_lon) + offset_lon

            dyn_nodes[f"N{i+1}"] = {
                "name": f"Waypoint {i+1}",
                "lat": round(float(n_lat), 4),
                "lon": round(float(n_lon), 4)
            }

        # Build dynamic sequential edges
        dyn_edges = []
        for i in range(num_nodes - 1):
            u, v = f"N{i+1}", f"N{i+2}"
            dist = self._haversine_dist(dyn_nodes[u]['lat'], dyn_nodes[u]['lon'], dyn_nodes[v]['lat'], dyn_nodes[v]['lon'])
            dyn_edges.append((u, v, dist))

        # Adjacency list with congestion-weighted edges
        graph = {n: [] for n in dyn_nodes}
        for u, v, dist in dyn_edges:
            congestion_factor = 1.0 + (ml_congestion_index / 50.0) ** 1.5
            weight = dist * congestion_factor
            graph[u].append((v, weight, dist))
            graph[v].append((u, weight, dist))

        # Dijkstra algorithm
        distances = {n: float('inf') for n in dyn_nodes}
        distances["N1"] = 0
        previous = {n: None for n in dyn_nodes}
        pq = [(0, "N1")]

        while pq:
            curr_dist, current = heapq.heappop(pq)
            if current == f"N{num_nodes}":
                break
            if curr_dist > distances[current]:
                continue
            for neighbor, weight, orig_dist in graph[current]:
                distance = curr_dist + weight
                if distance < distances[neighbor]:
                    distances[neighbor] = distance
                    previous[neighbor] = current
                    heapq.heappush(pq, (distance, neighbor))

        # Reconstruct path
        path = []
        curr = f"N{num_nodes}"
        while curr:
            path.append(curr)
            curr = previous[curr]
        path.reverse()

        path_coords = [[dyn_nodes[n]['lat'], dyn_nodes[n]['lon']] for n in path]

        return {
            "algorithm": "Dijkstra Graph Path",
            "start_node": dyn_nodes["N1"]['name'],
            "dest_node": dyn_nodes[f"N{num_nodes}"]['name'],
            "path_nodes": [dyn_nodes[n]['name'] for n in path],
            "total_distance_km": round(total_km, 1),
            "weighted_cost": round(distances[f"N{num_nodes}"], 2),
            "coordinates": path_coords
        }

dijkstra_router = MLWeightedDijkstraRouter()
