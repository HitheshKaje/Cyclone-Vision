import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  Circle, 
  Polyline 
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
  CheckCircle2
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
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          position: absolute;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: ${isSevere ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.35)'};
          animation: pulse 2s infinite ease-in-out;
        "></div>
        <div style="
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: ${isSevere ? '#dc2626' : '#d97706'};
          border: 3px solid #ffffff;
          box-shadow: 0 0 10px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="width: 4px; height: 4px; border-radius: 50%; background: #ffffff;"></div>
        </div>
      </div>
    `,
    className: 'cyclosafe-map-cyclone-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

const CycloneMap = () => {
  const { t, i18n } = useTranslation();
  const { isOnline } = useNetworkStatus();
  const { cyclones, metadata, loading, isCached, freshness } = useCycloneData();
  const [advisory, setAdvisory] = useState(null);
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

  // Map center: Default to detected cyclone coords if active, else Indian Coastal Region
  const defaultCenter = (advisory?.active && advisory?.coordinates?.lat != null && advisory?.coordinates?.lng != null)
    ? [advisory.coordinates.lat, advisory.coordinates.lng]
    : [16.5, 82.5];
  const defaultZoom = advisory?.active ? 6 : 5;

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
            <span>{t('map.active_warning_tracking')}: {mapCyclones[0].name} ({mapCyclones[0].wind_speed} km/h)</span>
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
      <div className="relative w-full h-[60vh] min-h-[420px] rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-800 shadow-md bg-slate-900">
        
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

          {/* Markers for live broadcast cyclones */}
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
                  <Popup className="custom-popup">
                    <div className="p-1 min-w-[180px] font-sans">
                      <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5 mb-2">
                        <h4 className="font-bold text-slate-900 text-sm">{cyclone.name}</h4>
                        {cyclone.status && (
                          <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-sm bg-red-100 text-red-700">
                            {cyclone.status}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 text-xs text-slate-700">
                        <p><span className="font-semibold">{t('map.coordinates')}:</span> {lat.toFixed(2)}°N, {lng.toFixed(2)}°E</p>
                        {cyclone.wind_speed != null && (
                          <p><span className="font-semibold">{t('map.wind')}:</span> {Math.round(cyclone.wind_speed)} km/h</p>
                        )}
                        <p><span className="font-semibold">{t('status.source')}:</span> {cyclone.source || metadata?.source || 'IMD / GDACS'}</p>
                        {cyclone.last_updated && (
                          <p className="text-[10px] text-slate-500 pt-1">
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

      {/* 4. Map Legend & Strict Data Distinction Note */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
        <div className="font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-1.5">
          <Info size={14} className="text-sky-500" />
          <span>{t('map.legend_title')}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] leading-relaxed">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-red-600 border border-white inline-block shrink-0" />
            <span>{t('map.legend_red_center')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-1 border-t-2 border-dashed border-red-500 inline-block shrink-0" />
            <span>{t('map.legend_dashed')}</span>
          </div>
          <div className="col-span-1 sm:col-span-2 text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
            {t('map.legend.distinction_note')}
          </div>
        </div>
      </div>

    </div>
  );
};

export default CycloneMap;
