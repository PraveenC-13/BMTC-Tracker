package main

import (
	"log"
	"net/http"
	"os"
)

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func main() {
	// connect to postgres
	db, err := NewDB(envOr("DATABASE_URL", ""))
	if err != nil {
		log.Fatal("postgres connection failed: ", err)
	}

	// connect to redis
	redisClient := NewRedisClient(envOr("REDIS_ADDR", "localhost:6379"))

	// connect to kafka
	producer := NewPingProducer(envOr("KAFKA_BROKER", "localhost:9092"))
	defer producer.Close()

	// wire everything into the server
	server := &Server{
		db:       db,
		redis:    redisClient,
		producer: producer,
	}

	port := envOr("PORT", "8080")
	log.Println("BMTC backend running on port " + port)
	log.Fatal(http.ListenAndServe(":"+port, server.routes()))
}
