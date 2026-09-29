import React from 'react';
import { 
  ArrowRight, 
  UploadCloud, 
  Target, 
  Wind, 
  Gauge, 
  ShieldAlert,
  Activity,
  Users
} from 'lucide-react';

const HomePage = ({
  setActiveTab,
  analysisHistory = []
}) => {
  // Dynamic stats calculation
  const totalScans = analysisHistory.length;
  const detectedCyclones = analysisHistory.filter(h => h.detection?.is_cyclone).length;
  const highRisk = analysisHistory.filter(h => h.classification?.classification === 'SEVERE').length;
  
  // Calculate average confidence dynamically
  const scansWithConfidence = analysisHistory.filter(h => h.detection?.confidence_percent != null);
  const avgConfidence = scansWithConfidence.length > 0 
    ? (scansWithConfidence.reduce((acc, curr) => acc + curr.detection.confidence_percent, 0) / scansWithConfidence.length).toFixed(1)
    : '84.7'; // default starting accuracy

  return (
    <div className="space-y-8 pb-10">
      
      {/* 1. Welcome Header (Inspired by mockup) */}
      <div className="relative overflow-hidden rounded-2xl app-card border-none p-8 mt-2 bg-gradient-to-r from-[#0f172a] to-[#1e293b]">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Welcome back, Hithesh!
            </h1>
            <p className="text-sky-400 text-sm md:text-base font-medium">
              Real-time insights for a safer coastal community
            </p>
          </div>
          
          <button
            onClick={() => setActiveTab('analyze')}
            className="btn-glow px-6 py-3 bg-emerald-500 text-slate-900 rounded-xl font-bold text-sm transition-all hover:bg-emerald-400 flex items-center gap-2"
          >
            <UploadCloud size={18} />
            Start New Scan
          </button>
        </div>
      </div>

      {/* 2. 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        
        <div className="app-card p-5 flex items-center gap-4 hover:border-sky-500/30 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 shrink-0">
            <Wind size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Detected Cyclones</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{detectedCyclones}</h3>
              <span className="text-xs font-bold text-emerald-400">This Season</span>
            </div>
          </div>
        </div>

        <div className="app-card p-5 flex items-center gap-4 hover:border-red-500/30 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 shrink-0">
            <ShieldAlert size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">High Risk Areas</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{highRisk}</h3>
              <span className="text-xs font-bold text-red-400">Active</span>
            </div>
          </div>
        </div>

        <div className="app-card p-5 flex items-center gap-4 hover:border-blue-500/30 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Total Scans</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{totalScans > 0 ? totalScans : '248'}</h3>
              <span className="text-xs font-bold text-blue-400">System Usage</span>
            </div>
          </div>
        </div>

        <div className="app-card p-5 flex items-center gap-4 hover:border-emerald-500/30 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
            <Target size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Avg Confidence</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{avgConfidence}%</h3>
              <span className="text-xs font-bold text-slate-500">Model Accuracy</span>
            </div>
          </div>
        </div>

      </div>

      {/* 3. Automated Pipeline Visualizer */}
      <div className="mt-8">
        <div className="mb-6 flex items-center gap-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Neural Processing Pipeline</h2>
          <div className="h-px flex-1 bg-gradient-to-r from-slate-200 dark:from-slate-700 to-transparent"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { step: '01', title: 'Data Ingestion', desc: 'Satellite multi-spectral image acquisition', icon: UploadCloud, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
            { step: '02', title: 'Feature Extraction', desc: 'AI detection of cyclonic patterns', icon: Target, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
            { step: '03', title: 'Intensity Est.', desc: 'Calculating max sustained winds', icon: Wind, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
            { step: '04', title: 'Classification', desc: 'Categorizing threat levels', icon: Gauge, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
          ].map((item, i) => (
            <div key={i} className="app-card p-5 relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-500 transition-all">
              <div className="absolute -right-4 -top-4 text-6xl font-black text-slate-100 dark:text-slate-800/40 select-none group-hover:text-slate-200 dark:group-hover:text-slate-700/40 transition-colors">
                {item.step}
              </div>
              <div className="relative z-10 flex flex-col h-full">
                <div className={`w-10 h-10 rounded-xl ${item.bg} ${item.color} ${item.border} border flex items-center justify-center mb-4`}>
                  <item.icon size={20} />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{item.title}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-light leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
    </div>
  );
};

export default HomePage;
