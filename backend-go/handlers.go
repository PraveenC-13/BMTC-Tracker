package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"
)

type Server struct {
	db       *DB
	redis    *RedisClient
	producer *PingProducer
}

func writeJSON(w http.ResponseWriter, status int, body interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(body); err != nil {
		log.Printf("writeJSON encoding error: %v", err)
	}
}

// HandlePing receives GPS pings from mobile clients or synthetic generators
func (s *Server) HandlePing(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "use POST"})
		return
	}

	var ping LocationPing
	if err := json.NewDecoder(r.Body).Decode(&ping); err != nil {
		log.Printf("Malformed ping JSON payload: %v", err)
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "malformed json"})
		return
	}

	// Validate geographic bounds, velocity, and IDs
	if !ping.IsValid() {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "ping out of expected bounds"})
		return
	}

	log.Printf("Received ping from device: %s [Lat: %.6f, Lng: %.6f]", ping.DeviceID, ping.Lat, ping.Lng)

	// Process asynchronously to maintain low response latency for clients
	go func(p LocationPing) {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("Recovered panic in background ping worker: %v", r)
			}
		}()

		ctx := context.Background()

		if s.db != nil {
			if err := s.db.RegisterDeviceIfNew(p.DeviceID); err != nil {
				log.Printf("Failed to register device %s: %v", p.DeviceID, err)
			}
			if err := s.db.InsertPing(p); err != nil {
				log.Printf("Failed to save ping for device %s: %v", p.DeviceID, err)
			}
		}

		if s.producer != nil {
			if err := s.producer.Publish(ctx, p); err != nil {
				log.Printf("Failed to publish ping to Kafka for device %s: %v", p.DeviceID, err)
			}
		}
	}(ping)

	writeJSON(w, http.StatusOK, map[string]string{"status": "accepted"})
}

// HandleGetETA retrieves real-time bus predictions from Redis
func (s *Server) HandleGetETA(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "use GET"})
		return
	}

	dirStr := r.URL.Query().Get("direction_id")
	dirID, err := strconv.Atoi(dirStr)
	if err != nil || dirID <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "valid positive direction_id is required"})
		return
	}

	stopName := r.URL.Query().Get("stop_name")
	if stopName == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "stop_name query parameter is required"})
		return
	}

	eta, err := s.redis.GetETA(r.Context(), dirID, stopName)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{
			"error": "no active riders on this route right now",
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(eta))
}

// HandleGetStops returns sequential stop data for a route direction
func (s *Server) HandleGetStops(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "use GET"})
		return
	}

	dirStr := r.URL.Query().Get("direction_id")
	dirID, err := strconv.Atoi(dirStr)
	if err != nil || dirID <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "valid positive direction_id required"})
		return
	}

	stops, err := s.db.GetStopsForDirection(dirID)
	if err != nil {
		log.Printf("Error querying stops for direction %d: %v", dirID, err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not fetch stops"})
		return
	}

	writeJSON(w, http.StatusOK, stops)
}

// HandleHealth provides a service health check probe
func (s *Server) HandleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/ping", s.HandlePing)
	mux.HandleFunc("/eta", s.HandleGetETA)
	mux.HandleFunc("/stops", s.HandleGetStops)
	mux.HandleFunc("/health", s.HandleHealth)

	frontendDir := os.Getenv("FRONTEND_DIR")
	if frontendDir == "" {
		frontendDir = "/frontend"
	}
	mux.Handle("/", http.FileServer(http.Dir(frontendDir)))

	return enableCORS(mux)
}

// enableCORS handles HTTP preflight checks and cross-origin resource access
func enableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
