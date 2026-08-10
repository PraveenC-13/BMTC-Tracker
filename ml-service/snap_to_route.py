"""
snap_to_route.py — finds which stop a GPS ping is nearest to.
This is the most important function in the whole ML pipeline.
Raw lat/lng means nothing. Stop order is what drives ETA.
"""
from geopy.distance import geodesic


def snap_to_nearest_stop(ping_lat, ping_lng, stops):
    """
    stops: list of dicts with stop_order, lat, lng, stop_name
    Returns (nearest_stop_dict, distance_in_metres)
    """
    best_stop = None
    best_distance = float("inf")
    for stop in stops:
        dist = geodesic((ping_lat, ping_lng), (stop["lat"], stop["lng"])).meters
        if dist < best_distance:
            best_distance = dist
            best_stop = stop
    return best_stop, best_distance


if __name__ == "__main__":
    fake_stops = [
        {"stop_order": 1, "lat": 13.042196, "lng": 77.593906, "stop_name": "Hebbala Bridge"},
        {"stop_order": 2, "lat": 13.043922, "lng": 77.600525, "stop_name": "Kempapura"},
        {"stop_order": 3, "lat": 13.042224, "lng": 77.613195, "stop_name": "Veerannapalya"},
    ]
    stop, dist = snap_to_nearest_stop(13.042, 77.613, fake_stops)
    print(f"Nearest: {stop['stop_name']} ({dist:.1f}m away)")
    assert stop["stop_name"] == "Veerannapalya"
    print("self-test passed")
