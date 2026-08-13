import json
import redis

def get_client(host="localhost", port=6379):
    print(f"Connecting to Redis at {host}:{port}")
    client = redis.Redis(host=host, port=port, decode_responses=True)
    print("Redis PING:", client.ping())
    return client


def write_eta(client, direction_id, current_stop, next_stop_eta_sec,
              user_stop_eta_sec, direction_name, ttl_seconds=30):
    payload = {
        "current_stop": current_stop,
        "next_stop_eta_sec": next_stop_eta_sec,
        "user_stop_eta_sec": user_stop_eta_sec,
        "direction": direction_name,
    }

    key = f"eta:{direction_id}"

    client.set(key, json.dumps(payload), ex=ttl_seconds)

    print(f"wrote Redis {key}: {current_stop}, ETA {next_stop_eta_sec:.0f}s")