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

// Custom cyclone icon using divIcon
const cycloneIcon = new L.divIcon({
  html: `<div style="background-color: #ef4444; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(239,68,68,0.8); display: flex; align-items: center; justify-content: center;"><div style="background-color: white; width: 4px; height: 4px; border-radius: 50%;"></div></div>`,
  className: 'custom-cyclone-marker',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10]
});

const API_URL = getApiBaseUrl();

const MapPage = () => {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('Updating');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);
  const isFetchingRef = useRef(false);
  const mapRef = useRef(null);

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
      
      // Only update state if data changed (compare stringified data to avoid unnecessary renders)
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
    // Initial fetch
    fetchLiveCyclones();
    
    // Polling every 1 second
    const interval = setInterval(() => {
      fetchLiveCyclones();
    }, 1000);
    
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
                <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
                  {cyclones.length}
                </div>
              </div>

              <div>
                <span className="text-xs font-medium text-slate-500 block mb-1 flex items-center gap-1.5">
                  <Clock size={12} /> Last Data Update
                </span>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {data?.updated_at ? new Date(data.updated_at).toLocaleString() : '-'}
                </div>
              </div>

              <div>
                <span className="text-xs font-medium text-slate-500 block mb-1 flex items-center gap-1.5">
                  <Database size={12} /> Data Source
                </span>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300 break-words">
                  {data?.source || '-'}
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
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-3 uppercase tracking-wider text-slate-500">
              Active Events
            </h3>
            {cyclones.length === 0 ? (
              <p className="text-sm text-slate-500 italic">Currently no active cyclone data available.</p>
            ) : (
              <div className="space-y-3 overflow-y-auto flex-1 pr-1 custom-scrollbar">
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapPage;
