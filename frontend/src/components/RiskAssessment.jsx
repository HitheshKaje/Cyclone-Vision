import React from 'react';
import { AlertTriangle, MapPin, Shield } from 'lucide-react';

const RiskAssessment = () => {
  return (
    <div className="glass-panel p-6">
      <div className="flex items-center gap-2 mb-6">
        <AlertTriangle size={20} className="text-orange-400" />
        <h2 className="text-lg font-semibold text-slate-200">Coastal Risk Assessment</h2>
      </div>

      <div className="bg-navy-900/50 border border-slate-700/50 rounded-xl p-5 mb-4 text-center">
        <p className="text-slate-500 font-medium">No risk assessment available</p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-navy-800/30 border border-slate-700/30">
          <div className="bg-navy-900 p-2 rounded-lg text-slate-500">
            <AlertTriangle size={16} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Risk Level</p>
            <p className="text-sm font-medium text-slate-600">Unknown</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 p-3 rounded-lg bg-navy-800/30 border border-slate-700/30">
          <div className="bg-navy-900 p-2 rounded-lg text-slate-500">
            <MapPin size={16} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Affected Coastal Region</p>
            <p className="text-sm font-medium text-slate-600">--</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-navy-800/30 border border-slate-700/30">
          <div className="bg-navy-900 p-2 rounded-lg text-slate-500">
            <Shield size={16} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Safety Status</p>
            <p className="text-sm font-medium text-slate-600">Awaiting Data</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskAssessment;
