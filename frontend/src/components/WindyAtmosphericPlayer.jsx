import React, { useState, useEffect } from 'react';
import { 
  Wind, 
  Satellite, 
  Radar, 
  Droplets, 
  CloudRain, 
  Compass, 
  Thermometer,
  RefreshCw,
  Sparkles
} from 'lucide-react';

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

  // Keep internal overlay state in sync with parent / sidebar layer selection
  useEffect(() => {
    if (activeLayer) {
      setOverlay(activeLayer);
    }
  }, [activeLayer]);

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
  const windyUrl = `https://embed.windy.com/embed2.html?lat=${stormLat}&lon=${stormLng}&detailLat=${stormLat}&detailLon=${stormLng}&width=100%25&height=100%25&zoom=6&level=surface&overlay=${currentWindyParam}&product=ecmwf&menu=&message=true&marker=true&calendar=now&pressure=true&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`;

  return (
    <div className="relative w-full h-full min-h-[500px] flex flex-col bg-slate-950 overflow-hidden select-none">
      {/* Embedded Live Interactive Atmospheric Engine */}
      <div className="flex-1 w-full h-full relative bg-slate-950">
        <iframe
          key={`${key}-${currentWindyParam}-${stormLat}-${stormLng}`}
          title="Windy Live Atmospheric Engine"
          src={windyUrl}
          className="w-full h-full border-0 absolute inset-0 pt-12 sm:pt-14"
          loading="lazy"
          allow="geolocation"
        />
      </div>

      {/* Floating Active System Pill */}
      <div className="absolute top-16 right-4 z-20 pointer-events-none hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0a1b24]/90 backdrop-blur-md border border-teal-500/35 text-xs text-white shadow-xl">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
        <span className="font-bold text-teal-300">{stormName}</span>
        <span className="text-slate-400 font-mono">({stormLat}°N, {stormLng}°E)</span>
        <span className="px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 uppercase font-black text-[10px]">
          {overlay}
        </span>
      </div>
    </div>
  );
}
