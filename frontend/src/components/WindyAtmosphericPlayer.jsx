import React, { useState } from 'react';
import { 
  Wind, 
  Satellite, 
  Radar, 
  Droplets, 
  CloudRain, 
  Compass, 
  Maximize2, 
  ExternalLink,
  RefreshCw,
  Sparkles
} from 'lucide-react';

/**
 * Full Live Atmospheric Radar & Dynamics Engine.
 * Embeds real-time numerical weather prediction & satellite radar feeds (Windy / ECMWF / GFS)
 * centered directly on the active cyclone coordinates.
 */
export default function WindyAtmosphericPlayer({
  stormLat = 15.5,
  stormLng = 81.8,
  stormName = 'Active Tropical Cyclone',
  stormWindKt = 65,
  initialOverlay = 'wind'
}) {
  const [overlay, setOverlay] = useState(initialOverlay);
  const [key, setKey] = useState(Date.now());

  const layers = [
    { id: 'wind', name: 'Wind', icon: Wind },
    { id: 'satellite', name: 'Satellite', icon: Satellite },
    { id: 'radar', name: 'Radar', icon: Radar },
    { id: 'rh', name: 'Humidity', icon: Droplets },
    { id: 'rain', name: 'Rain', icon: CloudRain },
    { id: 'pressure', name: 'Pressure', icon: Compass }
  ];

  // Map overlays to Windy URL parameters
  const getWindyOverlayParam = (layerId) => {
    switch (layerId) {
      case 'satellite': return 'satellite';
      case 'radar': return 'radar';
      case 'rh': return 'rh';
      case 'rain': return 'rain';
      case 'pressure': return 'pressure';
      case 'wind':
      default: return 'wind';
    }
  };

  const windyUrl = `https://embed.windy.com/embed2.html?lat=${stormLat}&lon=${stormLng}&detailLat=${stormLat}&detailLon=${stormLng}&width=100%25&height=100%25&zoom=6&level=surface&overlay=${getWindyOverlayParam(overlay)}&product=ecmwf&menu=&message=true&marker=true&calendar=now&pressure=true&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`;

  return (
    <div className="relative w-full h-full min-h-[500px] flex flex-col bg-slate-950 rounded-xl overflow-hidden border border-slate-700/60 shadow-xl">
      {/* Top Controls Toolbar */}
      <div className="bg-slate-900/95 backdrop-blur-md px-3 sm:px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 z-20">
        
        {/* Layer Selector Buttons (Matching Zoom Earth & Windy Options) */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5 custom-scrollbar">
          {layers.map((l) => {
            const Icon = l.icon;
            const isActive = overlay === l.id;
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => {
                  setOverlay(l.id);
                  setKey(Date.now());
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-500/20'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Icon size={14} className={isActive ? 'animate-pulse' : ''} />
                <span>{l.name}</span>
              </button>
            );
          })}
        </div>

        {/* Cyclone Live Status Pill */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-[11px] font-black text-red-400">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>{stormName}</span>
            <span className="text-slate-400 font-normal">({stormLat}°N, {stormLng}°E)</span>
          </div>

          <button
            type="button"
            onClick={() => setKey(Date.now())}
            title="Refresh Live Feeds"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Embedded Live Interactive Atmospheric Engine */}
      <div className="flex-1 w-full h-full relative bg-slate-950">
        <iframe
          key={`${key}-${overlay}`}
          title="Windy Live Atmospheric Engine"
          src={windyUrl}
          className="w-full h-full border-0 absolute inset-0"
          loading="lazy"
          allow="geolocation"
        />
      </div>

      {/* Bottom Floating Info Pill */}
      <div className="absolute bottom-3 left-4 z-20 pointer-events-none hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-[11px] text-slate-300 font-mono shadow-lg">
        <Sparkles size={12} className="text-teal-400" />
        <span>LIVE GLOBAL NUMERICAL MODEL & RADAR</span>
        <span className="text-slate-500">•</span>
        <span>ECMWF / GFS 22km / ICON</span>
      </div>
    </div>
  );
}

