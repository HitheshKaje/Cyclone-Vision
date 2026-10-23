import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Radio, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Anchor, 
  Layers, 
  Settings,
  Vibrate,
  Smartphone,
  ChevronLeft
} from 'lucide-react';
import { fetchOfficialAdvisories, toggleLighthouseSiren } from '../services/citizenApi';

const STATIONS = [
  { id: 'kaup', name: 'Kaup Coastal Lighthouse (Udupi / Malpe)', signal: 'Signal 10 (Great Danger)', focalHeight: '43m above MSL' },
  { id: 'mangalore', name: 'Mangalore Port Light Beacon #01', signal: 'Signal 09 (Severe Warning)', focalHeight: '33m above MSL' },
  { id: 'karwar', name: 'Karwar Oyster Rocks Lighthouse', signal: 'Signal 08 (Cyclone Threat)', focalHeight: '64m above MSL' },
  { id: 'visakhapatnam', name: 'Visakhapatnam Dolphin Nose Light', signal: 'Signal 10 (Great Danger)', focalHeight: '173m above MSL' },
  { id: 'paradip', name: 'Paradip Coastal Warning Tower', signal: 'Signal 11 (Communication Failure / Extreme Landfall)', focalHeight: '38m above MSL' }
];

const LighthouseStation = ({ onNavigateBack }) => {
  const [station, setStation] = useState(STATIONS[0]);
  const [isArmed, setIsArmed] = useState(false);
  const [sirenActive, setSirenActive] = useState(false);
  const [alertData, setAlertData] = useState(null);
  const [manualOverride, setManualOverride] = useState(false);
  const [volume, setVolume] = useState(0.85);

  const audioCtxRef = useRef(null);
  const oscillatorRef = useRef(null);
  const gainNodeRef = useRef(null);
  const sirenIntervalRef = useRef(null);
  const vibrationIntervalRef = useRef(null);

  // Initialize or unlock Web Audio API on user interaction (required by mobile browsers)
  const unlockAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtxRef.current = new AudioContextClass();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    setIsArmed(true);
  };

  // Start synthesizing the wailing coastal foghorn siren tone
  const startSirenAudio = () => {
    if (!audioCtxRef.current) {
      unlockAudioContext();
    }
    if (!audioCtxRef.current) return;

    try {
      // If already playing, don't restart
      if (oscillatorRef.current) return;

      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Gain (Volume) node
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.connect(ctx.destination);
      gainNodeRef.current = gainNode;

      // Primary Oscillator (Sawtooth waveform for rich mechanical foghorn harmonics)
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(450, ctx.currentTime);
      osc.connect(gainNode);
      osc.start();
      oscillatorRef.current = osc;

      // Oscillate pitch between 450Hz and 850Hz (authentic siren frequency modulation)
      let rising = true;
      sirenIntervalRef.current = setInterval(() => {
        if (!oscillatorRef.current || !ctx) return;
        const now = ctx.currentTime;
        if (rising) {
          oscillatorRef.current.frequency.exponentialRampToValueAtTime(850, now + 1.2);
        } else {
          oscillatorRef.current.frequency.exponentialRampToValueAtTime(450, now + 1.2);
        }
        rising = !rising;
      }, 1200);

      // Trigger physical mobile vibration motor if supported
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([600, 300, 600, 300, 900]);
        vibrationIntervalRef.current = setInterval(() => {
          navigator.vibrate([600, 300, 600, 300, 900]);
        }, 3000);
      }
    } catch (err) {
      console.warn('Audio siren start notice:', err);
    }
  };

  // Stop the acoustic siren and cancel vibration
  const stopSirenAudio = () => {
    try {
      if (sirenIntervalRef.current) {
        clearInterval(sirenIntervalRef.current);
        sirenIntervalRef.current = null;
      }
      if (vibrationIntervalRef.current) {
        clearInterval(vibrationIntervalRef.current);
        vibrationIntervalRef.current = null;
      }
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(0);
      }

      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
        oscillatorRef.current = null;
      }
      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect();
        gainNodeRef.current = null;
      }
    } catch (err) {
      console.warn('Audio siren stop notice:', err);
    }
  };

  // Poll backend for Admin siren broadcast
  useEffect(() => {
    let isMounted = true;

    const checkSirenStatus = async () => {
      const res = await fetchOfficialAdvisories();
      if (!isMounted) return;

      if (res.success && res.data) {
        setAlertData(res.data);
        const shouldSound = manualOverride || (res.data.siren_active === true);
        setSirenActive(shouldSound);
      } else {
        setSirenActive(manualOverride);
      }
    };

    checkSirenStatus();
    const pollTimer = setInterval(checkSirenStatus, 1500);

    return () => {
      isMounted = false;
      clearInterval(pollTimer);
    };
  }, [manualOverride]);

  // Audio start/stop synchronizer with sirenActive state
  useEffect(() => {
    if (sirenActive && isArmed) {
      startSirenAudio();
    } else {
      stopSirenAudio();
    }

    return () => {
      stopSirenAudio();
    };
  }, [sirenActive, isArmed, volume]);

  const toggleManualSiren = () => {
    unlockAudioContext();
    setManualOverride(!manualOverride);
  };

  const isRedAlert = alertData?.level === 'RED' || sirenActive;

  return (
    <div className={`min-h-screen w-full flex flex-col justify-between p-4 sm:p-6 transition-all duration-500 font-sans select-none relative overflow-hidden ${
      sirenActive 
        ? 'bg-red-950 text-white' 
        : 'bg-[#040814] text-slate-100'
    }`}>

      {/* ROTATING LIGHTHOUSE BEACON BACKGROUND ANIMATION */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 flex items-center justify-center">
        {/* Revolving Light Cone */}
        <div 
          className={`w-[600px] h-[600px] sm:w-[900px] sm:h-[900px] rounded-full transition-all duration-300 ${
            sirenActive
              ? 'bg-[conic-gradient(from_0deg,rgba(239,68,68,0.7)_0deg,transparent_60deg,transparent_300deg,rgba(239,68,68,0.7)_360deg)] animate-spin shadow-[0_0_120px_rgba(239,68,68,0.6)]'
              : 'bg-[conic-gradient(from_0deg,rgba(14,165,233,0.3)_0deg,transparent_45deg,transparent_315deg,rgba(14,165,233,0.3)_360deg)] animate-spin opacity-40'
          }`}
          style={{ animationDuration: sirenActive ? '2.5s' : '8s' }}
        />
        {/* Pulsing center lamp */}
        <div className={`absolute w-36 h-36 rounded-full blur-xl transition-all duration-300 ${
          sirenActive ? 'bg-red-500/80 animate-ping' : 'bg-sky-400/30'
        }`} />
      </div>

      {/* 1. TOP HEADER & STATION INFO */}
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          {onNavigateBack && (
            <button
              onClick={onNavigateBack}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              aria-label="Back to Citizen Dashboard"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <div className="flex items-center gap-2.5">
            <div className={`p-2.5 rounded-xl ${
              sirenActive ? 'bg-red-500 text-white animate-pulse' : 'bg-sky-500/20 text-sky-400'
            }`}>
              <Anchor size={22} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                CycloSafe Coastal Warning Beacon
              </span>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                {station.name}
              </h1>
            </div>
          </div>
        </div>

        {/* Port Warning Signal Tag */}
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-md ${
            sirenActive 
              ? 'bg-red-500 text-white border-white animate-pulse'
              : 'bg-slate-800 text-slate-300 border-slate-700'
          }`}>
            {station.signal}
          </span>
        </div>
      </header>

      {/* 2. MAIN CENTERPIECE: LIGHTHOUSE EMERGENCY BEACON */}
      <main className="relative z-10 my-auto py-6 flex flex-col items-center text-center max-w-xl mx-auto w-full space-y-6">
        
        {/* Huge Visual Siren Indicator */}
        <div className={`w-40 h-40 sm:w-52 sm:h-52 rounded-full border-4 flex flex-col items-center justify-center p-4 transition-all duration-300 relative ${
          sirenActive
            ? 'border-white bg-red-600 shadow-[0_0_80px_rgba(239,68,68,0.9)] animate-pulse'
            : isArmed
            ? 'border-sky-500/40 bg-slate-900/80 shadow-[0_0_40px_rgba(14,165,233,0.2)]'
            : 'border-slate-700 bg-slate-900/60'
        }`}>
          {sirenActive ? (
            <>
              <Volume2 size={64} className="text-white animate-bounce mb-2" />
              <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-white">
                SIREN BLASTING
              </span>
              <span className="text-[10px] font-bold text-red-100">
                FOGHORN ACTIVE
              </span>
            </>
          ) : (
            <>
              <VolumeX size={48} className="text-slate-400 mb-2" />
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-300">
                {isArmed ? 'BEACON STANDBY' : 'TAP TO ARM'}
              </span>
              <span className="text-[10px] text-slate-500">
                {isArmed ? 'Listening to Admin' : 'Audio Disabled'}
              </span>
            </>
          )}
        </div>

        {/* Live Status Description */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-white/10 backdrop-blur-md border border-white/20">
            <Radio size={14} className={sirenActive ? 'text-red-400 animate-ping' : 'text-emerald-400'} />
            <span>
              {sirenActive 
                ? 'EMERGENCY BROADCAST SYNCHRONIZED' 
                : alertData?.active 
                ? 'ALERT ISSUED — SIREN STANDBY' 
                : 'NORMAL MONITORING WATCH'}
            </span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            {sirenActive 
              ? 'RED ALERT: EVACUATE SEA WATERS' 
              : alertData?.title || 'Normal Maritime State'}
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed font-medium">
            {alertData?.message || 'Lighthouse beacon receiver connected to CycloSafe AI early warning telemetry. Audio siren triggers instantly when Admin hoists emergency danger signals.'}
          </p>
        </div>

        {/* Current Storm Telemetry if available */}
        {alertData?.active && (
          <div className="w-full p-3.5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Detected Storm</span>
              <span className="font-bold text-white text-sm truncate block">{alertData.cyclone_name}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Wind Speed</span>
              <span className="font-bold text-amber-400 text-sm">{alertData.wind_speed_kmh} km/h</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Category</span>
              <span className="font-bold text-red-400 text-sm">{alertData.classification}</span>
            </div>
          </div>
        )}

        {/* ARM AUDIO BUTTON (Required by Chrome/Android to permit siren autoplay) */}
        {!isArmed && (
          <button
            onClick={unlockAudioContext}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-400 hover:to-sky-400 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/30 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
          >
            <Smartphone size={18} />
            <span>Tap to Arm Audio on this Phone</span>
          </button>
        )}

        {/* MANUAL OVERRIDE / TEST BUTTON */}
        <div className="flex flex-wrap items-center justify-center gap-3 w-full pt-2">
          <button
            onClick={toggleManualSiren}
            className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md active:scale-95 flex items-center justify-center gap-2 select-none ${
              manualOverride
                ? 'bg-red-600 hover:bg-red-700 text-white ring-2 ring-white animate-pulse'
                : 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
            }`}
          >
            {manualOverride ? <VolumeX size={16} /> : <Volume2 size={16} />}
            <span>{manualOverride ? 'Stop Test Siren' : 'Test Siren (Demo Override)'}</span>
          </button>

          {/* Station Switcher Modal / Select */}
          <select
            value={station.id}
            onChange={(e) => {
              const selected = STATIONS.find(s => s.id === e.target.value);
              if (selected) setStation(selected);
            }}
            className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/20 text-xs font-semibold cursor-pointer focus:outline-hidden"
          >
            {STATIONS.map((s) => (
              <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                {s.name}
              </option>
            ))}
          </select>
        </div>

      </main>

      {/* 3. FOOTER TELEMETRY & HARDWARE METADATA */}
      <footer className="relative z-10 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${sirenActive ? 'bg-red-500 animate-ping' : 'bg-emerald-400'}`} />
          <span>Lighthouse Status: {sirenActive ? 'SIREN & REVOLVING BEACON HOISTED' : 'STANDBY - NORMAL ILLUMINATION'}</span>
        </div>
        <div className="flex items-center gap-3 text-slate-400">
          <span>Focal Height: {station.focalHeight}</span>
          <span>Optical Range: 22 Nautical Miles</span>
        </div>
      </footer>

    </div>
  );
};

export default LighthouseStation;
