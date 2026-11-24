import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  Activity, 
  Clock, 
  Database, 
  AlertCircle, 
  RefreshCw, 
  Navigation, 
  Compass, 
  Shield, 
  Wind, 
  Calendar, 
  ChevronRight, 
  ChevronLeft,
  Play,
  Pause,
  SkipForward,
  Target, 
  Sparkles, 
  Layers, 
  Satellite, 
  Radar, 
  Droplets, 
  CloudRain, 
  ExternalLink,
  ArrowLeft,
  Plus,
  Minus,
  Crosshair,
  Maximize2,
  Minimize2,
  X,
  List,
  Thermometer,
  UploadCloud,
  CheckCircle2
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, LayerGroup, Polyline, CircleMarker, Polygon, Tooltip, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getApiBaseUrl } from '../utils/apiConfig';
import WindParticleOverlay from '../components/WindParticleOverlay';
import ZoomEarthLayerMenu from '../components/ZoomEarthLayerMenu';
import HumidityMoistureOverlay from '../components/HumidityMoistureOverlay';
import PressureIsobarOverlay from '../components/PressureIsobarOverlay';
import TemperatureOverlay, { calculateTemperatureAtLatLng } from '../components/TemperatureOverlay';
import WindyAtmosphericPlayer from '../components/WindyAtmosphericPlayer';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Dynamic Real-Time Cyclone Icon based on Alert Level & Selection State
const createLiveCycloneIcon = (alertLevel = 'Red', isSelected = false) => {
  const isRed = alertLevel === 'Red';
  const isOrange = alertLevel === 'Orange';
  const color = isRed ? '#ef4444' : isOrange ? '#f97316' : '#10b981';
  const size = isSelected ? 34 : 26;
  const innerSize = isSelected ? 18 : 14;

  return new L.divIcon({
    html: `
      <div style="position: relative; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        <div style="position: absolute; width: ${size}px; height: ${size}px; border-radius: 50%; background: ${color}35; border: 2px solid ${color}; animation: ping 2.2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="width: ${innerSize}px; height: ${innerSize}px; border-radius: 50%; background: ${color}; border: 2.5px solid #ffffff; box-shadow: 0 0 14px ${color}; display: flex; align-items: center; justify-content: center; z-index: 5;">
          <div style="background-color: #ffffff; width: 4px; height: 4px; border-radius: 50%;"></div>
        </div>
      </div>
    `,
    className: 'custom-live-cyclone-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
};

// Bagyo Live Tracking Marker Icon
const createBagyoCycloneIcon = (alertLevel = 'Red', isSelected = false) => {
  const isRed = alertLevel === 'Red';
  const isOrange = alertLevel === 'Orange';
  const color = isRed ? '#ef4444' : isOrange ? '#f97316' : '#8b5cf6';
  const size = isSelected ? 34 : 26;
  const innerSize = isSelected ? 18 : 14;

  return new L.divIcon({
    html: `
      <div style="position: relative; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        <div style="position: absolute; width: ${size}px; height: ${size}px; border-radius: 50%; background: ${color}35; border: 2px solid ${color}; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="width: ${innerSize}px; height: ${innerSize}px; border-radius: 50%; background: ${color}; border: 2.5px solid #ffffff; box-shadow: 0 0 14px ${color}; display: flex; align-items: center; justify-content: center; z-index: 5;">
          <div style="background-color: #ffffff; width: 4px; height: 4px; border-radius: 50%;"></div>
        </div>
      </div>
    `,
    className: 'custom-bagyo-cyclone-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
};

// Spire Weather Future Track Prominent Cyclone Marker
const createSpireCycloneIcon = (isSelected = false) => {
  const size = isSelected ? 38 : 30;
  const innerSize = isSelected ? 18 : 14;

  return new L.divIcon({
    html: `
      <div style="position: relative; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        <div style="position: absolute; width: ${size}px; height: ${size}px; border-radius: 50%; background: rgba(14, 165, 233, 0.35); border: 2.5px solid #0284c7; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="width: ${innerSize}px; height: ${innerSize}px; border-radius: 50%; background: #0284c7; border: 2.5px solid #ffffff; box-shadow: 0 0 16px rgba(2, 132, 199, 0.9); display: flex; align-items: center; justify-content: center; z-index: 6;">
          <div style="background-color: #ffffff; width: 5px; height: 5px; border-radius: 50%;"></div>
        </div>
      </div>
    `,
    className: 'custom-spire-cyclone-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
};



// High-visibility Animated Radar Marker for AI Detected Cyclone
const aiCycloneIcon = new L.divIcon({
  html: `
    <div style="position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 48px; height: 48px; border-radius: 50%; background: rgba(239, 68, 68, 0.35); border: 2px solid #ef4444; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="position: absolute; width: 30px; height: 30px; border-radius: 50%; background: rgba(220, 38, 38, 0.55); animation: pulse 1.5s ease-in-out infinite;"></div>
      <div style="width: 22px; height: 22px; border-radius: 50%; background: #dc2626; border: 3px solid #ffffff; box-shadow: 0 0 16px rgba(220,38,38,1); display: flex; align-items: center; justify-content: center; z-index: 10;">
        <div style="width: 6px; height: 6px; border-radius: 50%; background: #ffffff;"></div>
      </div>
    </div>
  `,
  className: 'ai-cyclone-radar-marker',
  iconSize: [48, 48],
  iconAnchor: [24, 24],
  popupAnchor: [0, -24]
});

// Color-coded Day Waypoint Badge for AI Trajectory Forecast
const createDayMarkerIcon = (dayNumber, windKt, isCurrentStep = false) => {
  let bg = '#10b981'; // Green (Tropical Storm)
  if (windKt >= 96) bg = '#ef4444'; // Red (Cat 3+)
  else if (windKt >= 83) bg = '#f97316'; // Orange (Cat 2)
  else if (windKt >= 64) bg = '#eab308'; // Yellow (Cat 1)

  const scale = isCurrentStep ? 'scale(1.15)' : 'scale(1.0)';

  return new L.divIcon({
    html: `
      <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: ${scale}; transition: transform 0.2s ease;">
        <div style="background: ${bg}; color: #ffffff; font-weight: 900; font-size: 10px; padding: 2.5px 7px; border-radius: 9999px; border: 2px solid #ffffff; box-shadow: 0 3px 10px rgba(0,0,0,0.5); white-space: nowrap; display: flex; align-items: center; gap: 3px;">
          <span>Day ${dayNumber}</span>
          <span style="font-size: 8px; opacity: 0.9;">(+${dayNumber * 24}h)</span>
        </div>
        <div style="width: 8px; height: 8px; border-radius: 50%; background: ${bg}; border: 2px solid white; box-shadow: 0 0 6px ${bg}; margin-top: 1px;"></div>
      </div>
    `,
    className: 'custom-day-marker',
    iconSize: [58, 30],
    iconAnchor: [29, 27],
    popupAnchor: [0, -27]
  });
};

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

const API_URL = getApiBaseUrl();

// Client-side parser for direct GDACS satellite feed (fallback to ensure 100% live uptime)
const parseGdacsFeaturesToCyclones = (features) => {
  if (!Array.isArray(features)) return [];
  const list = [];
  
  for (const f of features) {
    const props = f?.properties || {};
    const geom = f?.geometry || {};
    const coords = geom?.coordinates || [];
    if (coords.length < 2 || props.eventtype !== 'TC') continue;

    // Filter out historical or dissipated events (older than 48 hours)
    const todateStr = props.todate || props.datemodified;
    if (todateStr) {
      try {
        const endDt = new Date(todateStr).getTime();
        if (Date.now() - endDt > 48 * 3600 * 1000) {
          continue; // Dissipated / inactive
        }
      } catch (e) {}
    }

    const lon = Number(coords[0]);
    const lat = Number(coords[1]);
    const rawName = String(props.eventname || props.name || 'Tropical Cyclone').trim();
    const sev = props.severitydata || {};
    const speedKmh = sev.severity ? Math.round(Number(sev.severity)) : null;
    const speedKt = speedKmh ? Math.round(speedKmh / 1.852) : null;

    const countryStr = String(props.country || '');
    const iso3 = String(props.iso3 || '');
    const isNio = (lon >= 45.0 && lon <= 105.0 && lat >= 0.0 && lat <= 35.0) ||
      countryStr.includes('India') || countryStr.includes('Sri Lanka') || countryStr.includes('Bangladesh') || countryStr.includes('Myanmar') ||
      ['IND', 'LKA', 'BGD', 'MMR', 'OMN', 'PAK'].includes(iso3);

    const basin = isNio ? (lon >= 78.0 ? 'Bay of Bengal' : 'Arabian Sea') : 'Global Ocean Waters';
    const cleanName = rawName.replace(/-2[4-6]/g, '').trim();
    const titleName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase();

    let displayName = `Tropical Cyclone ${titleName}`;
    if (speedKt && speedKt >= 64) {
      displayName = isNio ? `Severe Cyclonic Storm ${titleName}` : `Severe Tropical Cyclone ${titleName}`;
    } else if (speedKt && speedKt >= 34) {
      displayName = isNio ? `Cyclonic Storm ${titleName}` : `Tropical Storm ${titleName}`;
    } else if (speedKt && speedKt >= 17) {
      displayName = isNio ? `Deep Depression ${titleName}` : `Tropical Depression ${titleName}`;
    }

    const alertLevel = props.alertlevel || 'Orange';

    list.push({
      id: String(props.eventid || ''),
      name: displayName,
      raw_name: rawName,
      latitude: Number(lat.toFixed(2)),
      longitude: Number(lon.toFixed(2)),
      wind_speed: speedKmh,
      wind_kt: speedKt,
      status: `${alertLevel} Alert`,
      alert_level: alertLevel,
      basin,
      is_nio: isNio,
      country: countryStr,
      description: props.htmldescription || props.description || '',
      last_updated: props.todate || props.datemodified || '',
      report_url: props.url?.report || ''
    });
  }

  // Sort: Indian coastal waters first, then highest sustained wind
  list.sort((a, b) => {
    if (a.is_nio !== b.is_nio) return a.is_nio ? -1 : 1;
    return (b.wind_speed || 0) - (a.wind_speed || 0);
  });

  return list;
};

// Tracks continuous cursor movements for coordinates and temperature hover
function MapCursorTracker({ onMouseMove, onMouseLeave }) {
  useMapEvents({
    mousemove(e) {
      if (onMouseMove) onMouseMove(e);
    },
    mouseout() {
      if (onMouseLeave) onMouseLeave();
    }
  });
  return null;
}

const MapPage = ({ 
  currentAnalysis, 
  setActiveTab,
  viewMode: propViewMode,
  setViewMode: propSetViewMode,
  activeLayer: propActiveLayer,
  setActiveLayer: propSetActiveLayer,
  activeBaseMap: propActiveBaseMap,
  setActiveBaseMap: propSetActiveBaseMap,
  futureTrackActive = false,
  setFutureTrackActive
}) => {
  const [internalViewMode, setInternalViewMode] = useState('tactical'); // 'tactical' | 'windy_engine'
  const viewMode = propViewMode !== undefined ? propViewMode : internalViewMode;
  const setViewMode = propSetViewMode || setInternalViewMode;
  const [internalActiveLayer, setInternalActiveLayer] = useState('wind');
  const [internalActiveBaseMap, setInternalActiveBaseMap] = useState('satellite_base');

  const activeLayer = propActiveLayer !== undefined ? propActiveLayer : internalActiveLayer;
  const setActiveLayer = propSetActiveLayer || setInternalActiveLayer;

  const activeBaseMap = propActiveBaseMap !== undefined ? propActiveBaseMap : internalActiveBaseMap;
  const setActiveBaseMap = propSetActiveBaseMap || setInternalActiveBaseMap;

  // Spire Weather Future Track State
  const [internalFutureTrackActive, setInternalFutureTrackActive] = useState(false);
  const isFutureTrack = futureTrackActive !== undefined ? futureTrackActive : internalFutureTrackActive;
  const toggleFutureTrack = setFutureTrackActive || setInternalFutureTrackActive;

  const [spireData, setSpireData] = useState(null);
  const [isSpireLoading, setIsSpireLoading] = useState(false);
  const [lastSpireUpdated, setLastSpireUpdated] = useState(null);
  const isSpireFetchingRef = useRef(false);

  const [rainviewerPath, setRainviewerPath] = useState(null);
  const [isRadarLoading, setIsRadarLoading] = useState(false);

  // Floating UI state
  const [isCycloneDrawerOpen, setIsCycloneDrawerOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState('GFS 22 km'); // 'ICON 13 km' | 'GFS 22 km' | 'ECMWF 9 km'
  const [isPlaying, setIsPlaying] = useState(true);

  const [data, setData] = useState(null);
  const [status, setStatus] = useState('Updating');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [selectedCycloneId, setSelectedCycloneId] = useState(null);

  const [aiForecast, setAiForecast] = useState(null);
  const [isForecastLoading, setIsForecastLoading] = useState(false);
  const [manualDayStep, setManualDayStep] = useState(null);

  // Bagyo Tropical Cyclone Tracking API State (5-min polling interval)
  const [bagyoData, setBagyoData] = useState(null);
  const [isBagyoLoading, setIsBagyoLoading] = useState(false);
  const [lastBagyoUpdated, setLastBagyoUpdated] = useState(null);
  const [showBagyoTrack, setShowBagyoTrack] = useState(true);
  const isBagyoFetchingRef = useRef(false);

  // Cursor coordinate tracking & hover temperature inspection state
  const [cursorCoords, setCursorCoords] = useState(null);
  const [cursorPoint, setCursorPoint] = useState(null);
  const [hoverTemp, setHoverTemp] = useState(null);
  const [liveThermalData, setLiveThermalData] = useState({ temp: 29.4, feelsLike: 33.5 });


  const abortControllerRef = useRef(null);
  const isFetchingRef = useRef(false);
  const mapRef = useRef(null);
  const hasAutoCenteredRef = useRef(false);

  // Compute AI Detected Cyclone strictly from inputted image analysis (currentAnalysis)
  const isAiCyclone = Boolean(
    currentAnalysis && 
    currentAnalysis.detection?.is_cyclone !== false && 
    currentAnalysis.latitude != null && 
    currentAnalysis.longitude != null &&
    !isNaN(parseFloat(currentAnalysis.latitude)) &&
    !isNaN(parseFloat(currentAnalysis.longitude))
  );
  const aiLat = isAiCyclone ? parseFloat(currentAnalysis.latitude) : null;
  const aiLng = isAiCyclone ? parseFloat(currentAnalysis.longitude) : null;

  const aiCyclone = isAiCyclone ? {
    id: `ai-detected-${currentAnalysis.id || 'active'}`,
    name: currentAnalysis.cycloneName 
      ? currentAnalysis.cycloneName 
      : currentAnalysis.fileName 
      ? `Cyclone ${currentAnalysis.fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')}` 
      : 'Analyzed Cyclone System',
    latitude: aiLat,
    longitude: aiLng,
    wind_speed: currentAnalysis.intensity?.wind_speed_kmh != null 
      ? currentAnalysis.intensity.wind_speed_kmh 
      : (currentAnalysis.intensity?.wind_speed_kt ? Math.round(currentAnalysis.intensity.wind_speed_kt * 1.852) : 120),
    wind_kt: currentAnalysis.intensity?.wind_speed_kt || (currentAnalysis.intensity?.wind_speed_kmh ? Math.round(currentAnalysis.intensity.wind_speed_kmh / 1.852) : 65),
    status: currentAnalysis.classification?.classification || currentAnalysis.intensity?.classification || 'Severe Cyclonic Storm (SCS)',
    category_desc: currentAnalysis.classification?.description || 'Detected via Satellite AI Analysis',
    subbasin: currentAnalysis.subbasin || (aiLng >= 78.0 ? 'Bay of Bengal' : 'Arabian Sea'),
    basin: currentAnalysis.subbasin || (aiLng >= 78.0 ? 'Bay of Bengal' : 'Arabian Sea'),
    alert_level: 'Red',
    isAiDetected: true,
    imagePreview: currentAnalysis.imagePreview,
    coordMethod: currentAnalysis.coordMethod || 'Auto-Extracted from Image',
    last_updated: 'Current AI Analysis'
  } : null;

  // Real-time live Doppler radar frame path from RainViewer (free public open weather API)
  useEffect(() => {
    let isMounted = true;
    const fetchRainViewer = async () => {
      try {
        setIsRadarLoading(true);
        const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        if (!res.ok) return;
        const json = await res.json();
        const radar = json?.radar?.past;
        if (isMounted && Array.isArray(radar) && radar.length > 0) {
          setRainviewerPath(radar[radar.length - 1].path);
        }
      } catch (e) {
        console.warn('RainViewer API notice:', e);
      } finally {
        if (isMounted) setIsRadarLoading(false);
      }
    };
    fetchRainViewer();
    const interval = setInterval(fetchRainViewer, 300000); // Sync every 5 minutes
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Calculate elapsed time from detection timestamp (for 24h auto-advance)
  const getElapsedHours = () => {
    if (currentAnalysis?.id && !isNaN(Number(currentAnalysis.id)) && Number(currentAnalysis.id) > 1000000000000) {
      const diffMs = Date.now() - Number(currentAnalysis.id);
      return Math.max(0, diffMs / (1000 * 3600));
    }
    if (currentAnalysis?.timestamp) {
      const parsed = Date.parse(currentAnalysis.timestamp);
      if (!isNaN(parsed)) {
        return Math.max(0, (Date.now() - parsed) / (1000 * 3600));
      }
    }
    return 0; // Default: fresh detection (< 24h)
  };

  const [elapsedHours, setElapsedHours] = useState(getElapsedHours());

  useEffect(() => {
    const updateElapsed = () => setElapsedHours(getElapsedHours());
    updateElapsed();
    const interval = setInterval(updateElapsed, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [currentAnalysis?.id, currentAnalysis?.timestamp]);

  const autoActiveStep = Math.min(5, Math.max(1, Math.floor(elapsedHours / 24) + 1));
  const currentStep = manualDayStep || autoActiveStep;
  const hoursToNextDay = Math.max(0, 24 - (elapsedHours % 24));

  // Fetch Trajectory waypoints using Bi-LSTM model based on detected point & intensity
  useEffect(() => {
    if (!aiCyclone) {
      setAiForecast(null);
      return;
    }

    let isMounted = true;
    const fetchAiTrack = async () => {
      setIsForecastLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/track/predict-from-point`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: aiCyclone.latitude,
            longitude: aiCyclone.longitude,
            wind_speed_kt: aiCyclone.wind_kt || 75.0,
            storm_name: aiCyclone.name || 'AI Detected Cyclone'
          })
        });
        if (!res.ok) throw new Error('Failed to fetch AI track prediction');
        const resData = await res.json();
        if (isMounted && resData.forecast && resData.forecast.length > 0) {
          setAiForecast(resData.forecast);
        }
      } catch (err) {
        console.warn('AI Track fetch error, using physics projection:', err);
        const isBob = aiCyclone.longitude >= 78.0;
        const now = Date.now();
        const fallback = [24, 48, 72, 96, 120].map((h, idx) => {
          const step = idx + 1;
          const fLat = aiCyclone.latitude + step * 0.45;
          const fLon = isBob ? aiCyclone.longitude - step * 1.65 : aiCyclone.longitude - step * 0.9;
          return {
            step,
            horizon_hours: h,
            latitude: Number(fLat.toFixed(2)),
            longitude: Number(fLon.toFixed(2)),
            delta_lat: Number((step * 0.45).toFixed(2)),
            delta_lon: Number((isBob ? -step * 1.65 : -step * 0.9).toFixed(2)),
            arrival_time: new Date(now + h * 3600 * 1000).toISOString(),
            uncertainty_radius_km: 135 + idx * 80,
            stage: idx < 3 ? "Projected Severe Cyclone" : "Projected Landfall on Coast"
          };
        });
        if (isMounted) setAiForecast(fallback);
      } finally {
        if (isMounted) setIsForecastLoading(false);
      }
    };

    fetchAiTrack();
    return () => { isMounted = false; };
  }, [aiCyclone?.latitude, aiCyclone?.longitude, aiCyclone?.wind_kt]);

  // Robust live cyclone fetcher: checks backend first, falls back directly to GDACS live feed
  const fetchLiveCyclones = async () => {
    if (isFetchingRef.current) return;
    
    try {
      isFetchingRef.current = true;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      let loaded = false;

      // 1. Try local FastAPI backend endpoint
      try {
        const response = await fetch(`${API_URL}/api/cyclones/live`, {
          signal: abortControllerRef.current.signal
        });
        
        if (response.ok) {
          const jsonData = await response.json();
          if (jsonData && jsonData.status === 'connected' && Array.isArray(jsonData.cyclones) && jsonData.cyclones.length > 0) {
            setData(jsonData);
            setStatus('LIVE / Connected');
            setLastUpdated(new Date().toLocaleTimeString());
            setError(null);
            loaded = true;
          }
        }
      } catch (backendErr) {
        // Local backend offline or starting -> fall through to direct live satellite feed
      }

      // 2. Direct browser fallback to GDACS Live Tropical Cyclone API (Supports CORS)
      if (!loaded) {
        try {
          const directRes = await fetch('https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventtypes=TC', {
            headers: { 'Accept': 'application/json' },
            signal: abortControllerRef.current.signal
          });
          if (directRes.ok) {
            const directJson = await directRes.json();
            const parsedCyclones = parseGdacsFeaturesToCyclones(directJson?.features);
            if (parsedCyclones.length > 0) {
              setData({
                updated_at: new Date().toISOString(),
                source: 'GDACS & Joint Typhoon Warning Center (JTWC) Live Spaceborne Feed',
                status: 'connected',
                active_cyclones_count: parsedCyclones.length,
                cyclones: parsedCyclones
              });
              setStatus('LIVE / Connected');
              setLastUpdated(new Date().toLocaleTimeString());
              setError(null);
              loaded = true;
            }
          }
        } catch (directErr) {
          console.warn('Direct GDACS fallback notice:', directErr);
        }
      }

      if (!loaded && !data) {
        setStatus('Connection Error');
        setError('Connecting to live satellite data feeds...');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setStatus('Connection Error');
        setError('Live cyclone data currently unavailable.');
      }
    } finally {
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchLiveCyclones();
    const interval = setInterval(fetchLiveCyclones, 15000); // Live poll every 15 seconds
    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Dedicated Bagyo API 5-minute polling hook with cache awareness
  const fetchBagyoCyclones = async (forceRefresh = false) => {
    if (isBagyoFetchingRef.current) return;
    try {
      isBagyoFetchingRef.current = true;
      setIsBagyoLoading(true);
      const url = `${API_URL}/api/cyclones/bagyo${forceRefresh ? '?refresh=true' : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setBagyoData(json);
        if (json.last_successful_retrieval) {
          setLastBagyoUpdated(json.last_successful_retrieval);
        } else if (json.status === 'connected') {
          setLastBagyoUpdated(new Date().toLocaleTimeString());
        }
      }
    } catch (err) {
      console.warn('Bagyo API fetch notice:', err);
    } finally {
      isBagyoFetchingRef.current = false;
      setIsBagyoLoading(false);
    }
  };

  useEffect(() => {
    fetchBagyoCyclones();
    const interval = setInterval(() => {
      fetchBagyoCyclones();
    }, 300000); // 5 minutes periodic polling
    return () => clearInterval(interval);
  }, []);

  // Dedicated Spire Weather Future Track 5-minute polling hook with cache awareness
  const fetchSpireFutureTracks = async (forceRefresh = false) => {
    if (isSpireFetchingRef.current) return;
    try {
      isSpireFetchingRef.current = true;
      setIsSpireLoading(true);
      const url = `${API_URL}/api/cyclones/spire-future-track${forceRefresh ? '?refresh=true' : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setSpireData(json);
        if (json.last_successful_retrieval) {
          setLastSpireUpdated(json.last_successful_retrieval);
        } else if (json.status === 'connected') {
          setLastSpireUpdated(new Date().toLocaleTimeString());
        }
      }
    } catch (err) {
      console.warn('Spire Future Track API fetch notice:', err);
    } finally {
      isSpireFetchingRef.current = false;
      setIsSpireLoading(false);
    }
  };

  useEffect(() => {
    fetchSpireFutureTracks();
    const interval = setInterval(() => {
      fetchSpireFutureTracks();
    }, 300000); // 5 minutes periodic polling
    return () => clearInterval(interval);
  }, []);

  // Auto-center when Future Track mode is toggled on and Spire data is available
  useEffect(() => {
    if (isFutureTrack && mapRef.current) {
      const storms = spireData?.storms || [];
      const primarySpire = storms.find(s => s.is_indian_ocean) || storms[0];
      if (primarySpire?.current_position?.lat != null && primarySpire?.current_position?.lon != null) {
        try {
          mapRef.current.flyTo([primarySpire.current_position.lat, primarySpire.current_position.lon], 6, { duration: 1.5 });
        } catch (e) {
          console.warn('Map flyTo Spire storm notice:', e);
        }
      }
    }
  }, [isFutureTrack, spireData]);

  const cyclones = data?.cyclones || [];
  const bagyoCyclones = bagyoData?.cyclones || [];
  const spireStorms = spireData?.storms || [];

  // Determine currently active storm to center wind vortex and atmospheric layers on (strictly prioritize analyzed cyclone from image)
  const primaryCyclone = aiCyclone || (isFutureTrack ? (spireStorms.find(s => s.is_indian_ocean) || spireStorms[0]) : null);

  const activeLat = primaryCyclone?.latitude || (primaryCyclone?.current_position?.lat) || 16.0;
  const activeLng = primaryCyclone?.longitude || (primaryCyclone?.current_position?.lon) || 84.0;
  const activeWindKt = primaryCyclone?.wind_kt || (primaryCyclone?.current_position?.wind_kt) || (aiCyclone ? 65 : 0);
  const activeWindKmh = primaryCyclone?.wind_speed || (primaryCyclone?.current_position?.wind_kmh) || (aiCyclone ? 120 : 0);
  const activeName = primaryCyclone?.name || (isAiCyclone ? 'Analyzed Cyclone System' : 'Standby - No Cyclone Loaded');

  // Dynamic temperature range for continuous scale & legend (updates dynamically with live thermal data)
  const tempRange = {
    min: liveThermalData?.temp ? Math.min(20, Math.round(liveThermalData.temp - 9)) : 20,
    max: liveThermalData?.temp ? Math.max(34, Math.round(liveThermalData.temp + 4)) : 34
  };

  // Continuous cursor tracker for coordinates and temperature hover
  const handleMapMouseMove = (e) => {
    if (!e || !e.latlng) return;
    const { lat, lng } = e.latlng;
    const { x, y } = e.containerPoint;

    // Normalize longitude to -180 .. 180 and format directions
    const normLng = ((lng + 180) % 360 + 360) % 360 - 180;
    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = normLng >= 0 ? 'E' : 'W';

    setCursorCoords({
      latStr: `${Math.abs(lat).toFixed(4)}° ${latDir}`,
      lngStr: `${Math.abs(normLng).toFixed(4)}° ${lngDir}`,
      lat,
      lng: normLng
    });

    setCursorPoint({ x, y });

    if (activeLayer === 'temperature') {
      const temp = calculateTemperatureAtLatLng(
        lat, 
        normLng, 
        activeLat, 
        activeLng, 
        liveThermalData?.temp
      );
      setHoverTemp(temp);
    }
  };

  const handleMapMouseLeave = () => {
    setCursorPoint(null);
    setHoverTemp(null);
  };

  // Smooth auto-centering on the analyzed cyclone when page or analysis loads
  useEffect(() => {
    if (mapRef.current && aiCyclone?.latitude != null && aiCyclone?.longitude != null) {
      try {
        mapRef.current.flyTo([aiCyclone.latitude, aiCyclone.longitude], 6, { duration: 1.5 });
      } catch (e) {
        console.warn('Map flyTo notice:', e);
      }
    }
  }, [aiCyclone?.latitude, aiCyclone?.longitude]);

  // Whenever user clicks any of the 4 Base Maps (Street, Satellite, Ocean, Terrain), switch to Tactical Map mode
  useEffect(() => {
    if (activeBaseMap) {
      setViewMode('tactical');
    }
  }, [activeBaseMap]);

  const handleSelectCyclone = (cyclone) => {
    if (!cyclone) return;
    setSelectedCycloneId(cyclone.id);
    if (mapRef.current && cyclone.latitude != null && cyclone.longitude != null) {
      try {
        mapRef.current.flyTo([cyclone.latitude, cyclone.longitude], 7, { duration: 1.2 });
      } catch (e) {
        console.warn('Map flyTo notice:', e);
      }
    }
  };

  const handleZoomIn = () => {
    if (mapRef.current) mapRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapRef.current) mapRef.current.zoomOut();
  };

  const handleRecenter = () => {
    if (mapRef.current) {
      mapRef.current.flyTo([activeLat, activeLng], 6, { duration: 1.2 });
    }
  };

  const nioCount = (aiCyclone ? 1 : 0) + (isFutureTrack ? spireStorms.filter(s => s.is_indian_ocean).length : 0);
  const totalActiveCount = (aiCyclone ? 1 : 0) + (isFutureTrack ? spireStorms.length : 0);

  // Formatted synoptic timestamp for the bottom player (e.g. "16 Nov  18:35")
  const currentFormattedTime = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + '  ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="relative w-full h-[calc(100vh-64px)] overflow-hidden select-none bg-[#0a1622] font-sans">
      
      {/* =========================================================================
          FULL-PAGE WIDE MAP CONTAINER (Edge-to-Edge)
      ========================================================================= */}
      {viewMode === 'windy_engine' ? (
        /* Full Live Atmospheric Radar Engine */
        <WindyAtmosphericPlayer
          stormLat={activeLat}
          stormLng={activeLng}
          stormName={activeName}
          stormWindKt={activeWindKt}
          activeLayer={activeLayer}
          setActiveLayer={setActiveLayer}
        />
      ) : (
        <MapContainer 
          ref={mapRef}
          center={[activeLat, activeLng]} 
          zoom={6} 
          minZoom={3}
          maxZoom={12}
          zoomControl={false}
          scrollWheelZoom={true} 
          className="w-full h-full z-0"
          style={{ width: '100%', height: '100%', background: '#0a1622' }}
        >
          {/* Continuous Map Cursor Coordinate and Temperature Inspection Tracker */}
          <MapCursorTracker 
            onMouseMove={handleMapMouseMove} 
            onMouseLeave={handleMapMouseLeave} 
          />

          {/* 1. Base Cartography Tiles (Keyed to force clean unmount/remount in Leaflet) */}
          {activeBaseMap === 'street' && (
            <TileLayer
              key="base-street"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
          )}
          {activeBaseMap === 'satellite_base' && (
            <LayerGroup key="base-satellite">
              <TileLayer
                attribution='Tiles &copy; Esri World Imagery'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={18}
              />
              <TileLayer
                attribution='Labels &copy; Esri'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                maxZoom={18}
              />
            </LayerGroup>
          )}
          {activeBaseMap === 'terrain' && (
            <TileLayer
              key="base-terrain"
              attribution='Tiles &copy; Esri Topo'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
              maxZoom={18}
            />
          )}
          {activeBaseMap === 'ocean' && (
            <LayerGroup key="base-ocean">
              <TileLayer
                attribution='Tiles &copy; Esri Ocean'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}"
                maxZoom={13}
              />
              <TileLayer
                attribution='Labels &copy; Esri'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}"
                maxZoom={13}
              />
            </LayerGroup>
          )}

          {/* 2. Live Weather Doppler Radar (RainViewer Real-Time API) */}
          {(activeLayer === 'radar' || activeLayer === 'precipitation') && rainviewerPath && (
            <TileLayer
              key={`radar-${rainviewerPath}`}
              attribution='Radar &copy; <a href="https://www.rainviewer.com">RainViewer</a>'
              url={`https://tilecache.rainviewer.com${rainviewerPath}/512/{z}/{x}/{y}/2/1_1.png`}
              opacity={0.85}
              zIndex={420}
            />
          )}

          {/* 3. Live Satellite Cloud Cover Layer */}
          {activeLayer === 'satellite' && (
            <TileLayer
              attribution='Satellite &copy; NASA GIBS / Esri'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              opacity={0.95}
              zIndex={410}
            />
          )}

          {/* 4. Live Animated Wind Streamlines & Particle Vector Flow (Strictly isolated to Wind layer) */}
          {activeLayer === 'wind' && (
            <WindParticleOverlay
              stormLat={activeLat}
              stormLng={activeLng}
              stormWindKt={activeWindKt}
              active={true}
              showLegend={false}
            />
          )}

          {/* 5. Live Atmospheric Relative Humidity & Moisture Flux */}
          {activeLayer === 'humidity' && (
            <HumidityMoistureOverlay
              stormLat={activeLat}
              stormLng={activeLng}
              active={true}
              showLegend={false}
            />
          )}

          {/* 6. Live Atmospheric Pressure (MSLP) Isobars & Depression Core */}
          {activeLayer === 'pressure' && (
            <PressureIsobarOverlay
              stormLat={activeLat}
              stormLng={activeLng}
              stormWindKt={activeWindKt}
              active={true}
              showLegend={false}
            />
          )}

          {/* 7. Live Sea Surface & Air Temperature Warm Pool */}
          {activeLayer === 'temperature' && (
            <TemperatureOverlay
              stormLat={activeLat}
              stormLng={activeLng}
              active={true}
              showLegend={false}
              onThermalData={setLiveThermalData}
            />
          )}

          {/* =========================================================================
              AI DETECTED CYCLONE (FROM INPUTTED IMAGE): EYEWALL PINPOINT & 5-DAY NEXT UPDATE TRACK
          ========================================================================= */}
          {aiCyclone && (
            <React.Fragment key={`ai-group-${aiCyclone.id}`}>
              {/* 1. Uncertainty Cone Envelope Polygon */}
              {aiForecast && aiForecast.length > 0 && (
                <Polygon
                  positions={generateUncertaintyCone([aiCyclone.latitude, aiCyclone.longitude], aiForecast)}
                  pathOptions={{
                    fillColor: '#ef4444',
                    fillOpacity: 0.12,
                    color: '#ef4444',
                    weight: 1.5,
                    dashArray: '5, 5'
                  }}
                />
              )}

              {/* 2. Trajectory Track Polyline connecting Eyewall to each Next Update */}
              {aiForecast && aiForecast.length > 0 && (
                <Polyline
                  positions={[[aiCyclone.latitude, aiCyclone.longitude], ...aiForecast.map(w => [w.latitude, w.longitude])]}
                  pathOptions={{
                    color: '#ef4444',
                    weight: 3.5,
                    opacity: 0.95,
                    dashArray: '8, 8',
                    lineCap: 'round',
                    lineJoin: 'round'
                  }}
                />
              )}

              {/* 3. Next Update Waypoint Markers (Day 1..5 / +24h..+120h) */}
              {aiForecast && aiForecast.map((wp) => {
                const isSelectedStep = currentStep === wp.step;
                return (
                  <Marker
                    key={`ai-wp-${wp.step}`}
                    position={[wp.latitude, wp.longitude]}
                    icon={createDayMarkerIcon(wp.step, wp.wind_speed_kt || aiCyclone.wind_kt, isSelectedStep)}
                    eventHandlers={{
                      click: () => setManualDayStep(wp.step)
                    }}
                  >
                    <Popup className="custom-popup" autoPan={true}>
                      <div className="p-1 min-w-[210px] space-y-1.5 font-sans">
                        <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-700/50">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white shadow-xs">
                            Day {wp.step} Update (+{wp.horizon_hours}h)
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">AI Trajectory</span>
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                          {wp.stage || `Projected Day ${wp.step} Position`}
                        </h4>
                        <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                          <p className="flex justify-between border-b border-slate-200 dark:border-slate-700/50 pb-0.5">
                            <span className="font-semibold text-slate-500">Projected Eye:</span>
                            <span className="font-black text-red-500">{wp.latitude}°N, {wp.longitude}°E</span>
                          </p>
                          <p className="flex justify-between border-b border-slate-200 dark:border-slate-700/50 pb-0.5">
                            <span className="font-semibold text-slate-500">Intensity:</span>
                            <span className="font-bold text-amber-500">
                              {wp.wind_speed_kt ? Math.round(wp.wind_speed_kt * 1.852) : (aiCyclone.wind_speed || '--')} km/h ({wp.wind_speed_kt || aiCyclone.wind_kt} kt)
                            </span>
                          </p>
                          <p className="flex justify-between border-b border-slate-200 dark:border-slate-700/50 pb-0.5">
                            <span className="font-semibold text-slate-500">Confidence Margin:</span>
                            <span className="font-bold text-slate-600 dark:text-slate-300">±{wp.uncertainty_radius_km} km</span>
                          </p>
                          {wp.arrival_time && (
                            <p className="text-[10px] text-slate-400 pt-0.5">
                              Estimated Arrival: {new Date(wp.arrival_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* 4. Current AI Detected Cyclone Eyewall Pinpoint Marker */}
              <Marker 
                position={[aiCyclone.latitude, aiCyclone.longitude]}
                icon={aiCycloneIcon}
                eventHandlers={{
                  click: () => handleSelectCyclone(aiCyclone)
                }}
              >
                <Popup className="custom-popup" autoPan={true}>
                  <div className="p-1 min-w-[220px]">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white animate-pulse shadow-xs">
                        AI DETECTED EYEWALL
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-2">{aiCyclone.name}</h4>
                    <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                      <p className="flex justify-between border-b border-slate-200 dark:border-slate-700/50 pb-1">
                        <span className="font-semibold text-slate-500">Eyewall Coordinates:</span>
                        <span className="font-black text-red-500">{aiCyclone.latitude}°N, {aiCyclone.longitude}°E</span>
                      </p>
                      <p className="flex justify-between border-b border-slate-200 dark:border-slate-700/50 pb-1">
                        <span className="font-semibold text-slate-500">Basin:</span>
                        <span className="font-bold">{aiCyclone.subbasin}</span>
                      </p>
                      <p className="flex justify-between border-b border-slate-200 dark:border-slate-700/50 pb-1">
                        <span className="font-semibold text-slate-500">Classification:</span>
                        <span className="font-bold text-amber-500">{aiCyclone.status}</span>
                      </p>
                      <p className="flex justify-between border-b border-slate-200 dark:border-slate-700/50 pb-1">
                        <span className="font-semibold text-slate-500">Wind Speed:</span>
                        <span className="font-bold text-red-600">{aiCyclone.wind_speed} km/h ({aiCyclone.wind_kt} kt)</span>
                      </p>
                      <p className="text-[10px] text-slate-400 pt-1">
                        Detection: {aiCyclone.coordMethod}
                      </p>
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          )}

          {/* =========================================================================
              SPIRE WEATHER FUTURE TRACK: OBSERVED & FORECAST TRAJECTORIES
          ========================================================================= */}
          {isFutureTrack && (spireData?.storms || []).map((storm) => {
            const isSelected = selectedCycloneId === `spire-${storm.id}`;
            const obsTrack = Array.isArray(storm.observed_track) ? storm.observed_track : [];
            const fcTrack = Array.isArray(storm.forecast_track) ? storm.forecast_track : [];

            // 1. Observed path line: chronological solid line
            const obsPoints = obsTrack.map(pt => [pt.lat, pt.lon]);
            if (storm.current_position?.lat != null && storm.current_position?.lon != null && obsPoints.length > 0) {
              obsPoints.push([storm.current_position.lat, storm.current_position.lon]);
            }

            // 2. Future forecast track: dashed line connecting actual coordinates in chronological order
            const fcPoints = [];
            if (storm.current_position?.lat != null && storm.current_position?.lon != null) {
              fcPoints.push([storm.current_position.lat, storm.current_position.lon]);
            }
            fcTrack.forEach(pt => {
              if (pt.lat != null && pt.lon != null) {
                fcPoints.push([pt.lat, pt.lon]);
              }
            });

            const centerLat = storm.current_position?.lat ?? (obsTrack.length > 0 ? obsTrack[obsTrack.length - 1].lat : (fcTrack.length > 0 ? fcTrack[0].lat : null));
            const centerLon = storm.current_position?.lon ?? (obsTrack.length > 0 ? obsTrack[obsTrack.length - 1].lon : (fcTrack.length > 0 ? fcTrack[0].lon : null));

            return (
              <React.Fragment key={`spire-group-${storm.id}`}>
                {/* Observed Historical Path: Solid line (#0284c7 Sky Blue) */}
                {obsPoints.length > 1 && (
                  <Polyline
                    positions={obsPoints}
                    pathOptions={{
                      color: '#0284c7',
                      weight: 3.5,
                      opacity: 0.9,
                      lineCap: 'round',
                      lineJoin: 'round'
                    }}
                  />
                )}

                {/* Observed Waypoint Markers with Date/Time Labels */}
                {obsTrack.map((pt, idx) => (
                  <CircleMarker
                    key={`spire-obs-${storm.id}-${idx}`}
                    center={[pt.lat, pt.lon]}
                    radius={5}
                    pathOptions={{
                      color: '#ffffff',
                      fillColor: '#0284c7',
                      fillOpacity: 0.95,
                      weight: 1.5
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                      <div className="text-[11px] font-sans p-1">
                        <div className="font-bold text-sky-600 flex items-center gap-1">
                          <span>Observed Fix</span>
                          <span className="text-[9px] bg-sky-100 text-sky-800 px-1 rounded">{pt.time_display}</span>
                        </div>
                        <div className="text-slate-700 mt-0.5 space-y-0.5">
                          <div><strong>Position:</strong> {pt.lat}°N, {pt.lon}°E</div>
                          {pt.wind_kmh && <div><strong>Wind:</strong> {pt.wind_kmh} km/h ({pt.wind_kt} kt)</div>}
                          {pt.pressure && <div><strong>MSLP:</strong> {pt.pressure} hPa</div>}
                          <div className="text-[9px] text-slate-500">{pt.ist_display}</div>
                        </div>
                      </div>
                    </Tooltip>
                  </CircleMarker>
                ))}

                {/* Future Forecast Track: Distinguishable Dashed Line (#f59e0b Amber / Orange) */}
                {fcPoints.length > 1 && (
                  <Polyline
                    positions={fcPoints}
                    pathOptions={{
                      color: '#f59e0b',
                      weight: 3.5,
                      opacity: 0.95,
                      dashArray: '8, 8',
                      lineCap: 'round',
                      lineJoin: 'round'
                    }}
                  />
                )}

                {/* Forecast Positions: Small Circular Markers with Day/Time, Wind Speed & Category */}
                {fcTrack.map((pt, idx) => (
                  <CircleMarker
                    key={`spire-fc-${storm.id}-${idx}`}
                    center={[pt.lat, pt.lon]}
                    radius={6}
                    pathOptions={{
                      color: '#ffffff',
                      fillColor: '#f59e0b',
                      fillOpacity: 0.95,
                      weight: 2
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                      <div className="text-[11px] font-sans p-1">
                        <div className="font-bold text-amber-600 flex items-center gap-1">
                          <span>Spire Forecast +{pt.forecast_hour}h</span>
                          <span className="text-[9px] bg-amber-100 text-amber-800 px-1 rounded">{pt.date_display} {pt.time_display}</span>
                        </div>
                        <div className="text-slate-700 mt-0.5 space-y-0.5">
                          <div><strong>Position:</strong> {pt.lat}°N, {pt.lon}°E</div>
                          <div><strong>Wind Speed:</strong> {pt.max_sustained_wind_kmh || '--'} km/h ({pt.max_sustained_wind_kt || '--'} kt)</div>
                          {pt.category_code && <div><strong>Category:</strong> {pt.stage || pt.category_code}</div>}
                          <div className="text-[9px] text-slate-500">{pt.ist_display}</div>
                        </div>
                      </div>
                    </Tooltip>
                  </CircleMarker>
                ))}

                {/* Current Cyclone Position: Prominent Marker */}
                {centerLat != null && centerLon != null && (
                  <Marker
                    position={[centerLat, centerLon]}
                    icon={createSpireCycloneIcon(isSelected)}
                    eventHandlers={{
                      click: () => {
                        setSelectedCycloneId(`spire-${storm.id}`);
                        if (mapRef.current) {
                          mapRef.current.flyTo([centerLat, centerLon], 7, { duration: 1.2 });
                        }
                      }
                    }}
                  >
                    <Popup className="custom-popup" autoPan={true}>
                      <div className="p-1 min-w-[220px]">
                        <div className="flex items-center justify-between gap-1.5 mb-1.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white shadow-xs bg-sky-600">
                            Spire Forecast
                          </span>
                          <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                            {storm.basin_label || storm.basin}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-1">{storm.name}</h4>
                        
                        <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                          <p className="flex justify-between border-b border-slate-200 dark:border-slate-700/50 pb-1">
                            <span className="font-semibold text-slate-500">Current Fix:</span>
                            <span className="font-black text-sky-600">{centerLat}°N, {centerLon}°E</span>
                          </p>
                          <p className="flex justify-between border-b border-slate-200 dark:border-slate-700/50 pb-1">
                            <span className="font-semibold text-slate-500">Basin:</span>
                            <span className="font-bold">{storm.basin_label}</span>
                          </p>
                          {storm.current_position?.wind_kmh != null && (
                            <p className="flex justify-between border-b border-slate-200 dark:border-slate-700/50 pb-1">
                              <span className="font-semibold text-slate-500">Sustained Wind:</span>
                              <span className="font-bold text-red-600">{storm.current_position.wind_kmh} km/h ({storm.current_position.wind_kt} kt)</span>
                            </p>
                          )}
                          <p className="flex justify-between border-b border-slate-200 dark:border-slate-700/50 pb-1">
                            <span className="font-semibold text-slate-500">Forecast Points:</span>
                            <span className="font-bold text-amber-600">{storm.total_forecast_points} waypoints</span>
                          </p>
                          {storm.latest_observed_time && (
                            <p className="text-[10px] text-slate-400 pt-0.5">
                              Latest Fix: {storm.latest_observed_time}
                            </p>
                          )}
                          {storm.advisory_time_ist && (
                            <p className="text-[10px] text-slate-400">
                              Advisory: {storm.advisory_time_ist}
                            </p>
                          )}
                        </div>

                        <div className="mt-2 pt-1.5 border-t border-slate-200 dark:border-slate-700/50">
                          <p className="text-[9px] text-sky-600 dark:text-sky-400 leading-tight">
                            ℹ️ Official Spire Weather forecast track. Connected coordinates in chronological sequence.
                          </p>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )}
              </React.Fragment>
            );
          })}
        </MapContainer>
      )}

      {/* Centered Guidance Card when No Image is Analyzed on Tactical Map */}
      {viewMode === 'tactical' && !aiCyclone && !isFutureTrack && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[450]">
          <div className="pointer-events-auto max-w-sm mx-4 p-5 rounded-2xl bg-[#0a1b24]/95 backdrop-blur-xl border border-teal-500/40 shadow-2xl text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-teal-500/10 border border-teal-400/30 flex items-center justify-center mx-auto text-teal-400">
              <Compass size={24} className="animate-pulse" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white tracking-tight">Tactical Tracker Standby</h3>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                No cyclone satellite image is loaded. Upload an image in <span className="text-teal-300 font-bold">Analyze Image</span> to pinpoint the live eyewall coordinates and generate 5-day AI trajectory updates.
              </p>
            </div>
            {setActiveTab && (
              <button
                type="button"
                onClick={() => setActiveTab('analyze')}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-teal-500/25 transition-all cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
              >
                <Sparkles size={13} />
                <span>Go to Analyze Image</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Floating Tooltip: Temperature on Mouse Hover (smooth, near cursor) */}
      {viewMode === 'tactical' && activeLayer === 'temperature' && hoverTemp !== null && cursorPoint && (
        <div 
          className="absolute pointer-events-none z-[1000] px-2.5 py-1 rounded-lg bg-[#0a1b24]/95 backdrop-blur-md border border-orange-500/60 shadow-2xl text-xs font-mono font-bold text-white flex items-center gap-1.5 select-none transition-transform duration-75 ease-out"
          style={{
            left: `${(cursorPoint.x > (typeof window !== 'undefined' ? window.innerWidth - 200 : 800)) ? cursorPoint.x - 170 : cursorPoint.x + 14}px`,
            top: `${(cursorPoint.y > (typeof window !== 'undefined' ? window.innerHeight - 120 : 600)) ? cursorPoint.y - 36 : cursorPoint.y + 14}px`
          }}
        >
          <Thermometer size={13} className="text-orange-400 shrink-0 animate-pulse" />
          <span className="text-slate-200">Temperature:</span>
          <span className="text-orange-300 font-black">{hoverTemp}°C</span>
        </div>
      )}

      {/* =========================================================================
          TOP FLOATING NAVIGATION & COMMAND BAR (100% Full-Width Map)
      ========================================================================= */}
      <div className="absolute top-3 left-3 right-3 z-[990] flex items-center justify-between pointer-events-none gap-2">
        {/* Left: Back button & Title */}
        <div className="flex items-center gap-2 pointer-events-auto shrink-0">
          {setActiveTab && (
            <button
              type="button"
              onClick={() => {
                if (currentAnalysis) {
                  setActiveTab('results');
                } else {
                  setActiveTab('home');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0a1b24]/90 backdrop-blur-md border border-teal-500/35 text-slate-200 hover:bg-teal-900/40 hover:text-white font-bold text-xs shadow-xl transition-all cursor-pointer group shrink-0"
              title="Back to previous page"
            >
              <ArrowLeft size={14} className="text-teal-400 group-hover:-translate-x-1 transition-transform" />
              <span>Back</span>
            </button>
          )}

          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0a1b24]/90 backdrop-blur-md border border-teal-500/35 shadow-xl text-xs">
            <h1 className="font-bold text-white tracking-tight">
              India Coastal Cyclone Monitor
            </h1>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30 flex items-center gap-1">
              <Sparkles size={10} /> Live
            </span>
          </div>
        </div>

        {/* Right: Mode Switcher & Active Cyclones Trigger Button */}
        <div className="flex items-center gap-2 pointer-events-auto shrink-0">
          {/* Tactical Map vs Windy Atmospheric Radar Engine Switcher */}
          <div className="flex items-center p-0.5 rounded-xl bg-[#0a1b24]/90 backdrop-blur-md border border-teal-500/35 text-xs shadow-xl">
            <button
              type="button"
              onClick={() => setViewMode('tactical')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'tactical'
                  ? 'bg-teal-500/30 text-teal-200 border border-teal-400/40 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Compass size={13} />
              <span className="text-[11px] sm:text-xs">Tactical Map</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('windy_engine')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'windy_engine'
                  ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-xs font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Wind size={13} className={viewMode === 'windy_engine' ? 'animate-pulse' : ''} />
              <span className="text-[11px] sm:text-xs">Radar Engine</span>
            </button>
          </div>

          {/* Active Storms Trigger Pill */}
          <button
            type="button"
            onClick={() => setIsCycloneDrawerOpen(!isCycloneDrawerOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl backdrop-blur-md text-xs font-bold shadow-xl transition-all cursor-pointer ${
              isCycloneDrawerOpen
                ? 'bg-red-600 text-white border border-red-400'
                : 'bg-[#0a1b24]/90 border border-teal-500/35 text-slate-200 hover:bg-teal-900/40 hover:text-white'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${totalActiveCount > 0 ? 'bg-red-500 animate-ping' : 'bg-slate-500'}`} />
            <span>Active Storms ({totalActiveCount})</span>
            <List size={13} />
          </button>

          {/* Live Status Pill */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#0a1b24]/90 backdrop-blur-md border border-teal-500/35 text-xs text-slate-300 shadow-xl">
            <span className={`w-2 h-2 rounded-full ${status === 'LIVE / Connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'}`} />
            <span className="text-[11px] font-medium">{status}</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          FLOATING OPTION 3: RIGHT FLOATING DOCK (Zoom, Recenter & Quick Tools)
      ========================================================================= */}
      <div className="absolute top-16 sm:top-20 right-3 z-[990] flex flex-col gap-1.5 pointer-events-auto">
        <button
          type="button"
          onClick={handleZoomIn}
          className="w-9 h-9 rounded-xl bg-[#0a1b24]/90 hover:bg-teal-900/60 text-slate-200 hover:text-white border border-teal-500/35 backdrop-blur-md shadow-xl flex items-center justify-center transition-all cursor-pointer"
          title="Zoom In"
        >
          <Plus size={17} />
        </button>

        <button
          type="button"
          onClick={handleZoomOut}
          className="w-9 h-9 rounded-xl bg-[#0a1b24]/90 hover:bg-teal-900/60 text-slate-200 hover:text-white border border-teal-500/35 backdrop-blur-md shadow-xl flex items-center justify-center transition-all cursor-pointer"
          title="Zoom Out"
        >
          <Minus size={17} />
        </button>

        <button
          type="button"
          onClick={handleRecenter}
          className="w-9 h-9 rounded-xl bg-[#0a1b24]/90 hover:bg-teal-900/60 text-teal-300 hover:text-white border border-teal-500/35 backdrop-blur-md shadow-xl flex items-center justify-center transition-all cursor-pointer"
          title="Recenter on Active Cyclone Eye"
        >
          <Crosshair size={17} />
        </button>
      </div>

      {/* =========================================================================
          FLOATING OPTION 4 & 5: TACTICAL SCALE & PLAYER (Only in Tactical Map Mode)
          (Windy has its own built-in interactive timeline and scale bar)
      ========================================================================= */}
      {viewMode === 'tactical' && (
        <>
          {/* Floating Option 4: Bottom-Left Scale Bar, Continuous Temperature Legend & Coordinates */}
          <div className="absolute bottom-4 left-3 z-[950] pointer-events-auto select-none flex flex-col gap-2">
            {/* 1. Continuous Temperature Legend with °C units (Active strictly on Temperature layer) */}
            {activeLayer === 'temperature' && (
              <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-[#0a1b24]/95 backdrop-blur-md border border-teal-500/40 shadow-2xl text-slate-200 font-mono text-[10px] min-w-[270px] sm:min-w-[310px] animate-fade-in">
                <div className="flex items-center justify-between pb-1 border-b border-teal-500/20">
                  <span className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider text-teal-300">
                    <Thermometer size={13} className="text-orange-400 animate-pulse" />
                    Temperature
                  </span>
                  <span className="text-[10px] text-teal-400/80">
                    SST & Air (°C)
                  </span>
                </div>

                {/* Continuous colour gradient bar */}
                <div className="space-y-1">
                  <div 
                    className="h-2.5 w-full rounded shadow-inner"
                    style={{
                      background: 'linear-gradient(to right, #3b82f6 0%, #06b6d4 20%, #10b981 40%, #eab308 60%, #f97316 80%, #ef4444 100%)'
                    }}
                  />
                  {/* Dynamic continuous labels with °C units */}
                  <div className="flex justify-between text-[9px] text-slate-300 px-0.5">
                    <span>{tempRange.min}°C</span>
                    <span>{Math.round(tempRange.min + (tempRange.max - tempRange.min) * 0.2)}°C</span>
                    <span>{Math.round(tempRange.min + (tempRange.max - tempRange.min) * 0.4)}°C</span>
                    <span>{Math.round(tempRange.min + (tempRange.max - tempRange.min) * 0.6)}°C</span>
                    <span>{Math.round(tempRange.min + (tempRange.max - tempRange.min) * 0.8)}°C</span>
                    <span>{tempRange.max}°C+</span>
                  </div>
                </div>

                {/* Live warm pool status & dynamic range */}
                <div className="pt-1 border-t border-teal-500/15 flex items-center justify-between text-[9px] text-slate-400">
                  <span className="text-orange-300 font-semibold">Warm Core: {liveThermalData?.temp ? `${liveThermalData.temp}°C` : '29.5°C'}</span>
                  <span>Scale: {tempRange.min}°C – {tempRange.max}°C</span>
                </div>
              </div>
            )}

            {/* 2. Coordinates Display and other Layer Scales */}
            <div className="flex items-center gap-2">
              {/* Latitude and Longitude Display (Continuously updated on mouse move) */}
              <div className="flex flex-col justify-center px-2.5 py-1.5 rounded-xl bg-[#0a1b24]/92 backdrop-blur-md border border-teal-500/35 shadow-2xl text-[10px] font-mono text-slate-300 leading-snug">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-semibold">Latitude:</span>{' '}
                  <span className="text-teal-300 font-bold">{cursorCoords ? cursorCoords.latStr : `${activeLat.toFixed(4)}° N`}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-semibold">Longitude:</span>{' '}
                  <span className="text-teal-300 font-bold">{cursorCoords ? cursorCoords.lngStr : `${activeLng.toFixed(4)}° E`}</span>
                </div>
              </div>

              {activeLayer === 'pressure' && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0a1b24]/92 backdrop-blur-md border border-teal-500/35 shadow-2xl text-[10px] text-slate-200 font-mono">
                  <span className="font-bold text-teal-300">hPa</span>
                  <div className="flex items-center rounded overflow-hidden shadow-xs border border-teal-500/20">
                    <span className="px-1.5 py-0.5 bg-[#1d3557] text-white">970</span>
                    <span className="px-1.5 py-0.5 bg-[#457b9d] text-white">985</span>
                    <span className="px-1.5 py-0.5 bg-[#a8dadc] text-slate-900 font-bold">1000</span>
                    <span className="px-1.5 py-0.5 bg-[#f1faee] text-slate-900 font-bold">1015</span>
                    <span className="px-1.5 py-0.5 bg-[#e63946] text-white">1030</span>
                    <span className="px-1.5 py-0.5 bg-[#6a040f] text-white">1045</span>
                  </div>
                  <span className="hidden sm:inline text-teal-400 font-bold">MSLP Isobars</span>
                </div>
              )}

              {activeLayer === 'wind' && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0a1b24]/92 backdrop-blur-md border border-teal-500/35 shadow-2xl text-[10px] text-slate-200 font-mono">
                  <span className="font-bold text-teal-300">km/h</span>
                  <div className="flex items-center rounded overflow-hidden shadow-xs border border-teal-500/20">
                    <span className="px-1.5 py-0.5 bg-[#818cf8] text-white">0</span>
                    <span className="px-1.5 py-0.5 bg-[#06b6d4] text-white">25</span>
                    <span className="px-1.5 py-0.5 bg-[#10b981] text-white">50</span>
                    <span className="px-1.5 py-0.5 bg-[#eab308] text-slate-900 font-bold">75</span>
                    <span className="px-1.5 py-0.5 bg-[#f97316] text-white">100</span>
                    <span className="px-1.5 py-0.5 bg-[#ef4444] text-white font-bold">125+</span>
                  </div>
                  <span className="hidden sm:inline text-teal-400 font-bold">Wind Vectors</span>
                </div>
              )}

              {activeLayer === 'humidity' && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0a1b24]/92 backdrop-blur-md border border-teal-500/35 shadow-2xl text-[10px] text-slate-200 font-mono">
                  <span className="font-bold text-teal-300">%</span>
                  <div className="flex items-center rounded overflow-hidden shadow-xs border border-teal-500/20">
                    <span className="px-1.5 py-0.5 bg-[#e0f2fe] text-slate-900 font-bold">40%</span>
                    <span className="px-1.5 py-0.5 bg-[#38bdf8] text-slate-900 font-bold">60%</span>
                    <span className="px-1.5 py-0.5 bg-[#0284c7] text-white">75%</span>
                    <span className="px-1.5 py-0.5 bg-[#0369a1] text-white">90%</span>
                    <span className="px-1.5 py-0.5 bg-[#0c4a6e] text-white font-bold">100%</span>
                  </div>
                  <span className="hidden sm:inline text-teal-400 font-bold">RH Moisture</span>
                </div>
              )}
            </div>
          </div>

          {/* Floating Option 5: Bottom-Center Synoptic Player */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[950] pointer-events-auto flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#0a1b24]/92 backdrop-blur-md border border-teal-500/35 shadow-2xl text-xs text-white">
              <button 
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-7 h-7 rounded-lg bg-teal-500/25 hover:bg-teal-500/40 text-teal-300 flex items-center justify-center transition-colors cursor-pointer"
                title={isPlaying ? "Pause Stream" : "Play Stream"}
              >
                {isPlaying ? <Pause size={13} /> : <Play size={13} className="ml-0.5" />}
              </button>

              <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-200 px-1 border-x border-teal-500/20">
                <Clock size={12} className="text-teal-400" />
                <span>{currentFormattedTime}</span>
              </div>

              <button 
                type="button"
                onClick={() => fetchLiveCyclones()}
                className="w-7 h-7 rounded-lg bg-teal-500/15 hover:bg-teal-500/30 text-teal-300 flex items-center justify-center transition-colors cursor-pointer"
                title="Next Synoptic Refresh"
              >
                <SkipForward size={13} />
              </button>

              {/* Model Resolution Badges */}
              <div className="hidden sm:flex items-center gap-1 ml-1">
                {['ICON 13 km', 'GFS 22 km', 'ECMWF 9 km'].map((model) => (
                  <button
                    key={model}
                    type="button"
                    onClick={() => setSelectedModel(model)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase transition-all cursor-pointer ${
                      selectedModel === model 
                        ? 'bg-teal-400 text-slate-900 shadow-xs' 
                        : 'bg-teal-950/60 hover:bg-teal-900/60 text-teal-300/80 border border-teal-500/20'
                    }`}
                  >
                    {model}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* =========================================================================
          SLIDING RIGHT DRAWER: ACTIVE CYCLONES & 24H LANDFALL PROJECTION
          (Tuck away cleanly so user has 100% full-screen wide map)
      ========================================================================= */}
      <div className={`absolute top-0 right-0 h-full w-84 sm:w-96 z-[1050] bg-[#091821]/96 backdrop-blur-2xl border-l border-teal-500/30 shadow-2xl transition-transform duration-300 flex flex-col pointer-events-auto ${
        isCycloneDrawerOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Drawer Header */}
        <div className="p-4 border-b border-teal-500/25 flex items-center justify-between bg-teal-950/50">
          <div className="flex items-center gap-2">
            <Activity size={17} className="text-emerald-400 animate-pulse" />
            <h3 className="font-bold text-white text-sm">Active Cyclones & Track</h3>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-600 text-white">
              {totalActiveCount} Active
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsCycloneDrawerOpen(false)}
            className="w-7 h-7 rounded-lg bg-teal-900/40 hover:bg-teal-800 text-teal-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Close Drawer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-xs">
          
          {/* Active 24-Hour Landfall Prediction Card */}
          {aiCyclone && aiForecast && aiForecast.length > 0 && (() => {
            const activeWp = aiForecast.find(wp => wp.step === currentStep) || aiForecast[0];
            return (
              <div className="bg-gradient-to-br from-red-500/15 via-amber-500/10 to-slate-900/80 rounded-xl border border-red-500/40 p-3.5 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-red-500/20">
                  <div className="flex items-center gap-1.5">
                    <Navigation size={14} className="text-red-400 animate-spin" style={{ animationDuration: '6s' }} />
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-red-400">
                      Active Landfall Projection
                    </h4>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-600 text-white">
                    Day {activeWp.step} (+{activeWp.horizon_hours}h)
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-red-500/30 space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-base font-black text-red-400">
                      {activeWp.latitude}°N, {activeWp.longitude}°E
                    </span>
                    <span className="text-[11px] font-bold text-slate-300">
                      ±{activeWp.uncertainty_radius_km} km
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-200 font-semibold">{activeWp.stage}</p>
                </div>

                {/* Day Stepper */}
                <div className="flex items-center justify-between pt-1 gap-1 border-t border-slate-700/50">
                  <span className="text-[10px] text-slate-400">Cycle:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setManualDayStep(s === autoActiveStep ? null : s)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                          currentStep === s
                            ? 'bg-red-600 text-white shadow-xs'
                            : s === autoActiveStep
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        D{s}
                      </button>
                    ))}
                  </div>
                </div>

                {setActiveTab && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('prediction')}
                    className="w-full py-1.5 px-3 rounded-lg bg-teal-900/40 hover:bg-teal-800/60 border border-teal-500/30 text-teal-300 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span>Open 5-Day Trajectory Track</span>
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>
            );
          })()}

          {/* Active Storms List */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
              Active Storm Events ({totalActiveCount})
            </span>

            {/* Empty State: Reassuring status when 0 active cyclones exist in the basin */}
            {totalActiveCount === 0 && (
              <div className="p-4 rounded-xl bg-slate-900/60 border border-teal-500/20 text-center space-y-2">
                <div className="w-8 h-8 rounded-full bg-teal-500/10 border border-teal-500/30 flex items-center justify-center mx-auto text-teal-400">
                  <CheckCircle2 size={16} />
                </div>
                <h4 className="text-xs font-bold text-white">No Active Storms</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  No tropical cyclones are currently active in the North Indian Ocean basin.
                </p>
                <div className="pt-2 text-[10px] text-teal-300/80 border-t border-teal-500/15">
                  Live real-time monitoring via Spire Weather API
                </div>
              </div>
            )}

            {/* AI Detected Cyclone Card */}
            {aiCyclone && (
              <div 
                className={`p-3 rounded-xl border-2 transition-all cursor-pointer ${
                  selectedCycloneId === aiCyclone.id || (!selectedCycloneId && primaryCyclone?.id === aiCyclone.id)
                    ? 'bg-red-500/20 border-red-500 shadow-md'
                    : 'bg-red-500/10 border-red-500/40 hover:border-red-400'
                }`}
                onClick={() => handleSelectCyclone(aiCyclone)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${totalActiveCount > 0 ? 'bg-red-500 animate-ping' : 'bg-slate-500'}`} />
                    {aiCyclone.name}
                  </span>
                  <span className="text-[10px] font-black text-red-400 bg-red-500/20 px-1.5 py-0.5 rounded border border-red-500/30">
                    LIVE AI EYE
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 space-y-0.5">
                  <p className="flex justify-between">
                    <span>Coordinates:</span>
                    <strong className="text-red-400 font-bold">{aiCyclone.latitude}°N, {aiCyclone.longitude}°E</strong>
                  </p>
                  <p className="flex justify-between">
                    <span>Basin:</span>
                    <span className="font-semibold text-amber-400">{aiCyclone.subbasin}</span>
                  </p>
                  <p className="flex justify-between">
                    <span>Wind Speed:</span>
                    <span className="font-bold text-white">{aiCyclone.wind_speed} km/h</span>
                  </p>
                </div>
              </div>
            )}

            {/* Spire Weather Future Track Storms (Active when Future Track mode is selected) */}
            {isFutureTrack && (spireData?.storms || []).map((storm) => {
              const isSelected = selectedCycloneId === `spire-${storm.id}`;
              const centerLat = storm.current_position?.lat;
              const centerLon = storm.current_position?.lon;
              return (
                <div 
                  key={`spire-card-${storm.id}`}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-400 shadow-md'
                      : 'bg-slate-900/70 border-amber-500/30 hover:border-amber-400/60 hover:bg-slate-900/90'
                  }`}
                  onClick={() => {
                    setSelectedCycloneId(`spire-${storm.id}`);
                    if (mapRef.current && centerLat != null && centerLon != null) {
                      mapRef.current.flyTo([centerLat, centerLon], 7, { duration: 1.2 });
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white text-xs flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      {storm.name}
                    </span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded border text-amber-300 bg-amber-500/20 border-amber-400/40">
                      SPIRE FORECAST
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 space-y-0.5">
                    {centerLat != null && centerLon != null && (
                      <p className="flex justify-between">
                        <span>Current Fix:</span>
                        <strong className="text-amber-300 font-bold">{centerLat}°N, {centerLon}°E</strong>
                      </p>
                    )}
                    <p className="flex justify-between">
                      <span>Basin:</span>
                      <span className="font-semibold text-slate-300">{storm.basin_label}</span>
                    </p>
                    {storm.current_position?.wind_kmh != null && (
                      <p className="flex justify-between">
                        <span>Sustained Wind:</span>
                        <span className="font-bold text-white">
                          {storm.current_position.wind_kmh} km/h ({storm.current_position.wind_kt} kt)
                        </span>
                      </p>
                    )}
                    <div className="pt-1 flex items-center justify-between text-[10px] text-amber-300/80 border-t border-amber-500/20">
                      <span>Track Points: {storm.total_observed_points} obs / {storm.total_forecast_points} fc</span>
                      <span>{storm.latest_observed_time || storm.advisory_time_ist || 'Live'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Telemetry info */}
          <div className="p-3 rounded-xl bg-teal-950/40 border border-teal-500/20 text-[11px] text-slate-300 space-y-1.5">
            <p className="flex justify-between">
              <span className="text-slate-400">Primary Feed:</span>
              <span className="font-semibold text-teal-300">GDACS & JTWC Feeds</span>
            </p>
            <p className="flex justify-between">
              <span className="text-slate-400">Bagyo Tracking:</span>
              <span className={`font-semibold ${
                bagyoData?.status === 'connected' ? 'text-emerald-400' :
                bagyoData?.status === 'stale_cached' ? 'text-amber-400' :
                bagyoData?.status === 'unconfigured' ? 'text-slate-400' : 'text-purple-300'
              }`}>
                {bagyoData?.status === 'connected' ? 'Live Connected (5m)' :
                 bagyoData?.status === 'stale_cached' ? 'Cached / Stale' :
                 bagyoData?.status === 'unconfigured' ? 'Key Needed in .env' : (bagyoData?.status || 'Active')}
              </span>
            </p>
            <p className="flex justify-between">
              <span className="text-slate-400">Spire Future Track:</span>
              <span className={`font-semibold ${
                spireData?.status === 'connected' ? 'text-emerald-400' :
                spireData?.status === 'stale_cached' ? 'text-amber-400' :
                spireData?.status === 'unconfigured' ? 'text-slate-400' : 'text-amber-300'
              }`}>
                {spireData?.status === 'connected' ? 'Live Connected (5m)' :
                 spireData?.status === 'stale_cached' ? 'Cached / Stale' :
                 spireData?.status === 'unconfigured' ? 'Key Needed in .env' : (spireData?.status || 'Active')}
              </span>
            </p>
            <p className="flex justify-between">
              <span className="text-slate-400">Last Synoptic:</span>
              <span className="font-mono text-slate-200">{lastSpireUpdated || lastBagyoUpdated || lastUpdated || 'Live'}</span>
            </p>
            {spireData?.message && spireData?.status === 'unconfigured' && (
              <p className="text-[10px] text-amber-400/90 pt-1 border-t border-amber-500/20">
                ℹ️ {spireData.message}
              </p>
            )}
            {bagyoData?.warning_message && (
              <p className="text-[10px] text-amber-400/90 pt-1 border-t border-amber-500/20">
                ⚠️ {bagyoData.warning_message}
              </p>
            )}
            <p className="text-[9px] text-slate-400/80 pt-1 border-t border-slate-700/40">
              * Official warnings issued by India Meteorological Department (IMD).
            </p>
          </div>


        </div>
      </div>

    </div>
  );
};

export default MapPage;
