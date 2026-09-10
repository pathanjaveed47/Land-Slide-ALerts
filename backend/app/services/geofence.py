"""
Spatial Haversine Geofencing and Dynamic Hazard Polygon Generator.
"""

import math
from typing import List, Tuple, Dict, Any

EARTH_RADIUS_KM = 6371.0


def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes great-circle distance between two GPS coordinates using Haversine formula.
    Returns distance in kilometers.
    """
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    return round(EARTH_RADIUS_KM * c, 2)


def is_within_geofence(user_lat: float, user_lon: float, center_lat: float, center_lon: float, radius_km: float = 25.0) -> bool:
    """Checks if user coordinates fall within radius of hazard center."""
    return calculate_haversine_distance(user_lat, user_lon, center_lat, center_lon) <= radius_km


def generate_hazard_polygon(center_lat: float, center_lon: float, radius_km: float = 8.0, vertices: int = 8) -> List[List[float]]:
    """
    Generates an n-vertex dynamic danger polygon around hazard center point.
    Returns list of [latitude, longitude] pairs for Leaflet L.polygon.
    """
    coords = []
    # Semi-stochastic organic deformation for realistic slope contour
    radii_factors = [1.0, 1.15, 0.90, 1.25, 0.95, 1.10, 0.85, 1.20]

    for i in range(vertices):
        angle = (2.0 * math.pi / vertices) * i
        factor = radii_factors[i % len(radii_factors)]
        effective_r = radius_km * factor

        # Offset in degrees
        d_lat = (effective_r / EARTH_RADIUS_KM) * (180.0 / math.pi)
        d_lon = (effective_r / (EARTH_RADIUS_KM * math.cos(math.radians(center_lat)))) * (180.0 / math.pi)

        p_lat = round(center_lat + (d_lat * math.sin(angle)), 5)
        p_lon = round(center_lon + (d_lon * math.cos(angle)), 5)
        coords.append([p_lat, p_lon])

    # Close polygon
    if coords:
        coords.append(coords[0])

    return coords
