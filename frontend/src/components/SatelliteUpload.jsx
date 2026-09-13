import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  Image as ImageIcon, 
  Loader2, 
  RotateCcw, 
  Satellite, 
  Play, 
  Sparkles,
  ShieldAlert,
  CheckCircle2
} from 'lucide-react';

const SatelliteUpload = ({
  onAnalysisComplete,
  onIntensityComplete,
  analysisStatus,
  setAnalysisStatus,
  intensityStatus,
  setIntensityStatus,
  imagePreview,
  setImagePreview
}) => {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const processSelectedFile = (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(selectedFile);
    setAnalysisStatus('Pending');
    setIntensityStatus('Pending');
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

  const handleAnalyze = async () => {
    if (!file) return;
    
    setAnalysisStatus('Analyzing');
    setIntensityStatus('Pending');
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      // Step 1: Objective 1 Cyclone Detection
      const response = await fetch('http://localhost:8000/api/detect', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Detection request failed');
      }
      
      const detectData = await response.json();
      onAnalysisComplete(detectData);
      setAnalysisStatus('Completed');
      
      // Step 2: Objective 2 Intensity Estimation (ONLY if Cyclone is detected)
      if (detectData.is_cyclone) {
        setIntensityStatus('Estimating');
        try {
          const intensityFormData = new FormData();
          intensityFormData.append('image', file);
          const intensityResponse = await fetch('http://localhost:8000/api/intensity', {
            method: 'POST',
            body: intensityFormData,
          });
          
          if (!intensityResponse.ok) {
            throw new Error('Intensity request failed');
          }
          
          const intensityData = await intensityResponse.json();
          onIntensityComplete(intensityData);
          setIntensityStatus('Completed');
        } catch (intErr) {
          console.error('Intensity Error:', intErr);
          setIntensityStatus('Error');
          onIntensityComplete(null);
        }
      } else {
        // If No Cyclone, skip intensity estimation
        setIntensityStatus('Not Applicable');
        onIntensityComplete(null);
      }
    } catch (error) {
      console.error('Detection Error:', error);
      setAnalysisStatus('Error');
      setIntensityStatus('Pending');
    }
  };

  const isAnalyzing = analysisStatus === 'Analyzing' || intensityStatus === 'Estimating';

  return (
    <div className="glass-panel p-5 sm:p-6 flex flex-col h-full">
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-sky-100 text-sky-600">
            <Satellite size={22} className="shrink-0" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
              Analyze Satellite Image
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Upload a satellite image to detect cyclones and estimate their intensity using AI
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-200/80 text-sky-700 text-xs font-semibold">
          <Satellite size={14} className="text-sky-600" />
          <span>Multi-Source Satellite Data <span className="font-normal text-slate-500">(Himawari-8, GOES, etc.)</span></span>
        </div>
      </div>

      {/* Main Upload / Preview Area */}
      <div className="flex-1 flex flex-col space-y-4">
        {!imagePreview ? (
          /* Dropzone */
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex-1 min-h-[260px] sm:min-h-[300px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-sky-500 bg-sky-100/60 scale-[0.99]'
                : 'border-sky-200/90 bg-sky-50/40 hover:bg-sky-50/80 hover:border-sky-400'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg, image/png, image/tiff"
              className="hidden"
            />
            
            <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-sky-100 flex items-center justify-center mb-3 text-sky-500">
              <UploadCloud size={32} />
            </div>
            
            <p className="text-base font-bold text-slate-800 mb-1">
              Drag & drop a satellite image here
            </p>
            <p className="text-xs text-slate-500 mb-4">
              or click to browse from your device
            </p>
            
            <button
              type="button"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold text-sm shadow-sm hover:shadow-md transition-all pointer-events-none"
            >
              Upload Image
            </button>
            
            <p className="text-[11px] text-slate-400 mt-4">
              Supported formats: JPG, PNG (Max size: 10MB)
            </p>
          </div>
        ) : (
          /* Image Preview with Scan Animation */
          <div className="flex-1 min-h-[280px] sm:min-h-[320px] rounded-2xl overflow-hidden relative border border-slate-200 bg-slate-950 flex items-center justify-center group shadow-inner">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg, image/png, image/tiff"
              className="hidden"
            />

            <img
              src={imagePreview}
              alt="Satellite Cyclone Observation"
              className="w-full h-full max-h-[380px] object-contain transition-transform duration-500"
            />

            {/* Active AI Scanline Sweep Effect */}
            {isAnalyzing && (
              <>
                <div className="scanline-laser" />
                <div className="absolute inset-0 bg-sky-950/30 backdrop-blur-[1px] flex items-center justify-center">
                  <div className="px-4 py-2.5 rounded-xl bg-slate-900/90 text-white border border-sky-400/40 shadow-xl flex items-center gap-3">
                    <Loader2 size={18} className="animate-spin text-cyan-400" />
                    <span className="text-xs sm:text-sm font-semibold tracking-wide">
                      {analysisStatus === 'Analyzing'
                        ? 'Running Objective 1 Cyclone Detection...'
                        : 'Running Objective 2 Intensity Estimation...'}
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Floating Change Image Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              disabled={isAnalyzing}
              className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur-md text-xs font-semibold border border-white/20 shadow-md transition-all flex items-center gap-1.5 cursor-pointer z-20"
            >
              <RotateCcw size={13} />
              <span>Change Image</span>
            </button>
          </div>
        )}

        {/* Primary Action: Analyze Image Button */}
        <button
          onClick={handleAnalyze}
          disabled={!file || isAnalyzing}
          className={`w-full py-3.5 px-6 rounded-xl font-bold text-base shadow-md transition-all flex items-center justify-center gap-2.5 ${
            file && !isAnalyzing
              ? 'bg-gradient-to-r from-sky-500 via-cyan-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white shadow-sky-500/25 hover:shadow-lg hover:scale-[1.005] cursor-pointer'
              : 'bg-slate-200 text-slate-400 border border-slate-200/80 cursor-not-allowed shadow-none'
          }`}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              <span>Analyzing AI Models...</span>
            </>
          ) : (
            <>
              <Play size={18} className="fill-current" />
              <span>Analyze Image</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default SatelliteUpload;
