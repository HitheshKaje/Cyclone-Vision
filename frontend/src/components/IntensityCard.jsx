import React from 'react';
import { Wind, Gauge, ShieldCheck, AlertTriangle } from 'lucide-react';

const IntensityCard = ({ intensity, classification, isCyclone, isAnalysisCompleted }) => {
  // If analysis completed and isCyclone is false: show Not Applicable
  if (isAnalysisCompleted && isCyclone === false) {
    return (
      <div className="app-card p-5 space-y-4">
        {/* Intensity Section */}
        <div>
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/50 dark:border-slate-700/30">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                <Wind size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Intensity Estimation</h3>
                <span className="text-[11px] text-slate-600 dark:text-slate-400">Objective 2</span>
              </div>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50">
              Not Applicable
            </span>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/30 text-center">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Intensity: Not Applicable</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Skipped because Objective 1 determined no cyclone is present.
            </p>
          </div>
        </div>

        {/* Classification Section */}
        <div>
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/50 dark:border-slate-700/30">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                <Gauge size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Cyclone Classification</h3>
                <span className="text-[11px] text-slate-600 dark:text-slate-400">Objective 3</span>
              </div>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50">
              Not Applicable
            </span>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/30 text-center">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Classification: Not Applicable</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
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
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/50 dark:border-slate-700/30">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-emerald-500/100/10 text-emerald-400">
              <Wind size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Intensity Estimation</h3>
              <span className="text-[11px] text-slate-600 dark:text-slate-400">Objective 2</span>
            </div>
          </div>

          {isAvailable && (
            <span className="text-[11px] font-medium text-slate-500 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-md">
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
                  <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{windKt}</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase">kt</span>
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-medium ml-1">
                    (≈ {windKmh} km/h)
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Scale (0–140 kt)</span>
              </div>
            </div>

            {/* High-Contrast Horizontal Wind Scale */}
            <div className="space-y-2 pt-1">
              {/* Category Threshold Indicators (34kt and 64kt) */}
              <div className="relative h-4 w-full text-[10px] font-bold">
                <span 
                  className="absolute -translate-x-1/2 text-amber-700 dark:text-amber-400 font-bold flex flex-col items-center" 
                  style={{ left: '24.3%' }}
                >
                  <span>34 kt</span>
                </span>
                <span 
                  className="absolute -translate-x-1/2 text-red-700 dark:text-red-400 font-bold flex flex-col items-center" 
                  style={{ left: '45.7%' }}
                >
                  <span>64 kt</span>
                </span>
              </div>

              {/* Main Bar Track */}
              <div className="relative h-3.5 w-full bg-slate-200 dark:bg-slate-700/70 rounded-full overflow-hidden shadow-inner border border-slate-300/60 dark:border-slate-600/60">
                {/* Zone Underlay Colors */}
                <div className="absolute inset-0 flex">
                  <div className="h-full bg-emerald-500/15 dark:bg-emerald-500/20" style={{ width: '24.3%' }} />
                  <div className="h-full bg-amber-500/20 dark:bg-amber-500/20" style={{ width: '21.4%' }} />
                  <div className="h-full bg-red-500/20 dark:bg-red-500/20 flex-1" />
                </div>

                {/* Vertical Boundary Markers at 34 kt and 64 kt */}
                <div className="absolute top-0 bottom-0 w-[1.5px] bg-amber-600/80 dark:bg-amber-400 z-10" style={{ left: '24.3%' }} />
                <div className="absolute top-0 bottom-0 w-[1.5px] bg-red-600/80 dark:bg-red-400 z-10" style={{ left: '45.7%' }} />

                <div 
                  className={`h-full transition-all duration-700 rounded-full shadow-md ${
                    currentClass === 'SEVERE'
                      ? 'bg-gradient-to-r from-orange-500 to-red-600'
                      : currentClass === 'MEDIUM'
                      ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600'
                      : 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                  }`}
                  style={{ width: `${scalePercent}%` }}
                />
              </div>

              <div className="flex justify-between text-[10px] text-slate-600 dark:text-slate-300 font-semibold px-0.5">
                <span>0 kt</span>
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  TD &lt; 34 kt &bull; TS 34–63 kt &bull; TC &ge; 64 kt
                </span>
                <span>140 kt</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4 text-center text-slate-600 dark:text-slate-400 space-y-1">
            <p className="text-lg font-bold text-slate-700 dark:text-slate-300">—</p>
            <p className="text-xs">Awaiting intensity estimation</p>
          </div>
        )}
      </div>

      {/* Objective 3: Classification */}
      <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/30">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/50 dark:border-slate-700/30">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Gauge size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Cyclone Classification</h3>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Objective 3</span>
            </div>
          </div>

          {currentClass && (
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-xs ${
              currentClass === 'SEVERE'
                ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/40'
                : currentClass === 'MEDIUM'
                ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40'
                : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40'
            }`}>
              {currentClass}
            </span>
          )}
        </div>

        {currentClass ? (
          <div className="space-y-3">
            {classDescription && (
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {classDescription}
              </p>
            )}

            {/* Strict 3-Tier Classification Table / Badge System */}
            <div className="grid grid-cols-3 gap-2 text-center">
              {/* Tier 1: LOW (< 34 kt) */}
              <div className={`p-2.5 rounded-xl border text-xs transition-all ${
                currentClass === 'LOW'
                  ? 'bg-emerald-50 border-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-500/60 ring-2 ring-emerald-400/40 shadow-sm'
                  : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60'
              }`}>
                <p className={`font-bold text-[11px] ${
                  currentClass === 'LOW' ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300'
                }`}>
                  LOW
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">&lt; 34 kt (TD)</p>
              </div>

              {/* Tier 2: MEDIUM (>= 34 kt and < 64 kt) */}
              <div className={`p-2.5 rounded-xl border text-xs transition-all ${
                currentClass === 'MEDIUM'
                  ? 'bg-amber-50 border-amber-400 dark:bg-amber-950/40 dark:border-amber-500/60 ring-2 ring-amber-400/50 shadow-sm'
                  : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60'
              }`}>
                <p className={`font-bold text-[11px] ${
                  currentClass === 'MEDIUM' ? 'text-amber-900 dark:text-amber-200' : 'text-slate-700 dark:text-slate-300'
                }`}>
                  MEDIUM
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">34–63 kt (TS)</p>
              </div>

              {/* Tier 3: SEVERE (>= 64 kt) */}
              <div className={`p-2.5 rounded-xl border text-xs transition-all ${
                currentClass === 'SEVERE'
                  ? 'bg-red-50 border-red-400 dark:bg-red-950/40 dark:border-red-500/60 ring-2 ring-red-400/40 shadow-sm'
                  : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60'
              }`}>
                <p className={`font-bold text-[11px] ${
                  currentClass === 'SEVERE' ? 'text-red-800 dark:text-red-300' : 'text-slate-700 dark:text-slate-300'
                }`}>
                  SEVERE
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">&ge; 64 kt (TC)</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4 text-center text-slate-600 dark:text-slate-400 space-y-1">
            <p className="text-lg font-bold text-slate-700 dark:text-slate-300">—</p>
            <p className="text-xs">Awaiting classification</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntensityCard;
