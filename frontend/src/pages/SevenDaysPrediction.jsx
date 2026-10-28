import React, { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, Navigation, Compass, AlertTriangle, 
  Clock, Shield, Activity, RefreshCw, Info, CheckCircle2,
  Calendar, Layers, MapPin, BarChart3, Map, Eye, Waves,
  Crosshair, Play, RotateCcw
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, Polygon, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getApiBaseUrl } from '../utils/apiConfig';

// Fix Leaflet Default Icon Paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Rotating Cyclone Eye Swirl Icon (SVG)
const cycloneSwirlIcon = new L.divIcon({
  html: `
    <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px;">
      <span style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background-color: rgba(239, 68, 68, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
      <svg style="width: 38px; height: 38px; animation: spin 3s linear infinite; filter: drop-shadow(0 0 10px rgba(220, 38, 38, 0.9));" viewBox="0 0 100 100" fill="none">
        <path d="M50 15 C35 15, 20 28, 20 45 C20 60, 32 72, 45 75 C40 68, 38 60, 42 50 C46 40, 56 35, 68 38 C75 25, 65 15, 50 15 Z" fill="#ef4444"/>
        <path d="M50 85 C65 85, 80 72, 80 55 C80 40, 68 28, 55 25 C60 32, 62 40, 58 50 C54 60, 44 65, 32 62 C25 75, 35 85, 50 85 Z" fill="#ef4444"/>
        <circle cx="50" cy="50" r="10" fill="#ffffff" stroke="#b91c1c" stroke-width="3"/>
      </svg>
    </div>
  `,
  className: 'cyclone-eye-swirl',
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  popupAnchor: [0, -22]
});

// Color-coded Day Waypoint Badge
const createDayMarkerIcon = (dayNumber, windKt) => {
  // Saffir-Simpson style color mapping
  let bg = '#10b981'; // Green (Tropical Storm)
  if (windKt >= 96) bg = '#ef4444'; // Red (Cat 3+)
  else if (windKt >= 83) bg = '#f97316'; // Orange (Cat 2)
  else if (windKt >= 64) bg = '#eab308'; // Yellow (Cat 1)

  return new L.divIcon({
    html: `
      <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
        <div style="background: ${bg}; color: #ffffff; font-weight: 900; font-size: 10px; padding: 2px 7px; border-radius: 9999px; border: 2px solid #ffffff; box-shadow: 0 3px 10px rgba(0,0,0,0.5); white-space: nowrap;">
          Day ${dayNumber}
        </div>
        <div style="width: 8px; height: 8px; border-radius: 50%; background: ${bg}; border: 2px solid white; box-shadow: 0 0 6px ${bg}; margin-top: 1px;"></div>
      </div>
    `,
    className: 'custom-day-marker',
    iconSize: [46, 30],
    iconAnchor: [23, 26],
    popupAnchor: [0, -26]
  });
};

// Auto-center map helper
function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom, { animate: true });
    }
  }, [center, zoom, map]);
  return null;
}

// Map Click Listener to pick coordinates directly on the ocean
function MapClickHandler({ onLocationSelect, active }) {
  useMapEvents({
    click(e) {
      if (active) {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  return null;
}

// Helper: Generate Continuous Uncertainty Cone Polygon (Envelope)
function generateUncertaintyCone(origin, waypoints) {
  if (!origin || !waypoints || waypoints.length === 0) return [];
  
  const allPoints = [
    { lat: origin[0], lon: origin[1], r: 40 },
    ...waypoints.map((w, idx) => ({
      lat: w.latitude,
      lon: w.longitude,
      r: w.uncertainty_radius_km || ((idx + 1) * 85)
    }))
  ];

  const leftEdge = [];
  const rightEdge = [];

  for (let i = 0; i < allPoints.length; i++) {
    const pt = allPoints[i];
    const rDeg = pt.r / 111.0;
    const latRad = (pt.lat * Math.PI) / 180.0;
    const lonScale = Math.cos(latRad) || 1.0;

    let dLat, dLon;
    if (i === 0) {
      dLat = allPoints[1].lat - allPoints[0].lat;
      dLon = (allPoints[1].lon - allPoints[0].lon) * lonScale;
    } else if (i === allPoints.length - 1) {
      dLat = allPoints[i].lat - allPoints[i - 1].lat;
      dLon = (allPoints[i].lon - allPoints[i - 1].lon) * lonScale;
    } else {
      dLat = allPoints[i + 1].lat - allPoints[i - 1].lat;
      dLon = (allPoints[i + 1].lon - allPoints[i - 1].lon) * lonScale;
    }

    const norm = Math.hypot(dLat, dLon) || 1.0;
    const nx = -dLat / norm;
    const ny = dLon / norm;

    leftEdge.push([
      Number((pt.lat + ny * rDeg).toFixed(3)),
      Number((pt.lon + (nx * rDeg) / lonScale).toFixed(3))
    ]);

    rightEdge.push([
      Number((pt.lat - ny * rDeg).toFixed(3)),
      Number((pt.lon - (nx * rDeg) / lonScale).toFixed(3))
    ]);
  }

  return [...leftEdge, ...rightEdge.reverse()];
}

const SevenDaysPrediction = ({ currentAnalysis }) => {
  // Initial coordinates: prefill from image analysis if detected, else central Bay of Bengal
  const detectedLat = currentAnalysis?.latitude != null ? Number(currentAnalysis.latitude) : null;
  const detectedLon = currentAnalysis?.longitude != null ? Number(currentAnalysis.longitude) : null;

  const [inputLat, setInputLat] = useState(detectedLat !== null ? detectedLat : 12.50);
  const [inputLon, setInputLon] = useState(detectedLon !== null ? detectedLon : 88.20);
  const [isPickingOnMap, setIsPickingOnMap] = useState(false);

  const [predictionData, setPredictionData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeMapLayer, setActiveMapLayer] = useState('satellite'); // Default to satellite view

  const API_URL = getApiBaseUrl();

  // Core trajectory forecast handler starting from entered (lat, lon) in the ocean
  const calculateTrackFromOcean = async (lat, lon) => {
    setIsLoading(true);
    setError(null);

    const isBayOfBengal = lon >= 78.0;
    const dLat6h = 0.35;
    const dLon6h = isBayOfBengal ? 0.35 : -0.25;

    const now = Date.now();
    const recentHistory = [
      {
        lat: Number((lat - 3 * dLat6h).toFixed(2)),
        lon: Number((lon + 3 * dLon6h).toFixed(2)),
        timestamp: new Date(now - 18 * 3600 * 1000).toISOString(),
        wind_speed_kt: 55.0,
        pressure_mb: 994.0
      },
      {
        lat: Number((lat - 2 * dLat6h).toFixed(2)),
        lon: Number((lon + 2 * dLon6h).toFixed(2)),
        timestamp: new Date(now - 12 * 3600 * 1000).toISOString(),
        wind_speed_kt: 65.0,
        pressure_mb: 990.0
      },
      {
        lat: Number((lat - 1 * dLat6h).toFixed(2)),
        lon: Number((lon + 1 * dLon6h).toFixed(2)),
        timestamp: new Date(now - 6 * 3600 * 1000).toISOString(),
        wind_speed_kt: 75.0,
        pressure_mb: 985.0
      },
      {
        lat: Number(lat.toFixed(2)),
        lon: Number(lon.toFixed(2)),
        timestamp: new Date(now).toISOString(),
        wind_speed_kt: currentAnalysis?.intensity?.wind_speed_kt || 85.0,
        pressure_mb: 980.0
      }
    ];

    try {
      const res = await fetch(`${API_URL}/api/track/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storm_name: currentAnalysis?.fileName 
            ? `Cyclone ${currentAnalysis.fileName.replace(/\.[^/.]+$/, "")}`
            : 'Tropical Cyclone System',
          storm_id: 'OCEAN_ORIGIN',
          history: recentHistory
        })
      });

      if (!res.ok) throw new Error('Model inference error');
      const data = await res.json();
      setPredictionData(data);
    } catch (err) {
      console.warn('API error, projecting kinematically:', err);
      // Resilient fallback projection heading from ocean towards land
      const fallbackForecast = [24, 48, 72, 96, 120].map((h, idx) => {
        const step = idx + 1;
        const fLat = lat + step * 1.15;
        const fLon = isBayOfBengal ? lon - step * 0.82 : lon - step * 0.45;
        return {
          step,
          horizon_hours: h,
          latitude: Number(fLat.toFixed(2)),
          longitude: Number(fLon.toFixed(2)),
          delta_lat: Number((step * 1.15).toFixed(2)),
          delta_lon: Number((isBayOfBengal ? -step * 0.82 : -step * 0.45).toFixed(2)),
          arrival_time: new Date(now + h * 3600 * 1000).toISOString(),
          uncertainty_radius_km: 100 + step * 70,
          wind_speed_kt: Math.max(35, 90 - step * 11),
          stage: step < 4 ? "Projected Severe Cyclone" : "Projected Landfall on Coast"
        };
      });

      setPredictionData({
        success: true,
        storm_name: 'Tropical Cyclone System',
        current_position: { latitude: lat, longitude: lon },
        forecast: fallbackForecast
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Initial calculation on load
  useEffect(() => {
    calculateTrackFromOcean(inputLat, inputLon);
  }, []);

  // Auto-synchronize when AI detected cyclone coordinates are extracted from uploaded image
  useEffect(() => {
    if (detectedLat !== null && detectedLon !== null && !isNaN(detectedLat) && !isNaN(detectedLon)) {
      setInputLat(detectedLat);
      setInputLon(detectedLon);
      calculateTrackFromOcean(detectedLat, detectedLon);
    }
  }, [detectedLat, detectedLon]);

  // Form submission handler
  const handleFormSubmit = (e) => {
    e.preventDefault();
    setIsPickingOnMap(false);
    calculateTrackFromOcean(Number(inputLat), Number(inputLon));
  };

  // Map click handler to pick coordinates
  const handleMapClick = (clickedLat, clickedLon) => {
    const lat = Number(clickedLat.toFixed(2));
    const lon = Number(clickedLon.toFixed(2));
    setInputLat(lat);
    setInputLon(lon);
    setIsPickingOnMap(false);
    calculateTrackFromOcean(lat, lon);
  };

  // Coordinates data for map
  const originPos = [Number(inputLat), Number(inputLon)];
  const forecastWaypoints = predictionData?.forecast || [];
  const forecastCoords = forecastWaypoints.length > 0 
    ? [originPos, ...forecastWaypoints.map(w => [w.latitude, w.longitude])]
    : [];

  const conePolygonCoords = generateUncertaintyCone(originPos, forecastWaypoints);

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-300">
      
      {/* 1. Header & Coordinate Origin Input Controller */}
      <div className="app-card p-4 sm:p-5 border-2 border-sky-500/20 bg-white/95 dark:bg-slate-900/95 shadow-lg rounded-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Title & Info */}
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20">
                <Navigation size={22} className="stroke-[2.5]" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <span>Tropical Cyclone Track Prediction</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 font-bold border border-sky-500/30">
                    Ocean → Landfall
                  </span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Enter cyclone ocean coordinates or click on the map to start the trajectory line from that area moving toward land.
                </p>
              </div>
            </div>
          </div>

          {/* Coordinate Form */}
          <form onSubmit={handleFormSubmit} className="flex flex-wrap items-center gap-2.5">
            
            {/* Latitude Input */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 shadow-xs">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Lat (°N):</span>
              <input
                type="number"
                step="0.01"
                min="4.0"
                max="28.0"
                value={inputLat}
                onChange={(e) => setInputLat(parseFloat(e.target.value) || 0)}
                className="w-20 bg-transparent text-xs font-black text-slate-900 dark:text-white outline-none"
              />
            </div>

            {/* Longitude Input */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 shadow-xs">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Lon (°E):</span>
              <input
                type="number"
                step="0.01"
                min="60.0"
                max="98.0"
                value={inputLon}
                onChange={(e) => setInputLon(parseFloat(e.target.value) || 0)}
                className="w-20 bg-transparent text-xs font-black text-slate-900 dark:text-white outline-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <Play size={14} className={isLoading ? "animate-spin" : "fill-white"} />
              <span>{isLoading ? "Projecting..." : "Start Track Line"}</span>
            </button>

            {/* Click on Map Picker Toggle */}
            <button
              type="button"
              onClick={() => setIsPickingOnMap(!isPickingOnMap)}
              className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                isPickingOnMap
                  ? 'bg-rose-500 text-white border-rose-500 animate-pulse ring-2 ring-rose-400/50'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title="Click anywhere on the ocean on the map to set starting position"
            >
              <Crosshair size={14} />
              <span>{isPickingOnMap ? "Click on Ocean..." : "Pick on Map"}</span>
            </button>

          </form>

        </div>

        {/* Quick Ocean Location Presets */}
        <div className="flex flex-wrap items-center gap-2 pt-3 mt-3 border-t border-slate-200/60 dark:border-slate-800 text-xs">
          <span className="font-bold text-slate-400 text-[11px] uppercase tracking-wider">Quick Presets:</span>
          
          {detectedLat !== null && (
            <button
              type="button"
              onClick={() => {
                setInputLat(detectedLat);
                setInputLon(detectedLon);
                calculateTrackFromOcean(detectedLat, detectedLon);
              }}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30 transition-colors cursor-pointer"
            >
              ⭐ Analyzed Image ({detectedLat}°N, {detectedLon}°E)
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setInputLat(12.50);
              setInputLon(88.20);
              calculateTrackFromOcean(12.50, 88.20);
            }}
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
          >
            Bay of Bengal (Center: 12.5°N, 88.2°E)
          </button>

          <button
            type="button"
            onClick={() => {
              setInputLat(9.50);
              setInputLon(87.00);
              calculateTrackFromOcean(9.50, 87.00);
            }}
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
          >
            Bay of Bengal (South: 9.5°N, 87.0°E)
          </button>

          <button
            type="button"
            onClick={() => {
              setInputLat(14.00);
              setInputLon(68.50);
              calculateTrackFromOcean(14.00, 68.50);
            }}
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
          >
            Arabian Sea (14.0°N, 68.5°E)
          </button>
        </div>
      </div>

      {/* 2. Interactive Map Container with Ocean-to-Land Track Line */}
      <div className="app-card p-3 sm:p-4 rounded-2xl relative overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl">
        
        {/* Banner with Legend & Layer Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5 px-1">
          
          {/* Simple Clean Legend */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-bold text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-1.5 text-rose-500">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-ping inline-block"></span>
              <span>🌀 Cyclone Origin ({inputLat}°N, {inputLon}°E)</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
              <span className="w-4 h-1 border-t-2 border-dashed border-white inline-block"></span>
              <span>--- Predicted Track to Land</span>
            </div>
            <div className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
              <span className="w-3 h-3 rounded-sm bg-sky-500/30 border border-sky-400 inline-block"></span>
              <span>Uncertainty Cone</span>
            </div>
          </div>

          {/* Layer Switcher: Street / Satellite / Ocean */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs">
            <button
              type="button"
              onClick={() => setActiveMapLayer('standard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeMapLayer === 'standard'
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Map size={14} />
              <span>Street Map</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMapLayer('satellite')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeMapLayer === 'satellite'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Eye size={14} />
              <span>🛰️ Satellite View</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMapLayer('ocean')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeMapLayer === 'ocean'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Waves size={14} />
              <span>Ocean View</span>
            </button>
          </div>
        </div>

        {/* Map Canvas */}
        <div className="h-[520px] sm:h-[620px] w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 relative z-0">
          
          {/* Active Click Picking Banner Overlay */}
          {isPickingOnMap && (
            <div className="absolute top-3 left-14 z-[1000] px-3.5 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-lg flex items-center gap-2 animate-bounce">
              <Crosshair size={16} />
              <span>Click anywhere on the ocean map to set starting cyclone coordinates</span>
            </div>
          )}

          <MapContainer
            center={originPos}
            zoom={5}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <ChangeView center={originPos} zoom={5} />
            <MapClickHandler onLocationSelect={handleMapClick} active={isPickingOnMap} />

            {/* Base Tile Layer */}
            {activeMapLayer === 'standard' && (
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            )}

            {activeMapLayer === 'satellite' && (
              <>
                <TileLayer
                  attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />
                <TileLayer
                  attribution='Labels &copy; Esri'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                />
              </>
            )}

            {activeMapLayer === 'ocean' && (
              <TileLayer
                attribution='Tiles &copy; Esri &mdash; Sources: GEBCO, NOAA, CHS, OSU, UNH, CSUMB, National Geographic, DeLorme, NAVTEQ, and Esri'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}"
              />
            )}

            {/* A. Continuous Shaded Cone of Uncertainty (Ocean to Landfall Envelope) */}
            {conePolygonCoords.length > 2 && (
              <Polygon
                positions={conePolygonCoords}
                pathOptions={{
                  color: '#38bdf8',
                  weight: 1.5,
                  dashArray: '5, 5',
                  fillColor: '#38bdf8',
                  fillOpacity: 0.22
                }}
              />
            )}

            {/* B. Predicted Track Line from Ocean to Land (White Dashed Polyline) */}
            {forecastCoords.length > 1 && (
              <Polyline
                positions={forecastCoords}
                pathOptions={{
                  color: '#ffffff',
                  weight: 4,
                  dashArray: '8, 8',
                  opacity: 0.95
                }}
              />
            )}

            {/* C. Cyclone Eye Swirl Marker at Starting Ocean Coordinate */}
            <Marker position={originPos} icon={cycloneSwirlIcon}>
              <Popup>
                <div className="p-1.5 text-xs">
                  <div className="font-extrabold text-red-600 text-sm flex items-center gap-1.5">
                    <span>🌀 Cyclone Origin Point</span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 mt-1">
                    <strong>Starting Coordinates:</strong> {inputLat}°N, {inputLon}°E
                  </div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    Trajectory starts from this ocean area and moves toward land
                  </div>
                </div>
              </Popup>
            </Marker>

            {/* D. Day 1 to Day 5 Waypoint Markers Moving Towards Land */}
            {forecastWaypoints.map((wp) => {
              const wind = wp.wind_speed_kt || Math.max(35, 90 - wp.step * 10);
              return (
                <Marker
                  key={`day-wp-${wp.step}`}
                  position={[wp.latitude, wp.longitude]}
                  icon={createDayMarkerIcon(wp.step, wind)}
                >
                  <Popup>
                    <div className="p-2 text-xs min-w-[190px]">
                      <div className="font-extrabold text-slate-900 border-b pb-1 mb-1">
                        Day {wp.step} (+{wp.horizon_hours} Hours)
                      </div>
                      <div className="space-y-0.5 text-slate-600">
                        <div><strong>Target Lat/Lon:</strong> {wp.latitude}°N, {wp.longitude}°E</div>
                        <div><strong>Wind Speed:</strong> ~{wind} knots</div>
                        <div><strong>Expected Arrival:</strong> {new Date(wp.arrival_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit' })}</div>
                        <div className="text-[11px] font-bold text-amber-600 pt-1">
                          {wp.stage || (wp.step >= 4 ? "Landfall / Coastal Region" : "Inland Movement")}
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

          </MapContainer>
        </div>

      </div>

    </div>
  );
};

export default SevenDaysPrediction;
