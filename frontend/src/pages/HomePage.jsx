import React, { useState, useEffect, useCallback } from 'react';
import { 
  ArrowRight, 
  UploadCloud, 
  Target, 
  Wind, 
  Gauge, 
  ShieldAlert,
  Activity,
  Database,
  RefreshCw,
  Clock,
  Sparkles,
  Layers
} from 'lucide-react';
import { fetchAnalysisStats } from '../utils/analysisApi';

const HomePage = ({
  setActiveTab,
  analysisHistory = [],
  adminUser = null
}) => {
  const [liveStats, setLiveStats] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);

  // Load real-time stats directly from MongoDB cyclosafe.analyses
  const loadStats = useCallback(async () => {
    setIsRefreshing(true);
    const res = await fetchAnalysisStats();
    if (res.success && res.data) {
      setLiveStats(res.data);
      setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats, analysisHistory.length]);

  // Dynamic calculations: Priority to direct MongoDB aggregated stats, with fallback to active session records
  const totalScans = liveStats?.total_scans ?? analysisHistory.length;
  const detectedCyclones = liveStats?.detected_cyclones ?? analysisHistory.filter(h => h.detection?.is_cyclone).length;
  const highRisk = liveStats?.high_risk_areas ?? analysisHistory.filter(h => h.classification?.classification === 'SEVERE').length;

  const scansWithConfidence = analysisHistory.filter(h => h.detection?.confidence_percent != null);
  const fallbackConfidence = scansWithConfidence.length > 0 
    ? (scansWithConfidence.reduce((acc, curr) => acc + curr.detection.confidence_percent, 0) / scansWithConfidence.length).toFixed(1)
    : '0.0';

  const avgConfidence = liveStats?.avg_confidence != null 
    ? Number(liveStats.avg_confidence).toFixed(1) 
    : fallbackConfidence;

  const displayName = adminUser?.name || 'Hithesh';

  return (
    <div className="space-y-8 pb-10">
      
      {/* 1. Welcome Header with Live MongoDB Status */}
      <div className="relative overflow-hidden rounded-2xl p-8 mt-2 border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-sky-50 via-white to-emerald-50 dark:from-[#0f172a] dark:via-slate-900 dark:to-[#1e293b] shadow-xs">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Welcome back, {displayName}!
              </h1>
              {/* Direct MongoDB Live Connection Pill */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>MongoDB Live</span>
              </div>
            </div>
            <p className="text-sky-600 dark:text-sky-400 text-sm md:text-base font-semibold">
              Real-time AI telemetry & early warning command center
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={loadStats}
              title="Refresh live stats from MongoDB"
              className="p-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:text-sky-500 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin text-sky-500' : ''} />
              <span className="hidden sm:inline">Sync DB</span>
            </button>

            <button
              onClick={() => setActiveTab('analyze')}
              className="btn-glow px-6 py-3 bg-emerald-500 text-slate-900 rounded-xl font-bold text-sm transition-all hover:bg-emerald-400 flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <UploadCloud size={18} />
              Start New Scan
            </button>
          </div>
        </div>

        {/* Sync Info Bar */}
        {lastSynced && (
          <div className="relative z-10 mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
            <Database size={13} className="text-emerald-500" />
            <span>Connected to MongoDB database: <strong className="text-slate-700 dark:text-slate-300 font-medium">cyclosafe.analyses</strong></span>
            <span className="mx-1">•</span>
            <Clock size={12} />
            <span>Last synced at {lastSynced}</span>
          </div>
        )}
      </div>

      {/* 2. 4 Dynamic Stat Cards (Driven directly by MongoDB) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        
        {/* Card 1: Detected Cyclones */}
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

        {/* Card 2: High Risk Areas */}
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

        {/* Card 3: Total Scans */}
        <div className="app-card p-5 flex items-center gap-4 hover:border-blue-500/30 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Total Scans</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{totalScans}</h3>
              <span className="text-xs font-bold text-blue-400">System Usage</span>
            </div>
          </div>
        </div>

        {/* Card 4: Avg Confidence */}
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
