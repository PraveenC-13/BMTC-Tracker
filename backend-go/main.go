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

	// PostgreSQL configuration
	dbHost := envOr("DB_HOST", "localhost")
	dbPort := envOr("DB_PORT", "5432")
	dbUser := envOr("DB_USER", "bmtc")
	dbPassword := envOr("DB_PASSWORD", "bmtc")
	dbName := envOr("DB_NAME", "bmtc")

	db, err := NewDB(
		dbHost,
		dbPort,
		dbUser,
		dbPassword,
		dbName,
	)
	if err != nil {
		log.Fatal("postgres connection failed: ", err)
	}
	defer db.conn.Close()

	// Redis
	redisAddr := envOr("REDIS_ADDR", "localhost:6379")
	redisClient := NewRedisClient(redisAddr)

	// Kafka
	kafkaBroker := envOr("KAFKA_BROKER", "localhost:9092")
	producer := NewPingProducer(kafkaBroker)
	defer producer.Close()

	server := &Server{
		db:       db,
		redis:    redisClient,
		producer: producer,
	}

	port := envOr("PORT", "8080")

	log.Println("BMTC backend running on port " + port)

	log.Fatal(
		http.ListenAndServe(":"+port, server.routes()),
	)
}
