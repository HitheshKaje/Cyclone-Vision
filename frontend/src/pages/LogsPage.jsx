import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ShieldAlert, Activity, CheckCircle2, AlertTriangle, XCircle, 
  Search, Download, Trash2, Radio, Server, Cpu, RefreshCw, 
  Filter, FileText, ArrowUpDown, ChevronDown, ChevronRight,
  Send, Compass, Terminal, Shield, Eye, ArrowRight, Check
} from 'lucide-react';
import { getSystemLogs, clearSystemLogs, addSystemLog, logAnalysisEvent } from '../utils/auditLogger';
import { getApiBaseUrl } from '../utils/apiConfig';

const LogsPage = ({ currentAnalysis, analysisHistory = [], setActiveTab }) => {
  const [logs, setLogs] = useState(() => getSystemLogs());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('ALL');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [selectedPayload, setSelectedPayload] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync logs from storage
  const syncLogs = useCallback(() => {
    let currentLogs = getSystemLogs();

    // If local storage is empty but session has real analysisHistory, backfill genuine logs
    if (currentLogs.length === 0 && analysisHistory.length > 0) {
      analysisHistory.forEach(record => {
        logAnalysisEvent(record);
      });
      currentLogs = getSystemLogs();
    }

    setLogs(currentLogs);
  }, [analysisHistory]);

  // Initial load & listen for real-time log events
  useEffect(() => {
    syncLogs();

    const handleNewLog = () => {
      setLogs(getSystemLogs());
    };

    const handleCleared = () => {
      setLogs([]);
    };

    window.addEventListener('cyclosafe_new_log', handleNewLog);
    window.addEventListener('cyclosafe_logs_cleared', handleCleared);

    return () => {
      window.removeEventListener('cyclosafe_new_log', handleNewLog);
      window.removeEventListener('cyclosafe_logs_cleared', handleCleared);
    };
  }, [syncLogs]);

  // Manually refresh and check backend status
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/citizen/alerts`).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        if (data && data.active) {
          // If there is an active broadcast not yet in logs, record it
          const existing = getSystemLogs();
          const hasLogged = existing.some(l => l.payload?.broadcast_id === data.issued_at || l.event?.includes('Coastal Emergency Alert'));
          if (!hasLogged) {
            addSystemLog({
              module: 'Broadcast-Service',
              level: data.level === 'RED' ? 'WARNING' : 'INFO',
              event: `Coastal Warning Active: ${data.level} ALERT`,
              details: `Active broadcast for ${data.cyclone_name || 'monitored cyclone'} | Sector: ${data.area || 'Coastal Waters'} | Siren: ${data.siren_active ? 'ENABLED' : 'STANDBY'}`,
              payload: data
            });
          }
        }
      }
    } catch (_) {
      // Backend offline or unreachable
    } finally {
      syncLogs();
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Clear all logs
  const handleClearLogs = () => {
    clearSystemLogs();
    setLogs([]);
    setShowClearConfirm(false);
    setSelectedPayload(null);
    setExpandedLogId(null);
  };

  // Filter logs based on search query, severity level, and module
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesLevel = selectedLevel === 'ALL' || log.level === selectedLevel;
      const matchesModule = selectedModule === 'ALL' || log.module === selectedModule;
      
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query || 
        log.id?.toLowerCase().includes(query) ||
        log.event?.toLowerCase().includes(query) ||
        log.module?.toLowerCase().includes(query) ||
        log.details?.toLowerCase().includes(query);

      return matchesLevel && matchesModule && matchesSearch;
    });
  }, [logs, searchQuery, selectedLevel, selectedModule]);

  // Dynamic statistics from real logs
  const stats = useMemo(() => {
    const total = logs.length;
    const successes = logs.filter(l => l.level === 'SUCCESS').length;
    const warnings = logs.filter(l => l.level === 'WARNING').length;
    const errors = logs.filter(l => l.level === 'ERROR').length;
    return { total, successes, warnings, errors };
  }, [logs]);

  // Export logs to CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['Log ID', 'Timestamp', 'Severity', 'Module', 'Event', 'Details'];
    const rows = filteredLogs.map(l => [
      l.id,
      new Date(l.timestamp).toLocaleString(),
      l.level,
      l.module,
      `"${(l.event || '').replace(/"/g, '""')}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cyclosafe_system_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export logs to JSON
  const handleExportJSON = () => {
    if (filteredLogs.length === 0) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `cyclosafe_system_logs_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const getLevelBadgeClass = (level) => {
    switch (level) {
      case 'SUCCESS':
        return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'INFO':
        return 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30';
      case 'WARNING':
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'ERROR':
        return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="space-y-5 pb-12 animate-in fade-in duration-300">
      
      {/* 1. Header & Operational Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-500 border border-sky-500/20">
              <ShieldAlert size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                System Audit & Telemetry Logs
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time operational records for AI model inferences, coastal siren triggers, and API telemetry
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons: Refresh, Clear, Export */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh and sync operational logs"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-sky-500' : ''} />
            <span>Refresh</span>
          </button>

          {logs.length > 0 && (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-200 dark:border-rose-900/50 transition-colors cursor-pointer"
              title="Clear all recorded system logs"
            >
              <Trash2 size={14} />
              <span>Clear Logs</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="Download CSV log report"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportJSON}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="Download JSON log dump"
          >
            <FileText size={14} />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* 2. Dynamic Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        
        {/* Total Events */}
        <div className="app-card p-4 flex items-center gap-3.5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="p-3 rounded-xl bg-sky-500/10 text-sky-500">
            <Activity size={20} />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Events</div>
            <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
              {stats.total} {stats.total === 1 ? 'Log' : 'Logs'}
            </div>
          </div>
        </div>

        {/* AI Inferences */}
        <div className="app-card p-4 flex items-center gap-3.5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Successful Operations</div>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {stats.successes} Recorded
            </div>
          </div>
        </div>

        {/* Warnings & Advisories */}
        <div className="app-card p-4 flex items-center gap-3.5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
            <AlertTriangle size={20} />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Warnings & Alerts</div>
            <div className="text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">
              {stats.warnings} Flagged
            </div>
          </div>
        </div>

        {/* Errors / Anomaly */}
        <div className="app-card p-4 flex items-center gap-3.5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
            <Server size={20} />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">System Errors</div>
            <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
              {stats.errors} Errors
            </div>
          </div>
        </div>

      </div>

      {/* 3. Search & Filter Bar */}
      <div className="app-card p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search logs by cyclone name, module, event description, or ID..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Module Filter Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-500 hidden sm:inline-block">Module:</span>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
            >
              <option value="ALL">All Modules</option>
              <option value="AI-Detection">AI Detection</option>
              <option value="AI-Intensity">AI Intensity</option>
              <option value="Track-LSTM">Track Prediction (LSTM)</option>
              <option value="Broadcast-Service">Coastal Sirens & Broadcast</option>
              <option value="API-Gateway">API Gateway</option>
              <option value="System-Runtime">System Runtime</option>
            </select>
          </div>

        </div>

        {/* Severity Level Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-400 mr-1 uppercase tracking-wider text-[11px]">Severity:</span>
          
          {['ALL', 'SUCCESS', 'INFO', 'WARNING', 'ERROR'].map((lvl) => {
            const count = lvl === 'ALL' ? logs.length : logs.filter(l => l.level === lvl).length;
            const isActive = selectedLevel === lvl;
            return (
              <button
                key={lvl}
                type="button"
                onClick={() => setSelectedLevel(lvl)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-sky-500 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span>{lvl}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Logs Content: Empty State OR Live Table */}
      {logs.length === 0 ? (
        <div className="app-card rounded-2xl border border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-sm min-h-[380px]">
          <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500">
            <Terminal size={32} />
          </div>
          <div className="max-w-md space-y-1.5">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              No System Logs Recorded Yet
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Operational records and telemetry are captured dynamically when you upload and analyze satellite imagery, track trajectories, or dispatch coastal citizen warnings.
            </p>
          </div>
          {setActiveTab && (
            <button
              type="button"
              onClick={() => setActiveTab('analyze')}
              className="mt-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <span>Analyze Satellite Imagery</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      ) : (
        <div className="app-card rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              
              {/* Table Header */}
              <thead>
                <tr className="bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 w-28">Log ID</th>
                  <th className="py-3 px-4 w-44">Timestamp</th>
                  <th className="py-3 px-3 w-28 text-center">Severity</th>
                  <th className="py-3 px-3 w-36">Module</th>
                  <th className="py-3 px-4">Event Description</th>
                  <th className="py-3 px-4 text-right w-24">Payload</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Filter size={28} className="text-slate-300 dark:text-slate-600" />
                        <p className="font-semibold text-sm">No matching log entries found</p>
                        <p className="text-xs text-slate-400">Try modifying your search query or severity filter.</p>
                        <button
                          type="button"
                          onClick={() => { setSearchQuery(''); setSelectedLevel('ALL'); setSelectedModule('ALL'); }}
                          className="mt-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400 text-xs font-bold cursor-pointer"
                        >
                          Clear Filters
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    return (
                      <React.Fragment key={log.id}>
                        <tr 
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer ${
                            isExpanded ? 'bg-sky-500/5' : ''
                          }`}
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        >
                          {/* Log ID */}
                          <td className="py-3 px-4 font-mono font-bold text-sky-600 dark:text-sky-400 whitespace-nowrap">
                            {log.id}
                          </td>

                          {/* Timestamp */}
                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </td>

                          {/* Level Badge */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border ${getLevelBadgeClass(log.level)}`}>
                              {log.level}
                            </span>
                          </td>

                          {/* Module */}
                          <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] border border-slate-200 dark:border-slate-700">
                              {log.module}
                            </span>
                          </td>

                          {/* Event Description */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {log.event}
                            </div>
                            <div className="text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-xl">
                              {log.details}
                            </div>
                          </td>

                          {/* View JSON Action */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPayload({ id: log.id, event: log.event, payload: log.payload });
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sky-600 dark:text-sky-400 text-xs font-bold transition-colors cursor-pointer"
                            >
                              JSON
                            </button>
                          </td>
                        </tr>

                        {/* Expanded Inline Row Details */}
                        {isExpanded && (
                          <tr className="bg-slate-50/70 dark:bg-slate-800/30">
                            <td colSpan="6" className="py-3 px-6 text-xs text-slate-600 dark:text-slate-300">
                              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 font-mono text-[11px]">
                                <div><strong className="text-slate-800 dark:text-white">Details:</strong> {log.details}</div>
                                {log.payload && (
                                  <pre className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200 overflow-x-auto text-[11px] mt-2">
                                    {JSON.stringify(log.payload, null, 2)}
                                  </pre>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>

            </table>
          </div>

          {/* Table Footer */}
          <div className="p-3 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Showing {filteredLogs.length} of {logs.length} logged events</span>
            <span className="font-semibold">Local Audit Trail: Persistent Operational Storage</span>
          </div>
        </div>
      )}

      {/* 5. Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Clear System Logs?</h3>
                <p className="text-xs text-slate-500 mt-0.5">This action will erase all stored operational logs.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearLogs}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. JSON Payload Modal */}
      {selectedPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Terminal size={16} className="text-sky-500" />
                  <span>Log Telemetry Payload ({selectedPayload.id})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{selectedPayload.event}</p>
              </div>
              <button
                onClick={() => setSelectedPayload(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-base font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <pre className="p-3.5 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto max-h-[360px] border border-slate-800">
              {JSON.stringify(selectedPayload.payload || {}, null, 2)}
            </pre>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => copyToClipboard(JSON.stringify(selectedPayload.payload || {}, null, 2))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                {copiedPayload ? <Check size={14} className="text-emerald-500" /> : <FileText size={14} />}
                <span>{copiedPayload ? 'Copied!' : 'Copy JSON'}</span>
              </button>
              <button
                onClick={() => setSelectedPayload(null)}
                className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-xl text-xs hover:opacity-90 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LogsPage;
