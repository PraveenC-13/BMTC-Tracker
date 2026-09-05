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
Addr: addr,
})

return &RedisClient{client: rdb}
}

// GetETA matches have (context.Context, int) in handlers.go:85
func (r *RedisClient) GetETA(ctx context.Context, directionID int) (string, error) {
key := fmt.Sprintf("eta:direction:%d", directionID)
return r.client.Get(ctx, key).Result()
}

func (r *RedisClient) SetETA(ctx context.Context, directionID int, val interface{}, expiration time.Duration) error {
key := fmt.Sprintf("eta:direction:%d", directionID)
data, err := json.Marshal(val)
if err != nil {
return err
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
