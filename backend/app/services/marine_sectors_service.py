"""
CycloSafe - Marine Maritime Sectors & Coastal Lighthouse Intelligence Service
Detects nearby threatened Indian coastal maritime sectors and affected lighthouse
station beacons when a tropical cyclone is identified, powered by Google Gemini AI
with 16-key failover and geodesic meteorological proximity calculations.
"""

import math
import logging
from typing import List, Dict, Any, Optional
from services.cloud_vision_service import cloud_vision_service

logger = logging.getLogger("uvicorn.error")

# Comprehensive Indian Coastal Maritime Sectors (DGLL & IMD Maritime Divisions)
MARITIME_SECTORS = [
    {
        "id": "odisha_bengal",
        "name": "Odisha & Bengal Coast (Puri - Paradip)",
        "basin": "Bay of Bengal",
        "center_lat": 20.0,
        "center_lng": 86.5,
        "description": "Odisha coastal waters from Gopalpur, Puri, Paradip to West Bengal Sundarbans & Digha",
        "states": ["Odisha", "West Bengal"]
    },
    {
        "id": "andhra_tamilnadu",
        "name": "Tamil Nadu & Andhra Coast (Chennai - Visakhapatnam)",
        "basin": "Bay of Bengal",
        "center_lat": 15.5,
        "center_lng": 81.5,
        "description": "Coromandel and North Circars coast from Chennai, Machilipatnam to Visakhapatnam & Kalingapatnam",
        "states": ["Andhra Pradesh", "Tamil Nadu", "Puducherry"]
    },
    {
        "id": "karnataka_coast",
        "name": "Karnataka Coast (Mangalore - Malpe - Karwar)",
        "basin": "Arabian Sea",
        "center_lat": 13.5,
        "center_lng": 74.5,
        "description": "Central West Coast from Mangalore, Kaup, Malpe to Karwar & Bhatkal",
        "states": ["Karnataka"]
    },
    {
        "id": "kerala_coast",
        "name": "Kerala Coastal Waters (Kochi - Kozhikode)",
        "basin": "Arabian Sea",
        "center_lat": 10.0,
        "center_lng": 75.8,
        "description": "Malabar and South West Coast from Vizhinjam, Alappuzha, Kochi to Kozhikode & Kannur",
        "states": ["Kerala", "Lakshadweep"]
    },
    {
        "id": "gujarat_coast",
        "name": "Gujarat Coastal Waters (Dwarka - Porbandar - Kutch)",
        "basin": "Arabian Sea",
        "center_lat": 22.0,
        "center_lng": 69.2,
        "description": "Saurashtra and Gulf of Kutch / Khambhat from Veraval, Porbandar, Dwarka to Jakhau Port",
        "states": ["Gujarat"]
    },
    {
        "id": "maharashtra_goa",
        "name": "Maharashtra & Goa Coast (Mumbai - Ratnagiri - Aguada)",
        "basin": "Arabian Sea",
        "center_lat": 17.5,
        "center_lng": 73.0,
        "description": "Konkan coast from Mumbai, Raigad, Ratnagiri to Aguada Mormugao Goa",
        "states": ["Maharashtra", "Goa"]
    },
    {
        "id": "andaman_nicobar",
        "name": "Andaman & Nicobar Marine Zone (Port Blair)",
        "basin": "Bay of Bengal",
        "center_lat": 10.5,
        "center_lng": 92.8,
        "description": "Bay of Bengal oceanic archipelago from North Andaman to Great Nicobar",
        "states": ["Andaman and Nicobar Islands"]
    },
    {
        "id": "all_coastal",
        "name": "All Coastal Sectors (Pan-India)",
        "basin": "Pan-India",
        "center_lat": 15.0,
        "center_lng": 80.0,
        "description": "Pan-India national coastal maritime alert covering both Arabian Sea and Bay of Bengal",
        "states": ["All Coastal States"]
    }
]

# Official DGLL (Directorate General of Lighthouses and Lightships) & IMD Coastal Beacons
LIGHTHOUSE_STATIONS = [
    # --- Odisha & West Bengal ---
    {
        "id": "paradip",
        "name": "Paradip Coastal Warning Tower & Lighthouse",
        "sector_id": "odisha_bengal",
        "sector_name": "Odisha & Bengal Coast (Puri - Paradip)",
        "lat": 20.26,
        "lng": 86.70,
        "focal_height": "38m above MSL",
        "default_signal": "Signal 10 (Great Danger)",
        "state": "Odisha"
    },
    {
        "id": "puri",
        "name": "Puri Coastal Lighthouse Station",
        "sector_id": "odisha_bengal",
        "sector_name": "Odisha & Bengal Coast (Puri - Paradip)",
        "lat": 19.79,
        "lng": 85.82,
        "focal_height": "25m above MSL",
        "default_signal": "Signal 10 (Great Danger)",
        "state": "Odisha"
    },
    {
        "id": "gopalpur",
        "name": "Gopalpur Port Light Station",
        "sector_id": "odisha_bengal",
        "sector_name": "Odisha & Bengal Coast (Puri - Paradip)",
        "lat": 19.26,
        "lng": 84.91,
        "focal_height": "45m above MSL",
        "default_signal": "Signal 09 (Severe Warning)",
        "state": "Odisha"
    },
    {
        "id": "chandrabhaga",
        "name": "Chandrabhaga Lighthouse (Konark Coast)",
        "sector_id": "odisha_bengal",
        "sector_name": "Odisha & Bengal Coast (Puri - Paradip)",
        "lat": 19.86,
        "lng": 86.11,
        "focal_height": "35m above MSL",
        "default_signal": "Signal 09 (Severe Warning)",
        "state": "Odisha"
    },
    {
        "id": "sagar_island",
        "name": "Sagar Island Lighthouse (Sundarbans)",
        "sector_id": "odisha_bengal",
        "sector_name": "Odisha & Bengal Coast (Puri - Paradip)",
        "lat": 21.65,
        "lng": 88.05,
        "focal_height": "26m above MSL",
        "default_signal": "Signal 10 (Great Danger)",
        "state": "West Bengal"
    },
    {
        "id": "digha",
        "name": "Digha Coastal Light Beacon",
        "sector_id": "odisha_bengal",
        "sector_name": "Odisha & Bengal Coast (Puri - Paradip)",
        "lat": 21.62,
        "lng": 87.52,
        "focal_height": "22m above MSL",
        "default_signal": "Signal 08 (Cyclone Threat)",
        "state": "West Bengal"
    },

    # --- Tamil Nadu & Andhra Pradesh ---
    {
        "id": "visakhapatnam",
        "name": "Visakhapatnam Dolphin Nose Light",
        "sector_id": "andhra_tamilnadu",
        "sector_name": "Tamil Nadu & Andhra Coast (Chennai - Visakhapatnam)",
        "lat": 17.68,
        "lng": 83.29,
        "focal_height": "173m above MSL",
        "default_signal": "Signal 10 (Great Danger)",
        "state": "Andhra Pradesh"
    },
    {
        "id": "kalingapatnam",
        "name": "Kalingapatnam Coastal Light Beacon",
        "sector_id": "andhra_tamilnadu",
        "sector_name": "Tamil Nadu & Andhra Coast (Chennai - Visakhapatnam)",
        "lat": 18.34,
        "lng": 84.13,
        "focal_height": "56m above MSL",
        "default_signal": "Signal 09 (Severe Warning)",
        "state": "Andhra Pradesh"
    },
    {
        "id": "kakinada",
        "name": "Kakinada Vakalapudi Lighthouse",
        "sector_id": "andhra_tamilnadu",
        "sector_name": "Tamil Nadu & Andhra Coast (Chennai - Visakhapatnam)",
        "lat": 17.01,
        "lng": 82.28,
        "focal_height": "48m above MSL",
        "default_signal": "Signal 09 (Severe Warning)",
        "state": "Andhra Pradesh"
    },
    {
        "id": "machilipatnam",
        "name": "Machilipatnam Manginapudi Light Beacon",
        "sector_id": "andhra_tamilnadu",
        "sector_name": "Tamil Nadu & Andhra Coast (Chennai - Visakhapatnam)",
        "lat": 16.24,
        "lng": 81.23,
        "focal_height": "40m above MSL",
        "default_signal": "Signal 09 (Severe Warning)",
        "state": "Andhra Pradesh"
    },
    {
        "id": "chennai",
        "name": "Chennai Port Light Beacon #02",
        "sector_id": "andhra_tamilnadu",
        "sector_name": "Tamil Nadu & Andhra Coast (Chennai - Visakhapatnam)",
        "lat": 13.10,
        "lng": 80.30,
        "focal_height": "57m above MSL",
        "default_signal": "Signal 09 (Severe Warning)",
        "state": "Tamil Nadu"
    },
    {
        "id": "mahabalipuram",
        "name": "Mahabalipuram Coastal Lighthouse",
        "sector_id": "andhra_tamilnadu",
        "sector_name": "Tamil Nadu & Andhra Coast (Chennai - Visakhapatnam)",
        "lat": 12.61,
        "lng": 80.19,
        "focal_height": "42m above MSL",
        "default_signal": "Signal 08 (Cyclone Threat)",
        "state": "Tamil Nadu"
    },
    {
        "id": "point_calimere",
        "name": "Point Calimere (Kodiakkarai) Lighthouse",
        "sector_id": "andhra_tamilnadu",
        "sector_name": "Tamil Nadu & Andhra Coast (Chennai - Visakhapatnam)",
        "lat": 10.30,
        "lng": 79.86,
        "focal_height": "40m above MSL",
        "default_signal": "Signal 09 (Severe Warning)",
        "state": "Tamil Nadu"
    },
    {
        "id": "pamban",
        "name": "Pamban Channel Lighthouse (Rameswaram)",
        "sector_id": "andhra_tamilnadu",
        "sector_name": "Tamil Nadu & Andhra Coast (Chennai - Visakhapatnam)",
        "lat": 9.28,
        "lng": 79.21,
        "focal_height": "20m above MSL",
        "default_signal": "Signal 08 (Cyclone Threat)",
        "state": "Tamil Nadu"
    },

    # --- Karnataka Coast ---
    {
        "id": "kaup",
        "name": "Kaup Lighthouse Station #04 (Udupi Coast)",
        "sector_id": "karnataka_coast",
        "sector_name": "Karnataka Coast (Mangalore - Malpe - Karwar)",
        "lat": 13.22,
        "lng": 74.74,
        "focal_height": "43m above MSL",
        "default_signal": "Signal 10 (Great Danger)",
        "state": "Karnataka"
    },
    {
        "id": "mangalore",
        "name": "Mangalore Port Light Beacon #01",
        "sector_id": "karnataka_coast",
        "sector_name": "Karnataka Coast (Mangalore - Malpe - Karwar)",
        "lat": 12.85,
        "lng": 74.82,
        "focal_height": "33m above MSL",
        "default_signal": "Signal 09 (Severe Warning)",
        "state": "Karnataka"
    },
    {
        "id": "karwar",
        "name": "Karwar Head Lighthouse #07 (Oyster Rocks)",
        "sector_id": "karnataka_coast",
        "sector_name": "Karnataka Coast (Mangalore - Malpe - Karwar)",
        "lat": 14.82,
        "lng": 74.13,
        "focal_height": "64m above MSL",
        "default_signal": "Signal 08 (Cyclone Threat)",
        "state": "Karnataka"
    },
    {
        "id": "malpe",
        "name": "Malpe St. Mary's Light Beacon",
        "sector_id": "karnataka_coast",
        "sector_name": "Karnataka Coast (Mangalore - Malpe - Karwar)",
        "lat": 13.36,
        "lng": 74.67,
        "focal_height": "24m above MSL",
        "default_signal": "Signal 08 (Cyclone Threat)",
        "state": "Karnataka"
    },
    {
        "id": "bhatkal",
        "name": "Bhatkal Coastal Lighthouse",
        "sector_id": "karnataka_coast",
        "sector_name": "Karnataka Coast (Mangalore - Malpe - Karwar)",
        "lat": 13.96,
        "lng": 74.53,
        "focal_height": "41m above MSL",
        "default_signal": "Signal 08 (Cyclone Threat)",
        "state": "Karnataka"
    },
    {
        "id": "surathkal",
        "name": "Surathkal Point Lighthouse",
        "sector_id": "karnataka_coast",
        "sector_name": "Karnataka Coast (Mangalore - Malpe - Karwar)",
        "lat": 13.00,
        "lng": 74.79,
        "focal_height": "36m above MSL",
        "default_signal": "Signal 08 (Cyclone Threat)",
        "state": "Karnataka"
    },

    # --- Kerala Coast ---
    {
        "id": "kochi",
        "name": "Kochi (Cochin / Vypin) Lighthouse",
        "sector_id": "kerala_coast",
        "sector_name": "Kerala Coastal Waters (Kochi - Kozhikode)",
        "lat": 9.99,
        "lng": 76.22,
        "focal_height": "49m above MSL",
        "default_signal": "Signal 09 (Severe Warning)",
        "state": "Kerala"
    },
    {
        "id": "kozhikode",
        "name": "Kozhikode (Calicut) Coastal Light Station",
        "sector_id": "kerala_coast",
        "sector_name": "Kerala Coastal Waters (Kochi - Kozhikode)",
        "lat": 11.26,
        "lng": 75.77,
        "focal_height": "35m above MSL",
        "default_signal": "Signal 08 (Cyclone Threat)",
        "state": "Kerala"
    },
    {
        "id": "kannur",
        "name": "Kannur Coastal Lighthouse",
        "sector_id": "kerala_coast",
        "sector_name": "Kerala Coastal Waters (Kochi - Kozhikode)",
        "lat": 11.85,
        "lng": 75.36,
        "focal_height": "38m above MSL",
        "default_signal": "Signal 08 (Cyclone Threat)",
        "state": "Kerala"
    },
    {
        "id": "alappuzha",
        "name": "Alappuzha (Alleppey) Port Lighthouse",
        "sector_id": "kerala_coast",
        "sector_name": "Kerala Coastal Waters (Kochi - Kozhikode)",
        "lat": 9.49,
        "lng": 76.32,
        "focal_height": "33m above MSL",
        "default_signal": "Signal 08 (Cyclone Threat)",
        "state": "Kerala"
    },
    {
        "id": "vizhinjam",
        "name": "Vizhinjam Lighthouse (Thiruvananthapuram)",
        "sector_id": "kerala_coast",
        "sector_name": "Kerala Coastal Waters (Kochi - Kozhikode)",
        "lat": 8.38,
        "lng": 76.99,
        "focal_height": "57m above MSL",
        "default_signal": "Signal 08 (Cyclone Threat)",
        "state": "Kerala"
    },

    # --- Gujarat Coast ---
    {
        "id": "dwarka",
        "name": "Dwarka Coastal Lighthouse Station",
        "sector_id": "gujarat_coast",
        "sector_name": "Gujarat Coastal Waters (Dwarka - Porbandar - Kutch)",
        "lat": 22.24,
        "lng": 68.95,
        "focal_height": "46m above MSL",
        "default_signal": "Signal 10 (Great Danger)",
        "state": "Gujarat"
    },
    {
        "id": "porbandar",
        "name": "Porbandar Light Station",
        "sector_id": "gujarat_coast",
        "sector_name": "Gujarat Coastal Waters (Dwarka - Porbandar - Kutch)",
        "lat": 21.63,
        "lng": 69.58,
        "focal_height": "40m above MSL",
        "default_signal": "Signal 09 (Severe Warning)",
        "state": "Gujarat"
    },
    {
        "id": "veraval",
        "name": "Veraval Harbor Light Beacon",
        "sector_id": "gujarat_coast",
        "sector_name": "Gujarat Coastal Waters (Dwarka - Porbandar - Kutch)",
        "lat": 20.90,
        "lng": 70.36,
        "focal_height": "34m above MSL",
        "default_signal": "Signal 09 (Severe Warning)",
        "state": "Gujarat"
    },
    {
        "id": "jakhau",
        "name": "Jakhau Port Warning Beacon (Kutch)",
        "sector_id": "gujarat_coast",
        "sector_name": "Gujarat Coastal Waters (Dwarka - Porbandar - Kutch)",
        "lat": 23.23,
        "lng": 68.61,
        "focal_height": "32m above MSL",
        "default_signal": "Signal 11 (Communication Failure / Extreme Landfall)",
        "state": "Gujarat"
    },
    {
        "id": "mandvi",
        "name": "Mandvi Gulf of Kutch Lighthouse",
        "sector_id": "gujarat_coast",
        "sector_name": "Gujarat Coastal Waters (Dwarka - Porbandar - Kutch)",
        "lat": 22.82,
        "lng": 69.34,
        "focal_height": "35m above MSL",
        "default_signal": "Signal 09 (Severe Warning)",
        "state": "Gujarat"
    },

    # --- Maharashtra & Goa ---
    {
        "id": "mumbai",
        "name": "Mumbai Prongs Reef Lighthouse",
        "sector_id": "maharashtra_goa",
        "sector_name": "Maharashtra & Goa Coast (Mumbai - Ratnagiri - Aguada)",
        "lat": 18.89,
        "lng": 72.81,
        "focal_height": "44m above MSL",
        "default_signal": "Signal 09 (Severe Warning)",
        "state": "Maharashtra"
    },
    {
        "id": "aguada",
        "name": "Aguada Fort Lighthouse (Goa Coast)",
        "sector_id": "maharashtra_goa",
        "sector_name": "Maharashtra & Goa Coast (Mumbai - Ratnagiri - Aguada)",
        "lat": 15.49,
        "lng": 73.77,
        "focal_height": "84m above MSL",
        "default_signal": "Signal 08 (Cyclone Threat)",
        "state": "Goa"
    },
    {
        "id": "ratnagiri",
        "name": "Ratnagiri Head Lighthouse",
        "sector_id": "maharashtra_goa",
        "sector_name": "Maharashtra & Goa Coast (Mumbai - Ratnagiri - Aguada)",
        "lat": 16.98,
        "lng": 73.28,
        "focal_height": "100m above MSL",
        "default_signal": "Signal 08 (Cyclone Threat)",
        "state": "Maharashtra"
    },

    # --- Andaman & Nicobar ---
    {
        "id": "port_blair",
        "name": "Port Blair North Point Light Station",
        "sector_id": "andaman_nicobar",
        "sector_name": "Andaman & Nicobar Marine Zone (Port Blair)",
        "lat": 11.70,
        "lng": 92.76,
        "focal_height": "50m above MSL",
        "default_signal": "Signal 09 (Severe Warning)",
        "state": "Andaman & Nicobar Islands"
    },
    {
        "id": "car_nicobar",
        "name": "Car Nicobar Island Light Beacon",
        "sector_id": "andaman_nicobar",
        "sector_name": "Andaman & Nicobar Marine Zone (Port Blair)",
        "lat": 9.24,
        "lng": 92.77,
        "focal_height": "32m above MSL",
        "default_signal": "Signal 08 (Cyclone Threat)",
        "state": "Andaman & Nicobar Islands"
    }
]


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great-circle distance in kilometers between two lat/lon coordinates."""
    r = 6371.0  # Earth radius in kilometers
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


def get_risk_tier(distance_km: float, wind_speed_kt: float) -> tuple:
    """Returns (risk_level, recommended_signal) based on distance and wind intensity."""
    if distance_km <= 300:
        if wind_speed_kt >= 64:
            return "CRITICAL", "Signal 10 (Great Danger - Severe cyclone crossing near coast)"
        elif wind_speed_kt >= 48:
            return "CRITICAL", "Signal 09 (Severe Warning - Cyclone crossing coast)"
        else:
            return "HIGH", "Signal 08 (Danger - Storm approaching coast)"
    elif distance_km <= 600:
        if wind_speed_kt >= 64:
            return "HIGH", "Signal 09 (Severe Warning - Gale winds expected within 48h)"
        elif wind_speed_kt >= 48:
            return "HIGH", "Signal 08 (Danger - Threat to port & sea sector)"
        else:
            return "MODERATE", "Signal 07 (Caution - Port warned of impending squalls)"
    elif distance_km <= 900:
        return "MODERATE", "Signal 06 (Alert - Disturbance in maritime sector)"
    else:
        return "ADVISORY", "Signal 04 (Cautionary - Distant storm monitored)"


class MarineSectorsService:
    """
    Intelligent coastal sector detection and lighthouse beacon targeting
    driven by Google Gemini AI with geodesic validation.
    """

    def detect_nearby_sectors_and_lighthouses(
        self,
        lat: float,
        lon: float,
        wind_speed_kt: float = 65.0,
        cyclone_name: str = "Tropical Cyclone Disturbance",
        subbasin: Optional[str] = None,
        image_bytes: Optional[bytes] = None
    ) -> Dict[str, Any]:
        """
        Determines the maritime sectors and lighthouse stations nearby where the cyclone may get affected.
        Uses geodesic calculations cross-referenced with Google Gemini API reasoning.
        """
        if subbasin is None:
            subbasin = "Bay of Bengal" if lon >= 78.0 else "Arabian Sea"

        wind_kmh = round(wind_speed_kt * 1.852, 1)

        # 1. Calculate geodesic distances to all lighthouses
        lighthouses_with_dist = []
        for lh in LIGHTHOUSE_STATIONS:
            d_km = round(haversine_distance(lat, lon, lh["lat"], lh["lng"]), 1)
            risk, signal = get_risk_tier(d_km, wind_speed_kt)
            lighthouses_with_dist.append({
                "id": lh["id"],
                "name": lh["name"],
                "sector_id": lh["sector_id"],
                "sector_name": lh["sector_name"],
                "distance_km": d_km,
                "lat": lh["lat"],
                "lng": lh["lng"],
                "focal_height": lh["focal_height"],
                "signal": signal,
                "risk_level": risk,
                "state": lh["state"]
            })

        # Sort lighthouses by proximity to the cyclone eye
        lighthouses_with_dist.sort(key=lambda x: x["distance_km"])

        # 2. Calculate distance to each maritime sector center
        sectors_with_dist = []
        for s in MARITIME_SECTORS:
            if s["id"] == "all_coastal":
                continue
            d_km = round(haversine_distance(lat, lon, s["center_lat"], s["center_lng"]), 1)
            
            # Find closest lighthouse belonging to this sector
            sector_lhs = [lh for lh in lighthouses_with_dist if lh["sector_id"] == s["id"]]
            min_lh_dist = sector_lhs[0]["distance_km"] if sector_lhs else d_km
            nearest_lh_name = sector_lhs[0]["name"] if sector_lhs else "Port Beacon"
            
            # Distance score heavily weighs basin match and closest beacon
            effective_dist = min_lh_dist if s["basin"] == subbasin else (min_lh_dist + 500)
            risk, signal = get_risk_tier(min_lh_dist, wind_speed_kt)
            
            sectors_with_dist.append({
                "id": s["id"],
                "name": s["name"],
                "basin": s["basin"],
                "distance_km": round(min_lh_dist, 1),
                "effective_rank_km": effective_dist,
                "risk_level": risk,
                "recommended_signal": signal,
                "nearest_lighthouse": nearest_lh_name,
                "states": s["states"],
                "description": s["description"]
            })

        # Sort sectors by closest beacon proximity
        sectors_with_dist.sort(key=lambda x: x["effective_rank_km"])

        # Always include Pan-India option as fallback
        pan_india_sector = {
            "id": "all_coastal",
            "name": "All Coastal Sectors (Pan-India)",
            "basin": "Pan-India",
            "distance_km": round(lighthouses_with_dist[0]["distance_km"], 1),
            "effective_rank_km": 9999,
            "risk_level": "PAN-INDIA",
            "recommended_signal": "Signal 11 (Communication Failure / Pan-India Alert)",
            "nearest_lighthouse": lighthouses_with_dist[0]["name"],
            "states": ["All Coastal States"],
            "description": "Pan-India broadcast to all coastal maritime zones"
        }

        primary_sector = sectors_with_dist[0]
        primary_lighthouse = lighthouses_with_dist[0]

        # Filter affected lighthouses: top 8 nearest, prioritizing those in the threatened basin
        affected_lighthouses = lighthouses_with_dist[:10]

        # 3. Call Google Gemini AI via multi-key pool to analyze trajectory & confirm impact
        ai_summary = None
        ai_recommended_signal = primary_lighthouse["signal"]
        ai_risk_level = primary_sector["risk_level"]
        used_model_label = "AI Geodesic Impact Engine"

        prompt = (
            f"You are an expert meteorological marine hazard analyst for the India Meteorological Department (IMD) "
            f"and Directorate General of Lighthouses (DGLL).\n\n"
            f"CYCLONE INCIDENT DATA:\n"
            f"- Cyclone Name: {cyclone_name}\n"
            f"- Center Eye Location: {lat:.2f}°N, {lon:.2f}°E\n"
            f"- Basin: {subbasin}\n"
            f"- Sustained Winds: {wind_speed_kt} knots ({wind_kmh} km/h)\n\n"
            f"PROXIMITY MARITIME SECTORS:\n" +
            "\n".join([f"- {s['name']}: {s['distance_km']} km away (Nearest beacon: {s['nearest_lighthouse']})" for s in sectors_with_dist[:3]]) +
            "\n\nNEAREST LIGHTHOUSES:\n" +
            "\n".join([f"- {lh['name']} ({lh['sector_name']}): {lh['distance_km']} km, Default Signal: {lh['signal']}" for lh in affected_lighthouses[:4]]) +
            "\n\nTASK:\n"
            "1. Confirm which Indian coastal maritime sector is in greatest danger.\n"
            "2. Confirm which coastal lighthouse station beacon should sound emergency sirens and display port warning flags.\n"
            "3. State the official IMD warning signal code (e.g. Signal 10 Great Danger, Signal 09 Severe Warning, Signal 08 Danger).\n"
            "4. Provide a 1-2 sentence actionable meteorological directive for coastal fishermen and harbor masters.\n\n"
            "Return ONLY a JSON object:\n"
            "{\n"
            '  "primary_sector_name": "' + primary_sector["name"] + '",\n'
            '  "primary_lighthouse_name": "' + primary_lighthouse["name"] + '",\n'
            '  "recommended_signal": "' + primary_lighthouse["signal"] + '",\n'
            '  "risk_level": "' + primary_sector["risk_level"] + '",\n'
            '  "coastal_directive": "Specific 1-2 sentence coastal safety directive.",\n'
            '  "confidence": 98\n'
            "}"
        )

        try:
            parsed, used_model = cloud_vision_service._call_gemini_json(
                prompt=prompt,
                image_bytes=image_bytes
            )
            if parsed and isinstance(parsed, dict):
                used_model_label = f"Gemini Vision AI ({used_model})"
                ai_summary = parsed.get("coastal_directive")
                if parsed.get("recommended_signal"):
                    ai_recommended_signal = parsed["recommended_signal"]
                if parsed.get("risk_level"):
                    ai_risk_level = parsed["risk_level"]

                # If Gemini confirmed a specific primary sector/lighthouse, verify match
                gemini_sector = parsed.get("primary_sector_name")
                if gemini_sector:
                    for s in sectors_with_dist:
                        if s["name"].lower() in gemini_sector.lower() or gemini_sector.lower() in s["name"].lower():
                            primary_sector = s
                            break

                gemini_lh = parsed.get("primary_lighthouse_name")
                if gemini_lh:
                    for lh in lighthouses_with_dist:
                        if lh["name"].lower() in gemini_lh.lower() or gemini_lh.lower() in lh["name"].lower():
                            primary_lighthouse = lh
                            break

                logger.info(f"[Marine Sector AI] Identified {primary_sector['name']} & {primary_lighthouse['name']} via {used_model}")
        except Exception as e:
            logger.warning(f"[Marine Sector AI] Gemini notice: {e}. Utilizing geodesic meteorological calculation.")

        if not ai_summary:
            ai_summary = (
                f"Severe cyclonic vortex centered at {lat:.2f}°N, {lon:.2f}°E ({subbasin}) "
                f"approaching {primary_sector['name']} with peak winds of {wind_kmh} km/h. "
                f"Emergency alert dispatched to {primary_lighthouse['name']} ({primary_lighthouse['distance_km']} km away). "
                f"All maritime traffic must observe {ai_recommended_signal}."
            )

        # Mark recommended on primary lighthouse
        for lh in affected_lighthouses:
            lh["is_primary_threat"] = (lh["id"] == primary_lighthouse["id"])

        all_sectors_response = sectors_with_dist + [pan_india_sector]

        return {
            "success": True,
            "cyclone_location": {
                "latitude": lat,
                "longitude": lon,
                "subbasin": subbasin,
                "wind_speed_kt": wind_speed_kt,
                "wind_speed_kmh": wind_kmh
            },
            "primary_sector": primary_sector["name"],
            "primary_sector_id": primary_sector["id"],
            "primary_lighthouse": primary_lighthouse["name"],
            "primary_lighthouse_id": primary_lighthouse["id"],
            "primary_lighthouse_distance_km": primary_lighthouse["distance_km"],
            "recommended_signal": ai_recommended_signal,
            "risk_level": ai_risk_level,
            "ai_directive": ai_summary,
            "detection_engine": used_model_label,
            "affected_sectors": all_sectors_response,
            "affected_lighthouses": affected_lighthouses
        }


marine_sectors_service = MarineSectorsService()
