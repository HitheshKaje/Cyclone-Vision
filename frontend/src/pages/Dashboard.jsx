import React from 'react';
import { 
  Target, 
  Wind, 
  Gauge, 
  ArrowRight, 
  RotateCcw, 
  ShieldAlert, 
  ShieldCheck, 
  FileQuestion,
  Sparkles
} from 'lucide-react';
import SatelliteUpload from '../components/SatelliteUpload';
import DetectionResult from '../components/DetectionResult';
import IntensityCard from '../components/IntensityCard';
import PipelineStepper from '../components/PipelineStepper';
import LocationMap from '../components/LocationMap';
import RecentAnalysis from '../components/RecentAnalysis';

const Dashboard = ({
  activeTab = 'home',
  setActiveTab,
  currentAnalysis,
  setCurrentAnalysis,
  analysisHistory,
  setAnalysisHistory,
  analysisStatus,
  setAnalysisStatus,
  currentStage,
  setCurrentStage
}) => {
  const handleAnalysisSuccess = (record) => {
    setCurrentAnalysis(record);
    setAnalysisHistory((prev) => [record, ...prev]);
  };

  const handleSelectHistoryRecord = (record) => {
    setCurrentAnalysis(record);
    setActiveTab('results');
  };

  return (
    <div className="space-y-6 pb-8">
      {/* ======================================================== */}
      {/* 1. HOME TAB */}
      {/* ======================================================== */}
      {activeTab === 'home' && (
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Tropical Cyclone Monitoring
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Satellite image analysis
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

          {!currentAnalysis ? (
            /* Clean Empty State when no analysis has been run */
            <div className="app-card p-10 sm:p-14 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shadow-xs mb-1">
                <FileQuestion size={26} />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-slate-900">
                No analysis available
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm">
                Upload a satellite image to begin detection, intensity estimation, and classification.
              </p>
              <div className="pt-3">
                <button
                  onClick={() => setActiveTab('analyze')}
                  className="px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer shadow-xs inline-flex items-center gap-2"
                >
                  <span>Analyze Image</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          ) : (
            /* Populated Dashboard: 3 Compact Summary Cards + Active Observation Overview */
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Cyclone Detection Card */}
                <div className="app-card p-5 space-y-2">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-semibold uppercase tracking-wider">Detection</span>
                    <Target size={16} className="text-sky-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {currentAnalysis.detection?.is_cyclone ? 'Cyclone Detected' : 'No Cyclone Detected'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Confidence: {currentAnalysis.detection?.confidence_percent != null ? `${currentAnalysis.detection.confidence_percent}%` : '—'}
                    </p>
                  </div>
                </div>

                {/* 2. Intensity Card */}
                <div className="app-card p-5 space-y-2">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-semibold uppercase tracking-wider">Intensity</span>
                    <Wind size={16} className="text-sky-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {currentAnalysis.intensity?.wind_speed_kt != null 
                        ? `${currentAnalysis.intensity.wind_speed_kt} kt`
                        : (currentAnalysis.detection?.is_cyclone === false ? 'Not Applicable' : '—')}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {currentAnalysis.intensity?.wind_speed_kmh != null
                        ? `≈ ${currentAnalysis.intensity.wind_speed_kmh} km/h`
                        : (currentAnalysis.detection?.is_cyclone === false ? 'Not Applicable' : '—')}
                    </p>
                  </div>
                </div>

                {/* 3. Classification Card */}
                <div className="app-card p-5 space-y-2">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-semibold uppercase tracking-wider">Classification</span>
                    <Gauge size={16} className="text-sky-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {currentAnalysis.detection?.is_cyclone === false
                        ? 'Not Applicable'
                        : (currentAnalysis.classification?.classification || 
                           currentAnalysis.intensity?.classification || 
                           '—')}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {currentAnalysis.detection?.is_cyclone === false
                        ? 'Not Applicable'
                        : (currentAnalysis.classification?.description || 
                           currentAnalysis.intensity?.description || 
                           '—')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Active Observation Overview Panel */}
              <div className="app-card p-5 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-5">
                <div className="flex items-center gap-4 w-full md:w-auto">
                  {currentAnalysis.imagePreview && (
                    <img 
                      src={currentAnalysis.imagePreview} 
                      alt="Current Observation" 
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-contain bg-slate-900 border border-slate-200 shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                        Observation Analyzed
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
                    <p className="text-xs text-slate-500 mt-0.5">
                      Analyzed at {currentAnalysis.timestamp}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  <button
                    onClick={() => setActiveTab('analyze')}
                    className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Analyze Another
                  </button>
                  <button
                    onClick={() => setActiveTab('results')}
                    className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>View Full Results</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. ANALYZE IMAGE TAB */}
      {/* ======================================================== */}
      {activeTab === 'analyze' && (
        <div className="space-y-6">
          <div className="pb-3 border-b border-slate-200">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Analyze Image
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Upload a satellite image for AI cyclone detection, intensity estimation, and classification
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-5">
            <SatelliteUpload 
              currentAnalysis={currentAnalysis}
              onAnalysisSuccess={handleAnalysisSuccess}
              analysisStatus={analysisStatus}
              setAnalysisStatus={setAnalysisStatus}
              currentStage={currentStage}
              setCurrentStage={setCurrentStage}
              onNavigateToResults={() => setActiveTab('results')}
            />

            <PipelineStepper 
              currentStage={currentStage}
              isCompleted={analysisStatus === 'completed'}
              isCyclone={currentAnalysis?.detection?.is_cyclone}
            />
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. RESULTS TAB */}
      {/* ======================================================== */}
      {activeTab === 'results' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Analysis Results
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Model predictions across detection, intensity, and classification
              </p>
            </div>
            {currentAnalysis && (
              <button
                onClick={() => setActiveTab('analyze')}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <RotateCcw size={13} />
                <span>New Analysis</span>
              </button>
            )}
          </div>

          {!currentAnalysis ? (
            /* Clean Empty State */
            <div className="app-card p-10 sm:p-14 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-1">
                <FileQuestion size={26} />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-slate-900">
                No analysis available
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm">
                Upload and analyze a satellite image to inspect detection, intensity, and classification results.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setActiveTab('analyze')}
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                >
                  <span>Go to Analyze Image</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ) : (
            /* 2-Column Standard Results Grid */
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Left Column: Satellite Image Display (5 cols) */}
                <div className="lg:col-span-5 app-card p-5 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Satellite Observation
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      {currentAnalysis.fileName || 'Uploaded Image'}
                    </span>
                  </div>

                  <div className="w-full bg-slate-950 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center p-2 min-h-[300px]">
                    <img 
                      src={currentAnalysis.imagePreview} 
                      alt="Satellite Cyclone Observation" 
                      className="max-h-[360px] w-full object-contain"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>Analyzed: {currentAnalysis.timestamp}</span>
                    <span>Input: 224 × 224</span>
                  </div>
                </div>

                {/* Right Column: AI Results (7 cols) */}
                <div className="lg:col-span-7 space-y-5">
                  <DetectionResult 
                    detection={currentAnalysis.detection}
                  />

                  <IntensityCard 
                    intensity={currentAnalysis.intensity}
                    classification={currentAnalysis.classification}
                    isCyclone={currentAnalysis.detection?.is_cyclone}
                    isAnalysisCompleted={true}
                  />
                </div>
              </div>

              {/* Completed Pipeline Stepper */}
              <PipelineStepper 
                currentStage={null}
                isCompleted={true}
                isCyclone={currentAnalysis.detection?.is_cyclone}
              />
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. CYCLONE MAP TAB */}
      {/* ======================================================== */}
      {activeTab === 'map' && (
        <LocationMap />
      )}

      {/* ======================================================== */}
      {/* 5. HISTORY TAB */}
      {/* ======================================================== */}
      {activeTab === 'history' && (
        <RecentAnalysis 
          historyList={analysisHistory}
          onSelectRecord={handleSelectHistoryRecord}
          onNavigateToAnalyze={() => setActiveTab('analyze')}
        />
      )}
    </div>
  );
};

export default Dashboard;
