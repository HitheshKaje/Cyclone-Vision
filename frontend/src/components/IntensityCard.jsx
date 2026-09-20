import React from 'react';
import { Activity, Wind, Info, Gauge, Loader2, ShieldAlert, CheckCircle2 } from 'lucide-react';

const WindGauge = ({ windSpeedKt, classification }) => {
  // Clamp for gauge visualization (0 to 140 knots)
  const maxScale = 140;
  const speed = typeof windSpeedKt === 'number' ? Math.max(0, windSpeedKt) : 0;
  const percentage = Math.min(1, speed / maxScale);
  
  // Radius and Arc parameters
  const radius = 64;
  const strokeWidth = 12;
  const center = 85;
  const circumference = 2 * Math.PI * radius;
  // 240-degree arc (leave 120 degrees open at bottom)
  const arcFraction = 0.75;
  const totalDash = circumference * arcFraction;
  const dashOffset = totalDash * (1 - percentage);

  // Dynamic color based on classification
  let strokeColor = "#10b981"; // Emerald / Green for LOW
  if (classification === 'MEDIUM') {
    strokeColor = "#f59e0b"; // Amber for MEDIUM
  } else if (classification === 'SEVERE') {
    strokeColor = "#ef4444"; // Red for SEVERE
  } else {
    if (speed >= 64) strokeColor = "#ef4444";
    else if (speed >= 34) strokeColor = "#f59e0b";
  }

  const speedKmh = (speed * 1.852).toFixed(1);

  return (
    <div className="flex flex-col items-center justify-center relative p-2">
      <div className="relative w-44 h-44 flex items-center justify-center">
        <svg viewBox="0 0 170 170" className="w-full h-full transform -rotate-135">
          {/* Background Track Arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
            strokeDasharray={`${totalDash} ${circumference}`}
            strokeLinecap="round"
          />
          {/* Animated Value Arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={`${totalDash} ${circumference}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className="gauge-arc"
          />
        </svg>

        {/* Center Digital Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pt-2">
          <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-none">
            {speed.toFixed(1)}
          </span>
          <span className="text-xs sm:text-sm font-bold text-sky-700 uppercase tracking-wider mt-0.5">
            kt
          </span>
        </div>
      </div>

      {/* Speed in km/h Subtitle */}
      <p className="text-xs sm:text-sm font-bold text-slate-600 -mt-2">
        ≈ {speedKmh} km/h
      </p>
    </div>
  );
};

const IntensityCard = ({ intensityResult, intensityStatus, isCyclone }) => {
  const isCompleted = intensityStatus === 'Completed' && intensityResult;
  
  // Extract wind speed values
  const windSpeedKt = isCompleted
    ? (intensityResult.wind_speed_kt ?? intensityResult.predicted_wind_speed_kt)
    : null;
    
  const windSpeedKmh = isCompleted
    ? (intensityResult.wind_speed_kmh ?? (windSpeedKt !== null ? Number((windSpeedKt * 1.852).toFixed(1)) : null))
    : null;

  // Determine classification (from backend or fallback rule)
  const classification = isCompleted
    ? (intensityResult.classification || (windSpeedKt >= 64 ? 'SEVERE' : windSpeedKt >= 34 ? 'MEDIUM' : 'LOW'))
    : null;

  const description = isCompleted
    ? (intensityResult.description || (classification === 'SEVERE' ? 'High-intensity severe tropical cyclone' : classification === 'MEDIUM' ? 'Moderate-intensity cyclonic storm' : 'Low-intensity tropical disturbance / depression'))
    : null;

  return (
    <div className="glass-panel p-5 sm:p-6 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-100 text-cyan-700">
            <Activity size={18} className="shrink-0" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            Intensity & Classification <span className="text-xs font-semibold text-cyan-600">(Objectives 2 & 3)</span>
          </h3>
        </div>
        {isCompleted && (
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">
            AI + Rules
          </span>
        )}
      </div>

      {/* Main Intensity & Classification Content */}
      {isCompleted ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          {/* Left: Interactive Wind Speed Gauge */}
          <div className="md:col-span-5 flex justify-center border-b md:border-b-0 md:border-r border-sky-100 pb-3 md:pb-0 md:pr-3">
            <WindGauge windSpeedKt={windSpeedKt} classification={classification} />
          </div>

          {/* Right: Intensity & Classification Details */}
          <div className="md:col-span-7 space-y-4">
            
            {/* Section 1: CYCLONE INTENSITY */}
            <div>
              <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                CYCLONE INTENSITY
              </p>
              <div className="flex items-baseline gap-2.5 mt-1">
                <span className="text-3xl sm:text-4xl font-black text-sky-900 tracking-tight">
                  {windSpeedKt} KT
                </span>
                <span className="text-sm sm:text-base font-bold text-slate-500">
                  {windSpeedKmh} KM/H
                </span>
              </div>
            </div>

            {/* Section 2: CLASSIFICATION */}
            <div className="pt-2 border-t border-sky-100/90">
              <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                CLASSIFICATION
              </p>
              
              {/* Distinct 3-Level Indicator (LOW | MEDIUM | SEVERE) */}
              <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-100/80 border border-slate-200">
                {/* LOW Indicator */}
                <div
                  className={`flex-1 text-center py-1.5 px-2 rounded-lg text-xs font-black transition-all ${
                    classification === 'LOW'
                      ? 'bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-300/80 scale-[1.02]'
                      : 'text-slate-400 opacity-60'
                  }`}
                >
                  LOW
                </div>

                {/* MEDIUM Indicator */}
                <div
                  className={`flex-1 text-center py-1.5 px-2 rounded-lg text-xs font-black transition-all ${
                    classification === 'MEDIUM'
                      ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-300/80 scale-[1.02]'
                      : 'text-slate-400 opacity-60'
                  }`}
                >
                  MEDIUM
                </div>

                {/* SEVERE Indicator */}
                <div
                  className={`flex-1 text-center py-1.5 px-2 rounded-lg text-xs font-black transition-all ${
                    classification === 'SEVERE'
                      ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-300/80 scale-[1.02]'
                      : 'text-slate-400 opacity-60'
                  }`}
                >
                  SEVERE
                </div>
              </div>

              {/* Classification Subtitle / Description */}
              <p className="text-xs font-semibold text-slate-700 mt-2 flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    classification === 'SEVERE'
                      ? 'bg-rose-600'
                      : classification === 'MEDIUM'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                />
                <span>{description}</span>
              </p>
            </div>

            {/* Model Provenance Metadata */}
            <div className="space-y-1 pt-2 text-[11px] border-t border-sky-100/80 text-slate-500">
              <div className="flex items-center justify-between">
                <span>Intensity Model:</span>
                <span className="font-bold text-slate-700 font-mono">
                  {intensityResult.model || 'EfficientNetB0-TCIR-Intensity'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Classification Layer:</span>
                <span className="font-semibold text-slate-700">
                  Rule-Based Vmax Thresholds
                </span>
              </div>
            </div>

          </div>
        </div>
      ) : intensityStatus === 'Estimating' ? (
        /* Estimating loading state */
        <div className="p-8 rounded-2xl bg-cyan-50/40 border border-cyan-100 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 size={32} className="animate-spin text-cyan-600" />
          <div>
            <p className="text-sm font-bold text-slate-800">Estimating Cyclone Intensity & Classification...</p>
            <p className="text-xs text-slate-500 mt-0.5">Running EfficientNetB0 regression & rule-based classification</p>
          </div>
        </div>
      ) : intensityStatus === 'Not Applicable' ? (
        /* Not applicable (No Cyclone detected) */
        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
            <Wind size={20} />
          </div>
          <p className="text-sm font-bold text-slate-700">Intensity & Classification Skipped</p>
          <p className="text-xs text-slate-500 max-w-xs">
            Objective 1 detected No Cyclone in the uploaded image. Intensity estimation and classification are only performed for active cyclone threats.
          </p>
        </div>
      ) : (
        /* Awaiting state */
        <div className="p-6 rounded-2xl bg-sky-50/40 border border-sky-100/80 flex flex-col items-center justify-center text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-sky-100 flex items-center justify-center text-sky-400">
            <Gauge size={24} />
          </div>
          <p className="text-sm font-bold text-slate-700">Awaiting Cyclone Detection</p>
          <p className="text-xs text-slate-500 max-w-xs">
            Intensity and classification will be generated dynamically when a cyclone is detected in the satellite frame.
          </p>
        </div>
      )}
    </div>
  );
};

export default IntensityCard;
