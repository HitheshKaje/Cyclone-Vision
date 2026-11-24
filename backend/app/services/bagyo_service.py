"""
Bagyo Tropical Cyclone Tracking Service.
Integrates the Bagyo API (https://bagyo.io/v1/storms) to provide live tropical cyclone
telemetry, observed eye tracks, official agency forecast positions, and intensity data.

Strictly preserves existing CycloSafe functionalities while prioritizing
the North Indian Ocean (nio) basin (Bay of Bengal and Arabian Sea).
"""

import os
import time
import logging
from datetime import datetime, timedelta
import requests

logger = logging.getLogger("cyclosafe.bagyo")

# In-memory cache for Bagyo API responses
_bagyo_cache = {
    "timestamp": 0.0,
    "data": None,
    "last_successful_time": None,
    "is_fetching": False
}

BAGYO_CACHE_TTL_SECONDS = 300.0  # 5 minutes polling interval


def _parse_ist_time(dt_str: str) -> dict:
    """
    Parses an ISO or standard timestamp string and returns formatted UTC+5.5 (IST) strings.
    """
    if not dt_str:
        now_ist = datetime.utcnow() + timedelta(hours=5, minutes=30)
        return {
            "iso": now_ist.isoformat() + "Z",
            "date_display": now_ist.strftime("%d %b"),
            "time_display": now_ist.strftime("%H:%M"),
            "ist_display": now_ist.strftime("%d %b %H:%M IST")
        }

    try:
        clean_str = dt_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean_str)
        ist_dt = dt + timedelta(hours=5, minutes=30)
        return {
            "iso": dt_str,
            "date_display": ist_dt.strftime("%d %b"),
            "time_display": ist_dt.strftime("%H:%M"),
            "ist_display": ist_dt.strftime("%d %b %H:%M IST")
        }
    except Exception:
        return {
            "iso": dt_str,
            "date_display": str(dt_str)[:10],
            "time_display": str(dt_str)[11:16] if len(str(dt_str)) > 15 else "00:00",
            "ist_display": str(dt_str)
        }


def _extract_coords(item: dict) -> tuple:
    """
    Safely extracts (latitude, longitude) as floats from various JSON representations:
    - {"latitude": ..., "longitude": ...}
    - {"lat": ..., "lng": ...}
    - {"coordinates": [lon, lat]} or {"coordinates": [lat, lon]}
    """
    if not isinstance(item, dict):
        return None, None

    # Check direct or nested fields
    for container in [item, item.get("current", {}), item.get("position", {}), item.get("location", {})]:
        if not isinstance(container, dict):
            continue

        lat = container.get("latitude") if container.get("latitude") is not None else container.get("lat")
        lon = container.get("longitude") if container.get("longitude") is not None else (
            container.get("lng") if container.get("lng") is not None else container.get("lon")
        )

        if lat is not None and lon is not None:
            try:
                return float(lat), float(lon)
            except (ValueError, TypeError):
                pass

        coords = container.get("coordinates") or container.get("coords")
        if isinstance(coords, (list, tuple)) and len(coords) >= 2:
            try:
                c0 = float(coords[0])
                c1 = float(coords[1])
                # For Indian coastal waters (NIO): Lon ~ 45..105, Lat ~ 0..35
                # If first element is > 40 and second is <= 35, it's GeoJSON [lon, lat]
                if c0 > 40.0 and -40.0 <= c1 <= 40.0:
                    return c1, c0
                return c0, c1
            except (ValueError, TypeError):
                pass

    return None, None


def _is_nio_basin(basin_str: str, lat: float, lon: float) -> bool:
    """
    Determines if a storm is in the North Indian Ocean (nio), including
    Bay of Bengal and Arabian Sea.
    """
    b = str(basin_str or "").lower().strip()
    if b in ["nio", "io", "north indian ocean", "bay of bengal", "arabian sea", "bob", "as"]:
        return True

    # Geographic boundary check for North Indian Ocean basin: Lat 0-35 N, Lon 45-100 E
    if lat is not None and lon is not None:
        if 0.0 <= lat <= 35.0 and 45.0 <= lon <= 105.0:
            return True

    return False


def _normalize_speed(val, unit: str = "kmh") -> tuple:
    """
    Returns (wind_speed_kmh, wind_speed_kt).
    """
    if val is None:
        return None, None
    try:
        num = float(val)
        unit_lower = str(unit or "").lower()
        if "kt" in unit_lower or "knot" in unit_lower:
            kt = round(num)
            kmh = round(num * 1.852)
        elif "mph" in unit_lower:
            kmh = round(num * 1.60934)
            kt = round(kmh / 1.852)
        elif "m/s" in unit_lower or "mps" in unit_lower:
            kmh = round(num * 3.6)
            kt = round(kmh / 1.852)
        else:  # default assume km/h
            kmh = round(num)
            kt = round(num / 1.852)
        return kmh, kt
    except (ValueError, TypeError):
        return None, None


def _parse_track_points(raw_points: list, is_forecast_default: bool = False) -> list:
    """
    Parses and standardizes waypoint coordinates, intensity, and timestamps.
    """
    if not isinstance(raw_points, list):
        return []

    parsed = []
    for pt in raw_points:
        if not isinstance(pt, dict):
            continue

        lat, lon = _extract_coords(pt)
        if lat is None or lon is None:
            continue

        raw_wind = pt.get("wind_speed") or pt.get("wind") or pt.get("max_sustained_wind") or pt.get("intensity")
        wind_unit = pt.get("wind_speed_unit") or pt.get("unit") or "kt"
        wind_kmh, wind_kt = _normalize_speed(raw_wind, wind_unit)

        pressure = pt.get("pressure") or pt.get("central_pressure") or pt.get("mslp")
        try:
            pressure = round(float(pressure)) if pressure is not None else None
        except (ValueError, TypeError):
            pressure = None

        raw_time = pt.get("timestamp") or pt.get("time") or pt.get("date") or pt.get("valid_time")
        time_info = _parse_ist_time(str(raw_time) if raw_time else "")

        is_fc = pt.get("forecast")
        if is_fc is None:
            is_fc = pt.get("is_forecast", is_forecast_default)
        else:
            is_fc = bool(is_fc)

        parsed.append({
            "latitude": round(lat, 2),
            "longitude": round(lon, 2),
            "wind_speed_kmh": wind_kmh,
            "wind_speed_kt": wind_kt,
            "pressure_hpa": pressure,
            "stage": pt.get("stage") or pt.get("category") or pt.get("type") or ("Forecast Waypoint" if is_fc else "Observed Eye"),
            "timestamp": time_info["iso"],
            "date_display": time_info["date_display"],
            "time_display": time_info["time_display"],
            "ist_display": time_info["ist_display"],
            "is_forecast": is_fc
        })

    return parsed


def fetch_bagyo_storms_sync(force_refresh: bool = False) -> dict:
    """
    Synchronously fetches active tropical cyclone tracking data from Bagyo API
    with caching, error resilience, and North Indian Ocean (nio) prioritization.
    """
    now = time.time()
    
    # 1. Return cache if still valid
    if not force_refresh and _bagyo_cache["data"] is not None:
        if (now - _bagyo_cache["timestamp"]) < BAGYO_CACHE_TTL_SECONDS:
            return _bagyo_cache["data"]

    api_key = os.getenv("BAGYO_API_KEY", "").strip()
    api_url = os.getenv("BAGYO_API_URL", "https://bagyo.io/v1/storms").strip()

    # If API key is not configured, return an informative fallback without crashing
    if not api_key:
        logger.warning("BAGYO_API_KEY is not configured in backend/.env")
        result = {
            "status": "unconfigured",
            "message": "BAGYO_API_KEY is not configured in backend/.env. Please provide a valid key.",
            "source": "Bagyo Tropical Cyclone Tracking Network",
            "agency": "Independent Aggregator",
            "is_official_indian_warning": False,
            "advisory_disclaimer": "Bagyo is an independent tracking aggregator. For official Indian coastal warnings, refer to IMD.",
            "updated_at": datetime.utcnow().isoformat() + "Z",
            "last_successful_retrieval": _bagyo_cache["last_successful_time"],
            "active_cyclones_count": 0,
            "cyclones": [],
            "is_stale": False
        }
        return result

    headers = {
        "X-API-Key": api_key,
        "User-Agent": "CycloSafe-Coastal-Early-Warning/2.0 (India Coastal Safety Initiative)",
        "Accept": "application/json"
    }

    try:
        # Request with timeout and safe fallback
        response = requests.get(api_url, headers=headers, timeout=12.0)
        
        # Handle specific HTTP error status codes gracefully
        if response.status_code == 401:
            logger.error("Bagyo API 401 Unauthorized: Invalid or missing API key.")
            return _handle_failure("HTTP 401 Unauthorized: Invalid or expired Bagyo API Key.")
        elif response.status_code == 403:
            logger.error("Bagyo API 403 Forbidden: Access not permitted.")
            return _handle_failure("HTTP 403 Forbidden: Bagyo access restricted.")
        elif response.status_code == 404:
            logger.warning("Bagyo API 404: Endpoint not found.")
            return _handle_failure("HTTP 404: Endpoint not found.")
        elif response.status_code == 429:
            logger.warning("Bagyo API 429 Rate Limit Exceeded.")
            return _handle_failure("HTTP 429: Rate limit exceeded. Serving cached data.")

        response.raise_for_status()
        raw_json = response.json()

        # Extract storm list from various supported formats
        raw_storms = []
        if isinstance(raw_json, list):
            raw_storms = raw_json
        elif isinstance(raw_json, dict):
            raw_storms = (
                raw_json.get("storms")
                or raw_json.get("data")
                or raw_json.get("results")
                or raw_json.get("items")
                or []
            )
            if not raw_storms and "name" in raw_json:
                raw_storms = [raw_json]

        parsed_cyclones = []

        for storm in raw_storms:
            if not isinstance(storm, dict):
                continue

            storm_id = str(storm.get("id") or storm.get("storm_id") or storm.get("name") or "unknown-storm")
            name = str(storm.get("name") or storm.get("title") or "Unnamed Tropical Cyclone").strip().title()
            agency = str(storm.get("agency") or storm.get("source") or storm.get("issuing_agency") or "JTWC/IMD").upper()
            
            # Extract current center coordinates
            curr_lat, curr_lon = _extract_coords(storm)
            
            # Check basin
            basin_raw = storm.get("basin") or storm.get("basin_id") or ""
            is_nio = _is_nio_basin(basin_raw, curr_lat, curr_lon)

            # Assign human-readable basin name
            if is_nio:
                basin_display = "Bay of Bengal" if (curr_lon is not None and curr_lon >= 78.0) else "Arabian Sea"
            else:
                basin_display = str(basin_raw) if basin_raw else "Global Waters"

            # Intensity metrics
            raw_wind = (
                storm.get("wind_speed")
                or storm.get("wind")
                or storm.get("current", {}).get("wind_speed")
                or storm.get("intensity")
            )
            wind_unit = storm.get("wind_speed_unit") or storm.get("unit") or "kt"
            wind_kmh, wind_kt = _normalize_speed(raw_wind, wind_unit)

            pressure = (
                storm.get("pressure")
                or storm.get("central_pressure")
                or storm.get("current", {}).get("pressure")
                or storm.get("mslp")
            )
            try:
                pressure_hpa = round(float(pressure)) if pressure is not None else None
            except (ValueError, TypeError):
                pressure_hpa = None

            # Movement metrics
            movement_dir = (
                storm.get("movement_direction")
                or storm.get("heading")
                or storm.get("current", {}).get("movement_direction")
            )
            movement_spd = (
                storm.get("movement_speed")
                or storm.get("speed")
                or storm.get("current", {}).get("movement_speed")
            )
            movement_spd_kmh, _ = _normalize_speed(movement_spd, "kmh") if movement_spd else (None, None)

            # Stage or classification
            stage = (
                storm.get("category")
                or storm.get("stage")
                or storm.get("classification")
                or storm.get("current", {}).get("stage")
                or "Tropical Cyclone"
            )

            # Track history and forecast points
            observed_points = _parse_track_points(storm.get("track") or storm.get("observed_track") or [], is_forecast_default=False)
            forecast_points = _parse_track_points(storm.get("forecast") or storm.get("forecast_track") or [], is_forecast_default=True)

            # If all points are in a single list, separate them
            if not observed_points and not forecast_points and isinstance(storm.get("points"), list):
                all_pts = _parse_track_points(storm.get("points"))
                observed_points = [p for p in all_pts if not p["is_forecast"]]
                forecast_points = [p for p in all_pts if p["is_forecast"]]

            # If center coordinates were not in top level, use latest observed or first forecast
            if curr_lat is None or curr_lon is None:
                if observed_points:
                    curr_lat = observed_points[-1]["latitude"]
                    curr_lon = observed_points[-1]["longitude"]
                elif forecast_points:
                    curr_lat = forecast_points[0]["latitude"]
                    curr_lon = forecast_points[0]["longitude"]

            updated_raw = storm.get("updated_at") or storm.get("last_updated") or storm.get("timestamp")
            time_meta = _parse_ist_time(str(updated_raw) if updated_raw else "")

            cyclone_obj = {
                "id": storm_id,
                "name": name,
                "raw_name": storm.get("name") or name,
                "basin": basin_display,
                "basin_code": "nio" if is_nio else str(basin_raw).lower(),
                "is_nio": is_nio,
                "agency": agency,
                "data_source": f"Bagyo Cyclone Tracking Network ({agency})",
                "is_official_indian_warning": False,
                "advisory_disclaimer": "Independent Aggregator Data. For official Indian coastal warnings, refer to IMD.",
                "latitude": round(curr_lat, 2) if curr_lat is not None else None,
                "longitude": round(curr_lon, 2) if curr_lon is not None else None,
                "wind_speed": wind_kmh,
                "wind_speed_kmh": wind_kmh,
                "wind_kt": wind_kt,
                "pressure_hpa": pressure_hpa,
                "movement_direction": str(movement_dir) if movement_dir else None,
                "movement_speed_kmh": movement_spd_kmh,
                "stage": stage,
                "status": f"{stage} ({agency})",
                "alert_level": "Red" if (wind_kt and wind_kt >= 64) else ("Orange" if (wind_kt and wind_kt >= 34) else "Yellow"),
                "observed_track": observed_points,
                "forecast_track": forecast_points,
                "total_track_points": len(observed_points) + len(forecast_points),
                "last_updated": time_meta["iso"],
                "last_updated_ist": time_meta["ist_display"]
            }

            parsed_cyclones.append(cyclone_obj)

        # Prioritize North Indian Ocean cyclones first, then by sustained wind speed
        parsed_cyclones.sort(key=lambda c: (1 if c["is_nio"] else 0, c["wind_speed"] or 0), reverse=True)

        success_time = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
        result = {
            "status": "connected",
            "message": "Successfully synchronized with Bagyo API.",
            "source": "Bagyo Tropical Cyclone Tracking Network",
            "is_official_indian_warning": False,
            "advisory_disclaimer": "Bagyo is an independent tracking aggregator. For official Indian coastal warnings, refer to IMD.",
            "updated_at": datetime.utcnow().isoformat() + "Z",
            "last_successful_retrieval": success_time,
            "active_cyclones_count": len(parsed_cyclones),
            "nio_cyclones_count": sum(1 for c in parsed_cyclones if c["is_nio"]),
            "cyclones": parsed_cyclones,
            "is_stale": False
        }

        # Save to cache
        _bagyo_cache["timestamp"] = now
        _bagyo_cache["data"] = result
        _bagyo_cache["last_successful_time"] = success_time

        return result

    except requests.exceptions.Timeout:
        logger.warning("Bagyo API request timed out.")
        return _handle_failure("Bagyo API request timed out (12s threshold).")
    except requests.exceptions.RequestException as req_err:
        logger.warning(f"Bagyo API network error: {req_err}")
        return _handle_failure(f"Network error communicating with Bagyo API: {str(req_err)}")
    except Exception as exc:
        logger.error(f"Unexpected Bagyo parser exception: {exc}")
        return _handle_failure(f"Internal error processing Bagyo feed: {str(exc)}")


def _handle_failure(error_msg: str) -> dict:
    """
    Returns last cached data if available with is_stale=True,
    otherwise returns a safe empty error structure.
    """
    if _bagyo_cache["data"] is not None:
        cached = dict(_bagyo_cache["data"])
        cached["is_stale"] = True
        cached["status"] = "stale_cached"
        cached["warning_message"] = f"Showing cached data. Reason: {error_msg}"
        cached["last_successful_retrieval"] = _bagyo_cache.get("last_successful_time")
        return cached

    return {
        "status": "error",
        "message": error_msg,
        "source": "Bagyo Tropical Cyclone Tracking Network",
        "agency": "Independent Aggregator",
        "is_official_indian_warning": False,
        "advisory_disclaimer": "Bagyo is an independent tracking aggregator. For official Indian coastal warnings, refer to IMD.",
        "updated_at": datetime.utcnow().isoformat() + "Z",
        "last_successful_retrieval": None,
        "active_cyclones_count": 0,
        "cyclones": [],
        "is_stale": True
    }
