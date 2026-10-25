import React, { useState, useEffect } from 'react';
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
  Anchor
} from 'lucide-react';
import { 
  publishCitizenBroadcast, 
  toggleLighthouseSiren, 
  clearCitizenBroadcast,
  fetchOfficialAdvisories
} from '../citizen/services/citizenApi';

const CoastalBroadcastControl = ({ currentAnalysis }) => {
  const [broadcastState, setBroadcastState] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sirenToggling, setSirenToggling] = useState(false);
  const [selectedArea, setSelectedArea] = useState('Karnataka Coastal Maritime Zone (Mangalore - Malpe - Karwar)');
  const [targetStation, setTargetStation] = useState('Kaup Coastal Lighthouse Station #04');
  const [includeSirenOnPublish, setIncludeSirenOnPublish] = useState(true);
  const [successMessage, setSuccessMessage] = useState(null);

  // Poll current broadcast status from backend
  const refreshStatus = async () => {
    const res = await fetchOfficialAdvisories();
    if (res.success && res.data) {
      setBroadcastState(res.data);
    }
  };

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 3000);
    return () => clearInterval(interval);
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

  // Handle publishing analysis to citizen portal
  const handlePublishBroadcast = async () => {
    setIsSubmitting(true);
    setSuccessMessage(null);

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
      message: isCyclone
        ? `AI detection confirmed ${classification} cyclonic disturbance centered at ${cycloneLat.toFixed(2)}°N, ${cycloneLng.toFixed(2)}°E (${subbasin}) with peak sustained winds of ${windKmh} km/h (${windKt} kt). High sea swells and severe coastal winds expected.`
        : 'Satellite analysis confirmed clear coastal waters. Normal operations permitted.',
      fishermen_directive: isCyclone
        ? (level === 'RED' 
            ? 'RED ALERT: Strict ban on all fishing vessels. Boats at sea must return to harbor immediately.' 
            : 'CAUTION: Fishermen in deep sea waters advised to exercise vigilance and stay near port.')
        : 'Regular fishing operations permitted. Check standard harbor flags.',
      lat: cycloneLat,
      lng: cycloneLng,
      subbasin: subbasin
    };

    const res = await publishCitizenBroadcast(payload);
    setIsSubmitting(false);

    if (res.success) {
      setBroadcastState(res.data.broadcast);
      setSuccessMessage('Successfully broadcast to Citizen Dashboard and Lighthouse network!');
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  // Handle direct toggle of Lighthouse Siren
  const handleToggleSiren = async () => {
    const nextState = !broadcastState?.siren_active;
    setSirenToggling(true);
    const res = await toggleLighthouseSiren(nextState);
    setSirenToggling(false);

    if (res.success) {
      setBroadcastState(prev => ({ ...prev, siren_active: nextState }));
      setSuccessMessage(nextState ? 'Lighthouse Siren ACTIVATED!' : 'Lighthouse Siren SILENCED.');
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  // Handle Clearing Alert / Restoring All-Clear
  const handleClearBroadcast = async () => {
    setIsSubmitting(true);
    const res = await clearCitizenBroadcast();
    setIsSubmitting(false);

    if (res.success) {
      setBroadcastState(res.data.broadcast);
      setSuccessMessage('All coastal warnings cleared. Normal status restored.');
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  const isLiveActive = broadcastState?.active === true;
  const isSirenBlasting = broadcastState?.siren_active === true;

  return (
    <div className="w-full app-card p-5 sm:p-6 border-2 border-sky-500/30 bg-gradient-to-br from-slate-900/90 via-slate-900 to-[#0c1427] text-white shadow-xl relative overflow-hidden rounded-2xl">
      
      {/* Decorative top pulse */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 transition-colors ${
        isSirenBlasting ? 'bg-red-500 animate-pulse' : isLiveActive ? 'bg-amber-500' : 'bg-slate-700'
      }`} />

      {/* Card Header with Status Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-700/60">
        <div className="flex items-center gap-2.5">
          <div className={`p-2.5 rounded-xl ${
            isSirenBlasting ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-sky-500/20 text-sky-400'
          }`}>
            <Radio size={22} className={isLiveActive ? 'animate-pulse' : ''} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
              <span>Coastal Early Warning & Citizen Broadcast</span>
            </h2>
            <p className="text-xs text-slate-400">
              Publish AI findings to citizen apps & trigger audible sirens on their mobile phones
            </p>
          </div>
        </div>

        {/* Live Network Status Badge */}
        <div className="flex items-center gap-2">
          {isLiveActive ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/40">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              LIVE BROADCAST ACTIVE
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
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
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Target Sector & Station Settings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <div>
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Target Maritime Sector
          </label>
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-xs font-semibold text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-sky-500 cursor-pointer"
          >
            <option value="Karnataka Coastal Maritime Zone (Mangalore - Malpe - Karwar)">
              Karnataka Coast (Mangalore - Malpe - Karwar)
            </option>
            <option value="Kerala Coastal Waters (Kochi - Kozhikode)">
              Kerala Coastal Waters (Kochi - Kozhikode)
            </option>
            <option value="Odisha & Bengal Coast (Puri - Paradip)">
              Odisha & Bengal Coast (Puri - Paradip)
            </option>
            <option value="Tamil Nadu & Andhra Coast (Chennai - Visakhapatnam)">
              Tamil Nadu & Andhra Coast (Chennai - Visakhapatnam)
            </option>
            <option value="Pan-India All Coastal Sectors">
              All Coastal Sectors (Pan-India)
            </option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Target Lighthouse Station Beacon
          </label>
          <select
            value={targetStation}
            onChange={(e) => setTargetStation(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-xs font-semibold text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-sky-500 cursor-pointer"
          >
            <option value="Kaup Coastal Lighthouse Station #04">
              Kaup Lighthouse Station #04 (Udupi Coast)
            </option>
            <option value="Mangalore Port Light Beacon #01">
              Mangalore Port Light Beacon #01
            </option>
            <option value="Karwar Head Lighthouse #07">
              Karwar Head Lighthouse #07
            </option>
            <option value="Visakhapatnam Dolphin Nose Light">
              Visakhapatnam Dolphin Nose Light
            </option>
          </select>
        </div>
      </div>

      {/* Analysis Preview to be Broadcasted */}
      <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs mb-5">
        <span className="font-bold uppercase tracking-wider text-slate-400 block mb-1.5 text-[10px]">
          Data to be published from current image analysis:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-slate-200 font-medium">
          <div>
            <span className="text-slate-400 block text-[11px]">Detection:</span>
            <span className="font-bold text-white">{isCyclone ? 'CYCLONE DETECTED' : 'NO CYCLONE'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Location Coordinates:</span>
            <span className="font-black text-sky-400">{cycloneLat.toFixed(2)}°N, {cycloneLng.toFixed(2)}°E</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Intensity:</span>
            <span className="font-bold text-amber-400">{classification}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Wind Speed:</span>
            <span className="font-bold text-white">{windKmh} km/h ({windKt} kt)</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">AI Confidence:</span>
            <span className="font-bold text-emerald-400">{confidence}%</span>
          </div>
        </div>
      </div>

      {/* ACTION CONTROLS: 2 Core Buttons requested by user */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        
        {/* Left Options: Siren Toggle checkbox before publishing */}
        {isCyclone && (
          <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeSirenOnPublish}
              onChange={(e) => setIncludeSirenOnPublish(e.target.checked)}
              className="w-4 h-4 rounded-sm border-slate-700 bg-slate-800 text-red-500 focus:ring-red-500 cursor-pointer"
            />
            <span>Include Audible Siren alarm on citizens' phones with broadcast</span>
          </label>
        )}

        {/* Buttons Action Bar */}
        <div className="flex flex-wrap items-center gap-2.5 sm:ml-auto">
          
          {/* BUTTON 1: Broadcast / Notify Citizens */}
          <button
            onClick={handlePublishBroadcast}
            disabled={isSubmitting}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Broadcasting...</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>Notify Citizens & Coastal App</span>
              </>
            )}
          </button>

          {/* BUTTON 2: Siren Sound Control (On/Off) */}
          <button
            onClick={handleToggleSiren}
            disabled={sirenToggling}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer select-none ${
              isSirenBlasting
                ? 'bg-red-600 hover:bg-red-700 text-white ring-4 ring-red-500/40 animate-pulse'
                : 'bg-amber-600 hover:bg-amber-500 text-white'
            }`}
          >
            {sirenToggling ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Switching Siren...</span>
              </>
            ) : isSirenBlasting ? (
              <>
                <VolumeX size={18} />
                <span>Silence Siren on Phones</span>
              </>
            ) : (
              <>
                <Volume2 size={18} />
                <span>🚨 Sound Siren on Citizens' Phones</span>
              </>
            )}
          </button>

          {/* BUTTON 3: Clear / Reset */}
          {isLiveActive && (
            <button
              onClick={handleClearBroadcast}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-colors cursor-pointer"
              title="Clear active alert and restore normal status"
            >
              <RotateCcw size={14} />
              <span>All Clear</span>
            </button>
          )}

        </div>

      </div>

    </div>
  );
};

export default CoastalBroadcastControl;
