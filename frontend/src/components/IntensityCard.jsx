import React from 'react';
import { Activity, Wind, Gauge, Loader2, AlertCircle } from 'lucide-react';

const IntensityCard = ({ intensityResult, intensityStatus, isCyclone }) => {
  return (
    <div className="glass-panel p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-2">
          <Activity size={20} className="text-cyan-400 shrink-0" />
          <h2 className="text-base sm:text-lg font-semibold text-slate-200">Intensity Estimation</h2>
        </div>
        {intensityStatus === 'Completed' && intensityResult && (
          <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-medium">
            Objective 2
          </span>
        )}
      </div>

      <div className="space-y-4">
        {/* Status / Main Banner */}
        <div className={`p-4 rounded-lg border flex items-center justify-center py-5 sm:py-6 text-center transition-all ${
          intensityStatus === 'Completed' && intensityResult
            ? 'border-amber-500/40 bg-amber-950/20'
            : intensityStatus === 'Estimating'
            ? 'border-cyan-500/40 bg-cyan-950/20'
            : intensityStatus === 'Not Applicable'
            ? 'border-slate-700/50 bg-navy-900/30'
            : intensityStatus === 'Error'
            ? 'border-red-500/40 bg-red-950/20'
            : 'border-slate-700/50 bg-navy-900/50'
        }`}>
          {intensityStatus === 'Estimating' ? (
            <div className="flex items-center gap-2 text-cyan-400 text-sm font-medium">
              <Loader2 size={18} className="animate-spin" />
              <span>Estimating intensity...</span>
            </div>
          ) : intensityStatus === 'Completed' && intensityResult ? (
            <div className="space-y-1">
              <p className="text-xs text-amber-300 font-medium uppercase tracking-wider">Estimated Maximum Sustained Wind Speed</p>
              <p className="text-3xl font-bold text-amber-400">
                {intensityResult.predicted_wind_speed_kt} <span className="text-base font-medium text-slate-300">kt</span>
              </p>
            </div>
          ) : intensityStatus === 'Not Applicable' ? (
            <p className="text-slate-400 text-sm font-medium">No Cyclone Detected — Intensity N/A</p>
          ) : intensityStatus === 'Error' ? (
            <div className="flex items-center gap-2 text-red-400 text-sm font-medium">
              <AlertCircle size={18} />
              <span>Intensity estimation unavailable</span>
            </div>
          ) : (
            <p className="text-slate-500 font-medium text-sm text-center">
              Awaiting cyclone detection
            </p>
          )}
        </div>

        {/* Metric Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="p-3 rounded-lg border border-slate-700/50 bg-navy-900/50">
            <div className="flex items-center gap-2 mb-1">
              <Wind size={14} className={intensityStatus === 'Completed' && intensityResult ? "text-amber-400" : "text-slate-500"} />
              <p className="text-xs text-slate-400">Est. Wind Speed</p>
            </div>
            <p className="text-lg font-semibold text-slate-200">
              {intensityStatus === 'Completed' && intensityResult
                ? `${intensityResult.predicted_wind_speed_kt} kt`
                : intensityStatus === 'Not Applicable'
                ? 'N/A'
                : '-- kt'}
            </p>
          </div>
          
          <div className="p-3 rounded-lg border border-slate-700/50 bg-navy-900/50">
            <div className="flex items-center gap-2 mb-1">
              <Gauge size={14} className={intensityStatus === 'Completed' && intensityResult ? "text-cyan-400" : "text-slate-500"} />
              <p className="text-xs text-slate-400">Model</p>
            </div>
            <p className="text-sm font-medium text-slate-300 truncate">
              {intensityStatus === 'Completed' && intensityResult
                ? (intensityResult.model || 'EfficientNetB0-TCIR-Intensity')
                : 'EfficientNetB0 (Regression)'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntensityCard;
