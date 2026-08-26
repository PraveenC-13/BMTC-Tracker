"""
synthetic_rider.py — simulates real riders for testing clustering.

Run this when you want to test the full pipeline without real users.
It sends fake GPS pings through the Go API exactly like a real phone would.

Usage: python3 synthetic_rider.py
Needs Go backend running on localhost:8080.
"""
import time
import uuid
import threading
import requests

# Real 500D stops (UP direction, Hebbal to Silk Board)
STOPS_UP = [
    {"lat": 13.042196, "lng": 77.593906},  # Hebbala Bridge
    {"lat": 13.043922, "lng": 77.600525},  # Kempapura
    {"lat": 13.042224, "lng": 77.613195},  # Veerannapalya
    {"lat": 13.041148, "lng": 77.618729},  # Manyatha Tech Park
    {"lat": 13.040149, "lng": 77.624649},  # Nagawara Junction
]

API_URL = "http://localhost:8080/ping"


def play_back_route(stops, direction_id, speed_mps=8.0, offset_sec=0):
    device_id = str(uuid.uuid4())
    time.sleep(offset_sec)
    for stop in stops:
        payload = {
            "device_id": device_id,
            "direction_id": direction_id,
            "lat": stop["lat"],
            "lng": stop["lng"],
            "speed_mps": speed_mps,
            "heading": 90.0,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        try:
            resp = requests.post(API_URL, json=payload, timeout=5)
            print(f"[{device_id[:8]}] sent ping → {resp.status_code}")
        except requests.exceptions.ConnectionError:
            print(f"Cannot reach {API_URL} — is the Go server running?")
            return
        time.sleep(12)


if __name__ == "__main__":
    print("Starting 2 synthetic riders on UP direction...")
    riders = [
        threading.Thread(target=play_back_route, args=(STOPS_UP, 1), kwargs={"offset_sec": 0}),
        threading.Thread(target=play_back_route, args=(STOPS_UP, 1), kwargs={"offset_sec": 3}),
    ]
    for t in riders:
        t.start()
    for t in riders:
        t.join()
    print("Done.")
