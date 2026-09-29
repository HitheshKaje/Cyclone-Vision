import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  RotateCcw, 
  Play, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Target,
  Wind,
  Gauge,
  Sparkles,
  Info,
  Layers,
  Maximize,
  Settings,
  FileText,
  Clock,
  Trash2,
  Eye
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

const AnalyzePage = ({
  currentAnalysis,
  setCurrentAnalysis,
  analysisStatus,
  setAnalysisStatus,
  currentStage,
  setCurrentStage,
  analysisHistory = [], // ensure this is passed from Dashboard
  setAnalysisHistory,
  setActiveTab
}) => {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(currentAnalysis?.imagePreview || null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const fileInputRef = useRef(null);

  const loadSampleImage = async (url, filename) => {
    try {
      setIsLoadingSample(true);
      setErrorMessage(null);
      const response = await fetch(url);
      const blob = await response.blob();
      const loadedFile = new File([blob], filename, { type: blob.type || 'image/jpeg' });
      processSelectedFile(loadedFile);
    } catch (error) {
      console.error("Failed to load sample image", error);
      setErrorMessage("Failed to load sample image. Please try uploading your own.");
    } finally {
      setIsLoadingSample(false);
    }
  };

  const processSelectedFile = (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setErrorMessage(null);
    setAnalysisStatus('idle');
    setCurrentStage(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target.result);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleResetImage = () => {
    setFile(null);
    setPreviewUrl(null);
    setErrorMessage(null);
    setAnalysisStatus('idle');
    setCurrentStage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteHistory = (id) => {
    setAnalysisHistory(prev => prev.filter(h => h.id !== id));
  };

  const handleViewHistory = (record) => {
    setCurrentAnalysis(record);
    setActiveTab('results');
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setErrorMessage(null);
    setAnalysisStatus('analyzing');
    setCurrentStage('Detection');

    try {
      // Step 1: Objective 1 Cyclone Detection
      const formData = new FormData();
      formData.append('image', file);

      const detectResponse = await fetch(`${API_BASE}/api/detect`, {
        method: 'POST',
        body: formData,
      });

      if (!detectResponse.ok) {
        throw new Error(`Detection request failed with status ${detectResponse.status}`);
      }

      const detectData = await detectResponse.json();

      let intensityData = null;
      let classificationData = null;

      // Step 2 & 3: Run Objective 2 & 3 ONLY if Cyclone is detected
      if (detectData.is_cyclone) {
        setCurrentStage('Intensity');

        const intensityFormData = new FormData();
        intensityFormData.append('image', file);

        const intensityResponse = await fetch(`${API_BASE}/api/intensity`, {
          method: 'POST',
          body: intensityFormData,
        });

        if (!intensityResponse.ok) {
          throw new Error(`Intensity estimation request failed with status ${intensityResponse.status}`);
        }

        intensityData = await intensityResponse.json();

        if (intensityData && intensityData.classification) {
          classificationData = {
            classification: intensityData.classification,
            description: intensityData.description,
            wind_speed_kt: intensityData.wind_speed_kt,
            wind_speed_kmh: intensityData.wind_speed_kmh
          };
        }

        setCurrentStage('Classification');
      }

      setCurrentStage('Completed');
      setAnalysisStatus('completed');

      const analysisRecord = {
        id: Date.now().toString(),
        fileName: file.name,
        imageFile: file,
        imagePreview: previewUrl,
        detection: detectData,
        intensity: intensityData,
        classification: classificationData,
        timestamp: new Date().toLocaleString([], {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      };

      setCurrentAnalysis(analysisRecord);
      setAnalysisHistory((prev) => [analysisRecord, ...prev]);

    } catch (err) {
      console.error('Analysis error:', err);
      setErrorMessage(err.message || 'An error occurred during analysis.');
      setAnalysisStatus('error');
      setCurrentStage(null);
    }
  };

  const isAnalyzing = analysisStatus === 'analyzing';
  const isCompleted = analysisStatus === 'completed';

  return (
    <div className="space-y-6 pb-12 w-full max-w-7xl mx-auto">
      {/* 1. Header with background */}
      <div className="relative rounded-2xl overflow-hidden p-6 sm:p-10 border border-slate-200/50 dark:border-slate-700/50 shadow-lg">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80" 
            alt="Satellite background" 
            className="w-full h-full object-cover opacity-10 dark:opacity-25 mix-blend-multiply dark:mix-blend-screen"
            crossOrigin="anonymous"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-sky-50 via-white/80 dark:from-slate-900 dark:via-slate-900/80 to-transparent"></div>
        </div>
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <div className="p-2 bg-sky-500/20 rounded-xl text-sky-400">
              <UploadCloud size={24} />
            </div>
            Analyze Satellite Image
          </h1>
          <p className="text-sm text-slate-700 dark:text-slate-300 mt-2 font-medium">
            Upload a satellite image to detect cyclones, estimate intensity, and get a detailed analysis report.
          </p>
        </div>
      </div>

      {/* Grid Layout Container */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN (Upload Section) */}
        <div className="xl:col-span-7 2xl:col-span-8 space-y-6">
          
          <div className="app-card p-1 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 shadow-xl border-slate-200 dark:border-slate-700">
            <div className="p-4 sm:p-6 bg-white/50 dark:bg-slate-900/50 rounded-xl w-full h-full">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/jpeg, image/png, image/tiff"
                className="hidden"
              />

              {!previewUrl ? (
                /* Drag & Drop Area */
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`min-h-[260px] sm:min-h-[300px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 text-center transition-all cursor-pointer ${
                    isDragging
                      ? 'border-sky-500 bg-emerald-500/10'
                      : 'border-slate-300 dark:border-slate-600 bg-slate-50/40 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:border-sky-400'
                  }`}
                >
                  <div className="w-16 h-16 rounded-full bg-slate-100/80 dark:bg-slate-800/80 shadow-inner flex items-center justify-center mb-4 text-sky-400">
                    <UploadCloud size={30} />
                  </div>
                  
                  <p className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                    Drag & drop a satellite image here
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
                    or click to browse from your device
                  </p>

                  <button
                    type="button"
                    className="px-6 py-2.5 rounded-lg bg-emerald-500 text-slate-900 font-bold text-sm shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-colors pointer-events-none"
                  >
                    Choose Image
                  </button>

                  <div className="flex gap-4 mt-6 text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                    <span>Supported formats: JPG, PNG, TIFF</span>
                    <span>|</span>
                    <span>Max size: 10MB</span>
                  </div>
                </div>
              ) : (
                /* Preview Container */
                <div className="space-y-4">
                  <div className="min-h-[300px] rounded-xl overflow-hidden relative border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 flex items-center justify-center p-2">
                    <img
                      src={previewUrl}
                      alt="Uploaded"
                      className="max-h-[400px] w-full object-contain"
                    />
                    {!isAnalyzing && (
                      <div className="absolute top-4 right-4">
                        <button
                          type="button"
                          onClick={handleResetImage}
                          className="px-3 py-1.5 rounded-lg bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 hover:text-emerald-500 dark:hover:text-emerald-400 text-xs font-bold border border-slate-200 dark:border-slate-700 hover:border-emerald-500/50 shadow-lg transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-sm"
                        >
                          <RotateCcw size={14} />
                          <span>Clear Image</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleAnalyze}
                      disabled={!file || isAnalyzing}
                      className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                        file && !isAnalyzing
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-900 shadow-lg shadow-emerald-500/20 cursor-pointer'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed'
                      }`}
                    >
                      {isAnalyzing ? (
                        <><Loader2 size={18} className="animate-spin" /> Running AI Analysis...</>
                      ) : (
                        <><Play size={16} className="fill-current" /> Analyze Image</>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Error message */}
              {errorMessage && (
                <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Analysis Progress Tracker (Moves below upload box) */}
          {(isAnalyzing || isCompleted) && (
            <div className="app-card bg-white dark:bg-[#1e293b] border border-slate-200/50 dark:border-slate-700/50 rounded-xl shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/50 dark:border-slate-700/30">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <Settings size={14} className="text-sky-400" /> Pipeline Execution Status
                </span>
                {isCompleted && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Analysis completed
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Step 1: Cyclone Detection */}
                <div className={`p-3 rounded-lg border text-xs flex items-center gap-3 transition-colors ${
                  isCompleted || currentStage === 'Intensity' || currentStage === 'Classification'
                    ? 'bg-emerald-500/10/60 border-emerald-500/20/70 text-slate-800 dark:text-slate-200'
                    : currentStage === 'Detection'
                    ? 'bg-emerald-500/100/10/70 border-sky-200 text-slate-800 dark:text-slate-200 ring-1 ring-sky-200'
                    : 'bg-slate-100/60 dark:bg-slate-800/60 border-slate-700/50/70 text-slate-500'
                }`}>
                  {isCompleted || currentStage === 'Intensity' || currentStage === 'Classification' ? (
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                  ) : currentStage === 'Detection' ? (
                    <Loader2 size={18} className="animate-spin text-emerald-400 shrink-0" />
                  ) : (
                    <Target size={18} className="text-slate-600 dark:text-slate-400 shrink-0" />
                  )}
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">1. Cyclone Detection</p>
                    <p className="text-[10px] text-slate-500">
                      {currentStage === 'Detection' ? 'Processing...' : isCompleted ? 'Completed' : 'Pending'}
                    </p>
                  </div>
                </div>

                {/* Step 2: Intensity Estimation */}
                <div className={`p-3 rounded-lg border text-xs flex items-center gap-3 transition-colors ${
                  isCompleted
                    ? currentAnalysis?.detection?.is_cyclone === false
                      ? 'bg-slate-100/60 dark:bg-slate-800/60 border-slate-700/50/70 text-slate-500'
                      : 'bg-emerald-500/10/60 border-emerald-500/20/70 text-slate-800 dark:text-slate-200'
                    : currentStage === 'Intensity'
                    ? 'bg-emerald-500/100/10/70 border-sky-200 text-slate-800 dark:text-slate-200 ring-1 ring-sky-200'
                    : 'bg-slate-100/60 dark:bg-slate-800/60 border-slate-700/50/70 text-slate-500'
                }`}>
                  {isCompleted ? (
                    currentAnalysis?.detection?.is_cyclone === false ? (
                      <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 text-[10px] font-bold flex items-center justify-center shrink-0">—</span>
                    ) : (
                      <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                    )
                  ) : currentStage === 'Intensity' ? (
                    <Loader2 size={18} className="animate-spin text-emerald-400 shrink-0" />
                  ) : (
                    <Wind size={18} className="text-slate-600 dark:text-slate-400 shrink-0" />
                  )}
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">2. Intensity Estimation</p>
                    <p className="text-[10px] text-slate-500">
                      {currentStage === 'Intensity'
                        ? 'Estimating...'
                        : isCompleted
                        ? (currentAnalysis?.detection?.is_cyclone === false ? 'Skipped (No Cyclone)' : 'Completed')
                        : 'Pending'}
                    </p>
                  </div>
                </div>

                {/* Step 3: Classification */}
                <div className={`p-3 rounded-lg border text-xs flex items-center gap-3 transition-colors ${
                  isCompleted
                    ? currentAnalysis?.detection?.is_cyclone === false
                      ? 'bg-slate-100/60 dark:bg-slate-800/60 border-slate-700/50/70 text-slate-500'
                      : 'bg-emerald-500/10/60 border-emerald-500/20/70 text-slate-800 dark:text-slate-200'
                    : currentStage === 'Classification'
                    ? 'bg-emerald-500/100/10/70 border-sky-200 text-slate-800 dark:text-slate-200 ring-1 ring-sky-200'
                    : 'bg-slate-100/60 dark:bg-slate-800/60 border-slate-700/50/70 text-slate-500'
                }`}>
                  {isCompleted ? (
                    currentAnalysis?.detection?.is_cyclone === false ? (
                      <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 text-[10px] font-bold flex items-center justify-center shrink-0">—</span>
                    ) : (
                      <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                    )
                  ) : currentStage === 'Classification' ? (
                    <Loader2 size={18} className="animate-spin text-emerald-400 shrink-0" />
                  ) : (
                    <Gauge size={18} className="text-slate-600 dark:text-slate-400 shrink-0" />
                  )}
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">3. Classification</p>
                    <p className="text-[10px] text-slate-500">
                      {currentStage === 'Classification'
                        ? 'Categorizing...'
                        : isCompleted
                        ? (currentAnalysis?.detection?.is_cyclone === false ? 'Skipped (No Cyclone)' : 'Completed')
                        : 'Pending'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Completed Callout */}
              {isCompleted && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 pt-3">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                        Analysis completed successfully
                      </p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        Detailed predictions are ready for inspection across all objectives.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab('results')}
                    className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold text-xs sm:text-sm transition-colors flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20 shrink-0"
                  >
                    <span>View Report</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Pipeline Overview (Empty State only) */}
          {!previewUrl && (
            <div className="app-card p-5 border border-slate-200/50 dark:border-slate-700/50 shadow-lg hidden md:block">
              <div className="flex items-center gap-2 pb-4">
                <Settings size={20} className="text-sky-400" />
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">How CycloSafe Analyzes Your Image</h3>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                {[
                  { step: '1', title: 'Upload Image', desc: 'Provide a satellite image (IR/Visible)', icon: UploadCloud },
                  { step: '2', title: 'Preprocessing', desc: 'Enhance and normalize image', icon: Settings },
                  { step: '3', title: 'Cyclone Detection', desc: 'Detect cyclone or no cyclone', icon: Target },
                  { step: '4', title: 'Intensity Est.', desc: 'Estimate wind speed and classify category', icon: Wind },
                  { step: '5', title: 'Analysis Report', desc: 'Generate detailed results', icon: FileText },
                ].map((s, i) => (
                  <div key={i} className="flex-1 p-3 rounded-lg bg-slate-50/40 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50 flex flex-col relative group">
                    <div className="absolute -top-3 -left-2 w-6 h-6 rounded-full bg-sky-500 text-slate-900 dark:text-white font-bold text-xs flex items-center justify-center border-4 border-slate-900 z-10">
                      {s.step}
                    </div>
                    <div className="text-emerald-400 mb-2 mt-2 self-start bg-emerald-500/10 p-1.5 rounded-lg">
                      <s.icon size={16} />
                    </div>
                    <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">{s.title}</p>
                    <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">{s.desc}</p>
                    {i !== 4 && (
                      <ArrowRight size={14} className="text-slate-600 hidden sm:block absolute -right-3 top-1/2 -translate-y-1/2 translate-x-1" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN (Sample Images + Guidelines) */}
        {!previewUrl && (
          <div className="xl:col-span-5 2xl:col-span-4 space-y-6">
            
            {/* Try Sample Images */}
            <div className="app-card p-5 border border-emerald-500/30 bg-gradient-to-b from-emerald-900/10 to-transparent shadow-[0_0_30px_rgba(16,185,129,0.05)]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-slate-700/50">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <Sparkles size={18} />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">Sample Images</h3>
                </div>
                <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider cursor-pointer hover:text-sky-300">View More &rarr;</span>
              </div>
              
              {isLoadingSample ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <Loader2 size={28} className="text-emerald-400 animate-spin" />
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Loading demo image...</span>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 pt-4">
                  {[
                    { id: 'severe', name: 'Severe Cyclone', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80' },
                    { id: 'moderate', name: 'Moderate Cyclone', url: 'https://images.unsplash.com/photo-1584267385494-9fdd9a71ad75?auto=format&fit=crop&w=400&q=80' },
                    { id: 'clear', name: 'Clear Weather', url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=400&q=80' }
                  ].map((sample) => (
                    <div 
                      key={sample.id} 
                      onClick={() => loadSampleImage(sample.url, `demo_${sample.id}.jpg`)}
                      className="group cursor-pointer bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 rounded-xl overflow-hidden hover:border-sky-500/50 hover:shadow-lg transition-all flex flex-col"
                    >
                      <div className="aspect-[4/3] w-full relative overflow-hidden">
                        <div className="absolute inset-0 bg-slate-900/30 group-hover:bg-transparent transition-colors z-10"></div>
                        <img src={sample.url} alt={sample.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" crossOrigin="anonymous" />
                      </div>
                      <div className="p-2 flex-1 flex flex-col justify-between bg-slate-100/80 dark:bg-slate-800/80 text-center space-y-2">
                        <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200">{sample.name}</p>
                        <button className="w-full py-1 rounded bg-sky-500 text-slate-900 dark:text-white text-[10px] font-bold hover:bg-sky-400 transition-colors">
                          Analyze
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Image Guidelines */}
            <div className="app-card p-5 border border-amber-500/20 bg-gradient-to-b from-amber-900/10 to-transparent">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-200/50 dark:border-slate-700/50">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                  <Info size={18} />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">Image Guidelines</h3>
              </div>
              <ul className="space-y-3 mt-4">
                {[
                  "Use clear satellite imagery with visible clouds",
                  "Center the cyclone/storm system if possible",
                  "Supported formats: JPG, PNG, TIFF",
                  "Recommended resolution: 224 x 224 or higher",
                  "Works best with IR or Visible spectrum images"
                ].map((text, i) => (
                  <li key={i} className="flex gap-3 text-sm text-slate-700 dark:text-slate-300 items-start">
                    <CheckCircle2 size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <span className="font-medium text-slate-700 dark:text-slate-300">{text}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        )}
      </div>

      {/* RECENT ANALYSES TABLE (Empty State only) */}
      {!previewUrl && analysisHistory && analysisHistory.length > 0 && (
        <div className="app-card border border-sky-500/20 bg-white/40 dark:bg-slate-900/40 mt-6">
          <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-sky-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Recent Analyses</h3>
            </div>
            <button 
              onClick={() => setActiveTab('history')}
              className="text-xs font-bold text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-1"
            >
              View All <ArrowRight size={14} />
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400 border-collapse min-w-[600px]">
              <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200/50 dark:border-slate-700/50">
                <tr>
                  <th className="px-5 py-4">Image</th>
                  <th className="px-5 py-4">Result</th>
                  <th className="px-5 py-4">Confidence</th>
                  <th className="px-5 py-4">Date & Time</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
                {analysisHistory.slice(0, 3).map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-5 py-3">
                      <div className="w-12 h-12 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <img src={record.imagePreview} alt="Thumb" className="w-full h-full object-cover" />
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {record.detection?.is_cyclone ? (
                        <span className="font-bold text-red-400">
                          Cyclone {record.classification?.classification ? `(${record.classification.classification})` : ''}
                        </span>
                      ) : (
                        <span className="font-bold text-emerald-400">No Cyclone</span>
                      )}
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-700 dark:text-slate-300">
                      {record.detection?.confidence_percent != null ? `${record.detection.confidence_percent}%` : '—'}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {record.timestamp}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleViewHistory(record)}
                          className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-600 transition-colors flex items-center gap-1.5"
                        >
                          View
                        </button>
                        <button 
                          onClick={() => handleDeleteHistory(record.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default AnalyzePage;
