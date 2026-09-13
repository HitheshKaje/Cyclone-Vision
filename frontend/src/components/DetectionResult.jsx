import React from 'react';
import { Target, CheckCircle2, AlertCircle, Globe, ShieldCheck, HelpCircle } from 'lucide-react';

const CycloneSwirlIcon = ({ className = "w-12 h-12" }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none">
    <path
      d="M50 15 C70 15, 85 30, 85 50 C80 35, 68 28, 52 30 C36 32, 25 44, 25 60 C25 42, 36 24, 50 15 Z"
      fill="currentColor"
    />
    <path
      d="M50 85 C30 85, 15 70, 15 50 C20 65, 32 72, 48 70 C64 68, 75 56, 75 40 C75 58, 64 76, 50 85 Z"
      fill="currentColor"
    />
    <circle cx="50" cy="50" r="6" fill="currentColor" />
  </svg>
);

const DetectionResult = ({ predictionResult, analysisStatus }) => {
  const isCompleted = analysisStatus === 'Completed' && predictionResult;
  const isCyclone = isCompleted && predictionResult.is_cyclone;

  return (
    <div className="glass-panel p-5 sm:p-6 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-100 text-sky-700">
            <Target size={18} className="shrink-0" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            Detection Result <span className="text-xs font-semibold text-sky-600">(Objective 1)</span>
          </h3>
        </div>
        {isCompleted && (
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
            isCyclone 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
              : 'bg-slate-50 text-slate-700 border-slate-200'
          }`}>
            {isCyclone ? 'Active Cyclone' : 'No Threat'}
          </span>
        )}
      </div>

      {/* Main Detection Body */}
      {isCompleted ? (
        <div className="space-y-3">
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
            isCyclone 
              ? 'bg-emerald-50/70 border-emerald-200/80 shadow-xs' 
              : 'bg-slate-50 border-slate-200 shadow-xs'
          }`}>
            {/* Left Content */}
            <div className="flex items-center gap-3.5 w-full sm:w-auto">
              <div className={`p-2.5 rounded-2xl shrink-0 ${
                isCyclone ? 'bg-emerald-100/90 text-emerald-600' : 'bg-slate-200 text-slate-600'
              }`}>
                {isCyclone ? (
                  <CycloneSwirlIcon className="w-10 h-10 animate-spin" style={{ animationDuration: '10s' }} />
                ) : (
                  <ShieldCheck size={36} />
                )}
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className={`text-lg sm:text-xl font-extrabold ${
                    isCyclone ? 'text-emerald-950' : 'text-slate-800'
                  }`}>
                    {predictionResult.prediction}
                  </h4>
                  {isCyclone && <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />}
                </div>
                <p className="text-xs sm:text-sm font-bold text-slate-600 mt-0.5">
                  Confidence: <span className="text-emerald-700 font-extrabold text-base">{predictionResult.confidence_percent}%</span>
                </p>
              </div>
            </div>

            {/* Right Mini Earth Badge */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/90 border border-emerald-100 shadow-xs shrink-0">
              <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <Globe size={16} />
              </div>
              <div className="text-left">
                <p className="text-[10px] text-slate-400 font-medium">Status</p>
                <p className="text-xs font-bold text-emerald-700 leading-none">
                  {isCyclone ? 'Cyclone Detected' : 'Clear Area'}
                </p>
              </div>
            </div>
          </div>

          {/* Subtitle Explanatory Banner */}
          <div className="px-3.5 py-2 rounded-xl bg-sky-50/60 border border-sky-100 text-slate-600 text-xs flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
            <span>
              {isCyclone 
                ? 'The AI model has identified a tropical cyclone vortex in the satellite image.'
                : 'No tropical cyclone formations were identified in the satellite observation.'}
            </span>
          </div>
        </div>
      ) : (
        /* Waiting / Pending State */
        <div className="p-6 rounded-2xl bg-sky-50/40 border border-sky-100/80 flex flex-col items-center justify-center text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-sky-100 flex items-center justify-center text-sky-400">
            <Target size={24} />
          </div>
          <p className="text-sm font-bold text-slate-700">Awaiting Satellite Image Analysis</p>
          <p className="text-xs text-slate-500 max-w-xs">
            Upload and click "Analyze Image" to run AI-driven Objective 1 cyclone detection.
          </p>
        </div>
      )}
    </div>
  );
};

export default DetectionResult;
