import React, { useState } from 'react';
import SatelliteUpload from '../components/SatelliteUpload';
import DetectionResult from '../components/DetectionResult';
import IntensityCard from '../components/IntensityCard';
import PipelineStepper from '../components/PipelineStepper';
import AboutBanner from '../components/AboutBanner';
import { Database, Users, BarChart3, FileText, CheckCircle2, Shield, Sparkles } from 'lucide-react';

const Dashboard = ({ activeTab = 'home', setActiveTab }) => {
  const [analysisStatus, setAnalysisStatus] = useState("Pending"); // Pending, Analyzing, Completed, Error
  const [intensityStatus, setIntensityStatus] = useState("Pending"); // Pending, Estimating, Completed, Not Applicable, Error
  const [predictionResult, setPredictionResult] = useState(null);
  const [intensityResult, setIntensityResult] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const handleAnalysisComplete = (data) => {
    setPredictionResult(data);
  };

  const handleIntensityComplete = (data) => {
    setIntensityResult(data);
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Primary Workspace View (Home & Analyze Image) */}
      {(activeTab === 'home' || activeTab === 'analyze') && (
        <>
          {/* Main 2-Column Workspace Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Left Column: Satellite Image Workspace (7 cols) */}
            <div className="lg:col-span-7 flex flex-col">
              <SatelliteUpload 
                onAnalysisComplete={handleAnalysisComplete}
                onIntensityComplete={handleIntensityComplete}
                analysisStatus={analysisStatus}
                setAnalysisStatus={setAnalysisStatus}
                intensityStatus={intensityStatus}
                setIntensityStatus={setIntensityStatus}
                imagePreview={imagePreview}
                setImagePreview={setImagePreview}
              />
            </div>

            {/* Right Column: AI Model Results (5 cols) */}
            <div className="lg:col-span-5 flex flex-col space-y-5">
              <DetectionResult 
                predictionResult={predictionResult} 
                analysisStatus={analysisStatus} 
              />
              <IntensityCard 
                intensityResult={intensityResult} 
                intensityStatus={intensityStatus} 
                isCyclone={predictionResult?.is_cyclone}
              />
            </div>
          </div>

          {/* 5-Step Story Pipeline Stepper */}
          <PipelineStepper 
            analysisStatus={analysisStatus}
            intensityStatus={intensityStatus}
            isCyclone={predictionResult?.is_cyclone}
          />

          {/* Bottom About Banner */}
          <AboutBanner />
        </>
      )}

      {/* Dataset Tab Content */}
      {activeTab === 'dataset' && (
        <div className="glass-panel p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-sky-100 text-sky-700">
              <Database size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Tropical Cyclone Datasets</h2>
              <p className="text-xs sm:text-sm text-slate-500">Benchmark datasets used for training and evaluating CycloneVision models</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-sky-50/60 border border-sky-100 space-y-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Objective 1: Cyclone vs. No_Cyclone
              </h3>
              <p className="text-xs sm:text-sm text-slate-600">
                Satellite image collection covering tropical depressions, cyclonic storms, and non-cyclonic oceanic cloud formations for binary classification.
              </p>
              <div className="text-xs font-semibold text-sky-700 bg-white px-3 py-1.5 rounded-lg border border-sky-100 inline-block">
                Model: EfficientNetB0 Classifier
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-cyan-50/60 border border-cyan-100 space-y-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                Objective 2: TCIR Indian Ocean Dataset
              </h3>
              <p className="text-xs sm:text-sm text-slate-600">
                3,205 frames across 75 Indian Ocean storms from the Tropical Cyclone Image Dataset (TCIR) with verified 53/11/11 storm-level separation.
              </p>
              <div className="text-xs font-semibold text-cyan-700 bg-white px-3 py-1.5 rounded-lg border border-cyan-100 inline-block">
                Model: EfficientNetB0 Regression (Vmax in knots)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Tab Content */}
      {activeTab === 'results' && (
        <div className="glass-panel p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-sky-100 text-sky-700">
              <BarChart3 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Analysis Summary & Results</h2>
              <p className="text-xs sm:text-sm text-slate-500">Overview of current analysis session and model performance</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <p className="text-xs font-bold text-slate-500 uppercase">Detection Model</p>
              <p className="text-xl font-black text-slate-900">EfficientNetB0</p>
              <p className="text-xs text-emerald-600 font-medium">Objective 1: Active</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <p className="text-xs font-bold text-slate-500 uppercase">Intensity Model</p>
              <p className="text-xl font-black text-slate-900">EfficientNetB0 (TCIR)</p>
              <p className="text-xs text-cyan-600 font-medium">Objective 2: Active</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <p className="text-xs font-bold text-slate-500 uppercase">Input Format</p>
              <p className="text-xl font-black text-slate-900">224 × 224 × 3</p>
              <p className="text-xs text-slate-500 font-medium">Normalized Polarity Alignment</p>
            </div>
          </div>
        </div>
      )}

      {/* Team / About Tab Content */}
      {(activeTab === 'team' || activeTab === 'about') && (
        <div className="glass-panel p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-sky-100 text-sky-700">
              <Users size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">CycloneVision Project Team</h2>
              <p className="text-xs sm:text-sm text-slate-500">MCA Major Project — AI-Driven Tropical Cyclone Monitoring</p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-sky-50/70 border border-sky-100 space-y-3">
            <h3 className="font-extrabold text-slate-900 text-lg">Project Highlights</h3>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-700 list-disc list-inside">
              <li>End-to-end deep learning pipeline for real-time cyclone identification from multi-source satellite imagery.</li>
              <li>Regression-based maximum sustained wind speed (Vmax in knots) estimation utilizing TCIR infrared representations.</li>
              <li>Modern, responsive weather intelligence dashboard designed for disaster preparedness and coastal monitoring.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
