package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
)

type Server struct {
	db       *DB
	redis    *RedisClient
	producer *PingProducer
}

func writeJSON(w http.ResponseWriter, status int, body interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*") // allow website frontend to call this API
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(body)
}

// HandlePing — receives GPS ping from phone or website
// Validates it, then publishes to Kafka in a goroutine so the
// response is instant regardless of Kafka speed
func (s *Server) HandlePing(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "use POST"})
		return
	}

	var ping LocationPing
	if err := json.NewDecoder(r.Body).Decode(&ping); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "malformed json"})
		return
	}
	if !ping.IsValid() {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "ping out of expected bounds"})
		return
	}

	// goroutine: returns instantly to phone, Kafka publish happens in background
	go func() {
		ctx := context.Background()
		if err := s.db.RegisterDeviceIfNew(ping.DeviceID); err != nil {
			log.Println("register device failed:", err)
		}
		if err := s.db.InsertPing(ping); err != nil {
			log.Println("insert ping failed:", err)
		}
		if err := s.producer.Publish(ctx, ping); err != nil {
			log.Println("kafka publish failed:", err)
		}
	}()

	writeJSON(w, http.StatusOK, map[string]string{"status": "accepted"})
}

// HandleGetETA — phone/website asks for current ETA
// Only reads from Redis — never touches Kafka or Python directly
func (s *Server) HandleGetETA(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.WriteHeader(http.StatusOK)
		return
	}

	// URL pattern: /eta?direction_id=1
	dirStr := r.URL.Query().Get("direction_id")
	dirID, err := strconv.Atoi(dirStr)
	if err != nil || (dirID != 1 && dirID != 2) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "direction_id must be 1 or 2"})
		return
	}

	eta, err := s.redis.GetETA(r.Context(), dirID)
	if err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{
			"error": "no active riders on this route right now",
		})
		return
	}
	writeJSON(w, http.StatusOK, eta)
}

// HandleGetStops — returns ordered stop list for a direction
// Website and app use this to build the stop timeline UI
func (s *Server) HandleGetStops(w http.ResponseWriter, r *http.Request) {
	dirStr := r.URL.Query().Get("direction_id")
	dirID, err := strconv.Atoi(dirStr)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "direction_id required"})
		return
	}

	stops, err := s.db.GetStopsForDirection(dirID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not fetch stops"})
		return
	}
	writeJSON(w, http.StatusOK, stops)
}

// HandleHealth — simple health check so you know the server is alive
func (s *Server) HandleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) routes() *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("/ping", s.HandlePing)
	mux.HandleFunc("/eta", s.HandleGetETA)
	mux.HandleFunc("/stops", s.HandleGetStops)
	mux.HandleFunc("/health", s.HandleHealth)
	// serve the website frontend from the frontend folder
	mux.Handle("/", http.FileServer(http.Dir("../frontend")))
	return mux
}

func getEnv(key, fallback string) string {
	// reads environment variable, returns fallback if not set
	val := strings.TrimSpace(key)
	if val == "" {
		return fallback
	}
	return fallback
}
