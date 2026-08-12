"""
eta.py — computes ETA from current stop to next stop.

v1: heuristic using average segment time + live speed correction.
v2 (future): replace with averages from segment_travel_time table.
v3 (future): gradient boosting trained on real ride data.
"""


class HeuristicETA:
    def estimate(self, current_stop_order, target_stop_order,
                 segment_avg_seconds=180, current_speed_mps=0):
        remaining = max(target_stop_order - current_stop_order, 0)
        base = remaining * segment_avg_seconds

        assumed_avg = 8.0  # m/s — approximate BMTC city speed
        if current_speed_mps and current_speed_mps > 0.5:
            base *= (assumed_avg / current_speed_mps)

        return max(base, 30)  # never show under 30 seconds


if __name__ == "__main__":
    eta = HeuristicETA()
    result = eta.estimate(3, 5, 180, 8.0)
    print(f"ETA: {result:.0f}s")
    assert result == 360.0
    print("self-test passed")
