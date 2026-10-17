package main

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/segmentio/kafka-go"
)

type PingProducer struct {
	writer *kafka.Writer
}

func NewPingProducer(brokerAddr string) *PingProducer {
	return &PingProducer{
		writer: &kafka.Writer{
			Addr:         kafka.TCP(brokerAddr),
			Topic:        "location-pings",
			Balancer:     &kafka.Hash{},
			BatchSize:    100,
			BatchTimeout: 10 * time.Millisecond,
			Async:        false, // Synchronous writes ensure error feedback in server logs
		},
	}
}

// Publish sends one ping to the Kafka topic.
// Key format: "directionID:deviceID" ensures strict per-vehicle ordering while
// distributing load across all partitions.
func (p *PingProducer) Publish(ctx context.Context, ping LocationPing) error {
	body, err := json.Marshal(ping)
	if err != nil {
		return fmt.Errorf("kafka marshal error: %w", err)
	}

	key := fmt.Sprintf("%d:%s", ping.DirectionID, ping.DeviceID)

	err = p.writer.WriteMessages(ctx, kafka.Message{
		Key:   []byte(key),
		Value: body,
		Time:  ping.Timestamp,
	})
	if err != nil {
		return fmt.Errorf("kafka write message error: %w", err)
	}

	return nil
}

func (p *PingProducer) Close() error {
	if p.writer != nil {
		return p.writer.Close()
	}
	return nil
}
