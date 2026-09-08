import React from 'react';
import { Map } from 'lucide-react';

const LocationMap = () => {
  return (
    <div className="glass-panel p-4 sm:p-6 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <Map size={20} className="text-cyan-400 shrink-0" />
        <h2 className="text-base sm:text-lg font-semibold text-slate-200">Cyclone Location</h2>
      </div>

      <div className="flex-1 bg-navy-900/80 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center relative overflow-hidden min-h-[300px]">
        {/* Placeholder grid background */}
        <div className="absolute inset-0 opacity-10" 
             style={{ 
               backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', 
               backgroundSize: '20px 20px' 
             }}>
        </div>
        
        <div className="z-10 flex flex-col items-center text-center p-4 sm:p-6 bg-navy-800/80 backdrop-blur-sm rounded-xl border border-slate-700/50 mx-4">
          <Map size={32} className="text-slate-500 mb-2 sm:mb-3" />
          <p className="text-slate-400 font-medium text-sm sm:text-base">Awaiting Location Data</p>
          <p className="text-[10px] sm:text-xs text-slate-500 mt-1 sm:mt-2 max-w-[200px]">Map interface will populate when backend coordinates are received.</p>
        </div>
      </div>
    </div>
  );
};

export default LocationMap;
