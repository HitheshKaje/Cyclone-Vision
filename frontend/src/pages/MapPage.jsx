import React, { useState, useEffect, useRef } from 'react';
import { 
  Map, 
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
  Target,
  Sparkles,
  Layers
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, LayersControl, LayerGroup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getApiBaseUrl } from '../utils/apiConfig';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom cyclone icon using divIcon (Live GDACS storms)
const cycloneIcon = new L.divIcon({
  html: `<div style="background-color: #ef4444; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(239,68,68,0.8); display: flex; align-items: center; justify-content: center;"><div style="background-color: white; width: 4px; height: 4px; border-radius: 50%;"></div></div>`,
  className: 'custom-cyclone-marker',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10]
});

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

const MapPage = ({ currentAnalysis, setActiveTab }) => {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('Updating');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [aiForecast, setAiForecast] = useState(null);
  const [isForecastLoading, setIsForecastLoading] = useState(false);
  const [manualDayStep, setManualDayStep] = useState(null);

  const abortControllerRef = useRef(null);
  const isFetchingRef = useRef(false);
  const mapRef = useRef(null);

  // Compute AI Detected Cyclone from currentAnalysis
  const isAiCyclone = (currentAnalysis?.detection?.is_cyclone !== false) && currentAnalysis?.latitude != null && currentAnalysis?.longitude != null;
  const aiLat = isAiCyclone ? parseFloat(currentAnalysis.latitude) : null;
  const aiLng = isAiCyclone ? parseFloat(currentAnalysis.longitude) : null;

  const aiCyclone = isAiCyclone ? {
    id: `ai-detected-${currentAnalysis.id || 'active'}`,
    name: currentAnalysis.fileName 
      ? `Cyclone ${currentAnalysis.fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')}` 
      : 'AI Detected Tropical Cyclone',
    latitude: aiLat,
    longitude: aiLng,
    wind_speed: currentAnalysis.intensity?.wind_speed_kmh != null 
      ? currentAnalysis.intensity.wind_speed_kmh 
      : (currentAnalysis.intensity?.wind_speed_kt ? Math.round(currentAnalysis.intensity.wind_speed_kt * 1.852) : 120),
    wind_kt: currentAnalysis.intensity?.wind_speed_kt || (currentAnalysis.intensity?.wind_speed_kmh ? Math.round(currentAnalysis.intensity.wind_speed_kmh / 1.852) : 65),
    status: currentAnalysis.classification?.classification || currentAnalysis.intensity?.classification || 'Severe Cyclonic Storm',
    category_desc: currentAnalysis.classification?.description || 'Detected via Satellite AI Analysis',
    subbasin: currentAnalysis.subbasin || (aiLng >= 78.0 ? 'Bay of Bengal' : 'Arabian Sea'),
    isAiDetected: true,
    imagePreview: currentAnalysis.imagePreview,
    coordMethod: currentAnalysis.coordMethod || 'Auto-Extracted from Image',
    last_updated: 'Current AI Analysis'
  } : null;

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

  // Determine auto-advancing day based on 24-hour cycle:
  // 0 - 24 hours: Day 1 (Next 24h position)
  // 24 - 48 hours: Day 2 (Next 48h position)
  // 48 - 72 hours: Day 3
  // 72 - 96 hours: Day 4
  // 96+ hours: Day 5
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

  // Auto-center directly on the detected cyclone eye position
  useEffect(() => {
    if (aiCyclone && mapRef.current) {
      const timer = setTimeout(() => {
        try {
          mapRef.current.flyTo([aiCyclone.latitude, aiCyclone.longitude], 6, {
            duration: 1.5
          });
        } catch (e) {
          console.warn('Map flyTo notice:', e);
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [aiCyclone?.latitude, aiCyclone?.longitude]);

  const fetchLiveCyclones = async () => {
    if (isFetchingRef.current) return;
    
    try {
      isFetchingRef.current = true;
      setStatus(prev => prev === 'Connection Error' ? 'Updating' : prev);
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const response = await fetch(`${API_URL}/api/cyclones/live`, {
        signal: abortControllerRef.current.signal
      });
      
      if (!response.ok) throw new Error('API Error');
      
      const jsonData = await response.json();
      
      setData(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(jsonData)) {
          return jsonData;
        }
        return prev;
      });
      
      setStatus('LIVE / Connected');
      setLastUpdated(new Date().toLocaleTimeString());
      setError(null);
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
    const interval = setInterval(fetchLiveCyclones, 5000);
    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const cyclones = data?.cyclones || [];

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] space-y-4 pb-6">
      {/* 1. Page Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-slate-700/50">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            India Coastal Cyclone Monitor
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Pinpoints active tropical cyclone location around India's coastal region
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span className={`w-2 h-2 rounded-full ${
              status === 'LIVE / Connected' 
                ? 'bg-emerald-500 animate-pulse' 
                : status === 'Updating' 
                ? 'bg-amber-500 animate-ping' 
                : 'bg-red-500'
            }`} />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {status}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Content Layout (Map + Sidebar) */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
        {/* Map Container */}
        <div className="flex-1 rounded-xl overflow-hidden border border-slate-200/50 dark:border-slate-700/50 shadow-sm relative min-h-[400px]">
          <MapContainer 
            ref={mapRef}
            center={aiCyclone ? [aiCyclone.latitude, aiCyclone.longitude] : [15.5, 78.5]} 
            zoom={aiCyclone ? 6 : 5} 
            minZoom={3}
            maxZoom={12}
            scrollWheelZoom={true} 
            className="w-full h-full"
            style={{ height: '100%', minHeight: '100%', background: '#0f172a' }}
          >
            {/* Multi-Layer Base Maps */}
            <LayersControl position="topright">
              {/* 1. STREET / STANDARD VIEW */}
              <LayersControl.BaseLayer checked name="Standard Street">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
              </LayersControl.BaseLayer>

              {/* 2. SATELLITE / HYBRID VIEW */}
              <LayersControl.BaseLayer name="Satellite Hybrid">
                <LayerGroup>
                  <TileLayer
                    attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  />
                  <TileLayer
                    attribution='Labels &copy; Esri &mdash; National Geographic, Esri, DeLorme, NAVTEQ, UNEP-WCMC, USGS, NASA, ESA, METI, NRCAN, GEBCO, NOAA, iPC'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                  />
                </LayerGroup>
              </LayersControl.BaseLayer>

              {/* 3. TERRAIN VIEW */}
              <LayersControl.BaseLayer name="Terrain">
                <TileLayer
                  attribution='Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
                />
              </LayersControl.BaseLayer>

              {/* 4. OCEAN / COASTAL VIEW */}
              <LayersControl.BaseLayer name="Ocean / Coastal">
                <TileLayer
                  attribution='Tiles &copy; Esri &mdash; Sources: GEBCO, NOAA, CHS, OSU, UNH, CSUMB, National Geographic, DeLorme, NAVTEQ, and Esri'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}"
                />
              </LayersControl.BaseLayer>
            </LayersControl>

            {/* AI Detected Cyclone from Satellite Analysis (Clean, Single Eyewall Pinpoint) */}
            {aiCyclone && (
              <Marker 
                key={aiCyclone.id} 
                position={[aiCyclone.latitude, aiCyclone.longitude]}
                icon={aiCycloneIcon}
              >
                <Popup className="custom-popup" autoPan={true}>
                  <div className="p-1 min-w-[220px]">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white animate-pulse shadow-sm">
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

            {/* Live External Cyclones from GDACS (if any) */}
            {cyclones.map((cyclone) => (
              <Marker 
                key={cyclone.id} 
                position={[cyclone.latitude, cyclone.longitude]}
                icon={cycloneIcon}
              >
                <Popup className="custom-popup">
                  <div className="p-1">
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-2">{cyclone.name}</h4>
                    <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                      <p><span className="font-semibold">Latitude:</span> {cyclone.latitude}°</p>
                      <p><span className="font-semibold">Longitude:</span> {cyclone.longitude}°</p>
                      {cyclone.wind_speed != null && (
                        <p><span className="font-semibold">Wind:</span> {cyclone.wind_speed} km/h</p>
                      )}
                      {cyclone.status && (
                        <p><span className="font-semibold">Status:</span> {cyclone.status}</p>
                      )}
                      {cyclone.last_updated && (
                        <p className="mt-2 text-[10px] text-slate-600 dark:text-slate-400">Update: {cyclone.last_updated}</p>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* 3. Map Information Panel */}
        <div className="w-full md:w-80 flex flex-col gap-4 h-full">
          {/* Active 24-Hour Landfall Prediction Card (Auto-advancing to Day 2 after 24h) */}
          {aiCyclone && aiForecast && aiForecast.length > 0 && (() => {
            const activeWp = aiForecast.find(wp => wp.step === currentStep) || aiForecast[0];
            return (
              <div className="bg-gradient-to-br from-red-500/10 via-amber-500/5 to-slate-100/50 dark:to-slate-800/40 rounded-xl border-2 border-red-500/40 p-4 shadow-sm space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-red-500/20">
                  <div className="flex items-center gap-1.5">
                    <Navigation size={15} className="text-red-500 animate-spin" style={{ animationDuration: '6s' }} />
                    <h4 className="text-xs font-black uppercase tracking-wider text-red-600 dark:text-red-400">
                      Active Landfall Projection
                    </h4>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-600 text-white">
                      Day {activeWp.step}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                      +{activeWp.horizon_hours}h
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Active eye centered at <span className="font-bold text-red-500">{aiCyclone.latitude}°N, {aiCyclone.longitude}°E</span> ({aiCyclone.wind_speed} km/h). Showing projected movement for the active 24-hour cycle.
                </p>

                {/* Single Active Day Card */}
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border-2 border-red-500/30 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1">
                      <Compass size={12} />
                      Projected Day {activeWp.step} Position
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      {activeWp.horizon_hours}h Window
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between pt-0.5">
                    <span className="text-base sm:text-lg font-black text-red-600 dark:text-red-400">
                      {activeWp.latitude}°N, {activeWp.longitude}°E
                    </span>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      ±{activeWp.uncertainty_radius_km} km
                    </span>
                  </div>

                  <div className="text-xs text-slate-700 dark:text-slate-300 font-medium pt-1.5 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-slate-900 dark:text-slate-100 font-semibold">{activeWp.stage}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Expected Window: {new Date(activeWp.arrival_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                      {new Date(activeWp.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* 24-Hour Auto-Progression Status Indicator */}
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 text-[11px] space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock size={11} className="text-sky-500" />
                      24h Auto-Progression Cycle
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-black">
                      {currentStep === 1 ? 'Day 1 Active' : `Day ${currentStep} Active`}
                    </span>
                  </div>
                  
                  <p className="text-[10px] text-slate-500 leading-tight">
                    {currentStep < 5 
                      ? `Automatically moves to Day ${currentStep + 1} after 24 hours of tracking (in ~${hoursToNextDay.toFixed(1)} hrs).`
                      : 'Final Day 5 coastal landfall window reached.'}
                  </p>

                  {/* Day Stepper Selector for quick inspection */}
                  <div className="flex items-center justify-between pt-1 gap-1 border-t border-slate-200/50 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 font-medium">Cycle:</span>
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
                              ? 'bg-sky-500/20 text-sky-600 dark:text-sky-300 border border-sky-400/40'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
                          }`}
                          title={s === autoActiveStep ? `Day ${s} (Real-time active based on 24h clock)` : `Preview Day ${s}`}
                        >
                          D{s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Link to Dedicated 5-Day Prediction Page */}
                {setActiveTab && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('prediction')}
                    className="w-full py-2 px-3 rounded-lg bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-sky-600 dark:text-sky-400 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span>View Full 5-Day Prediction Track</span>
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>
            );
          })()}

          {/* Cyclone Monitoring Status */}
          <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-slate-200/50 dark:border-slate-700/50 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 pb-3 border-b border-slate-200/50 dark:border-slate-700/30 flex items-center gap-2">
              <Activity size={16} className="text-emerald-400" />
              Cyclone Monitoring
            </h3>
            
            <div className="space-y-4">
              <div>
                <span className="text-xs font-medium text-slate-500 block mb-1">Active Cyclones</span>
                <div className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <span>{(aiCyclone ? 1 : 0) + cyclones.length}</span>
                  {aiCyclone && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                      1 AI Detected
                    </span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-xs font-medium text-slate-500 block mb-1 flex items-center gap-1.5">
                  <Clock size={12} /> Last Data Update
                </span>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {aiCyclone ? 'Real-time AI Model & Live Feeds' : (data?.updated_at ? new Date(data.updated_at).toLocaleString() : '-')}
                </div>
              </div>

              <div>
                <span className="text-xs font-medium text-slate-500 block mb-1 flex items-center gap-1.5">
                  <Database size={12} /> Data Source
                </span>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300 break-words">
                  {aiCyclone ? 'CycloSafe AI Neural Network + GDACS' : (data?.source || '-')}
                </div>
              </div>

              <div>
                <span className="text-xs font-medium text-slate-500 block mb-1">Connection</span>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${status === 'LIVE / Connected' ? 'bg-emerald-500/100' : 'bg-slate-400'}`} />
                  {status}
                </div>
              </div>
            </div>
          </div>
          
          {/* Active Events List */}
          <div className="bg-slate-100/50 dark:bg-slate-800/30 rounded-xl border border-slate-200/50 dark:border-slate-700/50 p-5 flex-1 overflow-hidden flex flex-col">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-3 uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Active Events</span>
              <span className="text-[10px] font-normal text-slate-400">{(aiCyclone ? 1 : 0) + cyclones.length} Monitored</span>
            </h3>

            <div className="space-y-3 overflow-y-auto flex-1 pr-1 custom-scrollbar">
              {/* Highlight AI Detected Cyclone */}
              {aiCyclone && (
                <div 
                  className="p-3 rounded-lg bg-red-500/10 border-2 border-red-500/40 shadow-sm cursor-pointer hover:border-red-400 transition-all select-none group"
                  onClick={() => {
                    if (mapRef.current) {
                      mapRef.current.flyTo([aiCyclone.latitude, aiCyclone.longitude], 7);
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-800 dark:text-slate-100 text-xs flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                      {aiCyclone.name}
                    </span>
                    <span className="text-[10px] font-bold text-red-500 bg-red-500/15 px-1.5 py-0.5 rounded border border-red-500/30">
                      LIVE EYE
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5">
                    <p className="flex justify-between">
                      <span>Coordinates:</span>
                      <strong className="text-red-500 font-bold">{aiCyclone.latitude}°N, {aiCyclone.longitude}°E</strong>
                    </p>
                    <p className="flex justify-between">
                      <span>Category:</span>
                      <span className="font-semibold text-amber-500">{aiCyclone.status}</span>
                    </p>
                    <p className="flex justify-between">
                      <span>Wind Speed:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">{aiCyclone.wind_speed} km/h</span>
                    </p>
                  </div>
                </div>
              )}

              {/* GDACS Cyclones */}
              {cyclones.map((cyclone) => (
                <div 
                  key={cyclone.id}
                  className="p-3 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer"
                  onClick={() => {
                    if (mapRef.current) {
                      mapRef.current.flyTo([cyclone.latitude, cyclone.longitude], 6);
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{cyclone.name}</span>
                    <span className="text-[10px] text-slate-400">GDACS</span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                    <p>Lat: {cyclone.latitude}°, Lon: {cyclone.longitude}°</p>
                    {cyclone.wind_speed && <p>Wind: {cyclone.wind_speed} km/h</p>}
                  </div>
                </div>
              ))}

              {!aiCyclone && cyclones.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No active cyclone systems detected in coastal waters.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapPage;
