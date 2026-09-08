import React from 'react';
import { Activity, Wind, Zap } from 'lucide-react';

const IntensityCard = () => {
  return (
    <div className="glass-panel p-6">
      <div className="flex items-center gap-2 mb-6">
        <Activity size={20} className="text-cyan-400" />
        <h2 className="text-lg font-semibold text-slate-200">Intensity Estimation</h2>
      </div>

      <div className="space-y-4">
        <div className="p-4 rounded-lg border border-slate-700/50 bg-navy-900/50 flex items-center justify-center py-8">
          <p className="text-slate-500 font-medium text-lg">Waiting for model output</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg border border-slate-700/50 bg-navy-900/50">
            <div className="flex items-center gap-2 mb-1">
              <Wind size={14} className="text-slate-500" />
              <p className="text-xs text-slate-400">Est. Wind Speed</p>
            </div>
            <p className="text-xl font-bold text-slate-600">-- <span className="text-sm font-normal text-slate-600">knots</span></p>
          </div>
          
          <div className="p-3 rounded-lg border border-slate-700/50 bg-navy-900/50">
            <div className="flex items-center gap-2 mb-1">
              <Zap size={14} className="text-slate-500" />
              <p className="text-xs text-slate-400">Confidence</p>
            </div>
            <p className="text-xl font-bold text-slate-600">--%</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntensityCard;
