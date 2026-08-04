CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE routes (
    route_id        SERIAL PRIMARY KEY,
    route_number    TEXT NOT NULL UNIQUE,
    source          TEXT,
    destination     TEXT,
    path            GEOGRAPHY(LINESTRING,4326)
);

CREATE TABLE routes_direction (
    direction_id        SERIAL PRIMARY KEY,
    route_id            INT NOT NULL REFERENCES routes(route_id) ON DELETE CASCADE,
    direction           VARCHAR(10) NOT NULL CHECK (direction IN ('UP','DOWN')),
    source              TEXT NOT NULL,
    destination         TEXT NOT NULL,
    UNIQUE (route_id, direction)
);

CREATE TABLE stops (
    stop_id         SERIAL PRIMARY KEY,
    direction_id    INT NOT NULL REFERENCES routes_direction(direction_id) ON DELETE CASCADE,
    route_id        INT NOT NULL REFERENCES routes(route_id) ON DELETE CASCADE,
    stop_name       TEXT NOT NULL,
    stop_order      INT NOT NULL,
    location        GEOGRAPHY(POINT,4326) NOT NULL,
    UNIQUE (direction_id, stop_order)
);

CREATE INDEX idx_stops_route_order ON stops(route_id, stop_order);

CREATE TABLE devices (
    device_id       UUID PRIMARY KEY,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE location_pings (
    id              BIGSERIAL PRIMARY KEY,
    device_id       UUID NOT NULL REFERENCES devices(device_id),
    direction_id    INT NOT NULL REFERENCES routes_direction(direction_id),
    from_stop_order INT NOT NULL,
    location        GEOGRAPHY(POINT,4326) NOT NULL,
    speed_mps       REAL,
    heading         REAL,
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_location_pings_location ON location_pings USING GIST(location);

CREATE INDEX idx_pings_route_times ON location_pings(direction_id, recorded_at);

CREATE TABLE segment_travel_time (
    id              BIGSERIAL PRIMARY KEY,
    direction_id    INT NOT NULL REFERENCES routes_direction(direction_id),
    from_stop_order INT NOT NULL,
    to_stop_order   INT NOT NULL,
    hours_of_day    INT NOT NULL,
    travel_seconds  REAL NOT NULL,
    recorded_date   DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE INDEX idx_segment_lookup ON segment_travel_time(direction_id, from_stop_order, hours_of_day);

ALTER TABLE segment_travel_time
ADD CONSTRAINT chk_stop_order
CHECK (to_stop_order > from_stop_order);

INSERT INTO routes (route_number, source, destination)
VALUES ('500D', 'Hebbal', 'Central Silk Board');

INSERT INTO routes_direction (route_id, direction, source, destination)
VALUES
(1, 'UP', 'Hebbal', 'Central Silk Board'),
(1, 'DOWN', 'Central Silk Board', 'Hebbal');

INSERT INTO stops (direction_id , route_id, stop_name, stop_order, location) VALUES
(1, 1, 'Hebbala Bridge', 1, ST_GeogFromText('SRID=4326;POINT(77.593906 13.042196)')),
(1, 1, 'Kempapura', 2, ST_GeogFromText('SRID=4326;POINT(77.600525 13.043922)')),
(1, 1, 'Veerannapalya', 3, ST_GeogFromText('SRID=4326;POINT(77.613195 13.042224)')),
(1, 1, 'Manyatha Tech Park', 4, ST_GeogFromText('SRID=4326;POINT(77.618729 13.041148)')),
(1, 1, 'Nagawara Junction', 5, ST_GeogFromText('SRID=4326;POINT(77.624649 13.040149)')),
(1, 1, 'HBR Layout', 6, ST_GeogFromText('SRID=4326;POINT(77.626271 13.037957)')),
(1, 1, 'Hennur Junction', 7, ST_GeogFromText('SRID=4326;POINT(77.631541 13.029581)')),
(1, 1, 'Kalyananagara', 8, ST_GeogFromText('SRID=4326;POINT(77.636399 13.026671)')),
(1, 1, 'Kalyananagara 80ft Road', 9, ST_GeogFromText('SRID=4326;POINT(77.637065 13.026521)')),
(1, 1, 'Babusapalya', 10, ST_GeogFromText('SRID=4326;POINT(77.647163 13.022840)')),
(1, 1, 'Horamavu Signal', 11, ST_GeogFromText('SRID=4326;POINT(77.654185 13.019750)')),
(1, 1, 'Vijaya Bank Colony Ring Road', 12, ST_GeogFromText('SRID=4326;POINT(77.660040 13.017294)')),
(1, 1, 'B Channasandra Bridge', 13, ST_GeogFromText('SRID=4326;POINT(77.662493 13.011337)')),
(1, 1, 'Kasthurinagara', 14, ST_GeogFromText('SRID=4326;POINT(77.663305 13.004061)')),
(1, 1, 'Tin Factory', 15, ST_GeogFromText('SRID=4326;POINT(77.668534 12.996699)')),
(1, 1, 'KR Pura Railway Station', 16, ST_GeogFromText('SRID=4326;POINT(77.676048 13.000296)')),
(1, 1, 'B Narayanapura Ring Road', 17, ST_GeogFromText('SRID=4326;POINT(77.684139 12.995896)')),
(1, 1, 'Mahadevapura Ring Road', 18, ST_GeogFromText('SRID=4326;POINT(77.689664 12.988196)')),
(1, 1, 'EMC2', 19, ST_GeogFromText('SRID=4326;POINT(77.692415 12.983639)')),
(1, 1, 'Dodda Nekkundi Bridge', 20, ST_GeogFromText('SRID=4326;POINT(77.694196 12.971298)')),
(1, 1, 'Karthik Nagara', 21, ST_GeogFromText('SRID=4326;POINT(77.701965 12.968026)')),
(1, 1, 'Marathahalli Bridge', 22, ST_GeogFromText('SRID=4326;POINT(77.701588 12.960584)')),
(1, 1, 'Multiplex Marathahalli', 23, ST_GeogFromText('SRID=4326;POINT(77.700186 12.952301)')),
(1, 1, 'Kadubisanahalli', 24, ST_GeogFromText('SRID=4326;POINT(77.697530 12.942995)')),
(1, 1, 'New Horizon College', 25, ST_GeogFromText('SRID=4326;POINT(77.691654 12.935640)')),
(1, 1, 'Devarabisanahalli Ring Road', 26, ST_GeogFromText('SRID=4326;POINT(77.687510 12.931838)')),
(1, 1, 'Eco Space', 27, ST_GeogFromText('SRID=4326;POINT(77.681275 12.927983)')),
(1, 1, 'Bellanduru City Light Apartment', 28, ST_GeogFromText('SRID=4326;POINT(77.680153 12.927458)')),
(1, 1, 'Bellanduru Petrol Bunk', 29, ST_GeogFromText('SRID=4326;POINT(77.671211 12.923329)')),
(1, 1, 'Sarjapura Ring Road Junction', 30, ST_GeogFromText('SRID=4326;POINT(77.665695 12.920533)')),
(1, 1, 'Ibbaluru', 31, ST_GeogFromText('SRID=4326;POINT(77.661211 12.921512)')),
(1, 1, 'Agara Junction', 32, ST_GeogFromText('SRID=4326;POINT(77.652468 12.923974)')),
(1, 1, 'Depot-25 Central Silk Board', 33, ST_GeogFromText('SRID=4326;POINT(77.642726 12.919122)')),
(1, 1, 'HSR Layout 14th Main', 34, ST_GeogFromText('SRID=4326;POINT(77.650436 12.924297)')),
(1, 1, 'SI Apartment HSR Layout', 35, ST_GeogFromText('SRID=4326;POINT(77.629500 12.916593)')),
(1, 1, 'Central Silk Board', 36, ST_GeogFromText('SRID=4326;POINT(77.624154 12.917396)'));

INSERT INTO stops (direction_id, route_id, stop_name, stop_order, location) VALUES
(2, 1, 'Central Silk Board', 1, ST_GeogFromText('SRID=4326;POINT(77.624199 12.917749)')),
(2, 1, 'SI Apartment HSR Layout', 2, ST_GeogFromText('SRID=4326;POINT(77.629327 12.916891)')),
(2, 1, 'HSR Layout 14th Main', 3, ST_GeogFromText('SRID=4326;POINT(77.650409 12.924483)')),
(2, 1, 'Depot-25 Central Silk Board', 4, ST_GeogFromText('SRID=4326;POINT(77.642351 12.919129)')),
(2, 1, 'Agara Junction', 5, ST_GeogFromText('SRID=4326;POINT(77.654406 12.923960)')),
(2, 1, 'Ibbaluru', 6, ST_GeogFromText('SRID=4326;POINT(77.661644 12.921696)')),
(2, 1, 'Sarjapura Ring Road Junction', 7, ST_GeogFromText('SRID=4326;POINT(77.667115 12.921684)')),
(2, 1, 'Bellanduru Petrol Bunk', 8, ST_GeogFromText('SRID=4326;POINT(77.670664 12.923479)')),
(2, 1, 'Bellanduru City Light Apartment', 9, ST_GeogFromText('SRID=4326;POINT(77.679906 12.927820)')),
(2, 1, 'Eco Space', 10, ST_GeogFromText('SRID=4326;POINT(77.680949 12.928317)')),
(2, 1, 'Devarabisanahalli Ring Road', 11, ST_GeogFromText('SRID=4326;POINT(77.687220 12.932128)')),
(2, 1, 'New Horizon College', 12, ST_GeogFromText('SRID=4326;POINT(77.690732 12.935410)')),
(2, 1, 'Kadubisanahalli', 13, ST_GeogFromText('SRID=4326;POINT(77.697144 12.943011)')),
(2, 1, 'Multiplex Marathahalli', 14, ST_GeogFromText('SRID=4326;POINT(77.699566 12.951618)')),
(2, 1, 'Marathahalli Bridge', 15, ST_GeogFromText('SRID=4326;POINT(77.701552 12.962568)')),
(2, 1, 'Karthik Nagara', 16, ST_GeogFromText('SRID=4326;POINT(77.701503 12.968172)')),
(2, 1, 'Dodda Nekkundi Bridge', 17, ST_GeogFromText('SRID=4326;POINT(77.694111 12.971682)')),
(2, 1, 'EMC2', 18, ST_GeogFromText('SRID=4326;POINT(77.692605 12.982814)')),
(2, 1, 'Mahadevapura Ring Road', 19, ST_GeogFromText('SRID=4326;POINT(77.688456 12.989524)')),
(2, 1, 'B Narayanapura Ring Road', 20, ST_GeogFromText('SRID=4326;POINT(77.683695 12.996165)')),
(2, 1, 'KR Pura Railway Station', 21, ST_GeogFromText('SRID=4326;POINT(77.675936 12.999858)')),
(2, 1, 'Tin Factory', 22, ST_GeogFromText('SRID=4326;POINT(77.669175 12.996729)')),
(2, 1, 'Kasthurinagara', 23, ST_GeogFromText('SRID=4326;POINT(77.663185 13.003982)')),
(2, 1, 'B Channasandra Bridge', 24, ST_GeogFromText('SRID=4326;POINT(77.662325 13.011053)')),
(2, 1, 'Vijaya Bank Colony Ring Road', 25, ST_GeogFromText('SRID=4326;POINT(77.660137 13.017029)')),
(2, 1, 'Horamavu Signal', 26, ST_GeogFromText('SRID=4326;POINT(77.654554 13.019409)')),
(2, 1, 'Babusapalya', 27, ST_GeogFromText('SRID=4326;POINT(77.646753 13.022709)')),
(2, 1, 'Kalyananagara 80ft Road', 28, ST_GeogFromText('SRID=4326;POINT(77.636364 13.026421)')),
(2, 1, 'Kalyananagara', 29, ST_GeogFromText('SRID=4326;POINT(77.636389 13.026436)')),
(2, 1, 'Hennur Junction', 30, ST_GeogFromText('SRID=4326;POINT(77.631087 13.029826)')),
(2, 1, 'HBR Layout', 31, ST_GeogFromText('SRID=4326;POINT(77.625802 13.037957)')),
(2, 1, 'Nagawara Junction', 32, ST_GeogFromText('SRID=4326;POINT(77.624382 13.039747)')),
(2, 1, 'Manyatha Tech Park', 33, ST_GeogFromText('SRID=4326;POINT(77.618585 13.040852)')),
(2, 1, 'Veerannapalya', 34, ST_GeogFromText('SRID=4326;POINT(77.613760 13.042330)')),
(2, 1, 'Kempapura', 35, ST_GeogFromText('SRID=4326;POINT(77.600525 13.043922)')),
(2, 1, 'Hebbala Bridge', 36, ST_GeogFromText('SRID=4326;POINT(77.593747 13.041949)'));

-- Nightly cleanup job (run manually or via cron):
-- DELETE FROM location_pings WHERE recorded_at < now() - INTERVAL '6 hours';