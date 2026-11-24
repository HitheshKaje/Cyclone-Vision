"""
Spire Weather Tropical Cyclone Future Track Service.
Integrates Spire Weather API (https://api.wx.spire.com/storm/json?status=active)
to provide real-time observed tracks and official agency future forecast tracks.

Filters North Indian Ocean storms (NI: North Indian Ocean, AS: Arabian Sea, BB: Bay of Bengal).
Maintains 5-minute in-memory caching and resilient failure fallback.
"""

import os
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import requests

logger = logging.getLogger("cyclosafe.spire")

_spire_cache = {
    "timestamp": 0.0,
    "data": None,
    "last_successful_time": None
}

SPIRE_CACHE_TTL_SECONDS = 300.0  # 5 minutes cache TTL


def _parse_ist_datetime(dt_val) -> dict:
    """Parses an ISO / unix / string timestamp into formatted UTC+5.5 (IST) representations."""
    if not dt_val:
        now_ist = datetime.utcnow() + timedelta(hours=5, minutes=30)
        return {
            "iso": now_ist.isoformat() + "Z",
            "date_display": now_ist.strftime("%d %b"),
            "time_display": now_ist.strftime("%H:%M"),
            "ist_display": now_ist.strftime("%d %b %H:%M IST")
        }

    try:
        if isinstance(dt_val, (int, float)):
            # Unix timestamp (seconds or ms)
            if dt_val > 1e11:
                dt_val = dt_val / 1000.0
            dt = datetime.utcfromtimestamp(dt_val)
        else:
            clean_str = str(dt_val).replace("Z", "+00:00")
            dt = datetime.fromisoformat(clean_str)

        ist_dt = dt + timedelta(hours=5, minutes=30)
        return {
            "iso": dt.isoformat() + "Z",
            "date_display": ist_dt.strftime("%d %b"),
            "time_display": ist_dt.strftime("%H:%M"),
            "ist_display": ist_dt.strftime("%d %b %H:%M IST")
        }
    except Exception:
        dt_str = str(dt_val)
        return {
            "iso": dt_str,
            "date_display": dt_str[:10],
            "time_display": dt_str[11:16] if len(dt_str) > 15 else "00:00",
            "ist_display": dt_str
        }


def _is_indian_ocean_storm(basin: str, sub_basin: str, lat: Optional[float], lon: Optional[float]) -> bool:
    """
    Filters storms belonging to:
    - NI (North Indian Ocean)
    - AS (Arabian Sea)
    - BB (Bay of Bengal)
    Or coordinates inside the Indian coastal basin (Lat 0-35 N, Lon 45-105 E).
    """
    b = str(basin or "").upper().strip()
    sb = str(sub_basin or "").upper().strip()

    # Exact documented Spire basin codes
    if b in ["NI", "NIO", "IO"] or sb in ["AS", "BB", "BOB", "ARB"]:
        return True

    # Check for text names
    combined = f"{b} {sb}".lower()
    if any(k in combined for k in ["arabian", "bengal", "north indian"]):
        return True

    # Geographic boundary fallback for Indian Ocean waters
    if lat is not None and lon is not None:
        if 0.0 <= lat <= 35.0 and 45.0 <= lon <= 105.0:
            return True

    return False


def _normalize_category_code(code: str, wind_kt: Optional[int]) -> str:
    """Translates meteorological category codes into standardized descriptive stages."""
    c = str(code or "").upper().strip()
    mapping = {
        "TD": "Tropical Depression",
        "TS": "Tropical Storm / Cyclonic Storm",
        "CS": "Cyclonic Storm",
        "SCS": "Severe Cyclonic Storm",
        "VSCS": "Very Severe Cyclonic Storm",
        "ESCS": "Extremely Severe Cyclonic Storm",
        "SUCS": "Super Cyclonic Storm",
        "H1": "Category 1 Cyclone",
        "H2": "Category 2 Cyclone",
        "H3": "Category 3 Cyclone",
        "H4": "Category 4 Cyclone",
        "H5": "Category 5 Cyclone",
        "TY": "Typhoon / Severe Cyclone",
        "ST": "Super Typhoon"
    }
    if c in mapping:
        return mapping[c]

    if wind_kt is not None:
        if wind_kt >= 120:
            return "Super Cyclonic Storm"
        elif wind_kt >= 90:
            return "Extremely Severe Cyclonic Storm"
        elif wind_kt >= 64:
            return "Very Severe Cyclonic Storm"
        elif wind_kt >= 48:
            return "Severe Cyclonic Storm"
        elif wind_kt >= 34:
            return "Cyclonic Storm"
        elif wind_kt >= 17:
            return "Depression"

    return c if c else "Tropical System"


def fetch_spire_future_tracks_sync(force_refresh: bool = False) -> Dict[str, Any]:
    """
    Fetches real-time tropical cyclone forecast & observed tracks from the Spire Weather API.
    Preserves existing application functionality and caches responses for 5 minutes.
    """
    now = time.time()

    # 1. Check in-memory cache
    if not force_refresh and _spire_cache["data"] is not None:
        if (now - _spire_cache["timestamp"]) < SPIRE_CACHE_TTL_SECONDS:
            return _spire_cache["data"]

    api_key = os.getenv("SPIRE_API_KEY", "").strip()
    api_url = os.getenv("SPIRE_API_URL", "https://api.wx.spire.com/storm/json?status=active").strip()

    # If key is unconfigured, return a safe informative fallback
    if not api_key:
        logger.warning("SPIRE_API_KEY is not configured in backend/.env")
        result = {
            "status": "unconfigured",
            "message": "SPIRE_API_KEY is not configured in backend/.env. Please add your Spire API key.",
            "source": "Spire Weather Tropical Cyclone API",
            "issuance_time": None,
            "latest_observed_time": None,
            "last_successful_retrieval": _spire_cache["last_successful_time"],
            "storms": [],
            "is_stale": False
        }
        return result

    headers = {
        "spire-api-key": api_key,
        "Accept": "application/json",
        "User-Agent": "CycloSafe-FutureTrack/1.0 (Coastal Early Warning System)"
    }

    try:
        response = requests.get(api_url, headers=headers, timeout=12.0)

        if response.status_code == 401:
            logger.error("Spire API 401 Unauthorized: Invalid or missing spire-api-key.")
            return _handle_failure("HTTP 401 Unauthorized: Invalid or expired Spire API key.")
        elif response.status_code == 403:
            logger.error("Spire API 403 Forbidden: Access restricted.")
            return _handle_failure("HTTP 403 Forbidden: Spire storm track access not permitted.")
        elif response.status_code == 429:
            logger.warning("Spire API 429 Rate Limit Exceeded.")
            return _handle_failure("HTTP 429 Rate Limit Exceeded: Serving cached data.")

        response.raise_for_status()
        raw_json = response.json()

        # Extract storm list
        raw_storms = []
        if isinstance(raw_json, list):
            raw_storms = raw_json
        elif isinstance(raw_json, dict):
            raw_storms = (
                raw_json.get("storms")
                or raw_json.get("data")
                or raw_json.get("items")
                or []
            )
            if not raw_storms and ("name" in raw_json or "id" in raw_json):
                raw_storms = [raw_json]

        parsed_storms = []

        for item in raw_storms:
            if not isinstance(item, dict):
                continue

            storm_id = str(item.get("id") or item.get("storm_id") or "UNKNOWN")
            name = str(item.get("name") or "Tropical Cyclone").strip().title()
            basin = str(item.get("basin") or "").upper().strip()
            sub_basin = str(item.get("sub_basin") or item.get("subbasin") or "").upper().strip()
            agency = str(item.get("agency") or item.get("source") or "JTWC/IMD").upper()

            advisory_raw = item.get("advisory_time") or item.get("time") or item.get("updated_at")
            advisory_info = _parse_ist_datetime(advisory_raw)

            # 1. Process Observed Track
            raw_obs = item.get("observed_track") or []
            parsed_obs = []
            if isinstance(raw_obs, list):
                for pt in raw_obs:
                    if not isinstance(pt, dict):
                        continue
                    lat = pt.get("lat") if pt.get("lat") is not None else pt.get("latitude")
                    lon = pt.get("lon") if pt.get("lon") is not None else pt.get("longitude")
                    if lat is None or lon is None:
                        continue
                    try:
                        f_lat = round(float(lat), 2)
                        f_lon = round(float(lon), 2)
                    except (ValueError, TypeError):
                        continue

                    t_info = _parse_ist_datetime(pt.get("time") or pt.get("timestamp"))
                    wind_val = pt.get("wind") or pt.get("max_sustained_wind") or pt.get("wind_speed")
                    wind_kt = round(float(wind_val)) if wind_val is not None else None
                    wind_kmh = round(wind_kt * 1.852) if wind_kt is not None else None

                    parsed_obs.append({
                        "lat": f_lat,
                        "lon": f_lon,
                        "time": t_info["iso"],
                        "date_display": t_info["date_display"],
                        "time_display": t_info["time_display"],
                        "ist_display": t_info["ist_display"],
                        "wind_kt": wind_kt,
                        "wind_kmh": wind_kmh,
                        "pressure": pt.get("pressure"),
                        "is_forecast": False
                    })

            # Sort observed track in chronological order
            parsed_obs.sort(key=lambda p: str(p.get("time") or ""))

            # 2. Process Future Forecast Track
            raw_fc = item.get("forecast_track") or []
            parsed_fc = []
            if isinstance(raw_fc, list):
                for pt in raw_fc:
                    if not isinstance(pt, dict):
                        continue
                    lat = pt.get("lat") if pt.get("lat") is not None else pt.get("latitude")
                    lon = pt.get("lon") if pt.get("lon") is not None else pt.get("longitude")
                    if lat is None or lon is None:
                        continue
                    try:
                        f_lat = round(float(lat), 2)
                        f_lon = round(float(lon), 2)
                    except (ValueError, TypeError):
                        continue

                    fc_hour = pt.get("forecast_hour") or pt.get("hour")
                    try:
                        fc_hour = int(fc_hour) if fc_hour is not None else 0
                    except (ValueError, TypeError):
                        fc_hour = 0

                    fc_time = pt.get("forecast_time") or pt.get("time")
                    t_info = _parse_ist_datetime(fc_time)

                    msw = pt.get("max_sustained_wind") or pt.get("wind")
                    wind_kt = round(float(msw)) if msw is not None else None
                    wind_kmh = round(wind_kt * 1.852) if wind_kt is not None else None

                    cat_code = str(pt.get("category_code") or pt.get("category") or "").upper()
                    stage_name = _normalize_category_code(cat_code, wind_kt)

                    parsed_fc.append({
                        "lat": f_lat,
                        "lon": f_lon,
                        "forecast_time": t_info["iso"],
                        "forecast_hour": fc_hour,
                        "date_display": t_info["date_display"],
                        "time_display": t_info["time_display"],
                        "ist_display": t_info["ist_display"],
                        "max_sustained_wind_kt": wind_kt,
                        "max_sustained_wind_kmh": wind_kmh,
                        "category_code": cat_code,
                        "stage": stage_name,
                        "is_forecast": True
                    })

            # Sort future forecast track by forecast hour / forecast time
            parsed_fc.sort(key=lambda p: (p.get("forecast_hour", 0), str(p.get("forecast_time") or "")))

            # Determine Current Position
            current_lat = None
            current_lon = None
            current_wind_kt = None
            current_wind_kmh = None

            if parsed_obs:
                latest_obs = parsed_obs[-1]
                current_lat = latest_obs["lat"]
                current_lon = latest_obs["lon"]
                current_wind_kt = latest_obs.get("wind_kt")
                current_wind_kmh = latest_obs.get("wind_kmh")
            elif parsed_fc:
                first_fc = parsed_fc[0]
                current_lat = first_fc["lat"]
                current_lon = first_fc["lon"]
                current_wind_kt = first_fc.get("max_sustained_wind_kt")
                current_wind_kmh = first_fc.get("max_sustained_wind_kmh")
            else:
                top_lat = item.get("lat") or item.get("latitude")
                top_lon = item.get("lon") or item.get("longitude")
                if top_lat is not None and top_lon is not None:
                    current_lat = round(float(top_lat), 2)
                    current_lon = round(float(top_lon), 2)

            # Filter for Indian Ocean / Bay of Bengal / Arabian Sea relevance
            is_io = _is_indian_ocean_storm(basin, sub_basin, current_lat, current_lon)

            # Basin display name
            if sub_basin == "AS":
                basin_label = "Arabian Sea"
            elif sub_basin == "BB":
                basin_label = "Bay of Bengal"
            elif basin == "NI":
                basin_label = "North Indian Ocean"
            else:
                basin_label = f"{basin} {sub_basin}".strip() or "Indian Coastal Waters"

            latest_obs_time = parsed_obs[-1]["ist_display"] if parsed_obs else advisory_info["ist_display"]

            parsed_storms.append({
                "id": storm_id,
                "name": name,
                "basin": basin,
                "sub_basin": sub_basin,
                "basin_label": basin_label,
                "is_indian_ocean": is_io,
                "agency": agency,
                "advisory_time": advisory_info["iso"],
                "advisory_time_ist": advisory_info["ist_display"],
                "latest_observed_time": latest_obs_time,
                "current_position": {
                    "lat": current_lat,
                    "lon": current_lon,
                    "wind_kt": current_wind_kt,
                    "wind_kmh": current_wind_kmh
                },
                "observed_track": parsed_obs,
                "forecast_track": parsed_fc,
                "total_observed_points": len(parsed_obs),
                "total_forecast_points": len(parsed_fc)
            })

        # Sort Indian Ocean storms first, then by number of forecast waypoints
        parsed_storms.sort(key=lambda s: (1 if s["is_indian_ocean"] else 0, len(s["forecast_track"])), reverse=True)

        success_time = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
        latest_issuance = parsed_storms[0]["advisory_time_ist"] if parsed_storms else None
        latest_observed = parsed_storms[0]["latest_observed_time"] if parsed_storms else None

        result = {
            "status": "connected",
            "message": "Successfully synchronized Spire Weather forecast tracks.",
            "source": "Spire Weather Storm Tracking API",
            "advisory_issuance_time": latest_issuance,
            "latest_observed_time": latest_observed,
            "last_successful_retrieval": success_time,
            "total_storms": len(parsed_storms),
            "indian_ocean_storms": sum(1 for s in parsed_storms if s["is_indian_ocean"]),
            "storms": parsed_storms,
            "is_stale": False
        }

        # Update cache
        _spire_cache["timestamp"] = now
        _spire_cache["data"] = result
        _spire_cache["last_successful_time"] = success_time

        return result

    except requests.exceptions.Timeout:
        logger.warning("Spire Weather API request timed out (12s threshold).")
        return _handle_failure("Spire Weather API timed out. Preserving last successful response.")
    except requests.exceptions.RequestException as req_err:
        logger.warning(f"Spire API network error: {req_err}")
        return _handle_failure(f"Network error communicating with Spire API: {str(req_err)}")
    except Exception as exc:
        logger.error(f"Unexpected Spire parser error: {exc}")
        return _handle_failure(f"Error parsing Spire storm feed: {str(exc)}")


def _handle_failure(error_msg: str) -> Dict[str, Any]:
    """Preserves last successful response if temporary API request fails, flagging as stale."""
    if _spire_cache["data"] is not None:
        cached = dict(_spire_cache["data"])
        cached["is_stale"] = True
        cached["status"] = "stale_cached"
        cached["warning_message"] = f"Displaying stale data. Reason: {error_msg}"
        cached["last_successful_retrieval"] = _spire_cache.get("last_successful_time")
        return cached

    return {
        "status": "error",
        "message": error_msg,
        "source": "Spire Weather Storm Tracking API",
        "advisory_issuance_time": None,
        "latest_observed_time": None,
        "last_successful_retrieval": None,
        "total_storms": 0,
        "indian_ocean_storms": 0,
        "storms": [],
        "is_stale": True
    }
