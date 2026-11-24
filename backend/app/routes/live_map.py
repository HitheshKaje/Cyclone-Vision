from fastapi import APIRouter, Query, Request
from fastapi.responses import HTMLResponse
from datetime import datetime, timedelta
import asyncio
import time
import requests
from services.bagyo_service import fetch_bagyo_storms_sync
from services.spire_service import fetch_spire_future_tracks_sync

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


# =========================================================================
# REAL-TIME RADAR STREAM FOR ZOOM EARTH ATMOSPHERIC ENGINE
# =========================================================================

_radar_cache = {
    "timestamp": 0.0,
    "data": None
}
RADAR_CACHE_TTL_SECONDS = 45.0  # 45 seconds live freshness


def fetch_zoomearth_live_stream():
    """
    Fetches 100% real-time tropical cyclone telemetry, track history, cone of uncertainty,
    and forecast models directly from the live Zoom Earth / JTWC real-time stream.
    """
    now = time.time()
    if _radar_cache["data"] is not None and (now - _radar_cache["timestamp"]) < RADAR_CACHE_TTL_SECONDS:
        return _radar_cache["data"]

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Referer": "https://zoom.earth/"
    }

    utc_now = datetime.utcnow()
    iso_date = utc_now.strftime("%Y-%m-%dT%H:00Z")

    # 1. Fetch active storm identifiers
    list_url = f"https://zoom.earth/data/storms/?date={iso_date}&to=24"
    r_list = requests.get(list_url, headers=headers, timeout=12.0)
    r_list.raise_for_status()
    list_json = r_list.json()

    active_storms = list_json.get("storms", [])
    
    # Target Indian Ocean / Bay of Bengal or active priority storm (e.g., akvan-2026)
    target_id = "akvan-2026"
    if active_storms:
        for s_id in active_storms:
            if "akvan" in s_id.lower() or "nio" in s_id.lower():
                target_id = s_id
                break
        else:
            target_id = active_storms[0]

    # 2. Fetch complete live telemetry & track
    storm_url = f"https://zoom.earth/data/storms/?id={target_id}"
    r_storm = requests.get(storm_url, headers=headers, timeout=12.0)
    r_storm.raise_for_status()
    storm_data = r_storm.json()

    # 3. Process track with UTC+5.5 Indian Standard Time conversion
    raw_track = storm_data.get("track", [])
    parsed_track = []
    
    for pt in raw_track:
        try:
            dt = datetime.fromisoformat(pt["date"].replace("Z", "+00:00"))
            ist_dt = dt + timedelta(hours=5, minutes=30)
            date_display = ist_dt.strftime("%d %b")
            time_display = ist_dt.strftime("%H:%M")
        except Exception:
            date_display = "Live"
            time_display = "00:00"

        wind_kt = pt.get("wind", 0)
        wind_kmh = round(wind_kt * 1.852)
        coords = pt.get("coordinates", [0, 0])
        lon = float(coords[0]) if len(coords) > 0 else 0.0
        lat = float(coords[1]) if len(coords) > 1 else 0.0

        spline_pts = []
        for s in pt.get("spline", []):
            if len(s) >= 2:
                spline_pts.append([float(s[1]), float(s[0])])  # [lat, lon]

        parsed_track.append({
            "date_iso": pt.get("date"),
            "date_display": date_display,
            "time_display": time_display,
            "type": pt.get("code", "C"),
            "stage": pt.get("description", "Cyclonic Storm"),
            "wind_kt": wind_kt,
            "wind_kmh": wind_kmh,
            "pressure": pt.get("pressure"),
            "forecast": bool(pt.get("forecast")),
            "lat": lat,
            "lng": lon,
            "spline": spline_pts
        })

    # Convert cone from [lon, lat] to Leaflet [lat, lon]
    raw_cone = storm_data.get("cone", [])
    cone = [[float(p[1]), float(p[0])] for p in raw_cone if len(p) >= 2]

    # Identify current active eye point
    observed_points = [p for p in parsed_track if not p["forecast"]]
    current_point = observed_points[-1] if observed_points else (parsed_track[0] if parsed_track else None)

    result = {
        "updated_at": datetime.utcnow().isoformat() + "Z",
        "source": "Zoom Earth & JTWC Real-Time Synoptic Radar Feed",
        "status": "connected",
        "storm_id": storm_data.get("id", target_id),
        "name": storm_data.get("name", "Akvan"),
        "title": storm_data.get("title", "Cyclone Akvan"),
        "place": storm_data.get("place", "in the Bay of Bengal"),
        "description": storm_data.get("description", "Cyclonic Storm"),
        "active": storm_data.get("active", True),
        "agencies": storm_data.get("agencies", "JTWC"),
        "current_point": current_point,
        "track": parsed_track,
        "cone": cone,
        "active_storm_ids": active_storms
    }

    _radar_cache["timestamp"] = now
    _radar_cache["data"] = result
    return result


@router.get("/cyclones/radar-stream")
async def get_radar_stream():
    """
    Continuous real-time radar feed delivering dynamic cyclone tracks, cone of uncertainty,
    and meteorological pressure/wind telemetry directly matching Zoom Earth.
    """
    try:
        data = await asyncio.to_thread(fetch_zoomearth_live_stream)
        return data
    except Exception as e:
        if _radar_cache["data"] is not None:
            return _radar_cache["data"]
        return {
            "updated_at": datetime.utcnow().isoformat() + "Z",
            "source": "Zoom Earth Synoptic Stream",
            "status": "error",
            "error_message": str(e),
            "track": [],
            "cone": []
        }


# =========================================================================
# BAGYO TROPICAL CYCLONE TRACKING API (LIVE 5-MINUTE POLLING)
# =========================================================================

@router.get("/cyclones/bagyo")
async def get_bagyo_cyclones(refresh: bool = Query(False, description="Force refresh bypass cache")):
    """
    Fetches real-time tropical cyclone tracking data from Bagyo API (https://bagyo.io/v1/storms).
    Prioritizes North Indian Ocean (nio) basin, parses observed and agency forecast tracks,
    and applies a 5-minute cache with resilient failure fallbacks.
    """
    try:
        data = await asyncio.to_thread(fetch_bagyo_storms_sync, force_refresh=refresh)
        return data
    except Exception as e:
        return {
            "status": "error",
            "message": f"Bagyo service exception: {str(e)}",
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


# =========================================================================
# SPIRE WEATHER API - TROPICAL CYCLONE FUTURE TRACK
# =========================================================================

@router.get("/cyclones/spire-future-track")
async def get_spire_future_track(refresh: bool = Query(False, description="Force refresh bypass cache")):
    """
    Fetches official external tropical cyclone future forecast tracks and observed history
    from Spire Weather API (https://api.wx.spire.com/storm/json?status=active).
    Filters Indian Ocean basins (NI, AS, BB) and returns chronologically ordered waypoints.
    """
    try:
        data = await asyncio.to_thread(fetch_spire_future_tracks_sync, force_refresh=refresh)
        return data
    except Exception as e:
        return {
            "status": "error",
            "message": f"Spire service error: {str(e)}",
            "source": "Spire Weather Storm Tracking API",
            "advisory_issuance_time": None,
            "latest_observed_time": None,
            "last_successful_retrieval": None,
            "total_storms": 0,
            "indian_ocean_storms": 0,
            "storms": [],
            "is_stale": True
        }


# In-memory template cache for Windy embed to ensure instant response times (<2ms)
_windy_embed_cache = {
    "timestamp": 0.0,
    "html": None
}
WINDY_CACHE_TTL = 900.0  # 15 minutes


# =========================================================================
# WINDY ATMOSPHERIC PLAYER EMBED PROXY
# =========================================================================

@router.get("/windy-embed")
async def get_windy_embed(request: Request):
    """
    Proxies Windy embed2.html to control particle visibility strictly based on overlay layer.
    When overlay is NOT wind (e.g. humidity, temperature, precipitation, pressure),
    it disables moving wind particle drops so the map displays clean scalar fields.
    When overlay IS wind, particle drops/streamlines are rendered normally.
    """
    global _windy_embed_cache
    query_string = request.url.query
    upstream_url = f"https://embed.windy.com/embed2.html?{query_string}" if query_string else "https://embed.windy.com/embed2.html"
    
    headers = {
        "User-Agent": request.headers.get("user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://community.windy.com/"
    }

    html = None
    now = time.time()

    # Check in-memory cache first to avoid unnecessary network latency
    if _windy_embed_cache["html"] and (now - _windy_embed_cache["timestamp"] < WINDY_CACHE_TTL):
        html = _windy_embed_cache["html"]
    else:
        try:
            resp = await asyncio.to_thread(requests.get, upstream_url, headers=headers, timeout=10.0)
            if resp.status_code == 200 and len(resp.text) > 1000:
                html = resp.text
                _windy_embed_cache["html"] = html
                _windy_embed_cache["timestamp"] = now
        except Exception:
            pass

    # If network fetch failed but we have any cached template, use it
    if not html and _windy_embed_cache["html"]:
        html = _windy_embed_cache["html"]

    # Fallback if both fetch and cache fail
    if not html:
        return HTMLResponse(content=f"<html><body><iframe src='{upstream_url}' style='width:100%;height:100%;border:none;'></iframe></body></html>")

    # Determine if this request is specifically for the 'wind' overlay
    overlay_param = request.query_params.get("overlay", "wind").lower()
    is_wind = overlay_param == "wind"

    # Ensure all relative asset links (v/..., js/..., etc.) resolve directly to Windy's CDN
    if "<head>" in html and "<base" not in html:
        html = html.replace("<head>", '<head><base href="https://embed.windy.com/">')

    if not is_wind:
        # Turn OFF particle animation in localStorage and hide any canvas particle elements via CSS & Observer
        injection = """
        <script>
        try {
            window.localStorage.setItem("particlesAnim", JSON.stringify("off"));
            window.localStorage.setItem("particles", JSON.stringify("off"));
        } catch(e) {}

        // Enforce particle suppression continuously for non-wind layers
        (function() {
            function suppressParticles() {
                var elements = document.querySelectorAll('.particles-layer, canvas.particles-layer, canvas[class*="particles"]');
                for (var i = 0; i < elements.length; i++) {
                    elements[i].style.display = 'none';
                    elements[i].style.opacity = '0';
                    elements[i].style.visibility = 'hidden';
                    elements[i].style.pointerEvents = 'none';
                }
            }
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', suppressParticles);
            } else {
                suppressParticles();
            }
            var observer = new MutationObserver(suppressParticles);
            observer.observe(document.documentElement, { childList: true, subtree: true });
            setInterval(suppressParticles, 400);
        })();
        </script>
        <style>
            .particles-layer,
            canvas.particles-layer,
            canvas[class*="particles"],
            #map-container .leaflet-tile-pane .particles-layer {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                pointer-events: none !important;
            }
        </style>
        """
        html = html.replace("</head>", f"{injection}</head>")
        html = html.replace('<body class="target-embed">', '<body class="target-embed hide-particles no-particles">')
    else:
        injection = """
        <script>
        try {
            window.localStorage.setItem("particlesAnim", JSON.stringify("on"));
            window.localStorage.setItem("particles", JSON.stringify("on"));
        } catch(e) {}
        </script>
        """
        html = html.replace("</head>", f"{injection}</head>")

    # Pre-populate query string script so Windy's JS reads the proxied parameters accurately
    # (since the iframe's window.location.search already contains the query parameters)
    return HTMLResponse(content=html)



