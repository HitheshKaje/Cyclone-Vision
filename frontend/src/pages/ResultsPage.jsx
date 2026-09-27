import React from 'react';
import { 
  ArrowRight, 
  Target, 
  Wind, 
  Gauge, 
  ShieldAlert, 
  ShieldCheck, 
  FileQuestion,
  Info
} from 'lucide-react';

const ResultsPage = ({
  currentAnalysis,
  setActiveTab
}) => {
  if (!currentAnalysis) {
    return (
      <div className="space-y-6 pb-8">
        <div className="pb-3 border-b border-slate-200">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Analysis Results
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Detailed results from the analyzed satellite image
          </p>
        </div>

        <div className="app-card p-10 sm:p-14 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-1">
            <FileQuestion size={26} />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-slate-900">
            No analysis available
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm">
            Upload and analyze a satellite image to inspect detection, intensity, and classification results.
          </p>
          <div className="pt-2">
            <button
              onClick={() => setActiveTab('analyze')}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5"
            >
              <span>Go to Analyze Image</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { detection, intensity, classification, fileName, imagePreview, timestamp } = currentAnalysis;
  const isCyclone = detection?.is_cyclone;
  const confidencePercent = detection?.confidence_percent != null 
    ? detection.confidence_percent 
    : (detection?.confidence != null ? Number((detection.confidence * 100).toFixed(1)) : null);

  const windKt = intensity?.wind_speed_kt != null ? intensity.wind_speed_kt : null;
  const windKmh = intensity?.wind_speed_kmh != null 
    ? intensity.wind_speed_kmh 
    : (windKt != null ? Number((windKt * 1.852).toFixed(1)) : null);

  const calculatedClassification = isCyclone === false 
    ? 'Not Applicable' 
    : (classification?.classification || intensity?.classification || null);

  // SVG Ring calculation for Confidence
  const circleRadius = 42;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeOffset = confidencePercent != null 
    ? circumference - (circumference * Math.min(100, Math.max(0, confidencePercent))) / 100 
    : circumference;

  // Scale: 0 to 140 kt for gauge
  const scalePercent = windKt != null ? Math.min(100, Math.max(0, (windKt / 140) * 100)) : 0;

  return (
    <div className="space-y-6 pb-8">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Analysis Results
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Detailed results from the analyzed satellite image.
          </p>
        </div>
        <button
          onClick={() => setActiveTab('analyze')}
          className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs sm:text-sm transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <span>New Analysis</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* 2. Desktop Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Satellite Image + Image Information (5 cols on desktop) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="app-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">
                Satellite Image
              </h3>
              <span className="text-[11px] font-medium text-slate-400 truncate max-w-[180px]">
                {fileName || 'Uploaded Image'}
              </span>
            </div>

            {/* Satellite Image Display */}
            <div className="w-full bg-[#F5F8FC] rounded-xl overflow-hidden border border-slate-200/90 shadow-xs flex items-center justify-center p-3 min-h-[300px]">
              <img 
                src={imagePreview} 
                alt="Satellite Observation" 
                className="max-h-[360px] w-full object-contain"
              />
            </div>

            {/* Image Information */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Info size={14} className="text-sky-600" />
                <span>Image Information</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">File Name</span>
                  <span className="font-medium text-slate-800 truncate max-w-[200px]">
                    {fileName || 'satellite_image'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Analysis Date / Time</span>
                  <span className="font-medium text-slate-800">
                    {timestamp}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Input Resolution</span>
                  <span className="font-medium text-slate-800">
                    224 × 224 pixels
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Three Result Cards (7 cols on desktop) */}
        <div className="lg:col-span-7 space-y-5">
          {/* CARD 1: Cyclone Detection */}
          <div className="app-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-sky-50 text-sky-700">
                  <Target size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Cyclone Detection
                  </h3>
                  <span className="text-[11px] text-slate-400">Objective 1</span>
                </div>
              </div>

              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                isCyclone 
                  ? 'bg-red-50 text-red-700 border-red-200' 
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {isCyclone ? 'Cyclone Detected' : 'No Cyclone'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-5 py-2">
              <div className="space-y-1 text-center sm:text-left">
                <p className="text-xs text-slate-500 font-medium">Detection Result</p>
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-0.5">
                  {isCyclone ? (
                    <ShieldAlert size={22} className="text-red-500 shrink-0" />
                  ) : (
                    <ShieldCheck size={22} className="text-emerald-500 shrink-0" />
                  )}
                  <span className="text-xl sm:text-2xl font-bold text-slate-900">
                    {isCyclone ? 'Cyclone Detected' : 'No Cyclone Detected'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {isCyclone 
                    ? 'Satellite pattern indicates active cyclonic circulation.' 
                    : 'No evidence of cyclonic formation detected in image.'}
                </p>
              </div>

              {/* Professional Circular Ring Visualization */}
              <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r={circleRadius}
                    className="stroke-slate-100"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r={circleRadius}
                    className={isCyclone ? "stroke-red-500" : "stroke-emerald-500"}
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeOffset}
                    strokeLinecap="round"
                    fill="none"
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-base font-bold text-slate-900 leading-none">
                    {confidencePercent != null ? `${confidencePercent}%` : '—'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                    Confidence
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 2: Intensity Estimation */}
          <div className="app-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-sky-50 text-sky-700">
                  <Wind size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Intensity Estimation
                  </h3>
                  <span className="text-[11px] text-slate-400">Objective 2</span>
                </div>
              </div>

              <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                Maximum Sustained Wind Speed
              </span>
            </div>

            {isCyclone === false ? (
              /* No Cyclone Case: Not Applicable */
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center space-y-1">
                <p className="text-sm font-bold text-slate-600">
                  Intensity: Not Applicable
                </p>
                <p className="text-xs text-slate-400">
                  Skipped because Objective 1 determined no cyclone is present.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Estimated Wind Speed</p>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-2xl sm:text-3xl font-bold text-slate-900">
                        {windKt != null ? windKt : '—'}
                      </span>
                      <span className="text-sm font-bold text-slate-500 uppercase">kt</span>
                      {windKmh != null && (
                        <span className="text-xs sm:text-sm text-slate-500 font-medium ml-1">
                          (≈ {windKmh} km/h)
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="text-xs text-slate-400 font-medium">
                    Scale: 0 – 140 kt
                  </span>
                </div>

                {/* Clean Horizontal Intensity Gauge */}
                <div className="space-y-1.5">
                  <div className="relative h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                    {/* Tier thresholds at 34 kt (24.3%) and 64 kt (45.7%) */}
                    <div className="absolute top-0 bottom-0 left-[24.3%] w-[1.5px] bg-slate-300 z-10" title="34 kt threshold" />
                    <div className="absolute top-0 bottom-0 left-[45.7%] w-[1.5px] bg-slate-300 z-10" title="64 kt threshold" />
                    
                    <div 
                      className={`h-full transition-all duration-700 rounded-full ${
                        calculatedClassification === 'SEVERE'
                          ? 'bg-red-500'
                          : calculatedClassification === 'MEDIUM'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${scalePercent}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-slate-400 font-medium px-0.5">
                    <span>0 kt</span>
                    <span>34 kt (Medium)</span>
                    <span>64 kt (Severe)</span>
                    <span>140 kt</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CARD 3: Classification */}
          <div className="app-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-sky-50 text-sky-700">
                  <Gauge size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Classification
                  </h3>
                  <span className="text-[11px] text-slate-400">Objective 3</span>
                </div>
              </div>

              {calculatedClassification && calculatedClassification !== 'Not Applicable' && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                  calculatedClassification === 'SEVERE'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : calculatedClassification === 'MEDIUM'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {calculatedClassification}
                </span>
              )}
            </div>

            {isCyclone === false ? (
              /* No Cyclone Case: Not Applicable */
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center space-y-1">
                <p className="text-sm font-bold text-slate-600">
                  Classification: Not Applicable
                </p>
                <p className="text-xs text-slate-400">
                  Rule-based classification requires cyclone detection.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 3-Tier Classification Cards */}
                <div className="grid grid-cols-3 gap-2.5 text-center">
                  {/* LOW (< 34 kt) */}
                  <div className={`p-3 rounded-xl border text-xs transition-colors ${
                    calculatedClassification === 'LOW'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold ring-2 ring-emerald-300 shadow-xs'
                      : 'bg-slate-50/70 border-slate-200 text-slate-400'
                  }`}>
                    <p className="font-bold text-xs">LOW</p>
                    <p className="text-[10px] mt-0.5">&lt; 34 kt</p>
                  </div>

                  {/* MEDIUM (34–63 kt) */}
                  <div className={`p-3 rounded-xl border text-xs transition-colors ${
                    calculatedClassification === 'MEDIUM'
                      ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold ring-2 ring-amber-300 shadow-xs'
                      : 'bg-slate-50/70 border-slate-200 text-slate-400'
                  }`}>
                    <p className="font-bold text-xs">MEDIUM</p>
                    <p className="text-[10px] mt-0.5">34–63 kt</p>
                  </div>

                  {/* SEVERE (>= 64 kt) */}
                  <div className={`p-3 rounded-xl border text-xs transition-colors ${
                    calculatedClassification === 'SEVERE'
                      ? 'bg-red-50 border-red-300 text-red-900 font-bold ring-2 ring-red-300 shadow-xs'
                      : 'bg-slate-50/70 border-slate-200 text-slate-400'
                  }`}>
                    <p className="font-bold text-xs">SEVERE</p>
                    <p className="text-[10px] mt-0.5">&ge; 64 kt</p>
                  </div>
                </div>

                {classification?.description && (
                  <p className="text-xs text-slate-600 font-medium pt-1">
                    {classification.description}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;
