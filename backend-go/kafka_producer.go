package main

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/segmentio/kafka-go"
)

type PingProducer struct {
	writer *kafka.Writer
}

func NewPingProducer(brokerAddr string) *PingProducer {
	return &PingProducer{
		writer: &kafka.Writer{
			Addr:     kafka.TCP(brokerAddr),
			Topic:    "location-pings",
			Balancer: &kafka.Hash{},
		},
	}
}

// Publish sends one ping to the Kafka topic.
// The key is direction_id so all pings for the same direction
// always land on the same partition — keeping order consistent.
func (p *PingProducer) Publish(ctx context.Context, ping LocationPing) error {
	body, err := json.Marshal(ping)
	if err != nil {
		return err
	}
	return p.writer.WriteMessages(ctx, kafka.Message{
		Key:   []byte(fmt.Sprintf("%d", ping.DirectionID)),
		Value: body,
	})
}

func (p *PingProducer) Close() error {
	return p.writer.Close()
}
