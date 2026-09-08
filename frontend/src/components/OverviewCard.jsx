import React from 'react';
import { HelpCircle } from 'lucide-react';

const OverviewCard = ({ title, icon: Icon, value, subtitle }) => {
  return (
    <div className="glass-panel p-4 sm:p-5 flex flex-col gap-2 sm:gap-3">
      <div className="flex justify-between items-center text-slate-400">
        <div className="flex items-center gap-2">
          <Icon size={18} className="text-cyan-500/70 shrink-0" />
          <h3 className="font-medium text-xs sm:text-sm tracking-wide">{title}</h3>
        </div>
        <HelpCircle size={14} className="opacity-50 cursor-help hover:opacity-100 transition-opacity shrink-0" />
      </div>
      
      <div>
        <p className="text-xl sm:text-2xl font-bold text-slate-500">{value}</p>
        <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1">{subtitle}</p>
      </div>
    </div>
  );
};

export default OverviewCard;
