import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, MapPin, Eye, Map, Waves, Info, Compass } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Leaflet Default Marker Icon Fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Harbor Icon
const harborPinIcon = new L.divIcon({
  html: `
    <div style="background-color: #0284c7; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 12px rgba(2,132,199,0.7); display: flex; align-items: center; justify-content: center; color: white; font-size: 15px;">
      ⚓
    </div>
  `,
  className: 'fisherman-harbor-icon',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
});

// Cyclone Eye Swirl Icon
const stormSwirlIcon = new L.divIcon({
  html: `
    <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
      <span style="position: absolute; width: 40px; height: 40px; border-radius: 50%; background-color: rgba(220, 38, 38, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
      <div style="width: 26px; height: 26px; border-radius: 50%; background: #dc2626; border: 2.5px solid white; box-shadow: 0 0 14px rgba(220,38,38,0.9); display: flex; align-items: center; justify-content: center; font-size: 14px;">
        🌪️
      </div>
    </div>
  `,
  className: 'fisherman-storm-icon',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20]
});

function MapRecenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom, { animate: true });
    }
  }, [center, zoom, map]);
  return null;
}

const FishermanCycloneMap = ({ selectedPort, cyclone, onBack }) => {
  const { t, i18n } = useTranslation();
  const [baseLayer, setBaseLayer] = useState('satellite'); // 'standard' | 'satellite' | 'ocean'

  const portPos = [selectedPort?.lat || 13.35, selectedPort?.lng || 74.70];
  const hasActiveCyclone = cyclone && cyclone.is_active && cyclone.latitude != null && cyclone.longitude != null;
  const cyclonePos = hasActiveCyclone ? [cyclone.latitude, cyclone.longitude] : null;

  // Center on Cyclone if active, else selected port
  const mapCenter = cyclonePos || portPos;

  // Observed Track Points (solid line)
  const observedTrack = (cyclone?.observed_track || []).map(pt => [pt.lat, pt.lon]);
  
  // Official Forecast Track Points (dashed line)
  const forecastTrack = (cyclone?.forecast_track || []).map(pt => [pt.lat, pt.lon]);

  return (
    <div className="space-y-3 pb-16 animate-in fade-in duration-200">
      
      {/* Top Navigation & Controls */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        
        {/* Back to Home Button */}
        <button
          type="button"
          onClick={onBack}
          className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <ArrowLeft size={15} />
          <span>{t('fisherman.back_to_home', '← Back to Home')}</span>
        </button>

        {/* Selected Port Indicator */}
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
          <MapPin size={14} className="text-sky-500" />
          <span>{selectedPort?.name || 'Selected Port'}</span>
        </div>

        {/* Map Tile Layer Selector */}
        <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
          <button
            type="button"
            onClick={() => setBaseLayer('standard')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              baseLayer === 'standard' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Map
          </button>
          <button
            type="button"
            onClick={() => setBaseLayer('satellite')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              baseLayer === 'satellite' ? 'bg-sky-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Satellite
          </button>
          <button
            type="button"
            onClick={() => setBaseLayer('ocean')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              baseLayer === 'ocean' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Ocean
          </button>
        </div>

      </div>

      {/* Map Container */}
      <div className="h-[460px] sm:h-[560px] w-full rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg relative z-0">
        <MapContainer
          center={mapCenter}
          zoom={hasActiveCyclone ? 6 : 7}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <MapRecenter center={mapCenter} zoom={hasActiveCyclone ? 6 : 7} />

          {/* Tiles */}
          {baseLayer === 'standard' && (
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          )}

          {baseLayer === 'satellite' && (
            <>
              <TileLayer
                attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
              <TileLayer
                attribution='Labels &copy; Esri'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              />
            </>
          )}

          {baseLayer === 'ocean' && (
            <TileLayer
              attribution='Tiles &copy; Esri &mdash; GEBCO, NOAA, CHS, OSU'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}"
            />
          )}

          {/* 1. Fisherman's Selected Harbor Pin */}
          <Marker position={portPos} icon={harborPinIcon}>
            <Popup>
              <div className="p-1 text-xs">
                <div className="font-black text-[#102A43] text-sm">
                  ⚓ {selectedPort?.name}
                </div>
                <div className="text-slate-600 mt-1">
                  District: {selectedPort?.district} ({selectedPort?.region})
                </div>
                <div className="text-[11px] text-sky-600 font-bold mt-0.5">
                  Your Selected Base Port
                </div>
              </div>
            </Popup>
          </Marker>

          {/* 2. Active Cyclone Elements */}
          {hasActiveCyclone && cyclonePos && (
            <>
              {/* Cyclone 100km Rough Sea Warning Area (Circle) */}
              <Circle
                center={cyclonePos}
                radius={120000}
                pathOptions={{
                  color: '#dc2626',
                  fillColor: '#ef4444',
                  fillOpacity: 0.18,
                  weight: 2,
                  dashArray: '4, 4'
                }}
              />

              {/* Observed Past Track (Solid Line) */}
              {observedTrack.length > 1 && (
                <Polyline
                  positions={observedTrack}
                  pathOptions={{
                    color: '#2563eb',
                    weight: 3.5,
                    opacity: 0.9
                  }}
                />
              )}

              {/* Official Forecast Track (Dashed Line) */}
              {forecastTrack.length > 1 && (
                <Polyline
                  positions={forecastTrack}
                  pathOptions={{
                    color: '#f97316',
                    weight: 3.5,
                    dashArray: '6, 6',
                    opacity: 0.95
                  }}
                />
              )}

              {/* Cyclone Eye Marker */}
              <Marker position={cyclonePos} icon={stormSwirlIcon}>
                <Popup>
                  <div className="p-1 text-xs">
                    <div className="font-black text-red-600 text-sm">
                      🌪️ {cyclone.storm_name || 'Active Cyclone'}
                    </div>
                    <div className="text-slate-700 mt-1">
                      <strong>Intensity:</strong> {cyclone.category || 'Severe Storm'}
                    </div>
                    <div className="text-slate-700">
                      <strong>Wind:</strong> ~{cyclone.wind_speed_kmh || 95} km/h
                    </div>
                    <div className="text-slate-700">
                      <strong>Position:</strong> {cyclone.latitude}°N, {cyclone.longitude}°E
                    </div>
                    <div className="text-[11px] font-bold text-red-600 mt-1">
                      Warning: Avoid all sea navigation within 120km
                    </div>
                  </div>
                </Popup>
              </Marker>
            </>
          )}

        </MapContainer>
      </div>

      {/* Simple Map Legend (As specified in requirement 4) */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
          <Info size={13} className="text-sky-500" />
          <span>Simple Map Legend</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
            <span className="w-3.5 h-3.5 rounded-full bg-red-600 text-white flex items-center justify-center text-[9px] shrink-0">🌪️</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{t('fisherman.legend_current', 'Current Position')}</span>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
            <span className="w-5 h-1 bg-blue-600 shrink-0 rounded-full inline-block" />
            <span className="font-bold text-slate-800 dark:text-slate-200">{t('fisherman.legend_past', 'Past Movement')}</span>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
            <span className="w-5 h-1 border-t-2 border-dashed border-orange-500 shrink-0 inline-block" />
            <span className="font-bold text-slate-800 dark:text-slate-200">{t('fisherman.legend_forecast', 'Expected Movement')}</span>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
            <span className="w-3.5 h-3.5 rounded-full bg-red-500/30 border border-red-500 shrink-0" />
            <span className="font-bold text-slate-800 dark:text-slate-200">{t('fisherman.legend_warning', 'Warning Area')}</span>
          </div>

        </div>
      </div>

    </div>
  );
};

export default FishermanCycloneMap;
