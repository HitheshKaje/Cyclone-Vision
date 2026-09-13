import React from 'react';
import { Activity, Wind, Info, Gauge, Loader2, AlertCircle } from 'lucide-react';

const WindGauge = ({ windSpeedKt }) => {
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

  // Dynamic Color based on meteorological intensity
  let strokeColor = "#0284c7"; // Sky blue (< 34 kt)
  if (speed >= 34 && speed < 64) {
    strokeColor = "#06b6d4"; // Cyan/Teal (Cyclonic Storm)
  } else if (speed >= 64 && speed < 90) {
    strokeColor = "#f59e0b"; // Amber (Severe)
  } else if (speed >= 90) {
    strokeColor = "#ef4444"; // Red (Very Severe / Super Cyclone)
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
  const windSpeedKt = isCompleted ? intensityResult.predicted_wind_speed_kt : null;
  const windSpeedKmh = windSpeedKt !== null ? (windSpeedKt * 1.852).toFixed(1) : null;

  return (
    <div className="glass-panel p-5 sm:p-6 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-100 text-cyan-700">
            <Activity size={18} className="shrink-0" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            Intensity Estimation <span className="text-xs font-semibold text-cyan-600">(Objective 2)</span>
          </h3>
        </div>
        {isCompleted && (
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">
            Regression
          </span>
        )}
      </div>

      {/* Main Intensity Content */}
      {isCompleted ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Left: Interactive Wind Speed Gauge */}
          <div className="md:col-span-5 flex justify-center border-b md:border-b-0 md:border-r border-sky-100 pb-3 md:pb-0 md:pr-3">
            <WindGauge windSpeedKt={windSpeedKt} />
          </div>

          {/* Right: Detailed Metadata Info */}
          <div className="md:col-span-7 space-y-3">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Estimated Maximum Sustained Wind Speed
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-sky-800">
                  {windSpeedKt} kt
                </span>
                <span className="text-xs sm:text-sm font-semibold text-slate-500">
                  ≈ {windSpeedKmh} km/h
                </span>
              </div>
            </div>

            <div className="space-y-1.5 pt-1 text-xs border-t border-sky-100/80">
              <div className="flex items-center justify-between text-slate-600">
                <span className="font-semibold text-slate-500">Model Used:</span>
                <span className="font-bold text-slate-800 font-mono">
                  {intensityResult.model || 'EfficientNetB0-TCIR-Intensity'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="font-semibold text-slate-500">Task:</span>
                <span className="font-semibold text-slate-700">
                  Image-to-Intensity Regression
                </span>
              </div>
            </div>

            {/* Info note */}
            <div className="p-2.5 rounded-xl bg-sky-50/70 border border-sky-100 flex items-start gap-2 text-[11px] text-slate-600">
              <Info size={14} className="text-sky-600 shrink-0 mt-0.5" />
              <span>This is the model's estimated maximum sustained wind speed based on the satellite image.</span>
            </div>
          </div>
        </div>
      ) : intensityStatus === 'Estimating' ? (
        /* Estimating loading state */
        <div className="p-8 rounded-2xl bg-cyan-50/40 border border-cyan-100 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 size={32} className="animate-spin text-cyan-600" />
          <div>
            <p className="text-sm font-bold text-slate-800">Estimating Cyclone Intensity...</p>
            <p className="text-xs text-slate-500 mt-0.5">Running EfficientNetB0 regression on convective storm features</p>
          </div>
        </div>
      ) : intensityStatus === 'Not Applicable' ? (
        /* Not applicable (No Cyclone) */
        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
            <Wind size={20} />
          </div>
          <p className="text-sm font-bold text-slate-700">Intensity Estimation Skipped</p>
          <p className="text-xs text-slate-500 max-w-xs">
            Objective 1 detected No Cyclone in the uploaded image. Intensity estimation is only performed for active cyclone threats.
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
            Intensity will be estimated dynamically when a cyclone is detected in the satellite frame.
          </p>
        </div>
      )}
    </div>
  );
};

export default IntensityCard;
