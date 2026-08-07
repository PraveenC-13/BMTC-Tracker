package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

type DB struct {
	conn *sql.DB
}

func NewDB(databaseURL string) (*DB, error) {
	if databaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is empty")
	}

	conn, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, err
	}

	if err := conn.Ping(); err != nil {
		return nil, err
	}

	log.Println("connected to postgres")
	return &DB{conn: conn}, nil
}

// RegisterDeviceIfNew inserts a new device UUID if not seen before.
// This is the privacy layer — we never store names or phone numbers.
func (d *DB) RegisterDeviceIfNew(deviceID string) error {
	_, err := d.conn.Exec(
		`INSERT INTO devices (device_id) VALUES ($1) ON CONFLICT (device_id) DO NOTHING`,
		deviceID,
	)
	return err
}

// InsertPing saves one GPS ping into location_pings table
func (d *DB) InsertPing(p LocationPing) error {
	_, err := d.conn.Exec(`
		INSERT INTO location_pings 
		(device_id, direction_id, from_stop_order, location, speed_mps, heading, recorded_at)
		VALUES ($1, $2, 0, ST_GeogFromText('SRID=4326;POINT(' || $4 || ' ' || $3 || ')'), $5, $6, $7)`,
		p.DeviceID, p.DirectionID, p.Lat, p.Lng, p.SpeedMps, p.Heading, p.Timestamp,
	)
	return err
}

// GetStopsForDirection returns all stops for a direction in order
func (d *DB) GetStopsForDirection(directionID int) ([]Stop, error) {
	rows, err := d.conn.Query(`
		SELECT stop_id, stop_name, stop_order,
		       ST_Y(location::geometry) AS lat,
		       ST_X(location::geometry) AS lng
		FROM stops
		WHERE direction_id = $1
		ORDER BY stop_order`,
		directionID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stops []Stop
	for rows.Next() {
		var s Stop
		if err := rows.Scan(&s.StopID, &s.StopName, &s.StopOrder, &s.Lat, &s.Lng); err != nil {
			return nil, err
		}
		stops = append(stops, s)
	}
	return stops, nil
}
