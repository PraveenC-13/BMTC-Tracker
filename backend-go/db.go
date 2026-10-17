package main

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/lib/pq"
)

type DB struct {
	conn *sql.DB
}

func NewDB(host, port, user, password, dbname string) (*DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		host, port, user, password, dbname,
	)

	conn, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, err
	}

	// Connection Pool Optimization
	conn.SetMaxOpenConns(25)
	conn.SetMaxIdleConns(10)
	conn.SetConnMaxLifetime(5 * time.Minute)

	if err := conn.Ping(); err != nil {
		return nil, err
	}

	log.Println("Successfully connected to PostgreSQL DB")
	return &DB{conn: conn}, nil
}

func (d *DB) RegisterDeviceIfNew(deviceID string) error {
	query := `
		INSERT INTO devices (device_id) 
		VALUES ($1) 
		ON CONFLICT (device_id) DO NOTHING`

	_, err := d.conn.Exec(query, deviceID)
	return err
}

// InsertPing saves one GPS ping safely into location_pings table using ST_MakePoint.
func (d *DB) InsertPing(p LocationPing) error {
	query := `
		INSERT INTO location_pings 
		(device_id, direction_id, from_stop_order, location, speed_mps, heading, recorded_at)
		VALUES (
			$1, 
			$2, 
			$3, 
			ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography, 
			$6, 
			$7, 
			$8
		)`

	_, err := d.conn.Exec(
		query,
		p.DeviceID,
		p.DirectionID,
		p.FromStopOrder,
		p.Lng, // ST_MakePoint takes (Longitude, Latitude)
		p.Lat,
		p.SpeedMps,
		p.Heading,
		p.Timestamp,
	)

	return err
}

// GetStopsForDirection returns all stops for a direction in sequential order.
func (d *DB) GetStopsForDirection(directionID int) ([]Stop, error) {
	query := `
		SELECT stop_id, stop_name, stop_order,
		       ST_Y(location::geometry) AS lat,
		       ST_X(location::geometry) AS lng
		FROM stops
		WHERE direction_id = $1
		ORDER BY stop_order ASC`

	rows, err := d.conn.Query(query, directionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stops []Stop

	for rows.Next() {
		var s Stop

		if err := rows.Scan(
			&s.StopID,
			&s.StopName,
			&s.StopOrder,
			&s.Lat,
			&s.Lng,
		); err != nil {
			return nil, err
		}

		stops = append(stops, s)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return stops, nil
}
