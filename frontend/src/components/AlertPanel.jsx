import React from 'react';
import { BellRing, CheckCircle } from 'lucide-react';

const AlertPanel = () => {
  return (
    <div className="glass-panel p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 sm:mb-6">
        <div className="flex items-center gap-2">
          <BellRing size={20} className="text-cyan-400 shrink-0" />
          <h2 className="text-base sm:text-lg font-semibold text-slate-200">Alert Notifications</h2>
        </div>
        <span className="bg-slate-800 text-slate-400 text-xs px-2 py-1 rounded-full border border-slate-700">0 Active</span>
      </div>

      <div className="flex flex-col items-center justify-center p-6 sm:p-8 text-center border-2 border-dashed border-slate-700/50 rounded-xl bg-navy-900/30 mx-2 sm:mx-0">
        <CheckCircle size={32} className="text-slate-600 mb-2 sm:mb-3" />
        <p className="text-slate-400 font-medium text-sm sm:text-base">No active alerts</p>
        <p className="text-[10px] sm:text-xs text-slate-500 mt-1 max-w-[250px]">System is monitoring for cyclone threats. Alerts will appear here.</p>
      </div>
    </div>
  );
};

export default AlertPanel;
