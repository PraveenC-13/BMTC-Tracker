package main

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

type RedisClient struct {
	client *redis.Client
}

func NewRedisClient(addr string) *RedisClient {
	if addr == "" {
		addr = "localhost:6379"
	}

	rdb := redis.NewClient(&redis.Options{
		Addr:         addr,
		DialTimeout:  5 * time.Second,
		ReadTimeout:  3 * time.Second,
		WriteTimeout: 3 * time.Second,
		PoolSize:     20,
	})

	return &RedisClient{client: rdb}
}

// GetETA retrieves cached ETA calculations for a given direction and bus stop name
func (r *RedisClient) GetETA(ctx context.Context, directionID int, stopName string) (string, error) {
	key := fmt.Sprintf("eta:direction:%d:%s", directionID, stopName)
	return r.client.Get(ctx, key).Result()
}

// SetETA caches calculated ETA details using a matching key structure
func (r *RedisClient) SetETA(ctx context.Context, directionID int, stopName string, val interface{}, expiration time.Duration) error {
	key := fmt.Sprintf("eta:direction:%d:%s", directionID, stopName)

	var data []byte
	var err error

	switch v := val.(type) {
	case string:
		data = []byte(v)
	case []byte:
		data = v
	default:
		data, err = json.Marshal(val)
		if err != nil {
			return fmt.Errorf("redis set eta marshal error: %w", err)
		}
	}

	return r.client.Set(ctx, key, data, expiration).Err()
}

func (r *RedisClient) Get(ctx context.Context, key string) (string, error) {
	return r.client.Get(ctx, key).Result()
}

func (r *RedisClient) Set(ctx context.Context, key string, val interface{}, expiration time.Duration) error {
	return r.client.Set(ctx, key, val, expiration).Err()
}

func (r *RedisClient) Ping(ctx context.Context) error {
	return r.client.Ping(ctx).Err()
}

func (r *RedisClient) Close() error {
	if r.client != nil {
		return r.client.Close()
	}
	return nil
}
