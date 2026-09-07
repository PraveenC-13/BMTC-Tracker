import json
import os
from kafka import KafkaConsumer


def get_consumer():
    bootstrap_servers = os.getenv(
        "KAFKA_BROKER",
        "localhost:9092"
    )

    print(f"Connecting to Kafka at {bootstrap_servers}")

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