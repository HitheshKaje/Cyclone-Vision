import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  RotateCcw, 
  Play, 
  Loader2, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

const SatelliteUpload = ({
  currentAnalysis,
  onAnalysisSuccess,
  analysisStatus,
  setAnalysisStatus,
  currentStage,
  setCurrentStage,
  onNavigateToResults
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

        // Extract Objective 3 classification directly from backend intensity response
        if (intensityData && intensityData.classification) {
          classificationData = {
            classification: intensityData.classification,
            description: intensityData.description,
            wind_speed_kt: intensityData.wind_speed_kt,
            wind_speed_kmh: intensityData.wind_speed_kmh
          };
        }

        setCurrentStage('Classification');
        await new Promise(resolve => setTimeout(resolve, 250));
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

      if (onAnalysisSuccess) {
        onAnalysisSuccess(analysisRecord);
      }

    } catch (err) {
      console.error('Analysis error:', err);
      setErrorMessage(err.message || 'An error occurred during analysis.');
      setAnalysisStatus('error');
      setCurrentStage(null);
    }
  };

  const isAnalyzing = analysisStatus === 'analyzing';

  return (
    <div className="app-card p-5 sm:p-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200/50 dark:border-slate-700/30">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">
            Upload Satellite Image
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Select or drag an infrared or visual satellite image for analysis
          </p>
        </div>
        <span className="text-[11px] font-medium text-slate-500 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-md hidden sm:inline-block">
          JPG, PNG, TIFF
        </span>
      </div>

      {/* Main Dropzone / Image Container */}
      <div className="flex-1 flex flex-col space-y-4">
        {!previewUrl ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex-1 min-h-[260px] sm:min-h-[300px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 text-center transition-colors cursor-pointer ${
              isDragging
                ? 'border-sky-500 bg-emerald-500/100/10'
                : 'border-slate-300 bg-slate-100/60 dark:bg-slate-800/60 hover:bg-slate-800/60 hover:border-slate-400'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg, image/png, image/tiff"
              className="hidden"
            />
            
            <div className="w-12 h-12 rounded-full bg-white dark:bg-[#1e293b] border border-slate-200/50 dark:border-slate-700/50 shadow-xs flex items-center justify-center mb-3 text-emerald-400">
              <UploadCloud size={24} />
            </div>
            
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
              Click to browse or drag and drop image
            </p>
            <p className="text-xs text-slate-500 mb-4">
              Supported formats: JPG, PNG, TIFF (Max 15MB)
            </p>

            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-emerald-500/100 text-slate-900 dark:text-white font-medium text-xs shadow-xs hover:bg-emerald-600 transition-colors pointer-events-none"
            >
              Browse Files
            </button>
          </div>
        ) : (
          /* Preview Container with Strict object-fit: contain */
          <div className="flex-1 min-h-[280px] sm:min-h-[340px] rounded-xl overflow-hidden relative border border-slate-700/50/90 bg-white dark:bg-slate-900 shadow-xs flex items-center justify-center p-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg, image/png, image/tiff"
              className="hidden"
            />

            <img
              src={previewUrl}
              alt="Uploaded Satellite Image Preview"
              className="max-h-[360px] w-full object-contain"
            />

            {/* Change Image Button */}
            {!isAnalyzing && (
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetImage}
                  className="px-3.5 py-1.5 rounded-lg bg-[#1e293b]/95 hover:bg-slate-100 dark:hover:bg-[#1e293b] text-slate-800 dark:text-slate-200 hover:text-emerald-400 text-xs font-medium border border-slate-700/50/90 hover:border-sky-300 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Remove image"
                >
                  <RotateCcw size={13} />
                  <span>Change Image</span>
                </button>
              </div>
            )}

            {/* Active Analysis Stage Indicator Overlay */}
            {isAnalyzing && (
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-4">
                <div className="bg-white dark:bg-[#1e293b] rounded-xl p-4 shadow-xl border border-slate-200/50 dark:border-slate-700/50 flex flex-col items-center max-w-sm w-full text-center space-y-3">
                  <Loader2 size={24} className="animate-spin text-emerald-400" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {currentStage === 'Detection' && 'Running Cyclone Detection (Objective 1)...'}
                      {currentStage === 'Intensity' && 'Estimating Wind Intensity (Objective 2)...'}
                      {currentStage === 'Classification' && 'Categorizing Intensity (Objective 3)...'}
                      {!currentStage && 'Processing satellite image...'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Executing neural network inference
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleAnalyze}
            disabled={!file || isAnalyzing}
            className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${
              file && !isAnalyzing
                ? 'bg-emerald-500/100 hover:bg-emerald-600 text-slate-900 dark:text-white shadow-xs cursor-pointer'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50 cursor-not-allowed'
            }`}
          >
            {isAnalyzing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Analyzing Pipeline...</span>
              </>
            ) : (
              <>
                <Play size={16} className="fill-current" />
                <span>Analyze Image</span>
              </>
            )}
          </button>

          {analysisStatus === 'completed' && onNavigateToResults && (
            <button
              onClick={onNavigateToResults}
              className="py-2.5 px-4 rounded-lg bg-emerald-500/10 hover:bg-emerald-100 text-emerald-400 font-semibold text-sm border border-emerald-500/20 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 size={16} />
              <span>View Results</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SatelliteUpload;
