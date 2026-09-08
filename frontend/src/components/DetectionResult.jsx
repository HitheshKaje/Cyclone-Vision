import React from 'react';
import { Target, Maximize, AlertCircle } from 'lucide-react';

const DetectionResult = () => {
  return (
    <div className="glass-panel p-6">
      <div className="flex items-center gap-2 mb-6">
        <Target size={20} className="text-cyan-400" />
        <h2 className="text-lg font-semibold text-slate-200">Cyclone Detection</h2>
      </div>

      <div className="space-y-4">
        <div className="p-4 rounded-lg border border-slate-700/50 bg-navy-900/50 flex items-start gap-3">
          <AlertCircle size={20} className="text-slate-500 mt-0.5" />
          <div>
            <p className="text-slate-300 font-medium">Status</p>
            <p className="text-slate-500 text-sm mt-1">No analysis performed</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg border border-slate-700/50 bg-navy-900/50">
            <p className="text-xs text-slate-400 mb-1">Confidence Score</p>
            <p className="text-lg font-semibold text-slate-600">--%</p>
          </div>
          <div className="p-3 rounded-lg border border-slate-700/50 bg-navy-900/50">
            <p className="text-xs text-slate-400 mb-1">Detected Location</p>
            <p className="text-lg font-semibold text-slate-600">--</p>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-slate-700/50 bg-navy-900/50 flex justify-between items-center">
          <div>
            <p className="text-xs text-slate-400 mb-1">Bounding Box</p>
            <p className="text-sm font-medium text-slate-600">N/A</p>
          </div>
          <Maximize size={16} className="text-slate-600" />
        </div>
      </div>
    </div>
  );
};

export default DetectionResult;
