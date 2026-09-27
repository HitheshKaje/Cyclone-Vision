import React from 'react';
import { History, Eye, ArrowRight } from 'lucide-react';

const HistoryPage = ({
  analysisHistory = [],
  setCurrentAnalysis,
  setActiveTab
}) => {
  const handleSelectRecord = (record) => {
    setCurrentAnalysis(record);
    setActiveTab('results');
  };

  return (
    <div className="space-y-6 pb-8">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Analysis History
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Observations analyzed during the current session
          </p>
        </div>
        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-md self-start sm:self-auto">
          {analysisHistory.length} {analysisHistory.length === 1 ? 'Record' : 'Records'}
        </span>
      </div>

      {/* 2. Table / Clean Empty State */}
      <div className="app-card p-5 sm:p-6 flex flex-col justify-between">
        {analysisHistory.length === 0 ? (
          <div className="min-h-[340px] flex flex-col items-center justify-center p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-1">
              <History size={26} />
            </div>
            <h3 className="text-base font-semibold text-slate-800">
              No analysis history available
            </h3>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              Upload and analyze a satellite image to record real inference results.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setActiveTab('analyze')}
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Analyze Image</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px] bg-slate-50/80">
                  <th className="py-3 px-3">Date / Time</th>
                  <th className="py-3 px-3">Image</th>
                  <th className="py-3 px-3">Detection</th>
                  <th className="py-3 px-3">Confidence</th>
                  <th className="py-3 px-3">Wind Speed</th>
                  <th className="py-3 px-3">Classification</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analysisHistory.map((item) => {
                  const isCyclone = item.detection?.is_cyclone;
                  const conf = item.detection?.confidence_percent;
                  const wind = item.intensity?.wind_speed_kt;
                  const classification = item.classification?.classification || item.intensity?.classification;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 text-slate-600 font-medium whitespace-nowrap">
                        {item.timestamp}
                      </td>
                      <td className="py-3 px-3">
                        {item.imagePreview ? (
                          <img 
                            src={item.imagePreview} 
                            alt="Thumbnail" 
                            className="w-10 h-10 rounded-md object-contain bg-[#F5F8FC] border border-slate-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-[10px]">
                            N/A
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                          isCyclone 
                            ? 'bg-red-50 text-red-700 border-red-200' 
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {isCyclone ? 'Cyclone Detected' : 'No Cyclone'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-800">
                        {conf != null ? `${conf}%` : '—'}
                      </td>
                      <td className="py-3 px-3 text-slate-800 font-medium">
                        {wind != null ? `${wind} kt` : (isCyclone === false ? 'Not Applicable' : '—')}
                      </td>
                      <td className="py-3 px-3">
                        {classification ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            classification === 'SEVERE'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : classification === 'MEDIUM'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
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
                        <button
                          onClick={() => handleSelectRecord(item)}
                          className="px-2.5 py-1 text-xs font-semibold text-sky-700 hover:text-sky-800 hover:bg-sky-50 rounded-md transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>
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
