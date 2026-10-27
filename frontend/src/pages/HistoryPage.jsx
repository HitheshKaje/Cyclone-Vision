import React, { useState } from 'react';
import { 
  History, 
  Eye, 
  ArrowRight, 
  Trash2, 
  RefreshCw, 
  Database, 
  RotateCcw,
  MapPin,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { 
  deleteAnalysisRecord, 
  clearAllAnalysisRecords, 
  resetSeedAnalyses, 
  fetchAnalysisHistory 
} from '../utils/analysisApi';

const HistoryPage = ({
  analysisHistory = [],
  setAnalysisHistory,
  setCurrentAnalysis,
  setActiveTab
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  const handleSelectRecord = (record) => {
    setCurrentAnalysis(record);
    setActiveTab('results');
  };

  const handleRefresh = async () => {
    setIsSyncing(true);
    const res = await fetchAnalysisHistory();
    if (res.success && res.records && setAnalysisHistory) {
      setAnalysisHistory(res.records);
      showNotification('Synced live records from MongoDB');
    }
    setIsSyncing(false);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this scan record permanently from MongoDB?')) return;
    
    if (setAnalysisHistory) {
      setAnalysisHistory(prev => prev.filter(r => r.id !== id));
    }
    const res = await deleteAnalysisRecord(id);
    if (res.success) {
      showNotification('Record deleted from MongoDB');
    }
  };

  const handleClearAll = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 4000);
      return;
    }
    
    if (setAnalysisHistory) {
      setAnalysisHistory([]);
    }
    setConfirmClear(false);
    const res = await clearAllAnalysisRecords();
    if (res.success) {
      showNotification('All analysis records cleared from MongoDB');
    }
  };

  const handleResetSeed = async () => {
    if (!window.confirm('Reset and reload verified baseline cyclone satellite scans into MongoDB?')) return;
    setIsSyncing(true);
    const res = await resetSeedAnalyses();
    if (res.success) {
      const hist = await fetchAnalysisHistory();
      if (hist.success && hist.records && setAnalysisHistory) {
        setAnalysisHistory(hist.records);
      }
      showNotification('Baseline satellite observations re-seeded into MongoDB');
    }
    setIsSyncing(false);
  };

  const showNotification = (msg) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 3500);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/50 dark:border-slate-700/50">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Analysis History
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>MongoDB Dynamic</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Live satellite scans and AI inference records persisted in MongoDB
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={handleRefresh}
            title="Refresh from MongoDB"
            className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-sky-500 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <RefreshCw size={13} className={isSyncing ? 'animate-spin text-sky-500' : ''} />
            <span>Sync DB</span>
          </button>

          <button
            onClick={handleResetSeed}
            title="Reload verified baseline cyclone observations"
            className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-emerald-500 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <RotateCcw size={13} />
            <span className="hidden md:inline">Reset Baseline Data</span>
          </button>

          {analysisHistory.length > 0 && (
            <button
              onClick={handleClearAll}
              title="Delete all records from MongoDB"
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs border ${
                confirmClear 
                  ? 'bg-red-500 text-white border-red-600 animate-pulse' 
                  : 'bg-white dark:bg-slate-800 text-red-500 border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-950/20'
              }`}
            >
              <Trash2 size={13} />
              <span>{confirmClear ? 'Click again to confirm' : 'Clear All'}</span>
            </button>
          )}

          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
            {analysisHistory.length} {analysisHistory.length === 1 ? 'Record' : 'Records'}
          </span>
        </div>
      </div>

      {/* Action Notification Toast */}
      {actionMessage && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 size={15} />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* 2. Table / Clean Empty State */}
      <div className="app-card p-5 sm:p-6 flex flex-col justify-between">
        {analysisHistory.length === 0 ? (
          <div className="min-h-[340px] flex flex-col items-center justify-center p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-center text-slate-600 dark:text-slate-400 mb-1">
              <History size={26} />
            </div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              No analysis records in MongoDB
            </h3>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              Upload and analyze satellite imagery in the Analyze tab, or click "Reset Baseline Data" to load verified historical cyclone scans.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={() => setActiveTab('analyze')}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Analyze New Image</span>
                <ArrowRight size={14} />
              </button>
              <button
                onClick={handleResetSeed}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-300 dark:border-slate-700"
              >
                <RotateCcw size={14} />
                <span>Load Baseline Scans</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/50 dark:border-slate-700/50 text-slate-500 font-semibold uppercase tracking-wider text-[11px] bg-slate-100/80 dark:bg-slate-800/80">
                  <th className="py-3 px-3">Date / Time</th>
                  <th className="py-3 px-3">Scan / File</th>
                  <th className="py-3 px-3">Detection</th>
                  <th className="py-3 px-3">Confidence</th>
                  <th className="py-3 px-3">Intensity (Wind)</th>
                  <th className="py-3 px-3">Classification</th>
                  <th className="py-3 px-3">Location</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {analysisHistory.map((item) => {
                  const isCyclone = item.detection?.is_cyclone;
                  const conf = item.detection?.confidence_percent;
                  const wind = item.intensity?.wind_speed_kt;
                  const classification = item.classification?.classification || item.intensity?.classification;
                  const locationStr = item.latitude != null && item.longitude != null 
                    ? `${item.latitude.toFixed(2)}°N, ${item.longitude.toFixed(2)}°E` 
                    : (item.subbasin || '—');

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">
                        {item.timestamp || 'Recent'}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          {item.imagePreview ? (
                            <img 
                              src={item.imagePreview} 
                              alt="Thumbnail" 
                              className="w-9 h-9 rounded-md object-contain bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 text-[10px] shrink-0 font-bold">
                              SAT
                            </div>
                          )}
                          <div className="max-w-[140px] truncate" title={item.fileName}>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{item.fileName || 'scan.jpg'}</p>
                            <p className="text-[10px] text-slate-400 truncate">{item.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                          isCyclone 
                            ? 'bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/20' 
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        }`}>
                          {isCyclone ? 'Cyclone Detected' : 'No Cyclone'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                        {conf != null ? `${Number(conf).toFixed(1)}%` : '—'}
                      </td>
                      <td className="py-3 px-3 text-slate-800 dark:text-slate-200 font-medium">
                        {wind != null ? (
                          <span>{wind} kt <span className="text-[10px] text-slate-400">({Math.round(wind * 1.852)} km/h)</span></span>
                        ) : (isCyclone === false ? 'N/A' : '—')}
                      </td>
                      <td className="py-3 px-3">
                        {classification ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            classification === 'SEVERE'
                              ? 'bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/20'
                              : classification === 'MEDIUM'
                              ? 'bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          }`}>
                            {classification}
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            {isCyclone === false ? 'N/A' : '—'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1">
                          <MapPin size={11} className="text-slate-400 shrink-0" />
                          <span className="truncate max-w-[120px]">{locationStr}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleSelectRecord(item)}
                            className="px-2.5 py-1 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30 rounded-md transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="View analysis details in Results page"
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </button>

                          <button
                            onClick={(e) => handleDelete(item.id, e)}
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors cursor-pointer"
                            title="Delete permanently from MongoDB"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
