"""
db.py — loads stop data from Postgres at startup.
Python never writes location_pings — that is Go's job.
Python only reads stops for snap-to-route math.
"""
import psycopg2


def get_connection(host="localhost", port=5432, dbname="bmtc", user="bmtc", password="bmtc"):
    return psycopg2.connect(host=host, port=port, dbname=dbname, user=user, password=password)


def get_stops_for_direction(conn, direction_id):
    """Returns all stops for a direction as plain dicts, ordered by stop_order."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT stop_order, stop_name,
                   ST_Y(location::geometry) AS lat,
                   ST_X(location::geometry) AS lng
            FROM stops
            WHERE direction_id = %s
            ORDER BY stop_order
        """, (direction_id,))
        rows = cur.fetchall()
    return [
        {"stop_order": r[0], "stop_name": r[1], "lat": r[2], "lng": r[3]}
        for r in rows
    ]
