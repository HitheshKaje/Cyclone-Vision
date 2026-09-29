import React from 'react';
import { Map, MapPin } from 'lucide-react';

const LocationMap = () => {
  return (
    <div className="app-card p-5 sm:p-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-700/30">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/100/10 text-emerald-400">
            <Map size={20} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-slate-100">
              Cyclone Map
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Geospatial position monitoring
            </p>
          </div>
        </div>
      </div>

      {/* Map Canvas / Clean Empty State */}
      <div className="flex-1 min-h-[360px] bg-slate-800 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-[#1e293b] border border-slate-700/50 shadow-xs flex items-center justify-center text-slate-400 mb-3">
          <MapPin size={24} />
        </div>
        <h3 className="text-sm font-semibold text-slate-200 mb-1">
          No cyclone location data available
        </h3>
        <p className="text-xs text-slate-500 max-w-sm">
          Analyzed satellite images do not contain embedded geospatial coordinate metadata. Coordinates will display when provided by real telemetry sources.
        </p>
      </div>
    </div>
  );
};

export default LocationMap;
