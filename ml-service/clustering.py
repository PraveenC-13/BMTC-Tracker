"""
clustering.py — groups passengers moving together into bus clusters.

Why DBSCAN and not K-Means:
- K-Means needs you to say upfront how many buses are running. We don't know.
- DBSCAN finds however many groups exist naturally.
- DBSCAN labels lone outliers as -1 (noise) — car drivers, stationary people.
  K-Means would force them into a cluster incorrectly.
"""
from sklearn.cluster import DBSCAN
import numpy as np


def cluster_riders(pings, eps=150, min_samples=1):
    """
    pings: list of dicts with distance_along_route_m, speed_mps, heading
    Returns numpy array of labels. -1 means not on a bus.
    """
    if not pings:
        return np.array([])

    features = np.array([
        [p["distance_along_route_m"], p["speed_mps"], p["heading"]]
        for p in pings
    ])
    clustering = DBSCAN(eps=eps, min_samples=min_samples).fit(features)
    return clustering.labels_


if __name__ == "__main__":
    fake_pings = [
        {"distance_along_route_m": 1000, "speed_mps": 8.0, "heading": 90},
        {"distance_along_route_m": 1050, "speed_mps": 8.2, "heading": 91},
        {"distance_along_route_m": 9000, "speed_mps": 0.0, "heading": 0},
    ]
    labels = cluster_riders(fake_pings)
    print("labels:", labels)
    assert labels[0] == labels[1]
    assert labels[2] == -1
    print("self-test passed")
