import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  RotateCcw,
  ShieldAlert,
  Send,
  Anchor,
  Sparkles,
  Compass,
  RefreshCw,
  Navigation,
  TowerControl
} from 'lucide-react';
import { 
  publishCitizenBroadcast, 
  toggleLighthouseSiren, 
  clearCitizenBroadcast,
  fetchOfficialAdvisories,
  detectAffectedMarineSector
} from '../citizen/services/citizenApi';
import { addSystemLog } from '../utils/auditLogger';
import { getApiBaseUrl } from '../utils/apiConfig';

const DEFAULT_SECTORS = [
  { id: 'odisha_bengal', name: 'Odisha & Bengal Coast (Puri - Paradip)', basin: 'Bay of Bengal' },
  { id: 'andhra_tamilnadu', name: 'Tamil Nadu & Andhra Coast (Chennai - Visakhapatnam)', basin: 'Bay of Bengal' },
  { id: 'karnataka_coast', name: 'Karnataka Coast (Mangalore - Malpe - Karwar)', basin: 'Arabian Sea' },
  { id: 'kerala_coast', name: 'Kerala Coastal Waters (Kochi - Kozhikode)', basin: 'Arabian Sea' },
  { id: 'gujarat_coast', name: 'Gujarat Coastal Waters (Dwarka - Porbandar - Kutch)', basin: 'Arabian Sea' },
  { id: 'maharashtra_goa', name: 'Maharashtra & Goa Coast (Mumbai - Ratnagiri - Aguada)', basin: 'Arabian Sea' },
  { id: 'andaman_nicobar', name: 'Andaman & Nicobar Marine Zone (Port Blair)', basin: 'Bay of Bengal' },
  { id: 'all_coastal', name: 'All Coastal Sectors (Pan-India)', basin: 'Pan-India' }
];

const DEFAULT_LIGHTHOUSES = [
  { id: 'paradip', name: 'Paradip Coastal Warning Tower & Lighthouse', sector_id: 'odisha_bengal', signal: 'Signal 10 (Great Danger)' },
  { id: 'puri', name: 'Puri Coastal Lighthouse Station', sector_id: 'odisha_bengal', signal: 'Signal 10 (Great Danger)' },
  { id: 'visakhapatnam', name: 'Visakhapatnam Dolphin Nose Light', sector_id: 'andhra_tamilnadu', signal: 'Signal 10 (Great Danger)' },
  { id: 'kalingapatnam', name: 'Kalingapatnam Coastal Light Beacon', sector_id: 'andhra_tamilnadu', signal: 'Signal 09 (Severe Warning)' },
  { id: 'chennai', name: 'Chennai Port Light Beacon #02', sector_id: 'andhra_tamilnadu', signal: 'Signal 09 (Severe Warning)' },
  { id: 'kaup', name: 'Kaup Lighthouse Station #04 (Udupi Coast)', sector_id: 'karnataka_coast', signal: 'Signal 10 (Great Danger)' },
  { id: 'mangalore', name: 'Mangalore Port Light Beacon #01', sector_id: 'karnataka_coast', signal: 'Signal 09 (Severe Warning)' },
  { id: 'karwar', name: 'Karwar Head Lighthouse #07 (Oyster Rocks)', sector_id: 'karnataka_coast', signal: 'Signal 08 (Cyclone Threat)' },
  { id: 'kochi', name: 'Kochi (Cochin / Vypin) Lighthouse', sector_id: 'kerala_coast', signal: 'Signal 09 (Severe Warning)' },
  { id: 'dwarka', name: 'Dwarka Coastal Lighthouse Station', sector_id: 'gujarat_coast', signal: 'Signal 10 (Great Danger)' },
  { id: 'porbandar', name: 'Porbandar Light Station', sector_id: 'gujarat_coast', signal: 'Signal 09 (Severe Warning)' }
];

const CoastalBroadcastControl = ({ currentAnalysis }) => {
  const [broadcastState, setBroadcastState] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sirenToggling, setSirenToggling] = useState(false);
  
  // Dynamic Marine Sector & Lighthouse State
  const [availableSectors, setAvailableSectors] = useState(DEFAULT_SECTORS);
  const [availableLighthouses, setAvailableLighthouses] = useState(DEFAULT_LIGHTHOUSES);
  const [selectedArea, setSelectedArea] = useState('Odisha & Bengal Coast (Puri - Paradip)');
  const [targetStation, setTargetStation] = useState('Paradip Coastal Warning Tower & Lighthouse');
  const [isDetectingMarine, setIsDetectingMarine] = useState(false);
  const [aiDirective, setAiDirective] = useState(null);
  const [recommendedSignal, setRecommendedSignal] = useState('Signal 10 (Great Danger)');
  const [riskLevel, setRiskLevel] = useState('CRITICAL');
  const [detectionEngine, setDetectionEngine] = useState('');
  const [nearestDistanceKm, setNearestDistanceKm] = useState(null);

  const [includeSirenOnPublish, setIncludeSirenOnPublish] = useState(true);
  const [successMessage, setSuccessMessage] = useState(null);

  const isTogglingRef = useRef(false);
  const lastCoordsRef = useRef('');

  // Poll current broadcast status from backend
  const refreshStatus = async () => {
    if (isTogglingRef.current) return;
    const res = await fetchOfficialAdvisories();
    if (res.success && res.data && !isTogglingRef.current) {
      setBroadcastState(res.data);
    }
  };

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 3000);

    const handleSirenEvent = (e) => {
      if (e.detail?.siren_active !== undefined) {
        setBroadcastState(prev => ({ ...prev, siren_active: e.detail.siren_active === true }));
        setIncludeSirenOnPublish(e.detail.siren_active === true);
      }
    };
    window.addEventListener('cyclosafe_siren_toggled', handleSirenEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener('cyclosafe_siren_toggled', handleSirenEvent);
    };
  }, []);

  const isCyclone = currentAnalysis?.detection?.is_cyclone === true;
  const classification = currentAnalysis?.classification?.classification || currentAnalysis?.intensity?.classification || (isCyclone ? 'SEVERE' : 'NORMAL');
  const windKt = currentAnalysis?.intensity?.wind_speed_kt != null ? currentAnalysis.intensity.wind_speed_kt : 65.0;
  const windKmh = currentAnalysis?.intensity?.wind_speed_kmh != null ? currentAnalysis.intensity.wind_speed_kmh : Math.round(windKt * 1.852);
  const confidence = currentAnalysis?.detection?.confidence_percent || 95.0;
  const fileName = currentAnalysis?.fileName || 'Satellite_Observation_Scan';

  const cycloneLat = currentAnalysis?.latitude != null ? parseFloat(currentAnalysis.latitude) : 15.4;
  const cycloneLng = currentAnalysis?.longitude != null ? parseFloat(currentAnalysis.longitude) : 86.2;
  const subbasin = currentAnalysis?.subbasin || (cycloneLng >= 78.0 ? 'Bay of Bengal' : 'Arabian Sea');
  const cycloneName = `Cyclone ${fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')}`;

  // Automatically detect threatened marine sector and lighthouse station using Google Gemini API pool
  const triggerMarineDetection = async (lat, lon, windSpeed, stormName, basin) => {
    setIsDetectingMarine(true);
    try {
      const res = await detectAffectedMarineSector({
        lat,
        lng: lon,
        wind_speed_kt: windSpeed,
        cyclone_name: stormName,
        subbasin: basin
      });

      if (res.success && res.data) {
        const d = res.data;
        if (d.affected_sectors && d.affected_sectors.length > 0) {
          setAvailableSectors(d.affected_sectors);
        }
        if (d.affected_lighthouses && d.affected_lighthouses.length > 0) {
          setAvailableLighthouses(d.affected_lighthouses);
        }
        if (d.primary_sector) {
          setSelectedArea(d.primary_sector);
        }
        if (d.primary_lighthouse) {
          setTargetStation(d.primary_lighthouse);
        }
        if (d.ai_directive) {
          setAiDirective(d.ai_directive);
        }
        if (d.recommended_signal) {
          setRecommendedSignal(d.recommended_signal);
        }
        if (d.risk_level) {
          setRiskLevel(d.risk_level);
        }
        if (d.detection_engine) {
          setDetectionEngine(d.detection_engine);
        }
        if (d.primary_lighthouse_distance_km != null) {
          setNearestDistanceKm(d.primary_lighthouse_distance_km);
        }
      }
    } catch (err) {
      console.warn('[CoastalBroadcastControl] Marine proximity auto-detection notice:', err);
    } finally {
      setIsDetectingMarine(false);
    }
  };

  // Run auto-detection when cyclone coordinates, wind speed, or subbasin change
  useEffect(() => {
    if (isCyclone && cycloneLat != null && cycloneLng != null) {
      const coordKey = `${cycloneLat.toFixed(2)}_${cycloneLng.toFixed(2)}_${windKt}_${subbasin}`;
      if (lastCoordsRef.current !== coordKey) {
        lastCoordsRef.current = coordKey;
        triggerMarineDetection(cycloneLat, cycloneLng, windKt, cycloneName, subbasin);
      }
    }
  }, [cycloneLat, cycloneLng, windKt, isCyclone, subbasin]);

  // When user selects a different sector, filter lighthouses to that sector or prioritize them
  const handleSectorChange = (newSectorName) => {
    setSelectedArea(newSectorName);
    
    // Find matching sector object
    const matchedSector = availableSectors.find(s => s.name === newSectorName);
    if (matchedSector && matchedSector.id !== 'all_coastal') {
      const sectorLighthouses = availableLighthouses.filter(lh => lh.sector_id === matchedSector.id || lh.sector_name === newSectorName);
      if (sectorLighthouses.length > 0) {
        setTargetStation(sectorLighthouses[0].name);
      }
    }
  };

  // Filter displayed lighthouses based on selected sector
  const currentSectorObj = availableSectors.find(s => s.name === selectedArea);
  const displayedLighthouses = (currentSectorObj && currentSectorObj.id !== 'all_coastal')
    ? [
        ...availableLighthouses.filter(lh => lh.sector_id === currentSectorObj.id || lh.sector_name === selectedArea),
        ...availableLighthouses.filter(lh => lh.sector_id !== currentSectorObj.id && lh.sector_name !== selectedArea)
      ]
    : availableLighthouses;

  // Handle publishing analysis to citizen portal with 5-day prediction track
  const handlePublishBroadcast = async () => {
    setIsSubmitting(true);
    setSuccessMessage(null);

    // 1. Pre-fetch / build 5-day trajectory waypoints so citizen map displays full 5-day path
    let forecastData = currentAnalysis?.forecast || null;
    if (!forecastData && isCyclone && cycloneLat != null && cycloneLng != null) {
      try {
        const baseUrl = getApiBaseUrl();
        const trackRes = await fetch(`${baseUrl}/api/track/predict-from-point`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: cycloneLat,
            longitude: cycloneLng,
            wind_speed_kt: windKt,
            storm_name: cycloneName
          })
        });
        if (trackRes.ok) {
          const trackJson = await trackRes.json();
          if (trackJson?.forecast && trackJson.forecast.length > 0) {
            forecastData = trackJson.forecast;
          }
        }
      } catch (err) {
        console.warn('Forecast pre-fetch note:', err);
      }

      // Physics fallback if offline
      if (!forecastData) {
        const isBob = cycloneLng >= 78.0;
        const now = Date.now();
        forecastData = [24, 48, 72, 96, 120].map((h, idx) => {
          const step = idx + 1;
          const fLat = cycloneLat + step * 0.45;
          const fLon = isBob ? cycloneLng - step * 1.65 : cycloneLng - step * 0.9;
          return {
            step,
            horizon_hours: h,
            latitude: Number(fLat.toFixed(2)),
            longitude: Number(fLon.toFixed(2)),
            delta_lat: Number((step * 0.45).toFixed(2)),
            delta_lon: Number((isBob ? -step * 1.65 : -step * 0.9).toFixed(2)),
            arrival_time: new Date(now + h * 3600 * 1000).toISOString(),
            uncertainty_radius_km: 135 + idx * 80,
            stage: idx < 3 ? "Projected Severe Cyclone" : "Projected Landfall on Coast"
          };
        });
      }
    }

    const level = classification === 'SEVERE' ? 'RED' : classification === 'MEDIUM' ? 'ORANGE' : 'YELLOW';

    const payload = {
      cyclone_name: isCyclone ? cycloneName : 'No Cyclone Observed',
      classification: isCyclone ? classification : 'NONE',
      wind_speed_kt: isCyclone ? windKt : 0,
      wind_speed_kmh: isCyclone ? windKmh : 0,
      confidence_percent: confidence,
      level: isCyclone ? level : 'NORMAL',
      siren_active: isCyclone ? includeSirenOnPublish : false,
      area: selectedArea,
      target_lighthouse: targetStation,
      message: isCyclone
        ? (aiDirective || `AI detection confirmed ${classification} cyclonic disturbance centered at ${cycloneLat.toFixed(2)}°N, ${cycloneLng.toFixed(2)}°E (${subbasin}) with peak sustained winds of ${windKmh} km/h (${windKt} kt). 5-day projected trajectory active towards coastal zones.`)
        : 'Satellite analysis confirmed clear coastal waters. Normal operations permitted.',
      fishermen_directive: isCyclone
        ? (level === 'RED' 
            ? `RED ALERT (${recommendedSignal || 'Signal 10'}): Strict ban on all fishing vessels in ${selectedArea}. Boats at sea must return to harbor immediately.` 
            : `CAUTION (${recommendedSignal || 'Signal 08'}): Fishermen in ${selectedArea} advised to exercise vigilance and stay near port.`)
        : 'Regular fishing operations permitted. Check standard harbor flags.',
      lat: cycloneLat,
      lng: cycloneLng,
      subbasin: subbasin,
      forecast: forecastData
    };

    const res = await publishCitizenBroadcast(payload);
    setIsSubmitting(false);

    if (res.success) {
      setBroadcastState(res.data.broadcast);
      setSuccessMessage(`Successfully broadcast to Citizen Dashboard, ${selectedArea} & ${targetStation}!`);
      setTimeout(() => setSuccessMessage(null), 5000);
      addSystemLog({
        module: 'Broadcast-Service',
        level: payload.level === 'RED' ? 'WARNING' : 'INFO',
        event: `Coastal Emergency Alert Dispatched: ${payload.level} ALERT`,
        details: `Sector: ${payload.area} | Lighthouse Beacon: ${targetStation} | Signal: ${recommendedSignal} | Cyclone: ${payload.cyclone_name} | Lat: ${payload.lat}°N, Lon: ${payload.lng}°E | 5-Day Forecast: ${payload.forecast?.length || 0} waypoints | Siren: ${payload.siren_active ? 'ENABLED' : 'DISABLED'}`,
        payload: payload
      });
    }
  };

  // Handle direct toggle of Lighthouse Siren
  const handleToggleSiren = async () => {
    if (isTogglingRef.current) return;
    const nextState = !broadcastState?.siren_active;
    isTogglingRef.current = true;
    setSirenToggling(true);

    try {
      const res = await toggleLighthouseSiren(nextState);
      if (res.success) {
        setBroadcastState(prev => ({ ...prev, siren_active: nextState }));
        setIncludeSirenOnPublish(nextState);
        setSuccessMessage(nextState ? `Lighthouse Siren ACTIVATED on ${targetStation}!` : 'Lighthouse Siren SILENCED on User Dashboard.');
        setTimeout(() => setSuccessMessage(null), 4000);
        window.dispatchEvent(new CustomEvent('cyclosafe_siren_toggled', { detail: { siren_active: nextState } }));
        addSystemLog({
          module: 'Broadcast-Service',
          level: nextState ? 'WARNING' : 'INFO',
          event: nextState ? 'Coastal Lighthouse Siren ACTIVATED' : 'Coastal Lighthouse Siren SILENCED',
          details: nextState ? `Audible acoustic warning siren triggered on ${targetStation}` : 'Coastal sirens silenced back to standby',
          payload: { siren_active: nextState, target_lighthouse: targetStation }
        });
      }
    } finally {
      setTimeout(() => {
        isTogglingRef.current = false;
        setSirenToggling(false);
      }, 600);
    }
  };

  // Dedicated action to turn off siren on User Dashboard & Lighthouses
  const handleTurnOffSirenOnly = async () => {
    if (isTogglingRef.current) return;
    isTogglingRef.current = true;
    setSirenToggling(true);

    try {
      const res = await toggleLighthouseSiren(false);
      if (res.success) {
        setBroadcastState(prev => ({ ...prev, siren_active: false }));
        setIncludeSirenOnPublish(false);
        setSuccessMessage('Emergency siren SILENCED on User Dashboard & Lighthouses.');
        setTimeout(() => setSuccessMessage(null), 4000);
        window.dispatchEvent(new CustomEvent('cyclosafe_siren_toggled', { detail: { siren_active: false } }));
        addSystemLog({
          module: 'Broadcast-Service',
          level: 'INFO',
          event: 'Coastal Siren SILENCED',
          details: 'User dashboard and coastal siren alarms silenced by administrator.',
          payload: { siren_active: false }
        });
      }
    } finally {
      setTimeout(() => {
        isTogglingRef.current = false;
        setSirenToggling(false);
      }, 600);
    }
  };

  // Handle Clearing Alert / Restoring All-Clear
  const handleClearBroadcast = async () => {
    setIsSubmitting(true);
    const res = await clearCitizenBroadcast();
    setIsSubmitting(false);

    if (res.success) {
      setBroadcastState(res.data.broadcast);
      setIncludeSirenOnPublish(false);
      setSuccessMessage('All coastal warnings cleared. Normal status restored.');
      setTimeout(() => setSuccessMessage(null), 4000);
      window.dispatchEvent(new CustomEvent('cyclosafe_siren_toggled', { detail: { siren_active: false } }));
      addSystemLog({
        module: 'Broadcast-Service',
        level: 'SUCCESS',
        event: 'Coastal Advisory Cleared (All-Clear Restored)',
        details: 'Admin reset coastal advisory to normal maritime status',
        payload: { status: 'NORMAL' }
      });
    }
  };

  const isLiveActive = broadcastState?.active === true;
  const isSirenBlasting = broadcastState?.siren_active === true;

  return (
    <div className="w-full app-card p-5 sm:p-6 border-2 border-sky-500/20 dark:border-sky-500/30 bg-white/95 dark:bg-gradient-to-br dark:from-slate-900/90 dark:via-slate-900 dark:to-[#0c1427] text-slate-900 dark:text-white shadow-xl relative overflow-hidden rounded-2xl">
      
      {/* Decorative top pulse */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 transition-colors ${
        isSirenBlasting ? 'bg-red-500 animate-pulse' : isLiveActive ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-700'
      }`} />

      {/* Card Header with Status Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-200 dark:border-slate-700/60">
        <div className="flex items-center gap-2.5">
          <div className={`p-2.5 rounded-xl ${
            isSirenBlasting ? 'bg-red-500/20 text-red-500 dark:text-red-400 animate-pulse' : 'bg-sky-500/15 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400'
          }`}>
            <Radio size={22} className={isLiveActive ? 'animate-pulse' : ''} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <span>Coastal Early Warning & Citizen Broadcast</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Publish AI findings to citizen apps & trigger audible sirens on their mobile phones
            </p>
          </div>
        </div>

        {/* Live Network Status Badge */}
        <div className="flex items-center gap-2">
          {isLiveActive ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-500/40">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              LIVE BROADCAST ACTIVE
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
              <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500" />
              NO ACTIVE BROADCAST
            </span>
          )}

          {isSirenBlasting && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-red-600 text-white animate-pulse shadow-lg shadow-red-500/50">
              <Volume2 size={14} />
              SIREN BLOWING ON PHONES
            </span>
          )}
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Target Sector & Station Settings (AI Auto-Detected with Multi-Key Failover) */}
      <div className="space-y-3 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-500 animate-pulse" />
              <span>AI Target Sector & Lighthouse Station</span>
            </span>
            {isDetectingMarine && (
              <span className="text-[10px] font-bold text-sky-500 flex items-center gap-1">
                <Loader2 size={12} className="animate-spin" /> Auto-Detecting Nearby Coast...
              </span>
            )}
          </div>
          
          {detectionEngine && (
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
              {detectionEngine}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                Target Maritime Sector
              </label>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                AI Auto-Selected
              </span>
            </div>
            <select
              value={selectedArea}
              onChange={(e) => handleSectorChange(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-sky-500 shadow-xs cursor-pointer"
            >
              {availableSectors.map((sector) => (
                <option key={sector.id} value={sector.name} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200">
                  {sector.name} {sector.distance_km != null ? `(${sector.distance_km} km away ${sector.risk_level ? `• ${sector.risk_level}` : ''})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                Target Lighthouse Station Beacon
              </label>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <TowerControl size={11} /> Highest Risk Beacon
              </span>
            </div>
            <select
              value={targetStation}
              onChange={(e) => setTargetStation(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-sky-500 shadow-xs cursor-pointer"
            >
              {displayedLighthouses.map((lh) => (
                <option key={lh.id || lh.name} value={lh.name} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200">
                  {lh.name} {lh.distance_km != null ? `(${lh.distance_km} km` : ''}{lh.signal ? ` • ${lh.signal.split(' - ')[0]}` : ''}{lh.distance_km != null ? ')' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* AI Coastal Warning & Danger Signal Advisory Banner */}
        {aiDirective && (
          <div className="p-3 rounded-xl bg-gradient-to-r from-sky-500/10 via-amber-500/10 to-red-500/10 border border-sky-500/30 dark:border-sky-500/40 text-xs space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-bold text-sky-800 dark:text-sky-300 text-[11px] uppercase tracking-wider">
                <Sparkles size={14} className="text-amber-500" />
                <span>AI Coastal Risk Assessment ({detectionEngine || 'Gemini Vision AI'})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  riskLevel === 'CRITICAL' ? 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30' :
                  riskLevel === 'HIGH' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30' :
                  'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                }`}>
                  {riskLevel || 'HIGH'} THREAT
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                  {recommendedSignal || 'Signal 10 (Great Danger)'}
                </span>
              </div>
            </div>

            <p className="text-slate-700 dark:text-slate-200 text-xs leading-relaxed font-medium">
              {aiDirective}
            </p>

            <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/50 dark:border-slate-700/40">
              <span>
                Nearest Coastal Beacon: <strong className="text-slate-800 dark:text-slate-200">{targetStation}</strong> ({nearestDistanceKm != null ? `${nearestDistanceKm} km` : 'Proximity Calculated'})
              </span>
              <button
                type="button"
                onClick={() => triggerMarineDetection(cycloneLat, cycloneLng, windKt, cycloneName, subbasin)}
                disabled={isDetectingMarine}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
              >
                <RefreshCw size={11} className={isDetectingMarine ? 'animate-spin' : ''} />
                <span>Re-evaluate Proximity</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Analysis Preview to be Broadcasted */}
      <div className="p-3.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs mb-5">
        <span className="font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block mb-1.5 text-[10px]">
          Data to be published from current image analysis:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-slate-800 dark:text-slate-200 font-medium">
          <div>
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Detection:</span>
            <span className="font-bold text-slate-900 dark:text-white">{isCyclone ? 'CYCLONE DETECTED' : 'NO CYCLONE'}</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Location Coordinates:</span>
            <span className="font-black text-sky-600 dark:text-sky-400">{cycloneLat.toFixed(2)}°N, {cycloneLng.toFixed(2)}°E</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Intensity:</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">{classification}</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Wind Speed:</span>
            <span className="font-bold text-slate-900 dark:text-white">{windKmh} km/h ({windKt} kt)</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">AI Confidence:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{confidence}%</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">5-Day Prediction Track:</span>
            <span className="font-bold text-red-500 dark:text-red-400">Day 1–5 Included</span>
          </div>
        </div>
      </div>

      {/* Active Siren Banner with Direct OFF Button */}
      {isSirenBlasting && (
        <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border-2 border-red-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
              <VolumeX size={22} />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-red-600 dark:text-red-400">
                User Siren Currently Blasting
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400">
                The acoustic alarm is wailing on registered citizen phones and coastal lighthouses.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleTurnOffSirenOnly}
            disabled={sirenToggling}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer shrink-0"
          >
            {sirenToggling ? <Loader2 size={14} className="animate-spin" /> : <VolumeX size={14} />}
            <span>Turn OFF User Siren</span>
          </button>
        </div>
      )}

      {/* Action Buttons: Publish Broadcast & Toggle Siren */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Main Publish to Citizen Network Button */}
        <button
          type="button"
          onClick={handlePublishBroadcast}
          disabled={isSubmitting || !isCyclone}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
            !isCyclone
              ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-sky-500/25 active:scale-98'
          }`}
        >
          {isSubmitting ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Send size={18} />
          )}
          <span>{isLiveActive ? 'Update Coastal Broadcast' : 'Notify Citizens & Coastal App'}</span>
        </button>

        {/* Siren Trigger Button - ALWAYS clickable when siren is blasting so admin can silence it */}
        <button
          type="button"
          onClick={handleToggleSiren}
          disabled={sirenToggling || (!isCyclone && !isSirenBlasting)}
          className={`py-3 px-5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
            isSirenBlasting
              ? 'bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white shadow-red-500/30 animate-pulse'
              : !isCyclone
              ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-500/25'
          }`}
        >
          {sirenToggling ? (
            <Loader2 size={18} className="animate-spin" />
          ) : isSirenBlasting ? (
            <VolumeX size={18} />
          ) : (
            <Volume2 size={18} />
          )}
          <span>
            {isSirenBlasting ? 'Silence Siren Alarm' : '🚨 Sound Siren on Citizens\' Phones'}
          </span>
        </button>

        {/* All-Clear Reset Button */}
        {isLiveActive && (
          <button
            type="button"
            onClick={handleClearBroadcast}
            disabled={isSubmitting}
            className="py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
            title="Clear active broadcast and return to normal maritime status"
          >
            <RotateCcw size={16} />
            <span>All Clear</span>
          </button>
        )}
      </div>

      {/* Audible Siren Checkbox option */}
      {isCyclone && (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="checkbox"
            id="includeSiren"
            checked={includeSirenOnPublish}
            onChange={(e) => setIncludeSirenOnPublish(e.target.checked)}
            className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 dark:border-slate-700 cursor-pointer"
          />
          <label htmlFor="includeSiren" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
            Include Audible Siren alarm on citizens' phones with broadcast
          </label>
        </div>
      )}
    </div>
  );
};

export default CoastalBroadcastControl;
