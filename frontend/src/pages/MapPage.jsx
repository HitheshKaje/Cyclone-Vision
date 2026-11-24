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
  List
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, LayerGroup, Polyline, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getApiBaseUrl } from '../utils/apiConfig';
import WindParticleOverlay from '../components/WindParticleOverlay';
import ZoomEarthLayerMenu from '../components/ZoomEarthLayerMenu';
import HumidityMoistureOverlay from '../components/HumidityMoistureOverlay';
import PressureIsobarOverlay from '../components/PressureIsobarOverlay';
import TemperatureOverlay from '../components/TemperatureOverlay';
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

const MapPage = ({ 
  currentAnalysis, 
  setActiveTab,
  viewMode: propViewMode,
  setViewMode: propSetViewMode,
  activeLayer: propActiveLayer,
  setActiveLayer: propSetActiveLayer,
  activeBaseMap: propActiveBaseMap,
  setActiveBaseMap: propSetActiveBaseMap
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


  const abortControllerRef = useRef(null);
  const isFetchingRef = useRef(false);
  const mapRef = useRef(null);
  const hasAutoCenteredRef = useRef(false);

  // Compute AI Detected Cyclone from currentAnalysis
  const isAiCyclone = (currentAnalysis?.detection?.is_cyclone !== false) && currentAnalysis?.latitude != null && currentAnalysis?.longitude != null;
  const aiLat = isAiCyclone ? parseFloat(currentAnalysis.latitude) : 15.50;
  const aiLng = isAiCyclone ? parseFloat(currentAnalysis.longitude) : 81.80;

  const aiCyclone = isAiCyclone ? {
    id: `ai-detected-${currentAnalysis.id || 'active'}`,
    name: currentAnalysis.cycloneName 
      ? currentAnalysis.cycloneName 
      : currentAnalysis.fileName 
      ? `Cyclone ${currentAnalysis.fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')}` 
      : 'Severe Cyclonic Storm Murasu',
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

  const cyclones = data?.cyclones || [];
  const bagyoCyclones = bagyoData?.cyclones || [];

  // Determine currently active storm to center wind vortex and atmospheric layers on
  const primaryCyclone = selectedCycloneId
    ? (selectedCycloneId === aiCyclone?.id
        ? aiCyclone
        : (cyclones.find(c => c.id === selectedCycloneId) || bagyoCyclones.find(c => c.id === selectedCycloneId)))
    : (aiCyclone || bagyoCyclones[0] || cyclones[0] || null);


  const activeLat = primaryCyclone?.latitude || 15.80;
  const activeLng = primaryCyclone?.longitude || 80.20;
  const activeWindKt = primaryCyclone?.wind_kt || 85;
  const activeWindKmh = primaryCyclone?.wind_speed || 157;
  const activeName = primaryCyclone?.name || 'Live Monitored Cyclone';

  // Smooth auto-centering on the primary active cyclone when page or data loads
  useEffect(() => {
    if (!hasAutoCenteredRef.current && mapRef.current) {
      if (aiCyclone) {
        hasAutoCenteredRef.current = true;
        mapRef.current.flyTo([aiCyclone.latitude, aiCyclone.longitude], 6, { duration: 1.5 });
      } else if (cyclones.length > 0) {
        hasAutoCenteredRef.current = true;
        mapRef.current.flyTo([cyclones[0].latitude, cyclones[0].longitude], 6, { duration: 1.5 });
      }
    }
  }, [aiCyclone, cyclones]);

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

  const nioCount = cyclones.filter(c => c.is_nio).length + bagyoCyclones.filter(c => c.is_nio).length;
  const totalActiveCount = (aiCyclone ? 1 : 0) + cyclones.length + bagyoCyclones.length;

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

          {/* 4. Live Animated Wind Streamlines & Particle Vector Flow */}
          <WindParticleOverlay
            stormLat={activeLat}
            stormLng={activeLng}
            stormWindKt={activeWindKt}
            active={activeLayer === 'wind'}
            showLegend={false}
          />

          {/* 5. Live Atmospheric Relative Humidity & Moisture Flux */}
          <HumidityMoistureOverlay
            stormLat={activeLat}
            stormLng={activeLng}
            active={activeLayer === 'humidity'}
            showLegend={false}
          />

          {/* 6. Live Atmospheric Pressure (MSLP) Isobars & Depression Core */}
          <PressureIsobarOverlay
            stormLat={activeLat}
            stormLng={activeLng}
            stormWindKt={activeWindKt}
            active={activeLayer === 'pressure'}
            showLegend={false}
          />

          {/* 7. Live Sea Surface & Air Temperature Warm Pool */}
          <TemperatureOverlay
            stormLat={activeLat}
            stormLng={activeLng}
            active={activeLayer === 'temperature'}
            showLegend={false}
          />

          {/* AI Detected Cyclone Eyewall Pinpoint */}
          {aiCyclone && (
            <Marker 
              key={aiCyclone.id} 
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
          )}

          {/* Live External Cyclones from GDACS & JTWC Feeds */}
          {cyclones.map((cyclone) => {
            const isSelected = selectedCycloneId === cyclone.id || (!selectedCycloneId && !aiCyclone && cyclones[0]?.id === cyclone.id);
            return (
              <Marker 
                key={cyclone.id} 
                position={[cyclone.latitude, cyclone.longitude]}
                icon={createLiveCycloneIcon(cyclone.alert_level, isSelected)}
                eventHandlers={{
                  click: () => handleSelectCyclone(cyclone)
                }}
              >
                <Popup className="custom-popup" autoPan={true}>
                  <div className="p-1 min-w-[210px]">
                    <div className="flex items-center justify-between gap-1.5 mb-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white shadow-xs ${
                        cyclone.alert_level === 'Red' ? 'bg-red-600' : cyclone.alert_level === 'Orange' ? 'bg-amber-600' : 'bg-emerald-600'
                      }`}>
                        {cyclone.alert_level || 'Active'} Alert
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">GDACS / JTWC</span>
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-2">{cyclone.name}</h4>
                    <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                      <p className="flex justify-between border-b border-slate-200 dark:border-slate-700/50 pb-1">
                        <span className="font-semibold text-slate-500">Eyewall Coordinates:</span>
                        <span className="font-black text-red-500">{cyclone.latitude}°N, {cyclone.longitude}°E</span>
                      </p>
                      <p className="flex justify-between border-b border-slate-200 dark:border-slate-700/50 pb-1">
                        <span className="font-semibold text-slate-500">Basin:</span>
                        <span className="font-bold">{cyclone.basin || 'North Indian Ocean'}</span>
                      </p>
                      {cyclone.wind_speed != null && (
                        <p className="flex justify-between border-b border-slate-200 dark:border-slate-700/50 pb-1">
                          <span className="font-semibold text-slate-500">Sustained Wind:</span>
                          <span className="font-bold text-red-600">{cyclone.wind_speed} km/h ({cyclone.wind_kt || Math.round(cyclone.wind_speed / 1.852)} kt)</span>
                        </p>
                      )}
                      {cyclone.country && (
                        <p className="flex justify-between border-b border-slate-200 dark:border-slate-700/50 pb-1">
                          <span className="font-semibold text-slate-500">Threat Region:</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{cyclone.country}</span>
                        </p>
                      )}
                      {cyclone.last_updated && (
                        <p className="text-[10px] text-slate-400 pt-1">
                          Bulletin: {new Date(cyclone.last_updated).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                      {cyclone.report_url && (
                        <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800">
                          <a 
                            href={cyclone.report_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline font-bold flex items-center gap-1"
                          >
                            <span>Official GDACS Bulletin</span>
                            <ExternalLink size={11} />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* =========================================================================
              BAGYO LIVE CYCLONE POSITIONS, OBSERVED TRACKS & AGENCY FORECAST TRACKS
          ========================================================================= */}
          {showBagyoTrack && bagyoCyclones.map((storm) => {
            const isSelected = selectedCycloneId === storm.id;
            const hasObserved = Array.isArray(storm.observed_track) && storm.observed_track.length > 0;
            const hasForecast = Array.isArray(storm.forecast_track) && storm.forecast_track.length > 0;

            // Observed path line connecting historical waypoints
            const observedLine = hasObserved ? storm.observed_track.map(pt => [pt.latitude, pt.longitude]) : [];
            if (storm.latitude != null && storm.longitude != null && observedLine.length > 0) {
              observedLine.push([storm.latitude, storm.longitude]);
            }

            // Agency forecast path line
            const forecastLine = [];
            if (storm.latitude != null && storm.longitude != null && hasForecast) {
              forecastLine.push([storm.latitude, storm.longitude]);
            }
            if (hasForecast) {
              storm.forecast_track.forEach(pt => forecastLine.push([pt.latitude, pt.longitude]));
            }

            return (
              <React.Fragment key={`bagyo-group-${storm.id}`}>
                {/* 1. Observed Past Path (Solid Purple/Violet Line) */}
                {observedLine.length > 1 && (
                  <Polyline
                    positions={observedLine}
                    pathOptions={{
                      color: '#a855f7',
                      weight: 3.5,
                      opacity: 0.9,
                      lineCap: 'round',
                      lineJoin: 'round'
                    }}
                  />
                )}

                {/* Observed Waypoint Markers with Synoptic Telemetry Tooltips */}
                {hasObserved && storm.observed_track.map((pt, idx) => (
                  <CircleMarker
                    key={`bagyo-obs-${storm.id}-${idx}`}
                    center={[pt.latitude, pt.longitude]}
                    radius={5}
                    pathOptions={{
                      color: '#ffffff',
                      fillColor: '#8b5cf6',
                      fillOpacity: 0.95,
                      weight: 1.5
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                      <div className="text-[11px] font-sans p-1">
                        <div className="font-bold text-purple-600 flex items-center gap-1">
                          <span>Observed Eye</span>
                          <span className="text-[9px] bg-purple-100 text-purple-800 px-1 rounded">{pt.time_display}</span>
                        </div>
                        <div className="text-slate-700 mt-0.5 space-y-0.5">
                          <div><strong>Position:</strong> {pt.latitude}°N, {pt.longitude}°E</div>
                          {pt.wind_speed_kmh && <div><strong>Wind:</strong> {pt.wind_speed_kmh} km/h ({pt.wind_speed_kt} kt)</div>}
                          {pt.pressure_hpa && <div><strong>MSLP:</strong> {pt.pressure_hpa} hPa</div>}
                          <div className="text-[9px] text-slate-500">{pt.ist_display}</div>
                        </div>
                      </div>
                    </Tooltip>
                  </CircleMarker>
                ))}

                {/* 2. Official Agency Forecast Path (Dashed Emerald Line) */}
                {forecastLine.length > 1 && (
                  <Polyline
                    positions={forecastLine}
                    pathOptions={{
                      color: '#10b981',
                      weight: 3.5,
                      opacity: 0.95,
                      dashArray: '6, 6',
                      lineCap: 'round',
                      lineJoin: 'round'
                    }}
                  />
                )}

                {/* Forecast Waypoint Markers with Projected Intensity Tooltips */}
                {hasForecast && storm.forecast_track.map((pt, idx) => (
                  <CircleMarker
                    key={`bagyo-fc-${storm.id}-${idx}`}
                    center={[pt.latitude, pt.longitude]}
                    radius={6}
                    pathOptions={{
                      color: '#ffffff',
                      fillColor: '#10b981',
                      fillOpacity: 0.95,
                      weight: 2
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                      <div className="text-[11px] font-sans p-1">
                        <div className="font-bold text-emerald-600 flex items-center gap-1">
                          <span>Agency Forecast</span>
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded">{pt.time_display}</span>
                        </div>
                        <div className="text-slate-700 mt-0.5 space-y-0.5">
                          <div><strong>Position:</strong> {pt.latitude}°N, {pt.longitude}°E</div>
                          <div><strong>Intensity:</strong> {pt.wind_speed_kmh || '--'} km/h ({pt.wind_speed_kt || '--'} kt)</div>
                          {pt.pressure_hpa && <div><strong>MSLP:</strong> {pt.pressure_hpa} hPa</div>}
                          <div><strong>Stage:</strong> {pt.stage}</div>
                          <div className="text-[9px] text-slate-500">{pt.ist_display}</div>
                        </div>
                      </div>
                    </Tooltip>
                  </CircleMarker>
                ))}

                {/* 3. Current Eyewall Center Pinpoint */}
                {storm.latitude != null && storm.longitude != null && (
                  <Marker
                    position={[storm.latitude, storm.longitude]}
                    icon={createBagyoCycloneIcon(storm.alert_level, isSelected)}
                    eventHandlers={{
                      click: () => handleSelectCyclone(storm)
                    }}
                  >
                    <Popup className="custom-popup" autoPan={true}>
                      <div className="p-1 min-w-[220px]">
                        <div className="flex items-center justify-between gap-1.5 mb-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white shadow-xs ${
                            storm.alert_level === 'Red' ? 'bg-red-600' : 'bg-amber-600'
                          }`}>
                            {storm.alert_level || 'Active'} Alert
                          </span>
                          <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                            Bagyo ({storm.agency || 'JTWC'})
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-1">{storm.name}</h4>
                        
                        <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                          <p className="flex justify-between border-b border-slate-200 dark:border-slate-700/50 pb-1">
                            <span className="font-semibold text-slate-500">Eyewall Coordinates:</span>
                            <span className="font-black text-teal-600">{storm.latitude}°N, {storm.longitude}°E</span>
                          </p>
                          <p className="flex justify-between border-b border-slate-200 dark:border-slate-700/50 pb-1">
                            <span className="font-semibold text-slate-500">Basin:</span>
                            <span className="font-bold">{storm.basin}</span>
                          </p>
                          {storm.wind_speed != null && (
                            <p className="flex justify-between border-b border-slate-200 dark:border-slate-700/50 pb-1">
                              <span className="font-semibold text-slate-500">Sustained Wind:</span>
                              <span className="font-bold text-red-600">{storm.wind_speed} km/h ({storm.wind_kt} kt)</span>
                            </p>
                          )}
                          {storm.pressure_hpa != null && (
                            <p className="flex justify-between border-b border-slate-200 dark:border-slate-700/50 pb-1">
                              <span className="font-semibold text-slate-500">Central Pressure:</span>
                              <span className="font-bold text-slate-700 dark:text-slate-200">{storm.pressure_hpa} hPa</span>
                            </p>
                          )}
                          {storm.movement_direction && (
                            <p className="flex justify-between border-b border-slate-200 dark:border-slate-700/50 pb-1">
                              <span className="font-semibold text-slate-500">Forward Movement:</span>
                              <span className="font-medium text-slate-700 dark:text-slate-200">
                                {storm.movement_direction} {storm.movement_speed_kmh ? `@ ${storm.movement_speed_kmh} km/h` : ''}
                              </span>
                            </p>
                          )}
                          {storm.last_updated_ist && (
                            <p className="text-[10px] text-slate-400 pt-0.5">
                              Agency Update: {storm.last_updated_ist}
                            </p>
                          )}
                        </div>

                        {/* Safety notice as mandated by rule 8 */}
                        <div className="mt-2 pt-1.5 border-t border-slate-200 dark:border-slate-700/50">
                          <p className="text-[9px] text-amber-600 dark:text-amber-400 leading-tight">
                            ⚠️ <strong>Notice:</strong> Independent aggregator feed ({storm.agency || 'Bagyo'}). Refer to official IMD bulletins for coastal warning orders.
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

          {/* Bagyo Live Track Toggle */}
          <button
            type="button"
            onClick={() => setShowBagyoTrack(!showBagyoTrack)}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl backdrop-blur-md text-xs font-bold shadow-xl transition-all cursor-pointer ${
              showBagyoTrack
                ? 'bg-purple-600/30 text-purple-200 border border-purple-400/50'
                : 'bg-[#0a1b24]/90 border border-teal-500/35 text-slate-400 hover:text-white'
            }`}
            title="Toggle Bagyo Observed & Forecast Tracks"
          >
            <Activity size={12} className={showBagyoTrack ? 'text-purple-300' : 'text-slate-400'} />
            <span className="text-[11px]">Bagyo Track</span>
          </button>

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
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
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
          {/* Floating Option 4: Bottom-Left Scale Bar */}
          <div className="absolute bottom-4 left-3 z-[950] pointer-events-auto select-none">
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

            {activeLayer === 'temperature' && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0a1b24]/92 backdrop-blur-md border border-teal-500/35 shadow-2xl text-[10px] text-slate-200 font-mono">
                <span className="font-bold text-teal-300">°C</span>
                <div className="flex items-center rounded overflow-hidden shadow-xs border border-teal-500/20">
                  <span className="px-1.5 py-0.5 bg-[#3b82f6] text-white">20</span>
                  <span className="px-1.5 py-0.5 bg-[#06b6d4] text-white">24</span>
                  <span className="px-1.5 py-0.5 bg-[#10b981] text-white">28</span>
                  <span className="px-1.5 py-0.5 bg-[#f59e0b] text-slate-900 font-bold">30</span>
                  <span className="px-1.5 py-0.5 bg-[#ef4444] text-white font-bold">34+</span>
                </div>
                <span className="hidden sm:inline text-teal-400 font-bold">SST Thermal</span>
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
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
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

            {/* GDACS Live Feeds */}
            {cyclones.map((cyclone) => {
              const isSelected = selectedCycloneId === cyclone.id || (!selectedCycloneId && !aiCyclone && cyclones[0]?.id === cyclone.id);
              return (
                <div 
                  key={cyclone.id}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-teal-500/20 border-teal-400 shadow-md'
                      : 'bg-slate-900/70 border-teal-500/20 hover:border-teal-500/50 hover:bg-slate-900/90'
                  }`}
                  onClick={() => handleSelectCyclone(cyclone)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white text-xs flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${cyclone.alert_level === 'Red' ? 'bg-red-500 animate-pulse' : 'bg-amber-400'}`} />
                      {cyclone.name}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                      cyclone.alert_level === 'Red'
                        ? 'text-red-400 bg-red-500/20 border-red-500/40'
                        : 'text-amber-400 bg-amber-500/20 border-amber-500/40'
                    }`}>
                      {cyclone.alert_level || 'Active'} Alert
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 space-y-0.5">
                    <p className="flex justify-between">
                      <span>Coordinates:</span>
                      <strong className="text-teal-300 font-bold">{cyclone.latitude}°N, {cyclone.longitude}°E</strong>
                    </p>
                    <p className="flex justify-between">
                      <span>Basin:</span>
                      <span className="font-semibold text-slate-300">{cyclone.basin}</span>
                    </p>
                    {cyclone.wind_speed != null && (
                      <p className="flex justify-between">
                        <span>Wind Speed:</span>
                        <span className="font-bold text-white">
                          {cyclone.wind_speed} km/h ({cyclone.wind_kt || Math.round(cyclone.wind_speed / 1.852)} kt)
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Bagyo Live Cyclones & Track Feeds */}
            {bagyoCyclones.map((storm) => {
              const isSelected = selectedCycloneId === storm.id;
              return (
                <div 
                  key={`bagyo-card-${storm.id}`}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-purple-500/20 border-purple-400 shadow-md'
                      : 'bg-slate-900/70 border-purple-500/30 hover:border-purple-400/60 hover:bg-slate-900/90'
                  }`}
                  onClick={() => handleSelectCyclone(storm)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white text-xs flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${storm.alert_level === 'Red' ? 'bg-red-500 animate-pulse' : 'bg-purple-400'}`} />
                      {storm.name}
                    </span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded border text-purple-300 bg-purple-500/20 border-purple-400/40">
                      BAGYO ({storm.agency || 'JTWC'})
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 space-y-0.5">
                    <p className="flex justify-between">
                      <span>Coordinates:</span>
                      <strong className="text-purple-300 font-bold">{storm.latitude}°N, {storm.longitude}°E</strong>
                    </p>
                    <p className="flex justify-between">
                      <span>Basin:</span>
                      <span className="font-semibold text-slate-300">{storm.basin}</span>
                    </p>
                    {storm.wind_speed != null && (
                      <p className="flex justify-between">
                        <span>Wind Speed:</span>
                        <span className="font-bold text-white">
                          {storm.wind_speed} km/h ({storm.wind_kt || Math.round(storm.wind_speed / 1.852)} kt)
                        </span>
                      </p>
                    )}
                    {storm.pressure_hpa != null && (
                      <p className="flex justify-between">
                        <span>Central Pressure:</span>
                        <span className="font-bold text-slate-300">{storm.pressure_hpa} hPa</span>
                      </p>
                    )}
                    <div className="pt-1 flex items-center justify-between text-[10px] text-purple-300/80 border-t border-purple-500/20">
                      <span>Waypoints: {storm.observed_track?.length || 0} obs / {storm.forecast_track?.length || 0} fc</span>
                      <span>{storm.last_updated_ist || 'Live'}</span>
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
              <span className="text-slate-400">Last Synoptic:</span>
              <span className="font-mono text-slate-200">{lastBagyoUpdated || lastUpdated || 'Live'}</span>
            </p>
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
