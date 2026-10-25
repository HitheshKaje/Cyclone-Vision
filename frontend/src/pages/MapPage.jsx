import React, { useState, useEffect, useRef } from 'react';
import { Map, MapPin, Activity, Clock, Database, AlertCircle, RefreshCw } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, LayersControl, LayerGroup } from 'react-leaflet';
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
    <div style="position: relative; width: 46px; height: 46px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 46px; height: 46px; border-radius: 50%; background: rgba(239, 68, 68, 0.35); border: 2px solid #ef4444; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: rgba(220, 38, 38, 0.55); animation: pulse 1.5s ease-in-out infinite;"></div>
      <div style="width: 20px; height: 20px; border-radius: 50%; background: #dc2626; border: 3px solid #ffffff; box-shadow: 0 0 14px rgba(220,38,38,0.95); display: flex; align-items: center; justify-content: center; z-index: 10;">
        <div style="width: 5px; height: 5px; border-radius: 50%; background: #ffffff;"></div>
      </div>
    </div>
  `,
  className: 'ai-cyclone-radar-marker',
  iconSize: [46, 46],
  iconAnchor: [23, 23],
  popupAnchor: [0, -23]
});

const API_URL = getApiBaseUrl();

const MapPage = ({ currentAnalysis }) => {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('Updating');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);
  const isFetchingRef = useRef(false);
  const mapRef = useRef(null);

  // Compute AI Detected Cyclone from currentAnalysis
  const isAiCyclone = currentAnalysis?.detection?.is_cyclone === true && currentAnalysis?.latitude != null && currentAnalysis?.longitude != null;
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

  // Auto-center map on AI Detected Cyclone
  useEffect(() => {
    if (aiCyclone && mapRef.current) {
      const timer = setTimeout(() => {
        try {
          mapRef.current?.flyTo([aiCyclone.latitude, aiCyclone.longitude], 6, {
            duration: 1.5
          });
        } catch (e) {
          console.warn('Map flyTo notice:', e);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [aiCyclone?.latitude, aiCyclone?.longitude]);

  const fetchLiveCyclones = async () => {
    if (isFetchingRef.current) return;
    
    try {
      isFetchingRef.current = true;
      setStatus(prev => prev === 'Connection Error' ? 'Updating' : prev);
      
      // Abort previous request if any
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
            Monitoring tropical cyclone activity around India's coastal region
          </p>
        </div>
        
        {/* Live Status Indicator */}
        <div className="flex items-center gap-3 bg-white dark:bg-[#1e293b] px-4 py-2 rounded-lg border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${status === 'LIVE / Connected' ? 'bg-red-500/100 animate-pulse' : status === 'Updating' ? 'bg-amber-400' : 'bg-slate-300'}`} />
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{status}</span>
          </div>
          {lastUpdated && (
            <div className="text-xs text-slate-500 font-medium pl-3 border-l border-slate-200/50 dark:border-slate-700/50">
              Last updated: {lastUpdated}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-[500px]">
        {/* 2. Map Container */}
        <div className="flex-1 bg-white dark:bg-[#1e293b] rounded-xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden shadow-sm relative h-full">
          {error ? (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100/90 dark:bg-slate-800/90 z-10">
               <AlertCircle size={32} className="text-slate-600 dark:text-slate-400 mb-3" />
               <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{error}</h3>
               <p className="text-sm text-slate-500 mt-1">Backend or data source is unavailable.</p>
             </div>
          ) : null}
          
          <MapContainer 
            center={[20.5937, 78.9629]} 
            zoom={5} 
            className="w-full h-full z-0"
            ref={mapRef}
            scrollWheelZoom={true}
          >
            <LayersControl position="topright">
              {/* 1. STREET MAP */}
              <LayersControl.BaseLayer checked name="Street Map">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
              </LayersControl.BaseLayer>

              {/* 2. SATELLITE VIEW */}
              <LayersControl.BaseLayer name="Satellite">
                <LayerGroup>
                  <TileLayer
                    attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  />
                  {/* Transparent Labels / Boundaries Overlay */}
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
            {/* AI Detected Cyclone from Satellite Analysis */}
            {aiCyclone && (
              <Marker 
                key={aiCyclone.id} 
                position={[aiCyclone.latitude, aiCyclone.longitude]}
                icon={aiCycloneIcon}
              >
                <Popup className="custom-popup" autoPan={true}>
                  <div className="p-1 min-w-[210px]">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white animate-pulse shadow-sm">
                        AI DETECTED CYCLONE
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-2">{aiCyclone.name}</h4>
                    <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                      <p className="flex justify-between border-b border-slate-200 dark:border-slate-700/50 pb-1">
                        <span className="font-semibold text-slate-500">Coordinates:</span>
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
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-600 text-white shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      AI DETECTED
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400">
                      FOCUS MAP &rarr;
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-1">{aiCyclone.name}</div>
                  <div className="text-xs text-slate-500 flex justify-between font-semibold">
                    <span className="text-red-500 font-bold">{aiCyclone.latitude}°N, {aiCyclone.longitude}°E</span>
                    <span className="text-amber-500">{aiCyclone.status}</span>
                  </div>
                </div>
              )}

              {cyclones.map(cyc => (
                <div key={cyc.id} className="bg-white dark:bg-[#1e293b] p-3 rounded-lg border border-slate-200/50 dark:border-slate-700/50 shadow-sm cursor-pointer hover:border-sky-300 transition-colors"
                     onClick={() => {
                       if (mapRef.current) {
                         mapRef.current.flyTo([cyc.latitude, cyc.longitude], 6);
                       }
                     }}>
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1">{cyc.name}</div>
                  <div className="text-xs text-slate-500 flex justify-between">
                    <span>{cyc.latitude}°, {cyc.longitude}°</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{cyc.status}</span>
                  </div>
                </div>
              ))}

              {!aiCyclone && cyclones.length === 0 && (
                <p className="text-sm text-slate-500 italic">Currently no active cyclone data available.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapPage;
