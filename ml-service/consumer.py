"""
consumer.py — reads GPS pings from Kafka every 15 seconds.
Needs a real Kafka broker running (docker-compose.yml).
"""
from kafka import KafkaConsumer
import json


def get_consumer(bootstrap_servers="localhost:9092"):
    return KafkaConsumer(
        "location-pings",
        bootstrap_servers=bootstrap_servers,
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
        group_id="eta-processor",
        auto_offset_reset="latest",
    )


def consume_batch(consumer, timeout_ms=15000):
    records = consumer.poll(timeout_ms=timeout_ms)
    pings = []
    for _tp, messages in records.items():
        for msg in messages:
            pings.append(msg.value)
    return pings
