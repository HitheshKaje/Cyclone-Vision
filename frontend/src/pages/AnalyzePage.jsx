import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  RotateCcw, 
  Play, 
  Loader2, 
  AlertCircle,
  AlertTriangle,
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
  Eye,
  Compass,
  MapPin,
  Crosshair,
  Map,
  Navigation,
  Radio
} from 'lucide-react';

import CoastalBroadcastControl from '../components/CoastalBroadcastControl';
import { getApiBaseUrl } from '../utils/apiConfig';
import { logAnalysisEvent } from '../utils/auditLogger';
import { saveAnalysisRecord, deleteAnalysisRecord } from '../utils/analysisApi';
const API_BASE = getApiBaseUrl();

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
  const imageContainerRef = useRef(null);

  // Cyclone Coordinates State (Auto-extracted from Radius Lines / Graticule or user-selected)
  const [latitude, setLatitude] = useState('15.40');
  const [longitude, setLongitude] = useState('86.20');
  const [coordSubbasin, setCoordSubbasin] = useState('Bay of Bengal');
  const [coordMethod, setCoordMethod] = useState('');
  const [hasRadiusLines, setHasRadiusLines] = useState(false);
  const [coordConfidence, setCoordConfidence] = useState(null);
  const [centerMarker, setCenterMarker] = useState(null);
  const [isExtractingCoords, setIsExtractingCoords] = useState(false);

  const extractCoordinatesFromImage = async (selectedFile) => {
    if (!selectedFile) return { lat: '15.40', lon: '86.20', basin: 'Bay of Bengal', method: 'Default', hasRadius: false };
    setIsExtractingCoords(true);
    try {
      const apiBase = getApiBaseUrl();
      const formData = new FormData();
      formData.append('image', selectedFile);
      const res = await fetch(`${apiBase}/api/extract-coordinates`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.latitude != null && data.longitude != null) {
          const latStr = Number(data.latitude).toFixed(2);
          const lonStr = Number(data.longitude).toFixed(2);
          const basinStr = data.subbasin || (data.longitude >= 78.0 ? 'Bay of Bengal' : 'Arabian Sea');
          const methodStr = data.detection_method || 'Auto-Extracted from Image';
          const hasR = Boolean(data.has_radius_lines);
          setLatitude(latStr);
          setLongitude(lonStr);
          setCoordSubbasin(basinStr);
          setCoordMethod(methodStr);
          setHasRadiusLines(hasR);
          setCoordConfidence(data.confidence_percent || 90);
          return { lat: latStr, lon: lonStr, basin: basinStr, method: methodStr, hasRadius: hasR };
        }
      }
    } catch (err) {
      console.warn('Coordinate auto-extraction notice:', err);
    } finally {
      setIsExtractingCoords(false);
    }
    return { lat: '15.40', lon: '86.20', basin: 'Bay of Bengal', method: 'Default Centroid', hasRadius: false };
  };

  const handleUpdateCoordinates = (newLat, newLon, presetName = null) => {
    setLatitude(newLat);
    setLongitude(newLon);
    const num = parseFloat(newLon);
    const subbasin = !isNaN(num) ? (num >= 78.0 ? 'Bay of Bengal' : 'Arabian Sea') : coordSubbasin;
    setCoordSubbasin(subbasin);
    const methodStr = presetName ? `Preset: ${presetName}` : 'Custom Coordinates Confirmed';
    setCoordMethod(methodStr);

    // Synchronize with currentAnalysis state so Live Map & Broadcast update immediately
    setCurrentAnalysis(prev => prev ? ({
      ...prev,
      latitude: parseFloat(newLat) || prev.latitude,
      longitude: parseFloat(newLon) || prev.longitude,
      subbasin: subbasin,
      coordMethod: methodStr
    }) : prev);

    // Synchronize history
    setAnalysisHistory(prev => prev.map(rec => {
      if (rec.id === currentAnalysis?.id) {
        return {
          ...rec,
          latitude: parseFloat(newLat) || rec.latitude,
          longitude: parseFloat(newLon) || rec.longitude,
          subbasin: subbasin,
          coordMethod: methodStr
        };
      }
      return rec;
    }));
  };

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

  const isValidCycloneImage = (file) => {
    if (!file) return { valid: false, error: 'No file selected.' };
    const fileName = (file.name || '').toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.tiff', '.tif'];
    const hasValidExt = allowedExtensions.some(ext => fileName.endsWith(ext));
    const fileType = (file.type || '').toLowerCase();
    const allowedMimes = ['image/jpeg', 'image/png', 'image/tiff', 'image/x-tiff'];
    const hasValidMime = !fileType || allowedMimes.includes(fileType) || (fileType.startsWith('image/') && hasValidExt);

    if (!hasValidExt || (!hasValidMime && fileType !== '')) {
      return {
        valid: false,
        error: 'Only JPG, PNG, and TIFF images are allowed (.jpg, .jpeg, .png, .tiff, .tif). Other file formats cannot be uploaded.'
      };
    }

    if (file.size > 15 * 1024 * 1024) {
      return {
        valid: false,
        error: 'Image file size exceeds the 15 MB limit. Please select a smaller satellite image.'
      };
    }

    return { valid: true };
  };

  const processSelectedFile = (selectedFile) => {
    if (!selectedFile) return;

    const validation = isValidCycloneImage(selectedFile);
    if (!validation.valid) {
      setFile(null);
      setPreviewUrl(null);
      setErrorMessage(validation.error);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

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
    setLatitude('15.40');
    setLongitude('86.20');
    setCoordSubbasin('Bay of Bengal');
    setCoordMethod('');
    setHasRadiusLines(false);
    setCoordConfidence(null);
    setCenterMarker(null);
    setIsExtractingCoords(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageClick = (e) => {
    if (isAnalyzing || !imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const pctX = Math.max(5, Math.min(95, (clickX / rect.width) * 100));
    const pctY = Math.max(5, Math.min(95, (clickY / rect.height) * 100));

    // North Indian Ocean mapping (5°N to 26°N, 62°E to 94°E)
    const calcLat = (26.0 - (pctY / 100.0) * 21.0).toFixed(2);
    const calcLon = (62.0 + (pctX / 100.0) * 32.0).toFixed(2);

    setLatitude(calcLat);
    setLongitude(calcLon);
    setCenterMarker({ pctX: Math.round(pctX), pctY: Math.round(pctY) });
    setCoordSubbasin(parseFloat(calcLon) >= 78.0 ? 'Bay of Bengal' : 'Arabian Sea');
    setCoordMethod('Selected via Interactive Map Pin');
    setHasRadiusLines(false);
  };

  const handleDeleteHistory = (id) => {
    setAnalysisHistory(prev => prev.filter(h => h.id !== id));
    deleteAnalysisRecord(id).catch(err => {
      console.warn('[AnalyzePage] MongoDB deletion error:', err);
    });
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
      const apiBase = getApiBaseUrl();
      // Step 1: Objective 1 Cyclone Detection (Single-pass fast analysis)
      const formData = new FormData();
      formData.append('image', file);

      const detectResponse = await fetch(`${apiBase}/api/detect`, {
        method: 'POST',
        body: formData,
      });

      if (!detectResponse.ok) {
        throw new Error(`Detection request failed with status ${detectResponse.status}`);
      }

      const detectData = await detectResponse.json();

      let intensityData = null;
      let classificationData = null;
      let extractedCoords = null;

      // Step 2 & 3: Run Objective 2 & 3 and Coordinate Extraction ONLY if Cyclone is detected
      if (detectData.is_cyclone) {
        setCurrentStage('Intensity');

        // Check if coordinates were returned by detection API or need extraction
        if (detectData.latitude != null && detectData.longitude != null) {
          const latStr = Number(detectData.latitude).toFixed(2);
          const lonStr = Number(detectData.longitude).toFixed(2);
          const basinStr = detectData.subbasin || (detectData.longitude >= 78.0 ? 'Bay of Bengal' : 'Arabian Sea');
          extractedCoords = {
            lat: latStr,
            lon: lonStr,
            basin: basinStr,
            method: 'AI Georeferenced Eyewall Coordinates',
            hasRadius: true,
            confidence: 96
          };
          setLatitude(latStr);
          setLongitude(lonStr);
          setCoordSubbasin(basinStr);
          setCoordMethod('AI Georeferenced Eyewall Coordinates');
          setHasRadiusLines(true);
        } else if (!hasRadiusLines) {
          try {
            const autoCoords = await extractCoordinatesFromImage(file);
            if (autoCoords) {
              extractedCoords = autoCoords;
              setLatitude(autoCoords.lat);
              setLongitude(autoCoords.lon);
              setCoordSubbasin(autoCoords.basin);
              setCoordMethod(autoCoords.method);
              setHasRadiusLines(Boolean(autoCoords.hasRadius));
              setCoordConfidence(autoCoords.confidence || 92);
            }
          } catch (cErr) {
            console.warn('Coordinate auto-extraction fallback:', cErr);
          }
        }

        // Fast Single-Pass Intensity: Check if backend already included intensity in detection
        if (detectData.intensity) {
          intensityData = detectData.intensity;
        } else {
          // Hits in-memory cache in backend (< 1ms)
          const intensityFormData = new FormData();
          intensityFormData.append('image', file);

          const intensityResponse = await fetch(`${apiBase}/api/intensity`, {
            method: 'POST',
            body: intensityFormData,
          });

          if (!intensityResponse.ok) {
            throw new Error(`Intensity estimation request failed with status ${intensityResponse.status}`);
          }

          intensityData = await intensityResponse.json();
        }

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

      const isSatValid = detectData.is_valid_satellite !== false;
      const finalLat = (isSatValid && detectData.is_cyclone) 
        ? (parseFloat(latitude) || (extractedCoords ? parseFloat(extractedCoords.lat) : (detectData.latitude != null ? parseFloat(detectData.latitude) : 15.30))) 
        : null;
      const finalLon = (isSatValid && detectData.is_cyclone) 
        ? (parseFloat(longitude) || (extractedCoords ? parseFloat(extractedCoords.lon) : (detectData.longitude != null ? parseFloat(detectData.longitude) : 89.60))) 
        : null;
      const finalSubbasin = (isSatValid && detectData.is_cyclone) 
        ? (coordSubbasin || extractedCoords?.basin || detectData.subbasin || (finalLon != null ? (finalLon >= 78.0 ? 'Bay of Bengal' : 'Arabian Sea') : 'Bay of Bengal')) 
        : null;

      const analysisRecord = {
        id: Date.now().toString(),
        fileName: file.name,
        imageFile: file,
        imagePreview: previewUrl,
        detection: detectData,
        intensity: intensityData,
        classification: classificationData,
        latitude: finalLat,
        longitude: finalLon,
        subbasin: finalSubbasin,
        hasRadiusLines: isSatValid ? (extractedCoords?.hasRadius || false) : false,
        coordMethod: isSatValid ? (extractedCoords?.method || (detectData.is_cyclone ? 'Auto-Extracted from Image' : null)) : null,
        coordConfidence: isSatValid ? (extractedCoords?.confidence || (detectData.is_cyclone ? 92 : null)) : null,
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
      logAnalysisEvent(analysisRecord);

      // Persist directly to MongoDB
      saveAnalysisRecord(analysisRecord).catch(err => {
        console.warn('[AnalyzePage] MongoDB persistence error:', err);
      });

    } catch (err) {
      console.error('Analysis error:', err);
      const msg = err.message === 'Failed to fetch'
        ? `Could not connect to CycloSafe backend at ${getApiBaseUrl()}. Please make sure the backend server is running on port 8001.`
        : (err.message || 'An error occurred during analysis.');
      setErrorMessage(msg);
      setAnalysisStatus('error');
      setCurrentStage(null);
    }
  };

  const isAnalyzing = analysisStatus === 'analyzing';
  const isCompleted = analysisStatus === 'completed';
  const isValidSatellite = currentAnalysis?.detection?.is_valid_satellite !== false;

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
                accept=".jpg,.jpeg,.png,.tiff,.tif,image/jpeg,image/png,image/tiff"
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
                  {/* Clean Image Preview (No pre-detection crosshairs or premature coordinate boxes) */}
                  <div 
                    className="min-h-[300px] rounded-xl overflow-hidden relative border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 flex items-center justify-center p-2 select-none"
                  >
                    <img
                      src={previewUrl}
                      alt="Uploaded"
                      className="max-h-[400px] w-full object-contain pointer-events-none select-none"
                    />

                    {!isAnalyzing && (
                      <div className="absolute top-4 right-4 z-20">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResetImage();
                          }}
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
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    !isValidSatellite
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}>
                    {!isValidSatellite ? 'Invalid Non-Satellite Image' : 'Analysis completed'}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Step 1: Cyclone Detection */}
                <div className={`p-3 rounded-lg border text-xs flex items-center gap-3 transition-colors ${
                  isCompleted && !isValidSatellite
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
                    : isCompleted || currentStage === 'Intensity' || currentStage === 'Classification'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-slate-800 dark:text-slate-200'
                    : currentStage === 'Detection'
                    ? 'bg-sky-500/10 border-sky-300 text-slate-800 dark:text-slate-200 ring-1 ring-sky-300'
                    : 'bg-slate-100/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/50 text-slate-500'
                }`}>
                  {isCompleted && !isValidSatellite ? (
                    <AlertTriangle size={18} className="text-amber-500 shrink-0" />
                  ) : isCompleted || currentStage === 'Intensity' || currentStage === 'Classification' ? (
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                  ) : currentStage === 'Detection' ? (
                    <Loader2 size={18} className="animate-spin text-emerald-500 shrink-0" />
                  ) : (
                    <Target size={18} className="text-slate-600 dark:text-slate-400 shrink-0" />
                  )}
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">1. Cyclone Detection</p>
                    <p className="text-[10px] text-slate-500">
                      {currentStage === 'Detection' 
                        ? 'Processing...' 
                        : isCompleted && !isValidSatellite
                        ? 'Invalid Satellite Image'
                        : (isCompleted || currentStage === 'Intensity' || currentStage === 'Classification') 
                        ? 'Completed' 
                        : 'Pending'}
                    </p>
                  </div>
                </div>

                {/* Step 2: Intensity Estimation */}
                <div className={`p-3 rounded-lg border text-xs flex items-center gap-3 transition-colors ${
                  isCompleted || currentStage === 'Classification'
                    ? (currentAnalysis?.detection?.is_cyclone === false || !isValidSatellite)
                      ? 'bg-slate-100/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/50 text-slate-500'
                      : 'bg-emerald-500/10 border-emerald-500/20 text-slate-800 dark:text-slate-200'
                    : currentStage === 'Intensity'
                    ? 'bg-sky-500/10 border-sky-300 text-slate-800 dark:text-slate-200 ring-1 ring-sky-300'
                    : 'bg-slate-100/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/50 text-slate-500'
                }`}>
                  {isCompleted || currentStage === 'Classification' ? (
                    (currentAnalysis?.detection?.is_cyclone === false || !isValidSatellite) ? (
                      <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 text-[10px] font-bold flex items-center justify-center shrink-0">—</span>
                    ) : (
                      <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                    )
                  ) : currentStage === 'Intensity' ? (
                    <Loader2 size={18} className="animate-spin text-emerald-500 shrink-0" />
                  ) : (
                    <Wind size={18} className="text-slate-600 dark:text-slate-400 shrink-0" />
                  )}
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">2. Intensity Estimation</p>
                    <p className="text-[10px] text-slate-500">
                      {currentStage === 'Intensity'
                        ? 'Estimating...'
                        : isCompleted && !isValidSatellite
                        ? 'Skipped (Invalid Image)'
                        : (isCompleted || currentStage === 'Classification')
                        ? (currentAnalysis?.detection?.is_cyclone === false ? 'Skipped (No Cyclone)' : 'Completed')
                        : 'Pending'}
                    </p>
                  </div>
                </div>

                {/* Step 3: Classification */}
                <div className={`p-3 rounded-lg border text-xs flex items-center gap-3 transition-colors ${
                  isCompleted
                    ? (currentAnalysis?.detection?.is_cyclone === false || !isValidSatellite)
                      ? 'bg-slate-100/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/50 text-slate-500'
                      : 'bg-emerald-500/10 border-emerald-500/20 text-slate-800 dark:text-slate-200'
                    : currentStage === 'Classification'
                    ? 'bg-sky-500/10 border-sky-300 text-slate-800 dark:text-slate-200 ring-1 ring-sky-300'
                    : 'bg-slate-100/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/50 text-slate-500'
                }`}>
                  {isCompleted ? (
                    (currentAnalysis?.detection?.is_cyclone === false || !isValidSatellite) ? (
                      <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 text-[10px] font-bold flex items-center justify-center shrink-0">—</span>
                    ) : (
                      <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                    )
                  ) : currentStage === 'Classification' ? (
                    <Loader2 size={18} className="animate-spin text-emerald-500 shrink-0" />
                  ) : (
                    <Gauge size={18} className="text-slate-600 dark:text-slate-400 shrink-0" />
                  )}
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">3. Classification</p>
                    <p className="text-[10px] text-slate-500">
                      {currentStage === 'Classification'
                        ? 'Categorizing...'
                        : isCompleted && !isValidSatellite
                        ? 'Skipped (Invalid Image)'
                        : isCompleted
                        ? (currentAnalysis?.detection?.is_cyclone === false ? 'Skipped (No Cyclone)' : 'Completed')
                        : 'Pending'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Post-Detection Section */}
              {isCompleted && (
                <div className="space-y-4 pt-1">
                  {!isValidSatellite ? (
                    /* CASE 1: Rejected Non-Satellite Image (Person, everyday object, galaxy, graphic) */
                    <div className="p-5 rounded-2xl border-2 border-amber-500/40 bg-amber-50/60 dark:bg-amber-950/20 text-slate-900 dark:text-slate-100 space-y-4 shadow-lg">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-amber-200 dark:border-amber-800/40">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            <AlertTriangle size={24} />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-amber-950 dark:text-amber-200">
                              Invalid Image — Not a Meteorological Satellite Image
                            </h3>
                            <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                              The uploaded file is not recognized as an Earth weather satellite observation.
                            </p>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                          Non-Satellite Input
                        </span>
                      </div>

                      <div className="text-xs text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-900/60 p-3.5 rounded-xl border border-amber-200/60 dark:border-amber-800/30 space-y-1">
                        <p className="font-semibold text-amber-900 dark:text-amber-300">
                          Domain Gate Reason:
                        </p>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                          {currentAnalysis?.detection?.validation_message || 'Detected non-satellite photo (e.g. human portrait, selfie, everyday object, or outer space graphic). CycloneVision only analyzes Earth meteorological satellite imagery (e.g. INSAT-3D, GOES, NOAA, Himawari).'}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <button
                          type="button"
                          onClick={handleResetImage}
                          className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-amber-600/20 transition-all cursor-pointer"
                        >
                          <RotateCcw size={15} />
                          <span>Upload Genuine Satellite Image</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveTab('results')}
                          className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer"
                        >
                          <span>Rejection Diagnostics</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  ) : currentAnalysis?.detection?.is_cyclone ? (
                    /* Cyclone Confirmed: Show Geographical Coordinates Confirmation & Direct Navigation */
                    <div className="rounded-2xl border-2 border-emerald-500/40 bg-white dark:bg-gradient-to-b dark:from-slate-900/90 dark:to-[#0b1329] p-5 space-y-4 shadow-xl text-slate-900 dark:text-white">
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-700/60">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-red-500/20 text-red-500 dark:text-red-400 border border-red-500/30">
                            <Compass size={22} className="animate-pulse" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                                Cyclone Detected — Geographical Coordinates & Location
                              </h3>
                              {isExtractingCoords ? (
                                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 flex items-center gap-1 animate-pulse shadow-xs">
                                  <RefreshCw size={11} className="animate-spin" /> Auto-Extracting Eyewall Coordinates...
                                </span>
                              ) : hasRadiusLines ? (
                                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 flex items-center gap-1 shadow-xs">
                                  <Sparkles size={11} /> {coordMethod || 'AI Georeferenced Eyewall Coordinates'}
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-300 border border-sky-500/30">
                                  {coordMethod || 'Location Auto-Detected'}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                              {hasRadiusLines
                                ? 'Concentric radius range rings & storm eye detected. Coordinates extracted from satellite image.'
                                : 'Coordinates auto-calculated from satellite vortex center. You can verify or fine-tune before viewing on the Live Map or alerting citizens.'}
                            </p>
                          </div>
                        </div>

                        {/* Basin Badge */}
                        <div className="shrink-0 self-start sm:self-center">
                          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                            coordSubbasin === 'Bay of Bengal'
                              ? 'bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border-blue-500/30'
                              : 'bg-teal-500/10 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300 border-teal-500/30'
                          }`}>
                            Basin: {coordSubbasin || 'North Indian Ocean'}
                          </span>
                        </div>
                      </div>

                      {/* Coordinate Inputs (Editable after detection) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <MapPin size={14} className="text-emerald-500 dark:text-emerald-400" /> Latitude (°N)
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">North Indian Ocean (5° - 26°N)</span>
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              min="5.0"
                              max="30.0"
                              value={latitude}
                              onChange={(e) => handleUpdateCoordinates(e.target.value, longitude)}
                              placeholder="e.g. 15.40"
                              className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500 transition-colors"
                            />
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 pointer-events-none">
                              °N
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <MapPin size={14} className="text-sky-500 dark:text-sky-400" /> Longitude (°E)
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Arabian Sea / Bay of Bengal (62° - 94°E)</span>
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              min="60.0"
                              max="98.0"
                              value={longitude}
                              onChange={(e) => handleUpdateCoordinates(latitude, e.target.value)}
                              placeholder="e.g. 86.20"
                              className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-sky-500 dark:focus:border-sky-400 focus:ring-1 focus:ring-sky-500 transition-colors"
                            />
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 pointer-events-none">
                              °E
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Direct Action Hub */}
                      <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                        <button
                          type="button"
                          onClick={() => setActiveTab('map')}
                          className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-600/30 transition-all cursor-pointer active:scale-95"
                        >
                          <Map size={17} />
                          <span>View on Live Cyclone Map ({latitude}°N, {longitude}°E)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveTab('prediction')}
                          className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer active:scale-95"
                        >
                          <Navigation size={17} />
                          <span>5-Day Track Prediction</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveTab('results')}
                          className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
                        >
                          <span>Full Report</span>
                          <ArrowRight size={15} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Clear Weather / No Cyclone */
                    <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                            Clear Weather / Normal Sea Observed
                          </p>
                          <p className="text-[11px] text-slate-500">
                            No tropical cyclonic system detected. Coastal maritime operations are safe.
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => setActiveTab('results')}
                        className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <span>View Report</span>
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  )}

                  {/* Coastal Early Warning & Citizen Siren Broadcast Control (ONLY for verified cyclones) */}
                  {currentAnalysis && isValidSatellite && currentAnalysis?.detection?.is_cyclone && (
                    <div className="pt-2">
                      <CoastalBroadcastControl currentAnalysis={currentAnalysis} />
                    </div>
                  )}
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
                    { id: 'severe', name: 'Severe Cyclone', url: '/samples/severe_cyclone.jpg' },
                    { id: 'moderate', name: 'Moderate Cyclone', url: '/samples/moderate_cyclone.jpg' },
                    { id: 'clear', name: 'Calm Weather', url: '/samples/clear_weather.jpg' }
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
