import React from 'react';
import { Calendar, TrendingUp, AlertCircle, BarChart2 } from 'lucide-react';

const SevenDaysPrediction = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="text-emerald-500" />
            7-Day Prediction
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Advanced cyclone track and intensity forecasting
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trajectory Prediction Chart */}
        <div className="lg:col-span-2 app-card p-6 flex flex-col min-h-[450px]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <TrendingUp size={20} className="text-emerald-500" />
              Forecasted Intensity Graph
            </h2>
            <div className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              Training State
            </div>
          </div>
          
          <div className="flex-1 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/20 flex flex-col items-center justify-center p-8 relative overflow-hidden">
            {/* Grid lines background decoration */}
            <div className="absolute inset-0 flex flex-col justify-between py-4 opacity-[0.05] pointer-events-none">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="w-full border-b border-slate-900 dark:border-white"></div>
              ))}
            </div>
            <div className="absolute inset-0 flex justify-between px-4 opacity-[0.05] pointer-events-none">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-full border-r border-slate-900 dark:border-white"></div>
              ))}
            </div>
            
            <div className="relative z-10 flex flex-col items-center text-center bg-white/80 dark:bg-[#1e293b]/80 p-6 rounded-2xl backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 shadow-sm max-w-sm">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 text-emerald-400">
                <BarChart2 size={32} />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-2">Model Training in Progress</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                The 7-day predictive model is currently being trained. Once complete, interactive forecasting charts and trajectory paths will appear here.
              </p>
            </div>
          </div>
        </div>

        {/* Side Panel Info */}
        <div className="space-y-6">
          <div className="app-card p-6">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-5 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Upcoming Features
            </h2>
            <ul className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 mt-0.5 font-medium text-xs">
                  1
                </div>
                <span>7-day track forecasting with probability cones</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 font-medium text-xs">
                  2
                </div>
                <span>Wind speed intensity progression charts over time</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5 font-medium text-xs">
                  3
                </div>
                <span>Landfall impact estimation and risk assessment</span>
              </li>
            </ul>
          </div>
          
          <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-500/20 flex items-start gap-3 text-sky-800 dark:text-sky-300 text-sm shadow-sm">
            <AlertCircle size={18} className="shrink-0 mt-0.5 text-sky-500" />
            <p className="leading-relaxed">
              Data integration with Global Forecast System (GFS) is pending model validation. Check back after training.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SevenDaysPrediction;
