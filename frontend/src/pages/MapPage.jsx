import React from 'react';
import { Map, MapPin } from 'lucide-react';

const MapPage = ({ currentAnalysis }) => {
  const hasRealLocation = Boolean(
    currentAnalysis?.latitude != null && currentAnalysis?.longitude != null
  );

  return (
    <div className="space-y-6 pb-8">
      {/* 1. Page Header */}
      <div className="pb-3 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Cyclone Map
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Geospatial position monitoring
        </p>
      </div>

      {/* 2. Map Container */}
      <div className="app-card p-6 flex flex-col justify-between">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-sky-50 text-sky-700">
              <Map size={18} />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              Location Telemetry
            </h3>
          </div>
          <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md">
            Telemetry Feed
          </span>
        </div>

        {hasRealLocation ? (
          /* When real location data exists */
          <div className="min-h-[380px] bg-slate-50 rounded-xl border border-slate-200 p-6 flex flex-col items-center justify-center">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-2">
                <MapPin size={24} />
              </div>
              <p className="text-sm font-bold text-slate-900">
                Latitude: {currentAnalysis.latitude}° | Longitude: {currentAnalysis.longitude}°
              </p>
            </div>
          </div>
        ) : (
          /* Clean Empty State when no real location metadata exists */
          <div className="min-h-[380px] bg-slate-50/70 rounded-xl border border-slate-200 flex flex-col items-center justify-center p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-400 mb-1">
              <MapPin size={26} />
            </div>
            <h3 className="text-base font-semibold text-slate-800">
              No cyclone location data available
            </h3>
            <p className="text-xs text-slate-500 max-w-md leading-relaxed">
              Analyzed satellite images do not contain embedded geospatial coordinate metadata. Coordinates will display when provided by real telemetry sources.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapPage;
