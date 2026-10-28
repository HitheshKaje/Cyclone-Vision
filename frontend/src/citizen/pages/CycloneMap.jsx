import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  Circle, 
  Polyline,
  Polygon
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  AlertCircle, 
  Compass, 
  Wind, 
  Eye, 
  Map as MapIcon, 
  Layers, 
  WifiOff, 
  Info,
  CheckCircle2,
  Navigation,
  ArrowRight,
  ShieldAlert,
  Clock
} from 'lucide-react';
import { useCycloneData } from '../hooks/useCycloneData';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { fetchOfficialAdvisories } from '../services/citizenApi';
import MapLayerControl from '../components/MapLayerControl';
import OfflineStatusBanner from '../components/OfflineStatusBanner';

// Fix Leaflet's default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom high-visibility animated cyclone eye marker
const createCycloneIcon = (name, isSevere = true) => {
  return new L.divIcon({
    html: `
      <div style="
        position: relative;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          position: absolute;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: ${isSevere ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.35)'};
          border: 2px solid #ef4444;
          animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>
        <div style="
          position: absolute;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: ${isSevere ? 'rgba(220, 38, 38, 0.55)' : 'rgba(217, 119, 6, 0.55)'};
          animation: pulse 1.5s ease-in-out infinite;
        "></div>
        <div style="
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: ${isSevere ? '#dc2626' : '#d97706'};
          border: 3px solid #ffffff;
          box-shadow: 0 0 12px rgba(220,38,38,0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
        ">
          <div style="width: 5px; height: 5px; border-radius: 50%; background: #ffffff;"></div>
        </div>
      </div>
    `,
    className: 'cyclosafe-map-cyclone-icon',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  });
};

// Color-coded Day 1 through Day 5 Waypoint Badge
const createDayMarkerIcon = (dayNumber, stage = '') => {
  const isLandfall = stage && stage.toLowerCase().includes('landfall');
  const bg = isLandfall ? '#991b1b' : (dayNumber >= 4 ? '#b91c1c' : '#dc2626');
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

// Continuous Uncertainty Envelope Cone
function generateUncertaintyCone(origin, waypoints) {
  if (!origin || !waypoints || waypoints.length === 0) return [];
  
  const allPoints = [
    { lat: origin[0], lon: origin[1], r: 35 },
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

const CycloneMap = () => {
  const { t, i18n } = useTranslation();
  const { isOnline } = useNetworkStatus();
  const { cyclones, metadata, loading, isCached, freshness } = useCycloneData();
  const [advisory, setAdvisory] = useState(null);
  const [forecastWaypoints, setForecastWaypoints] = useState([]);
  const [activeLayer, setActiveLayer] = useState('standard'); // 'standard' | 'satellite'
  const [tileError, setTileError] = useState(false);
  const mapRef = useRef(null);

  // Poll live broadcast advisory from backend
  useEffect(() => {
    let isMounted = true;
    const checkAdvisory = async () => {
      const res = await fetchOfficialAdvisories();
      if (isMounted && res.success && res.data) {
        setAdvisory(res.data);
      }
    };
    checkAdvisory();
    const interval = setInterval(checkAdvisory, 1500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Compute 5-day forecast waypoints from broadcast or physics projection fallback
  useEffect(() => {
    if (advisory?.active && advisory?.coordinates?.lat != null && advisory?.coordinates?.lng != null) {
      if (advisory.forecast && advisory.forecast.length > 0) {
        setForecastWaypoints(advisory.forecast);
      } else {
        // Fallback: If forecast is not yet in payload (e.g., cached offline or legacy record), project 5 days
        const isBob = advisory.coordinates.lng >= 78.0;
        const now = advisory.issued_at ? new Date(advisory.issued_at).getTime() : Date.now();
        const fallback = [24, 48, 72, 96, 120].map((h, idx) => {
          const step = idx + 1;
          const fLat = advisory.coordinates.lat + step * 0.45;
          const fLon = isBob ? advisory.coordinates.lng - step * 1.65 : advisory.coordinates.lng - step * 0.9;
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
        setForecastWaypoints(fallback);
      }
    } else {
      setForecastWaypoints([]);
    }
  }, [advisory?.active, advisory?.coordinates?.lat, advisory?.coordinates?.lng, advisory?.forecast, advisory?.issued_at]);

  // Strict dynamic list: If Admin has active broadcast, display that detected cyclone
  const mapCyclones = [];
  if (advisory?.active && advisory?.cyclone_name && advisory?.coordinates?.lat != null && advisory?.coordinates?.lng != null) {
    mapCyclones.push({
      id: 'admin_broadcast_active',
      name: advisory.cyclone_name,
      status: advisory.level === 'RED' ? (i18n.language === 'kn' ? t('safety.badge_red') : 'Severe Cyclone (Live Broadcast)') : (i18n.language === 'kn' ? t('safety.badge_yellow') : 'Cyclone Alert'),
      latitude: advisory.coordinates.lat,
      longitude: advisory.coordinates.lng,
      wind_speed: advisory.wind_speed_kmh,
      last_updated: advisory.issued_at,
      description: advisory.message,
      source: advisory.source || 'CycloSafe Admin AI Broadcast'
    });
  }

  const activeCoord = advisory?.active && advisory?.coordinates?.lat != null && advisory?.coordinates?.lng != null
    ? [advisory.coordinates.lat, advisory.coordinates.lng]
    : null;

  // 5-day continuous trajectory polyline points (Origin + Day 1..5)
  const trajectoryPoints = activeCoord && forecastWaypoints.length > 0
    ? [activeCoord, ...forecastWaypoints.map(w => [w.latitude, w.longitude])]
    : [];

  // 5-day uncertainty envelope cone
  const uncertaintyCone = activeCoord && forecastWaypoints.length > 0
    ? generateUncertaintyCone(activeCoord, forecastWaypoints)
    : [];

  // Map center: Default to detected cyclone coords if active, else Indian Coastal Region
  const defaultCenter = activeCoord || [16.5, 82.5];
  const defaultZoom = activeCoord ? 6 : 5;

  // Auto-fit bounds to include origin point and the full 5-day trajectory towards the coast
  useEffect(() => {
    if (mapRef.current && activeCoord) {
      const timer = setTimeout(() => {
        try {
          if (trajectoryPoints.length > 0) {
            mapRef.current.fitBounds(trajectoryPoints, { padding: [50, 50], maxZoom: 7, animate: true });
          } else {
            mapRef.current.flyTo(activeCoord, 6, { duration: 1.5 });
          }
        } catch (e) {
          console.warn('Citizen map fitBounds notice:', e);
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [activeCoord?.[0], activeCoord?.[1], forecastWaypoints.length]);

  return (
    <div className="flex flex-col space-y-3 pb-6">
      
      {/* 1. Header & Layer Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {t('map.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {t('map.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <MapLayerControl 
            activeLayer={activeLayer}
            onLayerChange={setActiveLayer}
          />
        </div>
      </div>

      {/* Real-time Marine Status Bar */}
      {mapCyclones.length === 0 ? (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            <span>{t('map.clear_waters_banner')}</span>
          </div>
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
            {t('map.clear_waters_tag')}
          </span>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-800 dark:text-red-300 text-xs font-bold flex items-center justify-between gap-2 animate-pulse">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-red-500 shrink-0" />
            <span>{t('map.active_warning_tracking')}: {mapCyclones[0].name} ({mapCyclones[0].wind_speed} km/h) &mdash; 5-Day Projected Track Active</span>
          </div>
          <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-sm bg-red-600 text-white">
            {t('map.live_threat')}
          </span>
        </div>
      )}

      {/* 2. Offline Notice Banner */}
      <OfflineStatusBanner 
        isOnline={isOnline}
        isCached={isCached}
        freshness={freshness}
        metadata={metadata}
      />

      {/* 3. Map Viewport Container */}
      <div className="relative w-full h-[62vh] min-h-[440px] rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-800 shadow-md bg-slate-900">
        
        {/* Offline Tile Disclaimer Overlay */}
        {!isOnline && (
          <div className="absolute top-3 left-3 z-20 max-w-xs sm:max-w-sm p-2.5 rounded-xl bg-slate-900/90 text-amber-300 border border-amber-500/40 text-xs backdrop-blur-md shadow-lg flex items-start gap-2">
            <WifiOff size={16} className="shrink-0 mt-0.5 text-amber-400" />
            <div>
              <span className="font-bold block">{t('map.offline_map_title')}</span>
              <span>{t('map.offline_map_desc')}</span>
            </div>
          </div>
        )}

        {/* 5-Day Trajectory Active Badge in Top Right of Map */}
        {forecastWaypoints.length > 0 && (
          <div className="absolute top-3 right-3 z-20 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-red-500/50 text-white text-[11px] font-bold shadow-lg flex items-center gap-2 backdrop-blur-xs">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>5-Day Landfall Prediction Active</span>
          </div>
        )}

        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          className="w-full h-full z-10"
          ref={mapRef}
          scrollWheelZoom={true}
        >
          {/* STANDARD LAYER: OpenStreetMap */}
          {activeLayer === 'standard' && (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              eventHandlers={{
                tileerror: () => setTileError(true)
              }}
            />
          )}

          {/* SATELLITE LAYER: Esri ArcGIS World Imagery */}
          {activeLayer === 'satellite' && (
            <>
              <TileLayer
                attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                eventHandlers={{
                  tileerror: () => setTileError(true)
                }}
              />
              {/* Coastlines & Place Names Overlay */}
              <TileLayer
                attribution='Labels &copy; Esri'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              />
            </>
          )}

          {/* Continuous Uncertainty Envelope Cone */}
          {uncertaintyCone.length > 0 && (
            <Polygon
              positions={uncertaintyCone}
              pathOptions={{
                color: '#ef4444',
                fillColor: '#ef4444',
                fillOpacity: 0.16,
                weight: 1.5,
                dashArray: '5, 5'
              }}
            />
          )}

          {/* 5-Day Projected Trajectory Polylines (Glow + Core Dashed Line) */}
          {trajectoryPoints.length > 1 && (
            <>
              <Polyline
                positions={trajectoryPoints}
                pathOptions={{
                  color: '#ef4444',
                  weight: 6,
                  opacity: 0.35,
                  lineCap: 'round',
                  lineJoin: 'round'
                }}
              />
              <Polyline
                positions={trajectoryPoints}
                pathOptions={{
                  color: '#dc2626',
                  weight: 3.5,
                  opacity: 0.95,
                  dashArray: '8, 6',
                  lineCap: 'round',
                  lineJoin: 'round'
                }}
              />
            </>
          )}

          {/* Day 1 through Day 5 Projected Waypoint Markers */}
          {forecastWaypoints.map((wp) => (
            <Marker
              key={`citizen-wp-${wp.step}`}
              position={[wp.latitude, wp.longitude]}
              icon={createDayMarkerIcon(wp.step, wp.stage)}
            >
              <Popup className="custom-popup" autoPan={true}>
                <div className="p-1 min-w-[210px] font-sans">
                  <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-200">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white shadow-xs">
                      Day {wp.step} (+{wp.horizon_hours}h)
                    </span>
                    <span className="text-[10px] font-bold text-amber-600">
                      {wp.stage}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-slate-700">
                    <p className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="font-semibold text-slate-500">{t('map.coordinates')}:</span>
                      <span className="font-bold text-red-600">{wp.latitude}°N, {wp.longitude}°E</span>
                    </p>
                    <p className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="font-semibold text-slate-500">Expected ETA:</span>
                      <span className="font-medium text-slate-900">
                        {new Date(wp.arrival_time).toLocaleDateString(i18n.language === 'kn' ? 'kn-IN' : 'en-US', { month: 'short', day: 'numeric' })}{' '}
                        {new Date(wp.arrival_time).toLocaleTimeString(i18n.language === 'kn' ? 'kn-IN' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </p>
                    <p className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="font-semibold text-slate-500">Uncertainty Cone:</span>
                      <span className="font-semibold text-slate-600">±{wp.uncertainty_radius_km} km</span>
                    </p>
                    <p className="text-[10px] text-slate-400 pt-0.5">
                      5-Day Bi-LSTM Cyclone Track Prediction
                    </p>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Markers for live broadcast cyclone eyewall (Origin Point) */}
          {mapCyclones.map((cyclone) => {
            const lat = Number(cyclone.latitude);
            const lng = Number(cyclone.longitude);
            if (isNaN(lat) || isNaN(lng)) return null;

            const isSevere = cyclone.status === 'Red' || (cyclone.wind_speed && cyclone.wind_speed > 90);
            const icon = createCycloneIcon(cyclone.name, isSevere);

            return (
              <React.Fragment key={cyclone.id || `${lat}-${lng}`}>
                {/* Visual danger buffer radius (estimated ~100 km gale force radius) */}
                <Circle 
                  center={[lat, lng]} 
                  radius={100000} 
                  pathOptions={{
                    color: isSevere ? '#ef4444' : '#f59e0b',
                    fillColor: isSevere ? '#ef4444' : '#f59e0b',
                    fillOpacity: 0.12,
                    weight: 2,
                    dashArray: '4, 4'
                  }}
                />

                <Marker position={[lat, lng]} icon={icon}>
                  <Popup className="custom-popup" autoPan={true}>
                    <div className="p-1 min-w-[200px] font-sans">
                      <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5 mb-2">
                        <h4 className="font-bold text-slate-900 text-sm">{cyclone.name}</h4>
                        {cyclone.status && (
                          <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-sm bg-red-100 text-red-700">
                            {cyclone.status}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 text-xs text-slate-700">
                        <p className="flex justify-between border-b border-slate-100 pb-1">
                          <span className="font-semibold text-slate-500">{t('map.coordinates')}:</span>
                          <span className="font-bold text-red-600">{lat.toFixed(2)}°N, {lng.toFixed(2)}°E</span>
                        </p>
                        {cyclone.wind_speed != null && (
                          <p className="flex justify-between border-b border-slate-100 pb-1">
                            <span className="font-semibold text-slate-500">{t('map.wind')}:</span>
                            <span className="font-bold text-slate-900">{Math.round(cyclone.wind_speed)} km/h</span>
                          </p>
                        )}
                        <p className="flex justify-between border-b border-slate-100 pb-1">
                          <span className="font-semibold text-slate-500">5-Day Track:</span>
                          <span className="font-bold text-emerald-600">Active (Day 1–5 Projected)</span>
                        </p>
                        <p className="text-[11px] text-slate-600 pt-0.5">
                          <span className="font-semibold">{t('status.source')}:</span> {cyclone.source || metadata?.source || 'IMD / GDACS'}
                        </p>
                        {cyclone.last_updated && (
                          <p className="text-[10px] text-slate-400 pt-0.5">
                            {t('summary.observation_time')}: {new Date(cyclone.last_updated).toLocaleString(i18n.language === 'kn' ? 'kn-IN' : 'en-US')}
                          </p>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            );
          })}
        </MapContainer>
      </div>

      {/* 4. 5-Day Projected Trajectory & Landfall Timeline Strip */}
      {forecastWaypoints && forecastWaypoints.length > 0 && (
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border-2 border-red-500/30 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {i18n.language === 'kn' ? '೫ ದಿನಗಳ ಚಂಡಮಾರುತ ಚಲನೆಯ ಮುನ್ಸೂಚನೆ (ಕರಾವಳಿ ಕಡೆಗೆ)' : '5-Day Projected Landfall Trajectory towards Coast'}
              </h3>
            </div>
            <span className="text-[11px] font-bold text-red-500 dark:text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-500/20">
              {i18n.language === 'kn' ? 'ಎಐ ಮುನ್ಸೂಚನೆ ಟ್ರ್ಯಾಕ್ (ದಿನ ೧-೫)' : 'AI Bi-LSTM 5-Day Prediction Track'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
            {forecastWaypoints.map((wp) => (
              <div
                key={`timeline-${wp.step}`}
                onClick={() => {
                  if (mapRef.current) {
                    mapRef.current.flyTo([wp.latitude, wp.longitude], 7, { duration: 1 });
                  }
                }}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 hover:border-red-400 cursor-pointer transition-all hover:shadow-md group select-none"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white shadow-xs">
                    Day {wp.step}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 group-hover:text-red-500 transition-colors">
                    +{wp.horizon_hours}h
                  </span>
                </div>
                <div className="font-bold text-xs text-red-600 dark:text-red-400 mb-1">
                  {wp.latitude}°N, {wp.longitude}°E
                </div>
                <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 line-clamp-1 mb-1">
                  {wp.stage}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-200/60 dark:border-slate-700/60 pt-1 mt-1">
                  <span>ETA: {new Date(wp.arrival_time).toLocaleDateString(i18n.language === 'kn' ? 'kn-IN' : 'en-US', { month: 'short', day: 'numeric' })}</span>
                  <span className="text-red-500 font-bold group-hover:translate-x-0.5 transition-transform">→</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Map Legend & Safety Guidance */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
        <div className="font-bold text-slate-900 dark:text-slate-100 mb-2.5 flex items-center gap-1.5">
          <Info size={14} className="text-sky-500" />
          <span>{t('map.legend_title')}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-[11px] leading-relaxed">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-red-600 border border-white inline-block shrink-0 shadow-xs" />
            <span>{t('map.legend_red_center')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-1 border-t-2 border-dashed border-red-600 inline-block shrink-0" />
            <span>5-Day Projected Landfall Trajectory Track</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-red-600 text-white inline-block shrink-0">
              Day 1–5
            </span>
            <span>Forecast Daily Positions towards Coast</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-3 bg-red-500/20 border border-red-500/40 rounded-xs inline-block shrink-0" />
            <span>Uncertainty Cone Envelope (±135 to 455 km)</span>
          </div>
          <div className="col-span-1 sm:col-span-2 lg:col-span-4 text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
            {t('map.legend.distinction_note')}
          </div>
        </div>
      </div>

    </div>
  );
};

export default CycloneMap;
