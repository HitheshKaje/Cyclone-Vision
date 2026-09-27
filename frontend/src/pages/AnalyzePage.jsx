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
  Gauge
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

const AnalyzePage = ({
  currentAnalysis,
  setCurrentAnalysis,
  analysisStatus,
  setAnalysisStatus,
  currentStage,
  setCurrentStage,
  setAnalysisHistory,
  setActiveTab
}) => {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(currentAnalysis?.imagePreview || null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const fileInputRef = useRef(null);

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
    <div className="space-y-6 pb-8">
      {/* 1. Page Header */}
      <div className="pb-3 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Analyze Satellite Image
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Upload a satellite image to detect cyclones and estimate their intensity.
        </p>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        {/* 2. Upload / Preview Card */}
        <div className="app-card p-5 sm:p-6 space-y-5">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/jpeg, image/png, image/tiff"
            className="hidden"
          />

          {!previewUrl ? (
            /* Large Drag & Drop Area */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`min-h-[280px] sm:min-h-[320px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 text-center transition-colors cursor-pointer ${
                isDragging
                  ? 'border-sky-500 bg-sky-50'
                  : 'border-slate-300 bg-slate-50/70 hover:bg-slate-100/70 hover:border-slate-400'
              }`}
            >
              <div className="w-14 h-14 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center mb-3.5 text-sky-600">
                <UploadCloud size={26} />
              </div>
              
              <p className="text-sm font-semibold text-slate-800 mb-1">
                Drag & drop a satellite image here
              </p>
              <p className="text-xs text-slate-500 mb-4">
                or click to browse from your device
              </p>

              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-sky-600 text-white font-medium text-xs shadow-xs hover:bg-sky-700 transition-colors pointer-events-none"
              >
                Choose Image
              </button>

              <p className="text-[11px] text-slate-400 mt-4">
                Supported formats: JPG, PNG, TIFF
              </p>
            </div>
          ) : (
            /* Professional Preview Container (contain, no stretch, preserved aspect ratio) */
            <div className="space-y-4">
              <div className="min-h-[300px] sm:min-h-[380px] rounded-xl overflow-hidden relative border border-slate-200 bg-slate-950 flex items-center justify-center p-4">
                <img
                  src={previewUrl}
                  alt="Uploaded Satellite Image Preview"
                  className="max-h-[380px] w-full object-contain"
                />

                {/* Change Image button on preview */}
                {!isAnalyzing && (
                  <div className="absolute top-3.5 right-3.5">
                    <button
                      type="button"
                      onClick={handleResetImage}
                      className="px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-medium border border-slate-700 shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw size={13} />
                      <span>Change Image</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <button
                  onClick={handleAnalyze}
                  disabled={!file || isAnalyzing}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 ${
                    file && !isAnalyzing
                      ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-xs cursor-pointer'
                      : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                  }`}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Running Analysis...</span>
                    </>
                  ) : (
                    <>
                      <Play size={15} className="fill-current" />
                      <span>Analyze Image</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleResetImage}
                  disabled={isAnalyzing}
                  className="py-2.5 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RotateCcw size={14} />
                  <span>Change Image</span>
                </button>
              </div>
            </div>
          )}

          {/* Error message */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* 3. Analysis Progress Tracker */}
        {(isAnalyzing || isCompleted) && (
          <div className="app-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Pipeline Execution Status
              </span>
              {isCompleted && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Analysis completed
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Step 1: Cyclone Detection */}
              <div className={`p-3 rounded-lg border text-xs flex items-center gap-3 ${
                isCompleted || currentStage === 'Intensity' || currentStage === 'Classification'
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                  : currentStage === 'Detection'
                  ? 'bg-sky-50 border-sky-300 text-sky-900 ring-1 ring-sky-300'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}>
                {isCompleted || currentStage === 'Intensity' || currentStage === 'Classification' ? (
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                ) : currentStage === 'Detection' ? (
                  <Loader2 size={18} className="animate-spin text-sky-600 shrink-0" />
                ) : (
                  <Target size={18} className="text-slate-400 shrink-0" />
                )}
                <div>
                  <p className="font-semibold">1. Cyclone Detection</p>
                  <p className="text-[10px] text-slate-500">
                    {currentStage === 'Detection' ? 'Processing...' : isCompleted ? 'Completed' : 'Pending'}
                  </p>
                </div>
              </div>

              {/* Step 2: Intensity Estimation */}
              <div className={`p-3 rounded-lg border text-xs flex items-center gap-3 ${
                isCompleted
                  ? currentAnalysis?.detection?.is_cyclone === false
                    ? 'bg-slate-50 border-slate-200 text-slate-500'
                    : 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                  : currentStage === 'Intensity'
                  ? 'bg-sky-50 border-sky-300 text-sky-900 ring-1 ring-sky-300'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}>
                {isCompleted ? (
                  currentAnalysis?.detection?.is_cyclone === false ? (
                    <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">—</span>
                  ) : (
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                  )
                ) : currentStage === 'Intensity' ? (
                  <Loader2 size={18} className="animate-spin text-sky-600 shrink-0" />
                ) : (
                  <Wind size={18} className="text-slate-400 shrink-0" />
                )}
                <div>
                  <p className="font-semibold">2. Intensity Estimation</p>
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
              <div className={`p-3 rounded-lg border text-xs flex items-center gap-3 ${
                isCompleted
                  ? currentAnalysis?.detection?.is_cyclone === false
                    ? 'bg-slate-50 border-slate-200 text-slate-500'
                    : 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                  : currentStage === 'Classification'
                  ? 'bg-sky-50 border-sky-300 text-sky-900 ring-1 ring-sky-300'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}>
                {isCompleted ? (
                  currentAnalysis?.detection?.is_cyclone === false ? (
                    <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">—</span>
                  ) : (
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                  )
                ) : currentStage === 'Classification' ? (
                  <Loader2 size={18} className="animate-spin text-sky-600 shrink-0" />
                ) : (
                  <Gauge size={18} className="text-slate-400 shrink-0" />
                )}
                <div>
                  <p className="font-semibold">3. Classification</p>
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
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3 pt-3">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-emerald-900">
                      Analysis completed
                    </p>
                    <p className="text-[11px] text-emerald-700">
                      Predictions ready for inspection across detection, intensity, and classification.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('results')}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                >
                  <span>View Results</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyzePage;
