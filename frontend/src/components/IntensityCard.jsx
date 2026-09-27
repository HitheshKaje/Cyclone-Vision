import React from 'react';
import { Wind, Gauge, ShieldCheck, AlertTriangle } from 'lucide-react';

const IntensityCard = ({ intensity, classification, isCyclone, isAnalysisCompleted }) => {
  // If analysis completed and isCyclone is false: show Not Applicable
  if (isAnalysisCompleted && isCyclone === false) {
    return (
      <div className="app-card p-5 space-y-4">
        {/* Intensity Section */}
        <div>
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-slate-100 text-slate-600">
                <Wind size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Intensity Estimation</h3>
                <span className="text-[11px] text-slate-400">Objective 2</span>
              </div>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              Not Applicable
            </span>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 text-center">
            <p className="text-sm font-semibold text-slate-600">Intensity: Not Applicable</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Skipped because Objective 1 determined no cyclone is present.
            </p>
          </div>
        </div>

        {/* Classification Section */}
        <div>
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-slate-100 text-slate-600">
                <Gauge size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Cyclone Classification</h3>
                <span className="text-[11px] text-slate-400">Objective 3</span>
              </div>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              Not Applicable
            </span>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 text-center">
            <p className="text-sm font-semibold text-slate-600">Classification: Not Applicable</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Rule-based classification requires cyclone detection.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isAvailable = Boolean(intensity && typeof intensity.wind_speed_kt === 'number');
  const windKt = isAvailable ? intensity.wind_speed_kt : null;
  const windKmh = isAvailable 
    ? (intensity.wind_speed_kmh ?? Number((windKt * 1.852).toFixed(1)))
    : null;

  const currentClass = classification?.classification || intensity?.classification || null;
  const classDescription = classification?.description || intensity?.description || null;

  // Scale: 0 to 140 kt
  const scalePercent = windKt != null ? Math.min(100, Math.max(0, (windKt / 140) * 100)) : 0;

  return (
    <div className="app-card p-5 space-y-5">
      {/* Objective 2: Intensity Estimation */}
      <div>
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-sky-50 text-sky-700">
              <Wind size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Intensity Estimation</h3>
              <span className="text-[11px] text-slate-400">Objective 2</span>
            </div>
          </div>

          {isAvailable && (
            <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              Vmax Sustained
            </span>
          )}
        </div>

        {isAvailable ? (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Estimated Wind Speed</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-bold text-slate-900">{windKt}</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase">kt</span>
                  <span className="text-xs text-slate-400 font-medium ml-1">
                    (≈ {windKmh} km/h)
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-slate-400 font-medium">Scale (0–140 kt)</span>
              </div>
            </div>

            {/* Clean Horizontal Wind Scale */}
            <div className="space-y-1">
              <div className="relative h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                {/* 34 kt marker (24.3%) and 64 kt marker (45.7%) */}
                <div className="absolute top-0 bottom-0 left-[24.3%] w-[1px] bg-slate-300 z-10" />
                <div className="absolute top-0 bottom-0 left-[45.7%] w-[1px] bg-slate-300 z-10" />
                <div 
                  className={`h-full transition-all duration-700 rounded-full ${
                    currentClass === 'SEVERE'
                      ? 'bg-red-500'
                      : currentClass === 'MEDIUM'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${scalePercent}%` }}
                />
              </div>

              <div className="flex justify-between text-[10px] text-slate-400 font-medium px-0.5">
                <span>0 kt</span>
                <span>34 kt</span>
                <span>64 kt</span>
                <span>140 kt</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4 text-center text-slate-400 space-y-1">
            <p className="text-lg font-bold text-slate-300">—</p>
            <p className="text-xs">Awaiting intensity estimation</p>
          </div>
        )}
      </div>

      {/* Objective 3: Classification */}
      <div className="pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-sky-50 text-sky-700">
              <Gauge size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Cyclone Classification</h3>
              <span className="text-[11px] text-slate-400">Objective 3</span>
            </div>
          </div>

          {currentClass && (
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
              currentClass === 'SEVERE'
                ? 'bg-red-50 text-red-700 border-red-200'
                : currentClass === 'MEDIUM'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              {currentClass}
            </span>
          )}
        </div>

        {currentClass ? (
          <div className="space-y-3">
            {classDescription && (
              <p className="text-xs font-medium text-slate-600">
                {classDescription}
              </p>
            )}

            {/* Strict 3-Tier Classification Table / Badge System */}
            <div className="grid grid-cols-3 gap-2 text-center">
              {/* Tier 1: LOW (< 34 kt) */}
              <div className={`p-2.5 rounded-lg border text-xs transition-colors ${
                currentClass === 'LOW'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold ring-1 ring-emerald-300'
                  : 'bg-slate-50 border-slate-200 text-slate-400 font-medium'
              }`}>
                <p className="font-bold text-[11px]">LOW</p>
                <p className="text-[10px] mt-0.5">&lt; 34 kt</p>
              </div>

              {/* Tier 2: MEDIUM (>= 34 kt and < 64 kt) */}
              <div className={`p-2.5 rounded-lg border text-xs transition-colors ${
                currentClass === 'MEDIUM'
                  ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold ring-1 ring-amber-300'
                  : 'bg-slate-50 border-slate-200 text-slate-400 font-medium'
              }`}>
                <p className="font-bold text-[11px]">MEDIUM</p>
                <p className="text-[10px] mt-0.5">&ge; 34 to &lt; 64 kt</p>
              </div>

              {/* Tier 3: SEVERE (>= 64 kt) */}
              <div className={`p-2.5 rounded-lg border text-xs transition-colors ${
                currentClass === 'SEVERE'
                  ? 'bg-red-50 border-red-300 text-red-900 font-bold ring-1 ring-red-300'
                  : 'bg-slate-50 border-slate-200 text-slate-400 font-medium'
              }`}>
                <p className="font-bold text-[11px]">SEVERE</p>
                <p className="text-[10px] mt-0.5">&ge; 64 kt</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4 text-center text-slate-400 space-y-1">
            <p className="text-lg font-bold text-slate-300">—</p>
            <p className="text-xs">Awaiting classification</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntensityCard;
