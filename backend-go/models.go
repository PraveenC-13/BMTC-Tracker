package main

import "time"

// LocationPing represents a real-time GPS telemetry payload sent by a device or simulation.
type LocationPing struct {
	DeviceID      string    `json:"device_id"`
	DirectionID   int       `json:"direction_id"`
	FromStopOrder int       `json:"from_stop_order"`
	Lat           float64   `json:"lat"`
	Lng           float64   `json:"lng"`
	SpeedMps      float64   `json:"speed_mps"`
	Heading       float64   `json:"heading"`
	Timestamp     time.Time `json:"timestamp"`
}

// IsValid validates coordinate boundaries, velocity limits, and system identifiers.
func (p LocationPing) IsValid() bool {
	// Geofence check: Bengaluru bounding box (~12.7°N to 13.2°N, 77.4°E to 77.8°E)
	if p.Lat < 12.7 || p.Lat > 13.2 {
		return false
	}
	if p.Lng < 77.4 || p.Lng > 77.8 {
		return false
	}
	// Speed sanity check (0 to 60 m/s ~ 216 km/h max)
	if p.SpeedMps < 0 || p.SpeedMps > 60 {
		return false
	}
	// Direction ID validation (must be positive valid database ID)
	if p.DirectionID <= 0 {
		return false
	}
	return true
}

// ETA represents an estimated time of arrival calculation for a specific bus stop.
type ETA struct {
	StopName    string `json:"stop_name"`
	DirectionID int    `json:"direction_id"`
	ETAMinutes  int    `json:"eta_minutes"`
}

// IsValid checks whether the ETA attributes conform to domain constraints.
func (e *ETA) IsValid() bool {
	if e.StopName == "" {
		return false
	}
	if e.DirectionID <= 0 {
		return false
	}
	if e.ETAMinutes < 0 {
		return false
	}
	return true
}

// ETAResponse represents the payload returned by the public GET /eta endpoint.
type ETAResponse struct {
	CurrentStop    string  `json:"current_stop"`
	NextStopETASec float64 `json:"next_stop_eta_sec"`
	UserStopETASec float64 `json:"user_stop_eta_sec"`
	Direction      string  `json:"direction"`
}

// Stop represents a transit stop entity retrieved from PostgreSQL.
type Stop struct {
	StopID    int     `json:"stop_id"`
	StopName  string  `json:"stop_name"`
	StopOrder int     `json:"stop_order"`
	Lat       float64 `json:"lat"`
	Lng       float64 `json:"lng"`
}
