import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Volume2, 
  VolumeX, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Send, 
  Radio, 
  Trash2,
  ExternalLink
} from 'lucide-react';
import { 
  broadcastCitizenAlert, 
  clearCitizenAlert, 
  toggleLighthouseSiren, 
  fetchOfficialAdvisories 
} from '../citizen/services/citizenApi';

const AdminBroadcastCard = ({ currentAnalysis, onNavigateToCitizen }) => {
  const [broadcasting, setBroadcasting] = useState(false);
  const [sirenLoading, setSirenLoading] = useState(false);
  const [activeAlert, setActiveAlert] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  // Fetch current live broadcast state on mount
  useEffect(() => {
    let isMounted = true;
    const checkActiveAlert = async () => {
      const res = await fetchOfficialAdvisories();
      if (isMounted && res.success && res.data) {
        setActiveAlert(res.data);
      }
    };
    checkActiveAlert();
    const interval = setInterval(checkActiveAlert, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  if (!currentAnalysis) return null;

  const { detection, intensity, classification } = currentAnalysis;
  const isCyclone = detection?.is_cyclone;
  const windKmh = intensity?.wind_speed_kmh != null 
    ? intensity.wind_speed_kmh 
    : (intensity?.wind_speed_kt ? Math.round(intensity.wind_speed_kt * 1.852) : null);
  const windKt = intensity?.wind_speed_kt || (windKmh ? Math.round(windKmh / 1.852) : null);
  const category = classification?.classification || intensity?.classification || (isCyclone ? 'CYCLONIC STORM' : 'NONE');
  const confidence = detection?.confidence_percent || (detection?.confidence ? Math.round(detection.confidence * 100) : null);

  const isSevere = category === 'SEVERE' || (windKmh && windKmh >= 90);
  const alertLevel = isSevere ? 'RED' : (isCyclone ? 'ORANGE' : 'YELLOW');

  // Handle Notify Citizen broadcast
  const handleNotifyCitizen = async (autoSiren = false) => {
    setBroadcasting(true);
    setStatusMessage('');

    const payload = {
      level: alertLevel,
      cyclone_name: isCyclone ? `Tropical Cyclone (${category})` : 'Clear Weather System',
      title: isCyclone ? `Warning: ${category} Detected` : 'Coastal Weather Advisory',
      message: isCyclone 
        ? `Satellite pattern confirms active ${category}. Wind speed estimated at ${windKmh || '--'} km/h (${windKt || '--'} kt).`
        : 'Satellite analysis reports no cyclonic formation. Normal coastal weather.',
      wind_speed_kmh: windKmh,
      wind_speed_kt: windKt,
      classification: category,
      confidence: confidence,
      area: 'Coastal Maritime Sector & Harbors',
      fishermen_directive: isCyclone
        ? (isSevere 
            ? 'DO NOT VENTURE INTO SEA. All fishing vessels must return to nearest safe harbor immediately.' 
            : 'Caution advised. Squally winds expected. Stay within safe coastal waters.')
        : 'Regular seasonal fishing conditions. Follow local port signals.',
      siren_active: autoSiren,
      source: 'State Disaster Operations / AI Satellite Observation'
    };

    const res = await broadcastCitizenAlert(payload);
    setBroadcasting(false);

    if (res.success && res.data?.alert) {
      setActiveAlert(res.data.alert);
      setStatusMessage('Alert successfully pushed to Citizen Dashboard!');
      setTimeout(() => setStatusMessage(''), 4000);
    } else {
      setStatusMessage('Failed to broadcast alert. Please check backend connection.');
    }
  };

  // Handle Siren Toggle
  const handleToggleSiren = async () => {
    setSirenLoading(true);
    const newSirenState = !activeAlert?.siren_active;
    const res = await toggleLighthouseSiren(newSirenState);
    setSirenLoading(false);

    if (res.success) {
      setActiveAlert(prev => ({ ...prev, siren_active: newSirenState }));
    }
  };

  // Handle Clear / All Clear
  const handleClearAlert = async () => {
    setBroadcasting(true);
    const res = await clearCitizenAlert();
    setBroadcasting(false);
    if (res.success && res.data?.alert) {
      setActiveAlert(res.data.alert);
      setStatusMessage('Alert cleared. Citizen dashboard returned to normal.');
      setTimeout(() => setStatusMessage(''), 4000);
    }
  };

  const isAlertLive = activeAlert?.available === true;
  const isSirenActive = activeAlert?.siren_active === true;

  return (
    <div className="w-full rounded-2xl bg-gradient-to-r from-slate-900 via-[#0f172a] to-slate-900 border-2 border-sky-500/30 p-5 sm:p-6 shadow-xl text-white space-y-4">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400">
            <Radio size={22} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2">
              <span>Citizen Emergency Broadcast System</span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                Admin Control
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Transmit AI detection results to the Citizen Dashboard & trigger coastal lighthouse siren
            </p>
          </div>
        </div>

        {/* Live Broadcast Status Badge */}
        <div className="flex items-center gap-2">
          {isAlertLive ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/40">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              BROADCAST ACTIVE ({activeAlert.level})
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              NO ACTIVE BROADCAST
            </span>
          )}
        </div>
      </div>

      {/* Analysis Preview Banner */}
      <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          {isCyclone ? (
            <ShieldAlert size={18} className="text-red-400" />
          ) : (
            <CheckCircle2 size={18} className="text-emerald-400" />
          )}
          <span className="font-semibold">
            {isCyclone ? `Detected: ${category}` : 'Result: No Cyclone Detected'}
          </span>
          {windKmh && (
            <span className="text-slate-400">
              | Est. Wind: <strong className="text-white">{windKmh} km/h</strong> ({windKt} kt)
            </span>
          )}
        </div>

        <div className="text-slate-400 text-[11px]">
          Target: <span className="text-slate-200 font-medium">Coastal Citizens & Fishermen</span>
        </div>
      </div>

      {statusMessage && (
        <div className="p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* ACTION BUTTONS (User's requirement) */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        
        {/* BUTTON 1: Inform / Notify Citizen */}
        <button
          onClick={() => handleNotifyCitizen(false)}
          disabled={broadcasting}
          className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
          title="Push this cyclone observation to the Citizen Dashboard"
        >
          {broadcasting ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Send size={18} />
          )}
          <span>Notify Citizens / Update Dashboard</span>
        </button>

        {/* BUTTON 2: Coastal Siren Toggle */}
        <button
          onClick={handleToggleSiren}
          disabled={sirenLoading}
          className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-black text-xs sm:text-sm transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50 ${
            isSirenActive
              ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
              : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
          }`}
          title="Activate or silence the coastal acoustic siren beacon on connected mobile lighthouse"
        >
          {sirenLoading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : isSirenActive ? (
            <>
              <VolumeX size={18} />
              <span>Silence Coastal Siren</span>
            </>
          ) : (
            <>
              <Volume2 size={18} />
              <span>🚨 Sound Lighthouse Siren</span>
            </>
          )}
        </button>

        {/* BUTTON 3: Revoke / Clear Alert */}
        {isAlertLive && (
          <button
            onClick={handleClearAlert}
            disabled={broadcasting}
            className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
            title="Clear active broadcast from citizen dashboard"
          >
            <Trash2 size={18} />
          </button>
        )}

        {/* Quick Link to Preview Citizen Dashboard */}
        {onNavigateToCitizen && (
          <button
            onClick={onNavigateToCitizen}
            className="ml-auto inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-semibold underline underline-offset-4 cursor-pointer"
          >
            <span>Preview Citizen View</span>
            <ExternalLink size={14} />
          </button>
        )}
      </div>

      {isSirenActive && (
        <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs flex items-center gap-2 animate-pulse">
          <Volume2 size={18} className="text-red-400 shrink-0" />
          <span>
            <strong>SIREN TRANSMITTING:</strong> Connected mobile lighthouse terminal is currently wailing emergency coastal siren!
          </span>
        </div>
      )}

    </div>
  );
};

export default AdminBroadcastCard;
