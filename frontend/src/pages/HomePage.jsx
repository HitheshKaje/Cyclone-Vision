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
  Eye,
  Activity,
  ShieldAlert,
  BarChart4
} from 'lucide-react';

const HomePage = ({
  setActiveTab,
  currentAnalysis,
  analysisHistory = []
}) => {
  // Aggregate stats
  const totalScans = analysisHistory.length;
  const highRisk = analysisHistory.filter(h => h.classification?.classification === 'SEVERE').length;
  
  return (
    <div className="space-y-8 pb-10">
      
      {/* 1. Hero Section - Stunning Dynamic Background */}
      <div className="relative overflow-hidden rounded-2xl app-card border-none p-8 md:p-12 mt-2">
        {/* Animated Background Elements */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px] animate-pulse-glow" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-80 h-80 bg-sky-500/20 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tracking-wide uppercase">
              <Sparkles size={14} className="animate-pulse" />
              <span>Next-Gen Meteorological AI</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1]">
              Predict & Monitor <br />
              <span className="text-gradient">Tropical Cyclones</span>
            </h1>
            
            <p className="text-slate-400 text-base md:text-lg leading-relaxed max-w-xl font-light">
              Harness the power of AI to analyze satellite imagery, detect formations, and estimate intensity with unparalleled precision and speed.
            </p>
            
            <div className="pt-2">
              <button
                onClick={() => setActiveTab('analyze')}
                className="btn-glow relative group inline-flex items-center justify-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-xl font-bold text-sm overflow-hidden transition-all hover:bg-slate-800 border border-slate-700 hover:border-slate-600"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <UploadCloud size={18} className="text-emerald-400" />
                  Initialize Analysis
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-sky-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>
          
          {/* Floating Stats Widget on Hero */}
          <div className="hidden lg:flex relative animate-float">
            <div className="glass-panel p-6 w-72 space-y-5 rounded-2xl">
               <div className="flex justify-between items-center border-b border-white/10 pb-4">
                 <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">System Status</span>
                 <div className="flex items-center gap-1.5">
                   <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                   <span className="text-[10px] text-emerald-400 font-bold">ONLINE</span>
                 </div>
               </div>
               
               <div className="space-y-4">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400"><Activity size={16} /></div>
                     <span className="text-sm text-slate-300">Total Scans</span>
                   </div>
                   <span className="text-lg font-bold text-white">{totalScans > 0 ? totalScans : '0'}</span>
                 </div>
                 
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="p-2 rounded-lg bg-red-500/10 text-red-400"><ShieldAlert size={16} /></div>
                     <span className="text-sm text-slate-300">Severe Risks</span>
                   </div>
                   <span className="text-lg font-bold text-white">{highRisk}</span>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 2. Quick Action / Ready to Analyze (1 Column) */}
        <div className="app-card p-6 flex flex-col justify-between group hover:border-emerald-500/30 transition-colors">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-sky-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
              <Layers size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">New Scan</h3>
              <p className="text-sm text-slate-400 leading-relaxed font-light">
                Drop your latest multispectral satellite imagery here to trigger the 4-stage neural detection pipeline.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('analyze')}
            className="mt-6 w-full py-3 px-4 rounded-xl bg-emerald-500 text-slate-900 font-bold text-sm transition-all hover:bg-emerald-400 hover:shadow-[0_0_20px_rgba(52,211,153,0.3)] flex items-center justify-center gap-2"
          >
            <UploadCloud size={16} />
            Upload Image
          </button>
        </div>

        {/* 3. Latest Analysis Highlights (2 Columns) */}
        <div className="lg:col-span-2 app-card p-0 flex flex-col overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-400">
                <BarChart4 size={16} />
              </div>
              <h3 className="text-base font-bold text-white">Latest Intelligence</h3>
            </div>
            {currentAnalysis && (
              <button
                onClick={() => setActiveTab('results')}
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
              >
                Full Report <ArrowRight size={14} />
              </button>
            )}
          </div>

          <div className="p-5 sm:p-6 flex-1 flex flex-col justify-center">
            {!currentAnalysis ? (
              <div className="flex flex-col items-center justify-center text-center py-8">
                <div className="w-16 h-16 rounded-2xl bg-slate-800/50 border border-slate-700 flex items-center justify-center text-slate-500 mb-4 animate-float">
                  <FileQuestion size={28} />
                </div>
                <h4 className="text-base font-bold text-slate-200">Awaiting Data</h4>
                <p className="text-sm text-slate-500 max-w-sm mt-2">
                  The intelligence dashboard is standing by. Upload a satellite image to see live metrics and predictions.
                </p>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row gap-6 items-center">
                {currentAnalysis.imagePreview && (
                  <div className="relative group shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-sky-500 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity"></div>
                    <img 
                      src={currentAnalysis.imagePreview} 
                      alt="Observation" 
                      className="relative w-32 h-32 md:w-40 md:h-40 rounded-xl object-cover bg-slate-900 border-2 border-slate-700 z-10"
                    />
                  </div>
                )}
                
                <div className="flex-1 w-full grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800/60 transition-colors">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                    <p className="text-base font-bold text-white flex items-center gap-2">
                      {currentAnalysis.detection?.is_cyclone ? (
                        <><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Cyclone Detected</>
                      ) : (
                        <><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Clear</>
                      )}
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800/60 transition-colors">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Confidence</p>
                    <p className="text-base font-bold text-white">
                      {currentAnalysis.detection?.confidence_percent != null 
                        ? `${currentAnalysis.detection.confidence_percent}%` 
                        : '—'}
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800/60 transition-colors">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Max Wind</p>
                    <p className="text-base font-bold text-sky-400">
                      {currentAnalysis.intensity?.wind_speed_kt != null 
                        ? `${currentAnalysis.intensity.wind_speed_kt} kt`
                        : (currentAnalysis.detection?.is_cyclone === false ? 'N/A' : '—')}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800/60 transition-colors">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Category</p>
                    <p className="text-base font-bold text-white">
                      {currentAnalysis.detection?.is_cyclone === false
                        ? 'N/A'
                        : (currentAnalysis.classification?.classification || currentAnalysis.intensity?.classification || '—')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Automated Pipeline Visualizer (How it works redesigned) */}
      <div>
        <div className="mb-6 flex items-center gap-3">
          <h2 className="text-xl font-bold text-white">Neural Processing Pipeline</h2>
          <div className="h-px flex-1 bg-gradient-to-r from-slate-700 to-transparent"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { step: '01', title: 'Data Ingestion', desc: 'Satellite multi-spectral image acquisition', icon: UploadCloud, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
            { step: '02', title: 'Feature Extraction', desc: 'AI detection of cyclonic patterns', icon: Target, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
            { step: '03', title: 'Intensity Est.', desc: 'Calculating max sustained winds', icon: Wind, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
            { step: '04', title: 'Classification', desc: 'Categorizing threat levels', icon: Gauge, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
          ].map((item, i) => (
            <div key={i} className="app-card p-5 relative overflow-hidden group hover:border-slate-500 transition-all">
              <div className="absolute -right-4 -top-4 text-6xl font-black text-slate-800/40 select-none group-hover:text-slate-700/40 transition-colors">
                {item.step}
              </div>
              <div className="relative z-10 flex flex-col h-full">
                <div className={`w-10 h-10 rounded-xl ${item.bg} ${item.color} ${item.border} border flex items-center justify-center mb-4`}>
                  <item.icon size={20} />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">{item.title}</h4>
                <p className="text-xs text-slate-400 font-light leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
    </div>
  );
};

export default HomePage;
