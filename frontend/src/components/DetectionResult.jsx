import React from 'react';
import { Target, Maximize, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

const DetectionResult = ({ predictionResult, analysisStatus }) => {
  return (
    <div className="glass-panel p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4 sm:mb-6">
        <Target size={20} className="text-cyan-400 shrink-0" />
        <h2 className="text-base sm:text-lg font-semibold text-slate-200">Cyclone Detection</h2>
      </div>

      <div className="space-y-4">
        <div className={`p-4 rounded-lg border flex items-start gap-3 ${
            analysisStatus === 'Completed' ? (predictionResult?.is_cyclone ? 'border-red-500/50 bg-red-900/20' : 'border-green-500/50 bg-green-900/20')
            : 'border-slate-700/50 bg-navy-900/50'
          }`}>
          {analysisStatus === 'Completed' ? (
            predictionResult?.is_cyclone ? <AlertCircle size={20} className="text-red-500 mt-0.5 shrink-0" /> : <CheckCircle size={20} className="text-green-500 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle size={20} className="text-slate-500 mt-0.5 shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-slate-300 font-medium">Status</p>
            <p className={`text-sm mt-1 truncate font-semibold ${
                analysisStatus === 'Completed' ? (predictionResult?.is_cyclone ? 'text-red-400' : 'text-green-400') : 'text-slate-500 text-xs sm:text-sm'
              }`}>
              {analysisStatus === 'Completed' && predictionResult ? predictionResult.prediction : 'No analysis performed'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="p-3 rounded-lg border border-slate-700/50 bg-navy-900/50">
            <p className="text-xs text-slate-400 mb-1">Confidence Score</p>
            <p className="text-lg font-semibold text-slate-200">
              {analysisStatus === 'Completed' && predictionResult ? `${predictionResult.confidence_percent}%` : '--%'}
            </p>
          </div>
          <div className="p-3 rounded-lg border border-slate-700/50 bg-navy-900/50">
            <p className="text-xs text-slate-400 mb-1">Detected Location</p>
            <p className="text-sm font-medium text-slate-500 mt-1">Not available yet — Intensity module pending</p>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-slate-700/50 bg-navy-900/50 flex justify-between items-center">
          <div>
            <p className="text-xs text-slate-400 mb-1">Bounding Box</p>
            <p className="text-sm font-medium text-slate-500">Not available yet — Intensity module pending</p>
          </div>
          <Maximize size={16} className="text-slate-600" />
        </div>
      </div>
    </div>
  );
};

export default DetectionResult;
