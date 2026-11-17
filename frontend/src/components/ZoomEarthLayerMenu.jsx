import React, { useState } from 'react';
import { 
  Satellite, 
  Radar, 
  CloudRain, 
  Wind, 
  Thermometer, 
  Droplets, 
  Compass, 
  Layers, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  Sparkles,
  Map as MapIcon
} from 'lucide-react';

/**
 * Zoom Earth style Meteorological Drawer.
 * Can be docked cleanly into the sidebar or floated over the map.
 * Allows instant live toggling between Satellite, Radar, Wind, Humidity, Precipitation, and Pressure.
 */
export default function ZoomEarthLayerMenu({
  activeLayer = 'wind',
  setActiveLayer,
  activeBaseMap = 'satellite_base',
  setActiveBaseMap,
  isLiveLoading = false,
  isSidebar = false,
  className = ""
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [isLiveExpanded, setIsLiveExpanded] = useState(true);
  const [isForecastExpanded, setIsForecastExpanded] = useState(true);

  const liveMaps = [
    { id: 'satellite', name: 'Satellite', icon: Satellite, desc: 'NASA GIBS & Real-time Earth Satellite' },
    { id: 'radar', name: 'Radar', icon: Radar, desc: 'RainViewer Live Doppler Weather Radar' }
  ];

  const forecastMaps = [
    { id: 'precipitation', name: 'Precipitation', icon: CloudRain, desc: 'Live Rainfall Rate & Storm Convection' },
    { id: 'wind', name: 'Wind', icon: Wind, desc: 'Animated Vector Streamlines & Heatmap' },
    { id: 'temperature', name: 'Temperature', icon: Thermometer, desc: 'Sea Surface & Air Temperature' },
    { id: 'humidity', name: 'Humidity', icon: Droplets, desc: 'Atmospheric Relative Humidity (%)' },
    { id: 'pressure', name: 'Pressure', icon: Compass, desc: 'Barometric Isobars & Depression Core' }
  ];

  const baseMaps = [
    { id: 'street', name: 'Standard Street' },
    { id: 'satellite_base', name: 'Satellite Hybrid' },
    { id: 'ocean', name: 'Ocean / Coastal' },
    { id: 'terrain', name: 'Terrain' }
  ];

  return (
    <div className={className || (isSidebar ? "w-full pointer-events-auto select-none font-sans" : "absolute top-3 left-3 z-[1000] pointer-events-auto select-none font-sans w-56 sm:w-60")}>
      {/* Glassmorphic Container (Zoom Earth Aesthetic) */}
      <div className="w-full bg-[#0a1b24]/92 backdrop-blur-xl border border-teal-500/35 rounded-2xl shadow-2xl text-slate-100 overflow-hidden transition-all duration-300">
        
        {/* Header Bar */}
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className="px-3.5 py-3 border-b border-teal-500/25 flex items-center justify-between cursor-pointer bg-teal-950/40 hover:bg-teal-900/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-teal-500/20 border border-teal-400/40 flex items-center justify-center shadow-xs">
              <Layers size={13} className="text-teal-300 animate-pulse" />
            </div>
            <div>
              <span className="text-[11px] font-black tracking-wider uppercase text-teal-300 block leading-tight">
                ZOOM EARTH
              </span>
              <span className="text-[9px] text-teal-400/70 font-semibold uppercase tracking-widest">
                METEOROLOGICAL FEEDS
              </span>
            </div>
          </div>
          <button type="button" className="text-teal-300/80 hover:text-teal-200 cursor-pointer">
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {isOpen && (
          <div className="p-2.5 space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto custom-scrollbar text-xs">
            
            {/* 1. LIVE MAPS GROUP */}
            <div className="space-y-1">
              <div 
                onClick={() => setIsLiveExpanded(!isLiveExpanded)}
                className="flex items-center justify-between px-2 py-1 text-[10px] font-black uppercase tracking-wider text-teal-300/70 cursor-pointer hover:text-teal-200"
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                  LIVE MAPS
                </span>
                {isLiveExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </div>

              {isLiveExpanded && (
                <div className="space-y-1 pt-0.5">
                  {liveMaps.map(item => {
                    const Icon = item.icon;
                    const isActive = activeLayer === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveLayer(item.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-all cursor-pointer ${
                          isActive
                            ? 'bg-teal-500/25 border border-teal-400/50 text-white font-bold shadow-sm'
                            : 'text-slate-300 hover:bg-teal-900/30 hover:text-white border border-transparent'
                        }`}
                        title={item.desc}
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon size={15} className={isActive ? 'text-teal-300' : 'text-teal-400/80'} />
                          <span className="text-xs font-semibold">{item.name}</span>
                        </span>
                        {isActive && <Check size={14} className="text-teal-300" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. FORECAST & DYNAMICS MAPS GROUP */}
            <div className="space-y-1 pt-1 border-t border-teal-500/20">
              <div 
                onClick={() => setIsForecastExpanded(!isForecastExpanded)}
                className="flex items-center justify-between px-2 py-1 text-[10px] font-black uppercase tracking-wider text-teal-300/70 cursor-pointer hover:text-teal-200"
              >
                <span>FORECAST MAPS</span>
                {isForecastExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </div>

              {isForecastExpanded && (
                <div className="space-y-1 pt-0.5">
                  {forecastMaps.map(item => {
                    const Icon = item.icon;
                    const isActive = activeLayer === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveLayer(item.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-all cursor-pointer ${
                          isActive
                            ? 'bg-teal-500/25 border border-teal-400/50 text-white font-bold shadow-sm'
                            : 'text-slate-300 hover:bg-teal-900/30 hover:text-white border border-transparent'
                        }`}
                        title={item.desc}
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon size={15} className={isActive ? 'text-teal-300' : 'text-teal-400/80'} />
                          <span className="text-xs font-semibold">{item.name}</span>
                        </span>
                        {isActive && <Check size={14} className="text-teal-300" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. BASE CARTOGRAPHY */}
            <div className="pt-2 border-t border-teal-500/20 space-y-1">
              <span className="px-2 text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                BASE CARTOGRAPHY
              </span>
              <div className="grid grid-cols-2 gap-1 pt-0.5">
                {baseMaps.map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setActiveBaseMap(b.id)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-semibold text-center truncate transition-colors cursor-pointer ${
                      activeBaseMap === b.id
                        ? 'bg-teal-600/30 text-teal-200 border border-teal-400/40'
                        : 'bg-slate-900/40 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Status indicator */}
            <div className="pt-2 border-t border-teal-500/20 flex items-center justify-between text-[10px] text-teal-300/80 px-1 font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE STREAM
              </span>
              <span>10-Min Synoptic</span>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
