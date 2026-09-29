import React from 'react';
import { Target, CheckCircle2, ShieldAlert, ShieldCheck } from 'lucide-react';

const DetectionResult = ({ detection }) => {
  const isAvailable = Boolean(detection && typeof detection.is_cyclone === 'boolean');
  const isCyclone = isAvailable && detection.is_cyclone;
  const confidencePercent = isAvailable
    ? (detection.confidence_percent ?? (detection.confidence ? round(detection.confidence * 100, 2) : null))
    : null;

  return (
    <div className="app-card p-5 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-700/30">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-emerald-500/100/10 text-emerald-400">
            <Target size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Cyclone Detection
            </h3>
            <span className="text-[11px] text-slate-400">Objective 1</span>
          </div>
        </div>

        {isAvailable && (
          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
            isCyclone 
              ? 'bg-red-500/10 text-red-400 border-red-500/20' 
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          }`}>
            {isCyclone ? 'Cyclone Detected' : 'No Cyclone Detected'}
          </span>
        )}
      </div>

      {/* Main Content */}
      {isAvailable ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Detection Status</p>
              <div className="flex items-center gap-2 mt-0.5">
                {isCyclone ? (
                  <ShieldAlert size={20} className="text-red-500" />
                ) : (
                  <ShieldCheck size={20} className="text-emerald-500" />
                )}
                <span className="text-xl font-bold text-slate-100">
                  {isCyclone ? 'Cyclone Detected' : 'No Cyclone Detected'}
                </span>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs text-slate-500 font-medium">Confidence</p>
              <p className="text-xl font-bold text-slate-100 mt-0.5">
                {confidencePercent != null ? `${confidencePercent}%` : '—'}
              </p>
            </div>
          </div>

          {/* Clean Confidence Bar */}
          <div className="space-y-1.5">
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 rounded-full ${
                  isCyclone ? 'bg-red-500/100' : 'bg-emerald-500/100'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, confidencePercent || 0))}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 font-medium">
              <span>Model: {detection.model || 'EfficientNetB0'}</span>
              <span>Certainty: {confidencePercent != null ? `${confidencePercent}%` : '—'}</span>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="py-6 text-center text-slate-400 space-y-1">
          <p className="text-lg font-bold text-slate-300">—</p>
          <p className="text-xs">Awaiting image analysis</p>
        </div>
      )}
    </div>
  );
};

export default DetectionResult;
