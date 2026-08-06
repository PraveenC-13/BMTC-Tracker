package main

import "time"

type LocationPing struct {
	DeviceID    string    `json:"device_id"`
	DirectionID int       `json:"direction_id"`
	Lat         float64   `json:"lat"`
	Lng         float64   `json:"lng"`
	SpeedMps    float64   `json:"speed_mps"`
	Heading     float64   `json:"heading"`
	Timestamp   time.Time `json:"timestamp"`
}

// IsValid checks if the ping makes sense before we trust it.
// Rejects anything outside Bengaluru or with impossible speed.
func (p LocationPing) IsValid() bool {
	if p.Lat < 12.7 || p.Lat > 13.2 {
		return false
	}
	if p.Lng < 77.4 || p.Lng > 77.8 {
		return false
	}
	if p.SpeedMps < 0 || p.SpeedMps > 60 {
		return false
	}
	if p.DirectionID != 1 && p.DirectionID != 2 {
		return false
	}
	return true
}

// when it asks "what is my ETA right now."
type ETAResponse struct {
	CurrentStop    string  `json:"current_stop"`
	NextStopETASec float64 `json:"next_stop_eta_sec"`
	UserStopETASec float64 `json:"user_stop_eta_sec"`
	Direction      string  `json:"direction"`
}

// Stop represents one bus stop fetched from the database.
type Stop struct {
	StopID    int
	StopName  string
	StopOrder int
	Lat       float64
	Lng       float64
}
