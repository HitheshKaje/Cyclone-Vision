import React, { useState, useEffect, useRef } from 'react';
import { 
  Wind, 
  Satellite, 
  Radar, 
  Droplets, 
  CloudRain, 
  Compass, 
  Thermometer,
  RefreshCw,
  Sparkles,
  BarChart2,
  X
} from 'lucide-react';
import { getApiBaseUrl } from '../utils/apiConfig';

/**
 * Full Live Atmospheric Radar & Numerical Dynamics Engine.
 * Embeds real-time numerical weather prediction & satellite radar feeds (Windy / ECMWF / GFS)
 * dynamically synchronized with the sidebar layer controls and centered on active cyclone coordinates.
 */
export default function WindyAtmosphericPlayer({
  stormLat = 15.5,
  stormLng = 81.8,
  stormName = 'Active Tropical Cyclone',
  stormWindKt = 65,
  activeLayer = 'wind',
  setActiveLayer = null
}) {
  const [overlay, setOverlay] = useState(activeLayer || 'wind');
  const [key, setKey] = useState(Date.now());
  const [detailOpen, setDetailOpen] = useState(false);
  const iframeRef = useRef(null);

  // Keep internal overlay state in sync with parent / sidebar layer selection
  useEffect(() => {
    if (activeLayer) {
      setOverlay(activeLayer);
    }
  }, [activeLayer]);

  // Open the bottom forecast detail panel
  const handleOpenDetail = () => {
    setDetailOpen(true);
    setKey(Date.now());
  };

  // Close the bottom forecast detail panel and reset the iframe view cleanly
  const handleCloseDetail = () => {
    setDetailOpen(false);
    setKey(Date.now());
  };

  // Detect when user clicks on map inside iframe to automatically reveal the close button
  useEffect(() => {
    const handleWindowBlur = () => {
      setTimeout(() => {
        if (iframeRef.current && document.activeElement === iframeRef.current) {
          setDetailOpen(true);
        }
      }, 100);
    };

    window.addEventListener('blur', handleWindowBlur);
    return () => {
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, []);

  // Map application layer IDs accurately to Windy parameters
  const getWindyOverlayParam = (layerId) => {
    switch (layerId) {
      case 'satellite': 
        return 'satellite';
      case 'radar': 
        return 'radar';
      case 'temperature':
      case 'temp': 
        return 'temp';
      case 'humidity':
      case 'rh': 
        return 'rh';
      case 'precipitation':
      case 'rain': 
        return 'rain';
      case 'pressure': 
        return 'pressure';
      case 'wind':
      default: 
        return 'wind';
    }
  };

  const currentWindyParam = getWindyOverlayParam(overlay);
  const isWind = overlay === 'wind';
  const apiBase = getApiBaseUrl();

  // Detail panel params: only pass detail parameters if explicitly requested
  const detailParam = detailOpen 
    ? `&detailLat=${stormLat}&detailLon=${stormLng}&detail=true` 
    : '';

  // Moving wind particle drops: STRICTLY enabled only for the Wind layer.
  // For Precipitation, Temperature, Humidity, and Pressure, the proxy turns OFF particle animation.
  const windyUrl = `${apiBase}/api/live_map/windy-embed?lat=${stormLat}&lon=${stormLng}${detailParam}&width=100%25&height=100%25&zoom=6&level=surface&overlay=${currentWindyParam}&product=ecmwf&menu=&message=true&marker=true&calendar=now&pressure=${overlay === 'pressure' ? 'true' : 'false'}&type=map&location=coordinates&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1&particlesAnim=${isWind ? 'on' : 'off'}`;

  return (
    <div className="relative w-full h-full min-h-[500px] flex flex-col bg-slate-950 overflow-hidden select-none">
      {/* Embedded Live Interactive Atmospheric Engine */}
      <div className="flex-1 w-full h-full relative bg-slate-950">
        <iframe
          ref={iframeRef}
          key={`${key}-${currentWindyParam}-${stormLat}-${stormLng}-${isWind}-${detailOpen}`}
          title="Windy Live Atmospheric Engine"
          src={windyUrl}
          className="w-full h-full border-0 absolute inset-0 pt-12 sm:pt-14"
          loading="lazy"
          allow="geolocation"
        />
      </div>

      {/* Floating Top Controls: Forecast Detail Toggle & Active System Pill */}
      <div className="absolute top-16 right-4 z-20 flex items-center gap-2 pointer-events-auto">
        {/* Only ask to close forecast details AFTER opening forecast details */}
        {detailOpen ? (
          <button
            type="button"
            onClick={handleCloseDetail}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/90 hover:bg-rose-900 text-rose-200 hover:text-white border border-rose-500/50 shadow-xl text-xs font-semibold backdrop-blur-md transition-all cursor-pointer animate-fade-in"
            title="Close bottom forecast detail table"
          >
            <X size={14} className="text-rose-400" />
            <span>Close Forecast Details</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleOpenDetail}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0a1b24]/90 hover:bg-teal-900/60 text-teal-300 hover:text-white border border-teal-500/35 shadow-xl text-xs font-semibold backdrop-blur-md transition-all cursor-pointer"
            title="Open 5-day weather forecast table for active cyclone location"
          >
            <BarChart2 size={14} className="text-teal-400" />
            <span>Forecast Details</span>
          </button>
        )}

        {/* Floating Active System Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0a1b24]/90 backdrop-blur-md border border-teal-500/35 text-xs text-white shadow-xl pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span className="font-bold text-teal-300">{stormName}</span>
          <span className="text-slate-400 font-mono">({stormLat}°N, {stormLng}°E)</span>
          <span className="px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 uppercase font-black text-[10px]">
            {overlay}
          </span>
        </div>
      </div>
    </div>
  );
}
