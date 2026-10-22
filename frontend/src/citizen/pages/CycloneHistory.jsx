import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  MapContainer, 
  TileLayer, 
  Polyline, 
  Marker, 
  Popup 
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  History, 
  Calendar, 
  Wind, 
  MapPin, 
  ShieldCheck, 
  AlertCircle, 
  Info,
  CheckCircle2
} from 'lucide-react';
import { fetchHistoricalCyclones } from '../services/citizenApi';
import { 
  cacheHistoricalCyclones, 
  getCachedHistoricalCyclones 
} from '../services/cycloneCache';

// Historical observation point marker
const historyPointIcon = new L.divIcon({
  html: `<div style="background-color: #3b82f6; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 6px rgba(0,0,0,0.4);"></div>`,
  className: 'history-track-point',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  popupAnchor: [0, -7]
});

// Landfall marker
const landfallIcon = new L.divIcon({
  html: `<div style="background-color: #dc2626; width: 16px; height: 16px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 0 8px rgba(220,38,38,0.7); display: flex; align-items: center; justify-content: center;"><div style="background: white; width: 4px; height: 4px; border-radius: 50%;"></div></div>`,
  className: 'history-landfall-point',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -9]
});

const CycloneHistory = () => {
  const { t } = useTranslation();
  const [historyRecords, setHistoryRecords] = useState([]);
  const [selectedCyclone, setSelectedCyclone] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCached, setIsCached] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadHistory = async () => {
      setLoading(true);
      const res = await fetchHistoricalCyclones();
      
      if (!isMounted) return;

      if (res.success && res.data && res.data.records) {
        setHistoryRecords(res.data.records);
        setSelectedCyclone(res.data.records[0] || null);
        setIsCached(false);
        cacheHistoricalCyclones(res.data.records);
      } else {
        // Fallback to IndexedDB
        const cached = await getCachedHistoricalCyclones();
        if (!isMounted) return;
        if (cached && cached.length > 0) {
          setHistoryRecords(cached);
          setSelectedCyclone(cached[0] || null);
          setIsCached(true);
        }
      }
      setLoading(false);
    };

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, []);

  const trackPositions = selectedCyclone?.track?.map(pt => [pt.lat, pt.lng]) || [];
  const mapCenter = trackPositions.length > 0 ? trackPositions[Math.floor(trackPositions.length / 2)] : [18.0, 83.0];

  return (
    <div className="space-y-4 sm:space-y-6 pb-6">
      
      {/* 1. Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <History size={22} className="text-sky-500" />
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {t('history.title')}
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500">
          {t('history.subtitle')}
        </p>
      </div>

      {/* 2. Critical Historical Distinction Notice */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-950 dark:text-sky-200 text-xs flex items-start gap-2.5">
        <Info size={18} className="text-sky-500 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="block font-bold mb-0.5">Verified Historical Archives:</strong>
          {t('history.track_explanation')}
        </div>
      </div>

      {/* 3. Cyclone Selector Chips */}
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
          {t('history.select_cyclone')}:
        </span>
        <div className="flex flex-wrap gap-2">
          {historyRecords.map((cyc) => {
            const isSelected = selectedCyclone?.id === cyc.id;
            return (
              <button
                key={cyc.id}
                onClick={() => setSelectedCyclone(cyc)}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-sky-500 text-white shadow-sm ring-2 ring-sky-400'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                {cyc.name} ({cyc.year})
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Selected Cyclone Details Card */}
      {selectedCyclone && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-700/60 pb-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {selectedCyclone.basin} Basin
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
                {selectedCyclone.name} ({selectedCyclone.year})
              </h2>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
              {selectedCyclone.category}
            </span>
          </div>

          {/* Key Facts Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-slate-500 text-[11px] block">{t('history.max_wind')}</span>
              <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                {selectedCyclone.max_wind_speed_kmh} km/h
              </span>
              <span className="text-[10px] text-slate-500 block">({selectedCyclone.max_wind_speed_kt} kt)</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-slate-500 text-[11px] block">{t('history.landfall')}</span>
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                {selectedCyclone.landfall_location}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-slate-500 text-[11px] block">Landfall Date</span>
              <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                {new Date(selectedCyclone.landfall_date).toLocaleDateString()}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-slate-500 text-[11px] block">{t('history.verified_by')}</span>
              <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                {selectedCyclone.verified_source}
              </span>
            </div>
          </div>

          {/* Interactive Historical Track Map */}
          <div className="relative w-full h-[360px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
            <MapContainer
              key={selectedCyclone.id}
              center={mapCenter}
              zoom={5}
              className="w-full h-full z-10"
              scrollWheelZoom={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Recorded Track Polyline */}
              <Polyline
                positions={trackPositions}
                pathOptions={{
                  color: '#2563eb',
                  weight: 3.5,
                  opacity: 0.85
                }}
              />

              {/* Waypoint markers */}
              {selectedCyclone.track.map((pt, idx) => {
                const isLandfall = pt.stage.toLowerCase().includes('landfall');
                return (
                  <Marker
                    key={idx}
                    position={[pt.lat, pt.lng]}
                    icon={isLandfall ? landfallIcon : historyPointIcon}
                  >
                    <Popup>
                      <div className="text-xs font-sans">
                        <strong className="block text-slate-900 font-bold">{pt.stage}</strong>
                        <div className="text-slate-600 mt-1">
                          <div>Position: {pt.lat}°N, {pt.lng}°E</div>
                          <div>Wind: {pt.wind_kmh} km/h</div>
                          <div>Recorded: {new Date(pt.timestamp).toUTCString()}</div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>

          {/* Timeline of Observations */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Chronological Observation Points:
            </h4>
            <div className="space-y-2 text-xs">
              {selectedCyclone.track.map((pt, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{pt.stage}</span>
                    <span className="text-slate-500 text-[11px]">({pt.lat}°N, {pt.lng}°E)</span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-400 font-medium">
                    {pt.wind_kmh} km/h • {new Date(pt.timestamp).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CycloneHistory;
