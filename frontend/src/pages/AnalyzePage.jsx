import React, { useState, useRef, useEffect } from 'react';
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
  Radio,
  Zap,
  History,
  Calendar,
  Anchor,
  Landmark,
  Activity,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

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
  const [operationalMode, setOperationalMode] = useState(() => currentAnalysis?.operationalMode || 'demo');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(currentAnalysis?.imagePreview || null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const fileInputRef = useRef(null);
  const imageContainerRef = useRef(null);

  // Cyclone Coordinates State (Synchronized with currentAnalysis)
  const [latitude, setLatitude] = useState(() => currentAnalysis?.latitude != null ? String(currentAnalysis.latitude) : '15.40');
  const [longitude, setLongitude] = useState(() => currentAnalysis?.longitude != null ? String(currentAnalysis.longitude) : '86.20');
  const [coordSubbasin, setCoordSubbasin] = useState(() => currentAnalysis?.subbasin || 'Bay of Bengal');
  const [coordMethod, setCoordMethod] = useState(() => currentAnalysis?.coordMethod || '');
  const [hasRadiusLines, setHasRadiusLines] = useState(() => Boolean(currentAnalysis?.hasRadiusLines));
  const [coordConfidence, setCoordConfidence] = useState(() => currentAnalysis?.coordConfidence || null);
  const [centerMarker, setCenterMarker] = useState(null);
  const [isExtractingCoords, setIsExtractingCoords] = useState(false);

  // Synchronize local states whenever currentAnalysis changes (e.g. from history or tab navigation)
  useEffect(() => {
    if (currentAnalysis) {
      if (currentAnalysis.operationalMode) setOperationalMode(currentAnalysis.operationalMode);
      if (currentAnalysis.latitude != null) setLatitude(String(currentAnalysis.latitude));
      if (currentAnalysis.longitude != null) setLongitude(String(currentAnalysis.longitude));
      if (currentAnalysis.subbasin) setCoordSubbasin(currentAnalysis.subbasin);
      if (currentAnalysis.coordMethod) setCoordMethod(currentAnalysis.coordMethod);
      if (currentAnalysis.hasRadiusLines != null) setHasRadiusLines(Boolean(currentAnalysis.hasRadiusLines));
      if (currentAnalysis.coordConfidence != null) setCoordConfidence(currentAnalysis.coordConfidence);
      if (currentAnalysis.imagePreview) setPreviewUrl(currentAnalysis.imagePreview);
    }
  }, [currentAnalysis]);

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

    const parsedLat = parseFloat(newLat) || null;
    const parsedLon = parseFloat(newLon) || null;

    // Synchronize with currentAnalysis state so Live Map, Results, & Broadcast update immediately
    setCurrentAnalysis(prev => prev ? ({
      ...prev,
      latitude: parsedLat !== null ? parsedLat : prev.latitude,
      longitude: parsedLon !== null ? parsedLon : prev.longitude,
      subbasin: subbasin,
      coordMethod: methodStr,
      detection: prev.detection ? {
        ...prev.detection,
        latitude: parsedLat !== null ? parsedLat : prev.detection.latitude,
        longitude: parsedLon !== null ? parsedLon : prev.detection.longitude,
        subbasin: subbasin
      } : prev.detection
    }) : prev);

    // Synchronize history
    setAnalysisHistory(prev => prev.map(rec => {
      if (rec.id === currentAnalysis?.id) {
        return {
          ...rec,
          latitude: parsedLat !== null ? parsedLat : rec.latitude,
          longitude: parsedLon !== null ? parsedLon : rec.longitude,
          subbasin: subbasin,
          coordMethod: methodStr
        };
      }
      return rec;
    }));
  };

  const handleNavigateWithSync = (tabTarget) => {
    if (currentAnalysis) {
      const syncLat = parseFloat(latitude) || currentAnalysis.latitude;
      const syncLon = parseFloat(longitude) || currentAnalysis.longitude;
      const syncBasin = coordSubbasin || currentAnalysis.subbasin;
      const syncMethod = coordMethod || currentAnalysis.coordMethod;
      setCurrentAnalysis(prev => prev ? ({
        ...prev,
        latitude: syncLat,
        longitude: syncLon,
        subbasin: syncBasin,
        coordMethod: syncMethod,
        detection: prev.detection ? {
          ...prev.detection,
          latitude: syncLat,
          longitude: syncLon,
          subbasin: syncBasin
        } : prev.detection
      }) : prev);
    }
    setActiveTab(tabTarget);
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
    setLatitude('');
    setLongitude('');
    setCoordSubbasin('');
    setCoordMethod('');
    setHasRadiusLines(false);

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
      formData.append('mode', operationalMode);

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

      let activeLat = null;
      let activeLon = null;
      let activeBasin = null;
      let activeMethod = 'AI Georeferenced Eyewall Coordinates';
      let activeHasRadius = true;
      let activeConfidence = 96;

      // Step 2 & 3: Run Objective 2 & 3 and Coordinate Extraction ONLY if Cyclone is detected
      if (detectData.is_cyclone) {
        setCurrentStage('Intensity');

        // Check if coordinates were returned by detection API or need extraction
        if (detectData.latitude != null && detectData.longitude != null) {
          activeLat = Number(detectData.latitude).toFixed(2);
          activeLon = Number(detectData.longitude).toFixed(2);
          activeBasin = detectData.subbasin || (Number(detectData.longitude) >= 78.0 ? 'Bay of Bengal' : 'Arabian Sea');
          activeMethod = 'AI Georeferenced Eyewall Coordinates';
          activeHasRadius = true;
          activeConfidence = 96;
        } else {
          try {
            const autoCoords = await extractCoordinatesFromImage(file);
            if (autoCoords) {
              activeLat = autoCoords.lat;
              activeLon = autoCoords.lon;
              activeBasin = autoCoords.basin;
              activeMethod = autoCoords.method;
              activeHasRadius = Boolean(autoCoords.hasRadius);
              activeConfidence = autoCoords.confidence || 92;
            }
          } catch (cErr) {
            console.warn('Coordinate auto-extraction fallback:', cErr);
          }
        }

        if (!activeLat) activeLat = latitude || '15.40';
        if (!activeLon) activeLon = longitude || '86.20';
        if (!activeBasin) activeBasin = coordSubbasin || (parseFloat(activeLon) >= 78.0 ? 'Bay of Bengal' : 'Arabian Sea');

        setLatitude(activeLat);
        setLongitude(activeLon);
        setCoordSubbasin(activeBasin);
        setCoordMethod(activeMethod);
        setHasRadiusLines(activeHasRadius);
        setCoordConfidence(activeConfidence);

        extractedCoords = {
          lat: activeLat,
          lon: activeLon,
          basin: activeBasin,
          method: activeMethod,
          hasRadius: activeHasRadius,
          confidence: activeConfidence
        };

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
      const finalLat = (isSatValid && detectData.is_cyclone && activeLat != null) ? parseFloat(activeLat) : null;
      const finalLon = (isSatValid && detectData.is_cyclone && activeLon != null) ? parseFloat(activeLon) : null;
      const finalSubbasin = (isSatValid && detectData.is_cyclone) ? activeBasin : null;

      if (detectData && finalLat != null && finalLon != null) {
        detectData.latitude = finalLat;
        detectData.longitude = finalLon;
        detectData.subbasin = finalSubbasin;
      }

      const cycloneName = detectData.cyclone_name || (detectData.is_cyclone ? 'Tropical Cyclone' : null);
      const temporalStatus = detectData.temporal_status || (operationalMode === 'live' ? 'ACTIVE_PRESENT' : null);
      const historicalInfo = detectData.historical_info || null;
      const activeTrajectory = detectData.active_trajectory || null;
      const completeTrack = Array.isArray(detectData.complete_track) ? detectData.complete_track : [];
      const internetSources = Array.isArray(detectData.internet_sources) ? detectData.internet_sources : [];
      const internetVerified = Boolean(detectData.internet_verified);
      const lifecycleDates = detectData.lifecycle_dates || null;

      const analysisRecord = {
        id: Date.now().toString(),
        fileName: file.name,
        imageFile: file,
        imagePreview: previewUrl,
        operationalMode: operationalMode,
        cycloneName: cycloneName,
        temporalStatus: temporalStatus,
        historicalInfo: historicalInfo,
        activeTrajectory: activeTrajectory,
        completeTrack: completeTrack,
        internetSources: internetSources,
        internetVerified: internetVerified,
        lifecycleDates: lifecycleDates,
        detection: detectData,
        intensity: intensityData,
        classification: classificationData,
        latitude: finalLat,
        longitude: finalLon,
        subbasin: finalSubbasin,
        hasRadiusLines: isSatValid ? activeHasRadius : false,
        coordMethod: isSatValid ? activeMethod : null,
        coordConfidence: isSatValid ? activeConfidence : null,
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
            <div className={`p-2 rounded-xl text-white ${operationalMode === 'live' ? 'bg-rose-500/80 text-white' : 'bg-sky-500/20 text-sky-400'}`}>
              {operationalMode === 'live' ? <Radio size={24} className="animate-pulse" /> : <UploadCloud size={24} />}
            </div>
            Analyze Satellite Image
          </h1>
          <p className="text-sm text-slate-700 dark:text-slate-300 mt-2 font-medium">
            Upload a satellite image to detect cyclones, estimate intensity, and track trajectory.
          </p>
        </div>
      </div>

      {/* Operational Mode Switcher (Demo vs Go Live) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 px-4 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Mode:
          </span>
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
            operationalMode === 'live'
              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
              : 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20'
          }`}>
            {operationalMode === 'live' ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                <span>Live Mode</span>
              </>
            ) : (
              <>
                <Sparkles size={13} />
                <span>Demo Mode</span>
              </>
            )}
          </span>
        </div>

        <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-inner">
          <button
            type="button"
            onClick={() => {
              setOperationalMode('demo');
              handleResetImage();
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              operationalMode === 'demo'
                ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles size={14} />
            <span>Demo Mode</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setOperationalMode('live');
              handleResetImage();
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              operationalMode === 'live'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${operationalMode === 'live' ? 'bg-white' : 'bg-rose-500'} animate-pulse`}></span>
            <span>Go Live</span>
          </button>
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
                          ? operationalMode === 'live'
                            ? 'bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-rose-600/30 cursor-pointer active:scale-98'
                            : 'bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-900 shadow-lg shadow-emerald-500/20 cursor-pointer active:scale-98'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed'
                      }`}
                    >
                      {isAnalyzing ? (
                        <><Loader2 size={18} className="animate-spin" /> {operationalMode === 'live' ? 'Searching Internet & Live Cyclone Feeds...' : 'Running AI Analysis...'}</>
                      ) : (
                        <><Play size={16} className="fill-current" /> {operationalMode === 'live' ? '🔴 Search Internet & Analyze Live Cyclone' : 'Analyze Image'}</>
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
                        : isCompleted && currentAnalysis?.detection
                        ? (currentAnalysis.detection.is_cyclone ? `Cyclone Detected (${currentAnalysis.detection.confidence_percent != null ? currentAnalysis.detection.confidence_percent : 99}%)` : 'No Cyclone')
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
                        : isCompleted && currentAnalysis?.detection?.is_cyclone === false
                        ? 'Skipped (No Cyclone)'
                        : isCompleted && currentAnalysis?.intensity?.wind_speed_kt != null
                        ? `${currentAnalysis.intensity.wind_speed_kt} kt (~${currentAnalysis.intensity.wind_speed_kmh} km/h)`
                        : (isCompleted || currentStage === 'Classification')
                        ? 'Completed'
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
                        : isCompleted && currentAnalysis?.detection?.is_cyclone === false
                        ? 'Skipped (No Cyclone)'
                        : isCompleted && (currentAnalysis?.classification?.classification || currentAnalysis?.intensity?.classification)
                        ? `${currentAnalysis.classification?.classification || currentAnalysis.intensity?.classification} (${currentAnalysis?.intensity?.category_code || 'TD'})`
                        : isCompleted
                        ? 'Completed'
                        : 'Pending'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Post-Detection Section */}
              {isCompleted && (
                <div className="space-y-4 pt-1">
                  {!isValidSatellite ? (
                    /* CASE 1: Rejected Image (Non-satellite or Non-Indian coastal region) */
                    (() => {
                      const isCoastalRejection = currentAnalysis?.detection?.validation_message?.toLowerCase()?.includes('indian coastal');
                      return (
                        <div className="p-5 rounded-2xl border-2 border-amber-500/40 bg-amber-50/60 dark:bg-amber-950/20 text-slate-900 dark:text-slate-100 space-y-4 shadow-lg">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-amber-200 dark:border-amber-800/40">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                <AlertTriangle size={24} />
                              </div>
                              <div>
                                <h3 className="text-base font-bold text-amber-950 dark:text-amber-200">
                                  {isCoastalRejection 
                                    ? 'Regional Domain Restriction — Indian Coastal Regions Only' 
                                    : 'Invalid Image — Not a Meteorological Satellite Image'}
                                </h3>
                                <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                                  {isCoastalRejection 
                                    ? 'Only tropical cyclones and weather observations from the Bay of Bengal or Arabian Sea are permitted.'
                                    : 'The uploaded file is not recognized as an Earth weather satellite observation.'}
                                </p>
                              </div>
                            </div>
                            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                              {isCoastalRejection ? 'Non-Indian Coastal Region' : 'Non-Satellite Input'}
                            </span>
                          </div>

                          <div className="text-xs text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-900/60 p-3.5 rounded-xl border border-amber-200/60 dark:border-amber-800/30 space-y-1">
                            <p className="font-semibold text-amber-900 dark:text-amber-300">
                              Validation Notice:
                            </p>
                            <p className="text-slate-700 dark:text-slate-200 leading-relaxed font-bold">
                              {currentAnalysis?.detection?.validation_message || 'Please upload Indian coastal related images only.'}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 pt-1">
                            <button
                              type="button"
                              onClick={handleResetImage}
                              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-amber-600/20 transition-all cursor-pointer"
                            >
                              <RotateCcw size={15} />
                              <span>{isCoastalRejection ? 'Upload Indian Coastal Image' : 'Upload Genuine Satellite Image'}</span>
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
                      );
                    })()
                  ) : currentAnalysis?.detection?.is_cyclone ? (
                    /* Cyclone Confirmed: Clean Telemetry, Intensity & Coordinates Card */
                    <div className="rounded-2xl border-2 border-emerald-500/40 bg-white dark:bg-gradient-to-b dark:from-slate-900/95 dark:to-[#0b1329] p-5 space-y-4 shadow-xl text-slate-900 dark:text-white">
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl border ${
                            operationalMode === 'live' && currentAnalysis.temporalStatus === 'HISTORICAL'
                              ? 'bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 border-emerald-500/30'
                              : 'bg-red-500/20 text-red-500 dark:text-red-400 border-red-500/30'
                          }`}>
                            {operationalMode === 'live' && currentAnalysis.temporalStatus === 'HISTORICAL'
                              ? <CheckCircle2 size={24} />
                              : <Compass size={24} className="animate-pulse" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                                {operationalMode === 'live' && (currentAnalysis.cycloneName || currentAnalysis.historicalInfo?.cyclone_name || currentAnalysis.historicalInfo?.name)
                                  ? (currentAnalysis.cycloneName || currentAnalysis.historicalInfo?.cyclone_name || currentAnalysis.historicalInfo?.name)
                                  : 'Cyclone Detected — Coordinates & Location'}
                              </h3>
                              {operationalMode === 'live' && currentAnalysis.temporalStatus === 'HISTORICAL' ? (
                                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shadow-xs">
                                  <CheckCircle2 size={11} /> Completed Cyclone (Verified Original Record)
                                </span>
                              ) : operationalMode === 'live' && currentAnalysis.temporalStatus === 'ACTIVE_PRESENT' ? (
                                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1 shadow-xs">
                                  <Radio size={11} className="animate-pulse" /> {currentAnalysis.internetVerified ? 'Currently Running (Live Internet Feed)' : 'Live Satellite & Internet Telemetry'}
                                </span>
                              ) : (
                                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30 flex items-center gap-1 shadow-xs">
                                  <Sparkles size={11} /> Demo Mode: AI Georeferenced & Predicted
                                </span>
                              )}
                              {operationalMode === 'live' && (currentAnalysis.historicalInfo?.season || currentAnalysis.lifecycleDates?.formed) && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                  {currentAnalysis.lifecycleDates?.formed && currentAnalysis.lifecycleDates?.dissipated
                                    ? `${currentAnalysis.lifecycleDates.formed} – ${currentAnalysis.lifecycleDates.dissipated}`
                                    : currentAnalysis.historicalInfo?.season}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Basin Badge */}
                        <div className="shrink-0 self-start sm:self-center">
                          <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-500/30">
                            Basin: {currentAnalysis.historicalInfo?.basin || coordSubbasin || 'Bay of Bengal'}
                          </span>
                        </div>
                      </div>

                      {/* Original Intensity / Historical Summary & Track Indicator in Live Mode */}
                      {operationalMode === 'live' && currentAnalysis.historicalInfo?.summary && (
                        <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-xs text-slate-700 dark:text-slate-200 space-y-1.5">
                          <p className="leading-relaxed font-medium">{currentAnalysis.historicalInfo.summary}</p>
                          {Array.isArray(currentAnalysis.internetSources) && currentAnalysis.internetSources.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-emerald-200/60 dark:border-emerald-800/30 text-[11px]">
                              <span className="font-bold text-emerald-700 dark:text-emerald-400">Internet Sources:</span>
                              {currentAnalysis.internetSources.slice(0, 3).map((src, i) => (
                                <a
                                  key={i}
                                  href={src.url || '#'}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-emerald-300/60 dark:border-emerald-700/60 text-sky-600 dark:text-sky-400 hover:underline font-semibold truncate max-w-[220px]"
                                >
                                  {src.name}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Intensity & Landfall Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {/* Peak Sustained Wind (Intensity) */}
                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
                          <div className="flex items-center justify-between gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
                            <span className="flex items-center gap-1.5">
                              <Wind size={15} /> {operationalMode === 'live' && (currentAnalysis.intensity?.is_original_verified || currentAnalysis.historicalInfo) ? 'Original Verified Peak Wind' : 'Peak Sustained Wind'}
                            </span>
                            {operationalMode === 'live' && currentAnalysis.intensity?.estimated_pressure_mb && (
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                {currentAnalysis.intensity.estimated_pressure_mb} hPa
                              </span>
                            )}
                          </div>
                          <p className="text-lg font-black text-slate-900 dark:text-white">
                            {currentAnalysis.intensity?.wind_speed_kt || currentAnalysis.detection?.wind_speed_kt || (operationalMode === 'live' && currentAnalysis.historicalInfo?.peak_intensity_kt) || 65} kt
                            <span className="text-xs font-normal text-slate-500 ml-1.5">
                              (~{currentAnalysis.intensity?.wind_speed_kmh || (operationalMode === 'live' && currentAnalysis.historicalInfo?.peak_intensity_kmh) || Math.round((currentAnalysis.intensity?.wind_speed_kt || 65) * 1.852)} km/h)
                            </span>
                          </p>
                          <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            {currentAnalysis.intensity?.category || currentAnalysis.classification?.category || (operationalMode === 'live' && currentAnalysis.historicalInfo?.category) || 'Severe Cyclonic Storm'}
                          </p>
                        </div>

                        {/* Card 2: Show Completed Landfall / Live Projected Landfall in Live Mode, Central Pressure in Demo Mode */}
                        {operationalMode === 'live' && currentAnalysis.historicalInfo?.actual_landfall ? (
                          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
                            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              <Anchor size={15} /> Actual Landfall & Complete Track
                            </div>
                            <p className="text-sm font-black text-slate-900 dark:text-white">
                              {currentAnalysis.historicalInfo.actual_landfall}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {Array.isArray(currentAnalysis.completeTrack) && currentAnalysis.completeTrack.length > 0
                                ? `Complete Track Verified (${currentAnalysis.completeTrack.length} Lifecycle Waypoints)`
                                : 'IMD Official Meteorological Archive'}
                            </p>
                          </div>
                        ) : operationalMode === 'live' && currentAnalysis.activeTrajectory?.projected_landfall ? (
                          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
                            <div className="flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-400">
                              <Compass size={15} /> Projected Landfall & Track
                            </div>
                            <p className="text-sm font-black text-slate-900 dark:text-white">
                              {currentAnalysis.activeTrajectory.projected_landfall}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              Live Satellite Tracking ({currentAnalysis.activeTrajectory.movement_direction || 'WNW Direction'})
                            </p>
                          </div>
                        ) : operationalMode === 'live' && currentAnalysis.activeTrajectory?.closest_port ? (
                          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
                            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              <Anchor size={15} /> Proximity to Harbor
                            </div>
                            <p className="text-sm font-black text-slate-900 dark:text-white">
                              {currentAnalysis.activeTrajectory.distance_km} km to {currentAnalysis.activeTrajectory.closest_port}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              Marine Early Warning
                            </p>
                          </div>
                        ) : (
                          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
                            <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400">
                              <Activity size={15} /> Estimated Central Pressure
                            </div>
                            <p className="text-lg font-black text-slate-900 dark:text-white">
                              {currentAnalysis.intensity?.pressure_mb || currentAnalysis.intensity?.estimated_pressure_mb || 968} hPa
                              <span className="text-xs font-normal text-slate-500 ml-1.5">
                                (Barometric Core)
                              </span>
                            </p>
                            <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                              High Threat Cyclonic Vortex
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Coordinates: Latitude & Longitude Inputs */}
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
                              placeholder="e.g. 16.50"
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
                          onClick={() => handleNavigateWithSync('map')}
                          className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95 text-white ${
                            operationalMode === 'live' && currentAnalysis.temporalStatus === 'HISTORICAL' && Array.isArray(currentAnalysis.completeTrack) && currentAnalysis.completeTrack.length > 0
                              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/30'
                              : 'bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 shadow-sky-600/30'
                          }`}
                        >
                          <Map size={17} />
                          <span>
                            {operationalMode === 'live' && currentAnalysis.temporalStatus === 'HISTORICAL' && Array.isArray(currentAnalysis.completeTrack) && currentAnalysis.completeTrack.length > 0
                              ? `View Complete Cyclone Track on Map (${currentAnalysis.completeTrack.length} Points)`
                              : `View on Live Cyclone Map (${latitude}°N, ${longitude}°E)`}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleNavigateWithSync('prediction')}
                          className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer active:scale-95"
                        >
                          <Navigation size={17} />
                          <span>
                            {operationalMode === 'live' && currentAnalysis.temporalStatus === 'HISTORICAL'
                              ? 'Complete Track & Lifecycle View'
                              : '5-Day Track Prediction'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleNavigateWithSync('results')}
                          className="py-3 px-4 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-sm"
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
            
            {/* Try Sample Images / Real-World Feeds */}
            <div className={`app-card p-5 border transition-all ${
              operationalMode === 'live' 
                ? 'border-red-500/30 bg-gradient-to-b from-red-950/20 to-transparent shadow-[0_0_30px_rgba(239,68,68,0.08)]' 
                : 'border-emerald-500/30 bg-gradient-to-b from-emerald-900/10 to-transparent shadow-[0_0_30px_rgba(16,185,129,0.05)]'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-slate-700/50">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${operationalMode === 'live' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {operationalMode === 'live' ? <Radio size={18} className="animate-pulse" /> : <Sparkles size={18} />}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                    {operationalMode === 'live' ? 'Real-World Satellite Feeds' : 'Benchmark Sample Images'}
                  </h3>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${operationalMode === 'live' ? 'text-red-400' : 'text-sky-400'}`}>
                  {operationalMode === 'live' ? 'Live Telemetry' : 'Demo Test'}
                </span>
              </div>
              
              {isLoadingSample ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <Loader2 size={28} className={`${operationalMode === 'live' ? 'text-red-400' : 'text-emerald-400'} animate-spin`} />
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Loading satellite feed...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
                  {(operationalMode === 'live' ? [
                    { 
                      id: 'dana', 
                      name: 'Cyclone Dana (Oct 2024)', 
                      badge: '📜 Historical', 
                      badgeStyle: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
                      sub: 'Odisha Landfall (120 km/h)',
                      url: '/samples/cyclone_dana_live.jpg' 
                    },
                    { 
                      id: 'biparjoy', 
                      name: 'Cyclone Biparjoy (Jun 2023)', 
                      badge: '📜 Historical', 
                      badgeStyle: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
                      sub: 'Gujarat Landfall (167 km/h)',
                      url: '/samples/cyclone_biparjoy_live.jpg' 
                    },
                    { 
                      id: 'active_bob01', 
                      name: 'Active Disturbance BOB-01', 
                      badge: '⚡ Real-Time', 
                      badgeStyle: 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse',
                      sub: 'Current Bay of Bengal',
                      url: '/samples/cyclone_active_bob01.jpg' 
                    }
                  ] : [
                    { id: 'severe', name: 'Severe Cyclone', badge: 'Category 3+', badgeStyle: 'bg-red-500/20 text-red-400 border-red-500/30', sub: 'High eyewall rotation', url: '/samples/severe_cyclone.jpg' },
                    { id: 'moderate', name: 'Moderate Cyclone', badge: 'Tropical Storm', badgeStyle: 'bg-amber-500/20 text-amber-400 border-amber-500/30', sub: 'Developing system', url: '/samples/moderate_cyclone.jpg' },
                    { id: 'clear', name: 'Calm Weather', badge: 'Normal Sea', badgeStyle: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', sub: 'No tropical cyclone', url: '/samples/clear_weather.jpg' }
                  ]).map((sample) => (
                    <div 
                      key={sample.id} 
                      onClick={() => loadSampleImage(sample.url, `${sample.id}.jpg`)}
                      className={`group cursor-pointer bg-white dark:bg-slate-900 border rounded-xl overflow-hidden hover:shadow-lg transition-all flex flex-col ${
                        operationalMode === 'live' 
                          ? 'border-red-500/30 hover:border-red-400' 
                          : 'border-slate-200/80 dark:border-slate-700/80 hover:border-sky-500/50'
                      }`}
                    >
                      <div className="aspect-[4/3] w-full relative overflow-hidden">
                        <div className="absolute inset-0 bg-slate-900/30 group-hover:bg-transparent transition-colors z-10"></div>
                        <img src={sample.url} alt={sample.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" crossOrigin="anonymous" />
                        <span className={`absolute top-2 left-2 z-20 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${sample.badgeStyle}`}>
                          {sample.badge}
                        </span>
                      </div>
                      <div className="p-2.5 flex-1 flex flex-col justify-between bg-slate-50 dark:bg-slate-800/80 text-center space-y-2">
                        <div>
                          <p className="text-[11px] font-bold text-slate-800 dark:text-slate-100 line-clamp-1">{sample.name}</p>
                          <p className="text-[9px] text-slate-500 line-clamp-1 mt-0.5">{sample.sub}</p>
                        </div>
                        <button className={`w-full py-1.5 rounded-lg text-white text-[10px] font-bold transition-all shadow-xs ${
                          operationalMode === 'live'
                            ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500'
                            : 'bg-sky-500 hover:bg-sky-400 text-slate-900 font-bold'
                        }`}>
                          {operationalMode === 'live' ? 'Ingest Feed' : 'Analyze'}
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
