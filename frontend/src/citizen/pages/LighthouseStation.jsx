import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Radio, 
  ShieldAlert, 
  CheckCircle2, 
  Waves, 
  Compass, 
  Navigation,
  Sparkles,
  RefreshCw,
  Power
} from 'lucide-react';
import { fetchLighthouseStatus, toggleLighthouseSiren } from '../services/citizenApi';

const LIGHTHOUSE_STATIONS = [
  { id: 'kaup', name: 'Kaup Lighthouse (Udupi / Malpe Coast)', code: 'IN-KAP-01', lat: '13.2234° N', lng: '74.7388° E' },
  { id: 'mangalore', name: 'Mangalore Port Light Station', code: 'IN-MLR-02', lat: '12.8521° N', lng: '74.8317° E' },
  { id: 'karwar', name: 'Oyster Rocks Lighthouse (Karwar)', code: 'IN-KRW-03', lat: '14.8197° N', lng: '74.0601° E' },
  { id: 'vizag', name: 'Dolphin’s Nose Lighthouse (Visakhapatnam)', code: 'IN-VTZ-04', lat: '17.6833° N', lng: '83.2982° E' },
  { id: 'paradip', name: 'Paradip Port Coastal Light', code: 'IN-PRP-05', lat: '20.2600° N', lng: '86.7000° E' }
];

const LighthouseStation = () => {
  const [selectedStation, setSelectedStation] = useState(LIGHTHOUSE_STATIONS[0]);
  const [status, setStatus] = useState({
    siren_active: false,
    available: false,
    level: null,
    cyclone_name: '',
    message: '',
    issued_at: ''
  });
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [manualOverride, setManualOverride] = useState(false);
  const [lastHeartbeat, setLastHeartbeat] = useState(new Date().toLocaleTimeString());

  // Web Audio Context & Oscillator Refs
  const audioCtxRef = useRef(null);
  const oscRef = useRef(null);
  const gainNodeRef = useRef(null);
  const sirenIntervalRef = useRef(null);

  // Poll backend for real-time siren commands from Admin
  useEffect(() => {
    let isMounted = true;
    const pollStatus = async () => {
      const res = await fetchLighthouseStatus();
      if (isMounted && res.success && res.data) {
        setStatus(res.data);
        setLastHeartbeat(new Date().toLocaleTimeString());
      }
    };

    pollStatus();
    const interval = setInterval(pollStatus, 1500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const isSirenActive = manualOverride || status.siren_active === true;

  // Web Audio Siren Generator
  const startSirenAudio = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Stop any existing oscillator
      stopSirenAudio();

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(500, ctx.currentTime);

      gainNode.gain.setValueAtTime(0.7, ctx.currentTime);
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start();
      oscRef.current = osc;
      gainNodeRef.current = gainNode;

      // Oscillate frequency between 500Hz and 850Hz (Authentic Coastal Warning Siren)
      let rising = true;
      sirenIntervalRef.current = setInterval(() => {
        if (!oscRef.current) return;
        const now = ctx.currentTime;
        if (rising) {
          oscRef.current.frequency.exponentialRampToValueAtTime(850, now + 0.6);
        } else {
          oscRef.current.frequency.exponentialRampToValueAtTime(500, now + 0.6);
        }
        rising = !rising;
      }, 700);

      // Hardware phone vibration
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([600, 200, 600, 200, 800]);
      }
    } catch (e) {
      console.warn('Web Audio error:', e);
    }
  };

  const stopSirenAudio = () => {
    if (sirenIntervalRef.current) {
      clearInterval(sirenIntervalRef.current);
      sirenIntervalRef.current = null;
    }
    if (oscRef.current) {
      try {
        oscRef.current.stop();
        oscRef.current.disconnect();
      } catch {}
      oscRef.current = null;
    }
    if (gainNodeRef.current) {
      try {
        gainNodeRef.current.disconnect();
      } catch {}
      gainNodeRef.current = null;
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(0);
    }
  };

  // Sync Audio playback with siren state
  useEffect(() => {
    if (isSirenActive && audioEnabled) {
      startSirenAudio();
    } else {
      stopSirenAudio();
    }

    return () => stopSirenAudio();
  }, [isSirenActive, audioEnabled]);

  // Handle manual test button
  const handleToggleManualTest = () => {
    setAudioEnabled(true);
    setManualOverride(!manualOverride);
  };

  // Turn siren OFF across system
  const handleAdminSilence = async () => {
    setManualOverride(false);
    await toggleLighthouseSiren(false);
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans flex flex-col justify-between p-4 sm:p-8 select-none ${
      isSirenActive 
        ? 'bg-red-950 text-white animate-pulse' 
        : 'bg-slate-950 text-slate-100'
    }`}>

      {/* 1. TOP STATUS BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className={`w-3.5 h-3.5 rounded-full ${isSirenActive ? 'bg-red-500 animate-ping' : 'bg-emerald-500'}`} />
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
              Coastal Telemetry Link
            </span>
            <h1 className="text-sm sm:text-base font-black tracking-tight flex items-center gap-2">
              <span>{selectedStation.name}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-sm bg-white/10 text-sky-300 font-mono">
                {selectedStation.code}
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-mono text-[11px] hidden sm:inline">
            Sync: {lastHeartbeat}
          </span>
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              audioEnabled ? 'bg-emerald-500 text-slate-950' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            title="Enable Audio on Mobile Phone"
          >
            {audioEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            <span>Audio {audioEnabled ? 'Armed' : 'Muted (Tap to Arm)'}</span>
          </button>
        </div>
      </div>

      {/* 2. REVOLVING LIGHTHOUSE BEACON ANIMATION (Visual Centerpiece) */}
      <div className="my-auto py-8 flex flex-col items-center justify-center text-center">
        
        {/* Beacon Lens Graphic */}
        <div className="relative w-44 h-44 sm:w-56 sm:h-56 flex items-center justify-center mb-6">
          
          {/* Outer Pulsing Aura */}
          <div className={`absolute inset-0 rounded-full transition-all duration-700 ${
            isSirenActive 
              ? 'bg-red-500/40 animate-ping' 
              : 'bg-sky-500/20'
          }`} style={{ animationDuration: isSirenActive ? '1.2s' : '3s' }} />

          {/* Rotating Sweeping Beam Effect */}
          <div className={`absolute inset-0 rounded-full border-4 border-dashed transition-all ${
            isSirenActive 
              ? 'border-red-400 animate-spin' 
              : 'border-sky-400/50 animate-spin'
          }`} style={{ animationDuration: isSirenActive ? '2s' : '8s' }} />

          {/* Core Lantern / Beacon Bulb */}
          <div className={`w-28 h-28 sm:w-36 sm:h-36 rounded-full flex flex-col items-center justify-center shadow-2xl border-4 transition-all z-10 ${
            isSirenActive 
              ? 'bg-gradient-to-tr from-red-600 via-red-500 to-amber-400 border-white text-white shadow-red-500/80 scale-105' 
              : 'bg-gradient-to-tr from-sky-800 to-slate-900 border-sky-400/40 text-sky-300 shadow-sky-500/20'
          }`}>
            <Radio size={isSirenActive ? 42 : 36} className={isSirenActive ? 'animate-bounce' : ''} />
            <span className="text-[11px] font-black uppercase tracking-widest mt-1">
              {isSirenActive ? 'SIREN ON' : 'STANDBY'}
            </span>
          </div>
        </div>

        {/* Big Alert Banner */}
        {isSirenActive ? (
          <div className="space-y-2 max-w-md mx-auto">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-red-600 text-white shadow-lg">
              🚨 GREAT DANGER SIGNAL HOISTED
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              COASTAL SIREN ACTIVE
            </h2>
            <p className="text-xs sm:text-sm text-red-200 font-medium">
              {status.message || 'Severe cyclonic storm approaching coast. All fishing vessels must immediately return to harbor.'}
            </p>
          </div>
        ) : (
          <div className="space-y-1 max-w-md mx-auto">
            <span className="inline-block px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              NORMAL NAVIGATION BEACON
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-200">
              Lighthouse Ready
            </h2>
            <p className="text-xs text-slate-400">
              Listening for emergency cyclone broadcast commands from Admin Operations Center.
            </p>
          </div>
        )}
      </div>

      {/* 3. CONTROLS & DEMO OVERRIDE (For User's Presentation) */}
      <div className="space-y-4 pt-4 border-t border-white/10 max-w-lg mx-auto w-full">
        
        {/* Manual Test Button */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleToggleManualTest}
            className={`py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm transition-all shadow-lg active:scale-95 cursor-pointer flex items-center justify-center gap-2 ${
              isSirenActive 
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950' 
                : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
            }`}
          >
            {isSirenActive ? <VolumeX size={18} /> : <Volume2 size={18} />}
            <span>{isSirenActive ? 'Pause Siren' : 'Test Siren (Demo)'}</span>
          </button>

          {isSirenActive ? (
            <button
              onClick={handleAdminSilence}
              className="py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm bg-slate-800 hover:bg-slate-700 text-white border border-white/20 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={18} className="text-emerald-400" />
              <span>Silence All</span>
            </button>
          ) : (
            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-center flex flex-col justify-center">
              <span className="text-[10px] text-slate-400">Station Coordinates</span>
              <span className="text-xs font-mono font-bold text-slate-200">
                {selectedStation.lat}, {selectedStation.lng}
              </span>
            </div>
          )}
        </div>

        {/* Select Station Dropdown */}
        <div className="flex items-center justify-between gap-2 text-xs bg-white/5 p-2 rounded-xl border border-white/10">
          <span className="text-slate-400 pl-2">Station:</span>
          <select
            value={selectedStation.id}
            onChange={(e) => {
              const found = LIGHTHOUSE_STATIONS.find(s => s.id === e.target.value);
              if (found) setSelectedStation(found);
            }}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1.5 focus:outline-hidden cursor-pointer"
          >
            {LIGHTHOUSE_STATIONS.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Presentation Tip */}
        <p className="text-[11px] text-slate-400 text-center">
          <strong>Tip for presentation:</strong> Place this phone on the table. When you click <em>"Notify Citizens / Sound Siren"</em> on your laptop, this screen turns red and sounds the acoustic coastal warning horn!
        </p>
      </div>

    </div>
  );
};

export default LighthouseStation;
