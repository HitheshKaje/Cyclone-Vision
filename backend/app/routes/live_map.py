from fastapi import APIRouter
from datetime import datetime
import urllib.request
import json
import ssl
import asyncio

router = APIRouter()

def fetch_gdacs_data():
    url = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventtypes=TC"
    context = ssl.create_default_context()
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, context=context, timeout=10.0) as response:
        return json.loads(response.read().decode('utf-8'))

@router.get("/cyclones/live")
async def get_live_cyclones():
    """
    Fetches real-time cyclone data from GDACS (Global Disaster Alert and Coordination System)
    Returns structured data for the Live Cyclone Map frontend.
    """
    try:
        data = await asyncio.to_thread(fetch_gdacs_data)
        
        cyclones = []
        if "features" in data:
            for feature in data["features"]:
                props = feature.get("properties", {})
                geom = feature.get("geometry", {})
                coords = geom.get("coordinates", [])
                
                # Only include if we have coordinates and it's a current event and it is a TC
                if len(coords) >= 2 and props.get("iscurrent") == "true" and props.get("eventtype") == "TC":
                    cyclones.append({
                        "id": str(props.get("eventid", "")),
                        "name": props.get("eventname", "Unknown Cyclone"),
                        "latitude": coords[1],
                        "longitude": coords[0],
                        "wind_speed": props.get("severitydata", {}).get("severity", None),
                        "pressure": None, 
                        "status": props.get("alertlevel", "Unknown"),
                        "movement_direction": None,
                        "movement_speed": None,
                        "description": props.get("description", ""),
                        "last_updated": props.get("todate", "")
                    })
                    
        return {
            "updated_at": datetime.utcnow().isoformat() + "Z",
            "source": "GDACS (Global Disaster Alert and Coordination System)",
            "status": "connected",
            "cyclones": cyclones
        }
        
    except Exception as e:
        return {
            "updated_at": datetime.utcnow().isoformat() + "Z",
            "source": "GDACS",
            "status": "error",
            "error_message": str(e),
            "cyclones": []
        }
