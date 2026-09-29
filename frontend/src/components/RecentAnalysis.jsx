import React from 'react';
import { History, Eye, ArrowRight } from 'lucide-react';

const RecentAnalysis = ({ historyList = [], onSelectRecord, onNavigateToAnalyze }) => {
  return (
    <div className="app-card p-5 sm:p-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-700/30">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/100/10 text-emerald-400">
            <History size={20} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-slate-100">
              Analysis History
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Observations analyzed during the current session
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold text-slate-500 bg-slate-800 px-2.5 py-1 rounded-md">
          {historyList.length} {historyList.length === 1 ? 'Record' : 'Records'}
        </span>
      </div>

      {/* Table / Empty State */}
      {historyList.length === 0 ? (
        <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center p-8 text-center bg-slate-800 rounded-xl border border-slate-700/50">
          <div className="w-12 h-12 rounded-full bg-[#1e293b] border border-slate-700/50 shadow-xs flex items-center justify-center text-slate-400 mb-3">
            <History size={22} />
          </div>
          <h3 className="text-sm font-semibold text-slate-200 mb-1">
            No analysis history available
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mb-4">
            Upload and analyze a satellite image to record real inference results.
          </p>
          {onNavigateToAnalyze && (
            <button
              onClick={onNavigateToAnalyze}
              className="px-4 py-2 rounded-lg bg-emerald-500/100 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>Analyze Image</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-700/50 text-slate-500 font-semibold uppercase tracking-wider text-[11px] bg-slate-800/80">
                <th className="py-3 px-3">Date / Time</th>
                <th className="py-3 px-3">Preview</th>
                <th className="py-3 px-3">Detection</th>
                <th className="py-3 px-3">Confidence</th>
                <th className="py-3 px-3">Wind Speed</th>
                <th className="py-3 px-3">Classification</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historyList.map((item) => {
                const isCyclone = item.detection?.is_cyclone;
                const conf = item.detection?.confidence_percent;
                const wind = item.intensity?.wind_speed_kt;
                const classification = item.classification?.classification || item.intensity?.classification;

                return (
                  <tr key={item.id} className="hover:bg-slate-800/80 transition-colors">
                    <td className="py-3 px-3 text-slate-400 font-medium whitespace-nowrap">
                      {item.timestamp}
                    </td>
                    <td className="py-3 px-3">
                      {item.imagePreview ? (
                        <img 
                          src={item.imagePreview} 
                          alt="Thumbnail" 
                          className="w-10 h-10 rounded-md object-contain bg-slate-900 border border-slate-700/50"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-slate-800 border border-slate-700/50 flex items-center justify-center text-slate-400 text-[10px]">
                          N/A
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                        isCyclone 
                          ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        {isCyclone ? 'Cyclone Detected' : 'No Cyclone Detected'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-200">
                      {conf != null ? `${conf}%` : '—'}
                    </td>
                    <td className="py-3 px-3 text-slate-200 font-medium">
                      {wind != null ? `${wind} kt` : (isCyclone === false ? 'Not Applicable' : '—')}
                    </td>
                    <td className="py-3 px-3">
                      {classification ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          classification === 'SEVERE'
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : classification === 'MEDIUM'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {classification}
                        </span>
                      ) : (
                        <span className="text-slate-400">
                          {isCyclone === false ? 'Not Applicable' : '—'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {onSelectRecord && (
                        <button
                          onClick={() => onSelectRecord(item)}
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-400 hover:text-sky-800 hover:bg-emerald-500/100/10 rounded-md transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RecentAnalysis;
