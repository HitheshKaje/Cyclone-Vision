import React from 'react';
import { 
  ArrowRight, 
  UploadCloud, 
  Target, 
  Wind, 
  Gauge, 
  FileQuestion, 
  Sparkles,
  Layers,
  Eye
} from 'lucide-react';

const HomePage = ({
  setActiveTab,
  currentAnalysis,
  analysisHistory = []
}) => {
  return (
    <div className="space-y-6 pb-8">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Tropical Cyclone Monitoring
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Satellite image analysis and cyclone intelligence
          </p>
        </div>
        <button
          onClick={() => setActiveTab('analyze')}
          className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <span>Analyze Image</span>
          <ArrowRight size={15} />
        </button>
      </div>

      {/* 2. Hero Section */}
      <div className="app-card p-6 sm:p-8 bg-gradient-to-r from-sky-50/70 via-white to-sky-50/40 border border-sky-100/80">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 text-[11px] font-semibold">
            <Sparkles size={13} className="text-sky-600" />
            <span>AI-Driven Meteorological Intelligence</span>
          </div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
            AI-powered tropical cyclone detection, intensity estimation, and classification.
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Multi-stage neural processing designed for coastal safety and satellite meteorological analysis.
          </p>
        </div>
      </div>

      {/* 3. How It Works (Explanatory UI) */}
      <div className="app-card p-5 sm:p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            How It Works
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Four sequential stages of the automated cyclone intelligence pipeline
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Stage 1 */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 flex flex-col justify-between space-y-2">
            <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-sky-600 shadow-xs">
              <UploadCloud size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Stage 1</span>
              <p className="text-xs sm:text-sm font-semibold text-slate-900 mt-0.5">Satellite Image</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Multispectral or infrared satellite input acquisition</p>
            </div>
          </div>

          {/* Stage 2 */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 flex flex-col justify-between space-y-2">
            <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-sky-600 shadow-xs">
              <Target size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Stage 2</span>
              <p className="text-xs sm:text-sm font-semibold text-slate-900 mt-0.5">Cyclone Detection</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Binary presence verification with neural confidence score</p>
            </div>
          </div>

          {/* Stage 3 */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 flex flex-col justify-between space-y-2">
            <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-sky-600 shadow-xs">
              <Wind size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Stage 3</span>
              <p className="text-xs sm:text-sm font-semibold text-slate-900 mt-0.5">Intensity Estimation</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Maximum sustained wind speed estimation in knots (kt)</p>
            </div>
          </div>

          {/* Stage 4 */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 flex flex-col justify-between space-y-2">
            <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-sky-600 shadow-xs">
              <Gauge size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Stage 4</span>
              <p className="text-xs sm:text-sm font-semibold text-slate-900 mt-0.5">Classification</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Three-tier meteorological category (LOW, MEDIUM, SEVERE)</p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Ready to Analyze Callout & Latest Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Ready to Analyze Card (5 cols on desktop) */}
        <div className="lg:col-span-4 app-card p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
              <Layers size={20} />
            </div>
            <h3 className="text-base font-semibold text-slate-900">
              Ready to Analyze?
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Upload a satellite image to begin detection, intensity estimation, and classification.
            </p>
          </div>

          <button
            onClick={() => setActiveTab('analyze')}
            className="w-full py-2.5 px-4 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <span>Analyze Image</span>
            <ArrowRight size={15} />
          </button>
        </div>

        {/* Latest Analysis Section (8 cols on desktop) */}
        <div className="lg:col-span-8 app-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Latest Analysis
              </h3>
              <p className="text-[11px] text-slate-400">
                Most recent satellite image observation
              </p>
            </div>
            {currentAnalysis && (
              <button
                onClick={() => setActiveTab('results')}
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                <span>View Full Results</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>

          {!currentAnalysis ? (
            /* Clean Empty State when no analysis has been run */
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-1">
                <FileQuestion size={22} />
              </div>
              <h4 className="text-sm font-semibold text-slate-800">
                No analysis available
              </h4>
              <p className="text-xs text-slate-500 max-w-xs">
                Upload a satellite image to begin analysis.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setActiveTab('analyze')}
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium text-xs transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                >
                  <span>Analyze Image</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ) : (
            /* Real Analysis Display */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {currentAnalysis.imagePreview && (
                  <img 
                    src={currentAnalysis.imagePreview} 
                    alt="Latest Observation Thumbnail" 
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-contain bg-slate-900 border border-slate-200 shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900 truncate">
                      {currentAnalysis.fileName || 'Observation'}
                    </span>
                    {currentAnalysis.detection?.is_cyclone ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                        Cyclone Detected
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        No Cyclone Detected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Analyzed at {currentAnalysis.timestamp}
                  </p>
                </div>
              </div>

              {/* Real Metric Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70">
                  <p className="text-[11px] text-slate-500 font-medium">Detection</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5 truncate">
                    {currentAnalysis.detection?.is_cyclone ? 'Cyclone Detected' : 'No Cyclone'}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70">
                  <p className="text-[11px] text-slate-500 font-medium">Confidence</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {currentAnalysis.detection?.confidence_percent != null 
                      ? `${currentAnalysis.detection.confidence_percent}%` 
                      : '—'}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70">
                  <p className="text-[11px] text-slate-500 font-medium">Wind Speed</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5 truncate">
                    {currentAnalysis.intensity?.wind_speed_kt != null 
                      ? `${currentAnalysis.intensity.wind_speed_kt} kt`
                      : (currentAnalysis.detection?.is_cyclone === false ? 'Not Applicable' : '—')}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70">
                  <p className="text-[11px] text-slate-500 font-medium">Classification</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5 truncate">
                    {currentAnalysis.detection?.is_cyclone === false
                      ? 'Not Applicable'
                      : (currentAnalysis.classification?.classification || 
                         currentAnalysis.intensity?.classification || 
                         '—')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Recent History Section */}
      <div className="app-card p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Recent Analysis History
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Observations analyzed in the current session
            </p>
          </div>
          <button
            onClick={() => setActiveTab('history')}
            className="text-xs font-semibold text-sky-600 hover:text-sky-700 transition-colors inline-flex items-center gap-1 cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {analysisHistory.length === 0 ? (
          <div className="py-8 text-center text-slate-400 space-y-1">
            <p className="text-sm font-medium text-slate-600">No analysis history available</p>
            <p className="text-xs text-slate-400">Perform an analysis to record session history.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px] bg-slate-50/80">
                  <th className="py-2.5 px-3">Date / Time</th>
                  <th className="py-2.5 px-3">Image</th>
                  <th className="py-2.5 px-3">Detection</th>
                  <th className="py-2.5 px-3">Confidence</th>
                  <th className="py-2.5 px-3">Wind Speed</th>
                  <th className="py-2.5 px-3">Classification</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analysisHistory.slice(0, 5).map((item) => {
                  const isCyclone = item.detection?.is_cyclone;
                  const conf = item.detection?.confidence_percent;
                  const wind = item.intensity?.wind_speed_kt;
                  const classification = item.classification?.classification || item.intensity?.classification;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 text-slate-600 font-medium whitespace-nowrap">
                        {item.timestamp}
                      </td>
                      <td className="py-2.5 px-3">
                        {item.imagePreview ? (
                          <img 
                            src={item.imagePreview} 
                            alt="Thumbnail" 
                            className="w-9 h-9 rounded-md object-contain bg-slate-900 border border-slate-200"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-[10px]">
                            N/A
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          isCyclone 
                            ? 'bg-red-50 text-red-700 border-red-200' 
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {isCyclone ? 'Cyclone Detected' : 'No Cyclone'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {conf != null ? `${conf}%` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-800 font-medium">
                        {wind != null ? `${wind} kt` : (isCyclone === false ? 'Not Applicable' : '—')}
                      </td>
                      <td className="py-2.5 px-3">
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
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => {
                            setActiveTab('results');
                          }}
                          className="px-2 py-1 text-xs font-semibold text-sky-700 hover:text-sky-800 hover:bg-sky-50 rounded-md transition-colors inline-flex items-center gap-1 cursor-pointer"
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

export default HomePage;
