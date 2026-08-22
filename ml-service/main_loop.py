"""
main_loop.py — the continuously running ML service.

Every 15 seconds:
1. Pulls GPS pings from Kafka
2. Snaps each ping to nearest stop
3. Clusters pings with DBSCAN
4. Computes ETA
5. Writes result to Redis

Run: python3 main_loop.py
Needs Postgres, Redis, and Kafka all running (docker-compose up -d)
"""
from consumer import get_consumer, consume_batch
from snap_to_route import snap_to_nearest_stop
from clustering import cluster_riders
from eta import HeuristicETA
from redis_cache import get_client, write_eta
from db import get_connection, get_stops_for_direction

DIRECTION_NAMES = {1: "UP (Hebbal → Silk Board)", 2: "DOWN (Silk Board → Hebbal)"}


def main():
    print("connecting to databases...")
    conn = get_connection()
    redis_client = get_client()
    estimator = HeuristicETA()

    # load stops for both directions once at startup
    stops = {
        1: get_stops_for_direction(conn, 1),
        2: get_stops_for_direction(conn, 2),
    }
    print(f"loaded {len(stops[1])} stops for UP, {len(stops[2])} stops for DOWN")

    consumer = get_consumer()
    print("waiting for pings from Kafka...")

    while True:
        pings = consume_batch(consumer)
        if not pings:
            print("no pings this cycle, waiting...")
            continue

        print(f"processing {len(pings)} pings...")

        # group pings by direction
        by_direction = {1: [], 2: []}
        for ping in pings:
            d = ping.get("direction_id")
            if d in by_direction:
                by_direction[d].append(ping)

        for direction_id, direction_pings in by_direction.items():
            if not direction_pings:
                continue

            direction_stops = stops[direction_id]

            # step 1: snap every ping to its nearest stop
            enriched = []
            for ping in direction_pings:
                stop, dist = snap_to_nearest_stop(ping["lat"], ping["lng"], direction_stops)
                enriched.append({
                    **ping,
                    "distance_along_route_m": stop["stop_order"] * 1000,
                    "nearest_stop": stop,
                })

            # step 2: cluster — find who is on the same bus
            labels = cluster_riders(enriched)

            # step 3: for each confirmed cluster, compute and cache ETA
            for ping, label in zip(enriched, labels):
                if label == -1:
                    continue  # not confidently on a bus

                current_order = ping["nearest_stop"]["stop_order"]
                next_order = min(current_order + 1, len(direction_stops))

                eta_sec = estimator.estimate(
                    current_stop_order=current_order,
                    target_stop_order=next_order,
                    segment_avg_seconds=180,
                    current_speed_mps=ping.get("speed_mps", 0),
                )

                write_eta(
                    redis_client,
                    direction_id=direction_id,
                    current_stop=ping["nearest_stop"]["stop_name"],
                    next_stop_eta_sec=eta_sec,
                    user_stop_eta_sec=eta_sec,
                    direction_name=DIRECTION_NAMES[direction_id],
                )


if __name__ == "__main__":
    main()
