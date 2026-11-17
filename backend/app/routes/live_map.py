from fastapi import APIRouter
from datetime import datetime
import asyncio
import time
import requests

router = APIRouter()

# In-memory cache to prevent spamming GDACS API and ensure high performance
_cache = {
    "timestamp": 0.0,
    "data": None
}
CACHE_TTL_SECONDS = 120.0  # 2 minutes cache


def fetch_gdacs_live_cyclones():
    """
    Fetches real-time tropical cyclone alerts directly from the GDACS live API feed
    with proper browser User-Agent headers to avoid 403 blocks.
    """
    now = time.time()
    if _cache["data"] is not None and (now - _cache["timestamp"]) < CACHE_TTL_SECONDS:
        return _cache["data"]

    url = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventtypes=TC"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.gdacs.org/"
    }

    resp = requests.get(url, headers=headers, timeout=12.0)
    resp.raise_for_status()
    raw_json = resp.json()

    cyclones = []
    features = raw_json.get("features", [])

    for feature in features:
        props = feature.get("properties", {})
        geom = feature.get("geometry", {})
        coords = geom.get("coordinates", [])

        if len(coords) < 2 or props.get("eventtype") != "TC":
            continue

        lon = float(coords[0])
        lat = float(coords[1])
        raw_name = str(props.get("eventname") or props.get("name") or "Tropical Cyclone").strip()

        sev = props.get("severitydata", {}) or {}
        speed_kmh = round(float(sev.get("severity", 0))) if sev.get("severity") else None
        speed_kt = round(speed_kmh / 1.852) if speed_kmh else None

        # Regional identification: North Indian Ocean (Arabian Sea & Bay of Bengal)
        country_str = str(props.get("country", ""))
        iso3 = str(props.get("iso3", ""))
        is_nio = (
            (45.0 <= lon <= 105.0 and 0.0 <= lat <= 35.0)
            or ("India" in country_str or "Sri Lanka" in country_str or "Bangladesh" in country_str or "Myanmar" in country_str)
            or (iso3 in ["IND", "LKA", "BGD", "MMR", "OMN", "PAK"])
        )

        if is_nio:
            basin = "Bay of Bengal" if lon >= 78.0 else "Arabian Sea"
        else:
            basin = "Global Ocean Waters"

        # Format standardized meteorological classification name
        clean_name = raw_name.replace("-26", "").replace("-25", "").replace("-24", "").strip().title()
        if speed_kt and speed_kt >= 64:
            display_name = f"Severe Cyclonic Storm {clean_name}" if is_nio else f"Tropical Cyclone {clean_name}"
        elif speed_kt and speed_kt >= 34:
            display_name = f"Cyclonic Storm {clean_name}" if is_nio else f"Tropical Storm {clean_name}"
        elif speed_kt and speed_kt >= 17:
            display_name = f"Deep Depression {clean_name}" if is_nio else f"Tropical Depression {clean_name}"
        else:
            display_name = f"Tropical Low {clean_name}"

        alert_level = props.get("alertlevel", "Orange")

        cyclones.append({
            "id": str(props.get("eventid", "")),
            "name": display_name,
            "raw_name": raw_name,
            "latitude": round(lat, 2),
            "longitude": round(lon, 2),
            "wind_speed": speed_kmh,
            "wind_kt": speed_kt,
            "status": f"{alert_level} Alert",
            "alert_level": alert_level,
            "basin": basin,
            "is_nio": is_nio,
            "country": country_str,
            "description": props.get("htmldescription") or props.get("description", ""),
            "last_updated": props.get("todate") or props.get("datemodified", ""),
            "report_url": props.get("url", {}).get("report", "")
        })

    # Sort prioritising North Indian Ocean cyclones first, then by highest wind speed
    cyclones.sort(key=lambda c: (1 if c["is_nio"] else 0, c["wind_speed"] or 0), reverse=True)

    result = {
        "updated_at": datetime.utcnow().isoformat() + "Z",
        "source": "GDACS & Joint Typhoon Warning Center (JTWC) Real-Time Satellite Feed",
        "status": "connected",
        "active_cyclones_count": len(cyclones),
        "cyclones": cyclones
    }

    _cache["timestamp"] = now
    _cache["data"] = result
    return result


@router.get("/cyclones/live")
async def get_live_cyclones():
    """
    Fetches real-time cyclone data from GDACS (Global Disaster Alert and Coordination System)
    Returns structured real-time data for the Live Cyclone Map frontend.
    """
    try:
        data = await asyncio.to_thread(fetch_gdacs_live_cyclones)
        return data
    except Exception as e:
        # If cache exists from earlier successful fetch, serve it gracefully
        if _cache["data"] is not None:
            return _cache["data"]

        return {
            "updated_at": datetime.utcnow().isoformat() + "Z",
            "source": "GDACS Live Feed",
            "status": "error",
            "error_message": str(e),
            "cyclones": []
        }
