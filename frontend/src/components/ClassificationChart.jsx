import React from 'react';
import { BarChart3 } from 'lucide-react';

const categories = [
  { label: 'TD', name: 'Tropical Depression' },
  { label: 'TS', name: 'Tropical Storm' },
  { label: 'STS', name: 'Severe Tropical Storm' },
  { label: 'TY', name: 'Typhoon' },
  { label: 'STY', name: 'Severe Typhoon' },
  { label: 'SuperTY', name: 'Super Typhoon' }
];

const ClassificationChart = () => {
  return (
    <div className="glass-panel p-6">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 size={20} className="text-cyan-400" />
        <h2 className="text-lg font-semibold text-slate-200">Cyclone Classification</h2>
      </div>

      <div className="space-y-4">
        {categories.map((cat, index) => (
          <div key={index} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-slate-400 w-16">{cat.label}</span>
              <span className="text-slate-500 hidden sm:inline">{cat.name}</span>
              <span className="text-slate-600">0%</span>
            </div>
            <div className="h-2 w-full bg-navy-900 rounded-full overflow-hidden border border-slate-800">
              <div 
                className="h-full bg-cyan-500/0 transition-all duration-1000 ease-out" 
                style={{ width: '0%' }}
              />
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 pt-4 border-t border-slate-700/50 flex justify-center">
        <p className="text-xs text-slate-500">Awaiting probabilistic model output</p>
      </div>
    </div>
  );
};

export default ClassificationChart;
