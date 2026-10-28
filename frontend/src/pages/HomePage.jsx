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
  Layers,
  Volume2,
  VolumeX,
  Loader2
} from 'lucide-react';
import { fetchAnalysisStats } from '../utils/analysisApi';
import { fetchOfficialAdvisories, toggleLighthouseSiren } from '../citizen/services/citizenApi';

const HomePage = ({
  setActiveTab,
  analysisHistory = [],
  adminUser = null
}) => {
  const [liveStats, setLiveStats] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const [sirenActive, setSirenActive] = useState(false);
  const [sirenLoading, setSirenLoading] = useState(false);
  const [sirenToast, setSirenToast] = useState('');

  // Poll siren state and listen to local toggle events
  useEffect(() => {
    let isMounted = true;
    const checkSiren = async () => {
      try {
        const res = await fetchOfficialAdvisories();
        if (isMounted && res.success && res.data) {
          setSirenActive(res.data.siren_active === true);
        }
      } catch (_) {}
    };

    checkSiren();
    const interval = setInterval(checkSiren, 2500);

    const handleSirenEvent = (e) => {
      if (e.detail?.siren_active !== undefined) {
        setSirenActive(e.detail.siren_active === true);
      }
    };
    window.addEventListener('cyclosafe_siren_toggled', handleSirenEvent);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('cyclosafe_siren_toggled', handleSirenEvent);
    };
  }, []);

  // Action: Turn off user siren
  const handleTurnOffSiren = async () => {
    setSirenLoading(true);
    try {
      const res = await toggleLighthouseSiren(false);
      if (res.success) {
        setSirenActive(false);
        setSirenToast('User Dashboard Siren Silenced');
        setTimeout(() => setSirenToast(''), 3500);
        window.dispatchEvent(new CustomEvent('cyclosafe_siren_toggled', { detail: { siren_active: false } }));
      }
    } catch (err) {
      console.error('Failed to silence user siren:', err);
    } finally {
      setSirenLoading(false);
    }
  };

  // Action: Test/Sound user siren
  const handleTriggerSiren = async () => {
    if (!window.confirm('Sound the emergency siren on Citizen Dashboards and coastal stations?')) return;
    setSirenLoading(true);
    try {
      const res = await toggleLighthouseSiren(true);
      if (res.success) {
        setSirenActive(true);
        setSirenToast('Emergency Siren Activated on User Dashboards');
        setTimeout(() => setSirenToast(''), 3500);
        window.dispatchEvent(new CustomEvent('cyclosafe_siren_toggled', { detail: { siren_active: true } }));
      }
    } catch (err) {
      console.error('Failed to sound user siren:', err);
    } finally {
      setSirenLoading(false);
    }
  };

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

      {/* Siren Feedback Toast */}
      {sirenToast && (
        <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-600 dark:text-sky-400 text-xs font-bold flex items-center justify-between">
          <span>{sirenToast}</span>
        </div>
      )}

      {/* User Dashboard Siren Direct Admin Control Card */}
      {sirenActive ? (
        <div className="relative overflow-hidden rounded-2xl p-4 sm:p-5 border-2 border-red-500/50 bg-gradient-to-r from-red-500/15 via-rose-500/10 to-red-500/15 dark:from-red-950/40 dark:via-rose-900/30 dark:to-red-950/40 shadow-lg animate-pulse flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <Volume2 size={24} className="animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white">
                  EMERGENCY ACTIVE
                </span>
                <span className="text-xs font-bold text-red-600 dark:text-red-400">
                  Coastal Siren Sounding on Citizen User Dashboard
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                The emergency acoustic alarm is currently playing on all citizen mobile dashboards and coastal lighthouse stations.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleTurnOffSiren}
            disabled={sirenLoading}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all shrink-0"
          >
            {sirenLoading ? <Loader2 size={16} className="animate-spin" /> : <VolumeX size={16} />}
            <span>Turn OFF User Siren Now</span>
          </button>
        </div>
      ) : (
        <div className="rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <Volume2 size={16} />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                User Dashboard Emergency Siren: <span className="text-emerald-600 dark:text-emerald-400 font-black">STANDBY (OFF)</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Citizen mobile phones and coastal foghorns are silent.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleTurnOffSiren}
              disabled={sirenLoading}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
              title="Force silence on all citizen user dashboards"
            >
              <VolumeX size={13} className="inline mr-1" />
              <span>Ensure Siren OFF</span>
            </button>
            <button
              type="button"
              onClick={handleTriggerSiren}
              disabled={sirenLoading}
              className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-bold cursor-pointer transition-colors"
              title="Test citizen acoustic emergency siren"
            >
              <span>🚨 Test Siren Drill</span>
            </button>
          </div>
        </div>
      )}

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
