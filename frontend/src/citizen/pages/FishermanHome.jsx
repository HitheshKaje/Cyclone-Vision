import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Anchor, 
  Ship, 
  MapPin, 
  Wind, 
  Waves, 
  AlertTriangle, 
  ShieldCheck, 
  Volume2, 
  PhoneCall, 
  Map as MapIcon, 
  CloudSun, 
  ArrowRight, 
  WifiOff, 
  LogIn, 
  CheckCircle2, 
  LifeBuoy, 
  Radio, 
  Navigation,
  Compass,
  Clock,
  RefreshCw
} from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { fetchOfficialAdvisories, updateUserStatus } from '../services/citizenApi';
import VoiceAlertButton from '../components/VoiceAlertButton';

const FishermanHome = ({ onNavigate }) => {
  const { t, i18n } = useTranslation();
  const { isOnline } = useNetworkStatus();
  const [advisory, setAdvisory] = useState({
    available: false,
    active: false,
    level: null,
    cyclone_name: null,
    message: '',
    fishermen_directive: '',
    wind_speed_kmh: null,
    area: '',
    issued_at: null,
    siren_active: false
  });

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const raw = localStorage.getItem('cyclosafe_current_citizen_user');
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  });

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState('');

  // Sync user from storage or event
  useEffect(() => {
    const handleSync = (e) => {
      if (e.detail) setCurrentUser(e.detail);
    };
    window.addEventListener('cyclosafe_user_registered', handleSync);
    return () => window.removeEventListener('cyclosafe_user_registered', handleSync);
  }, []);

  // Poll advisories
  useEffect(() => {
    let isMounted = true;
    const loadAdvisory = async () => {
      const res = await fetchOfficialAdvisories();
      if (!isMounted) return;
      if (res.success && res.data) {
        setAdvisory(res.data);
      }
    };

    loadAdvisory();
    const pollInterval = setInterval(loadAdvisory, 2500);
    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, []);

  // Check active cyclone hazard
  const isRealCyclone = Boolean(
    advisory?.active && 
    advisory?.cyclone_name && 
    !advisory.cyclone_name.toLowerCase().includes('no cyclone') &&
    !advisory.cyclone_name.toLowerCase().includes('clear') &&
    !advisory.cyclone_name.toLowerCase().includes('normal') &&
    (advisory.level === 'RED' || advisory.level === 'ORANGE' || advisory.level === 'YELLOW' || advisory.level === 'DANGER')
  );

  const windKmh = advisory.wind_speed_kmh ? Math.round(advisory.wind_speed_kmh) : null;
  const windKt = windKmh ? Math.round(windKmh / 1.852) : null;

  // Text for maritime audio broadcast
  const englishAdvisory = isRealCyclone
    ? `Maritime Alert for Fishermen! Active storm warning: ${advisory.cyclone_name}. Coastal winds up to ${windKt || 45} knots (${windKmh || 85} km/h). ${advisory.fishermen_directive || 'All fishing vessels must return to harbor immediately. Do not venture into deep sea.'}`
    : 'Maritime weather bulletin: Coastal waters safe for fishing operations. Sea state normal. Maintain routine VHF watch.';

  const kannadaAdvisory = isRealCyclone
    ? `ಮೀನುಗಾರರಿಗೆ ಎಚ್ಚರಿಕೆ! ${advisory.cyclone_name} ಚಂಡಮಾರುತದ ಭೀತಿ. ಗಾಳಿಯ ವೇಗ ${windKt || 45} ನಾಟ್‌ಗಳು. ಎಲ್ಲಾ ದೋಣಿಗಳು ತಕ್ಷಣ ಹತ್ತಿರದ ಬಂದರಿಗೆ ಹಿಂತಿರುಗಬೇಕು. ಸಮುದ್ರಕ್ಕೆ ಇಳಿಯಬೇಡಿ.`
    : 'ಕರಾವಳಿ ಸಮುದ್ರ ಶಾಂತವಾಗಿದೆ. ಮೀನುಗಾರಿಕೆಗೆ ಪರಿಸ್ಥಿತಿ ಅನುಕೂಲಕರವಾಗಿದೆ. ಯಾವುದೇ ಚಂಡಮಾರುತದ ಅಪಾಯವಿಲ್ಲ.';

  const voiceText = i18n.language === 'kn' ? kannadaAdvisory : englishAdvisory;

  // Toggle vessel status (IN_HARBOR vs AT_SEA)
  const handleToggleVesselStatus = async () => {
    if (!currentUser) {
      onNavigate('/login');
      return;
    }

    const currentStatus = currentUser.status || 'IN_HARBOR';
    const nextStatus = currentStatus === 'AT_SEA' ? 'IN_HARBOR' : 'AT_SEA';

    setIsUpdatingStatus(true);
    setStatusFeedback('');

    try {
      const userId = currentUser.id || currentUser._id;
      const res = await updateUserStatus(userId, { status: nextStatus });
      if (res.success && res.data) {
        const updated = { ...currentUser, ...res.data, status: nextStatus };
        setCurrentUser(updated);
        try {
          localStorage.setItem('cyclosafe_current_citizen_user', JSON.stringify(updated));
        } catch (_) {}
        setStatusFeedback(nextStatus === 'AT_SEA' ? 'Vessel logged AT SEA' : 'Vessel safe IN HARBOR');
      } else {
        // Local optimistic update
        const updated = { ...currentUser, status: nextStatus };
        setCurrentUser(updated);
        try {
          localStorage.setItem('cyclosafe_current_citizen_user', JSON.stringify(updated));
        } catch (_) {}
        setStatusFeedback(nextStatus === 'AT_SEA' ? 'Vessel status updated to AT SEA' : 'Vessel status updated to IN HARBOR');
      }
    } catch (_) {
      const updated = { ...currentUser, status: nextStatus };
      setCurrentUser(updated);
      try {
        localStorage.setItem('cyclosafe_current_citizen_user', JSON.stringify(updated));
      } catch (_) {}
      setStatusFeedback('Status updated locally');
    } finally {
      setIsUpdatingStatus(false);
      setTimeout(() => setStatusFeedback(''), 3000);
    }
  };

  const isAtSea = currentUser?.status === 'AT_SEA';

  return (
    <div className="space-y-4 sm:space-y-5 select-none">

      {/* 1. Coastal Siren Alert Banner */}
      {advisory?.siren_active && (
        <div className="p-4 rounded-2xl bg-red-600 text-white shadow-lg animate-pulse flex flex-col sm:flex-row items-center justify-between gap-3 border-2 border-red-300">
          <div className="flex items-center gap-3">
            <Volume2 size={28} className="animate-bounce shrink-0" />
            <div>
              <h3 className="text-sm font-black uppercase tracking-wide">
                {i18n.language === 'kn' ? 'ತುರ್ತು ಕರಾವಳಿ ಸೈರನ್ ಸಕ್ರಿಯವಾಗಿದೆ' : 'Coast Guard & Harbor Siren Active'}
              </h3>
              <p className="text-xs font-semibold opacity-95">
                {i18n.language === 'kn' ? 'ಎಲ್ಲಾ ಮೀನುಗಾರಿಕಾ ದೋಣಿಗಳು ತಕ್ಷಣ ಬಂದರಿಗೆ ಮರಳಬೇಕು!' : 'High Sea Threat: All fishing vessels return to harbor immediately!'}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('/lighthouse')}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white text-red-700 font-black text-xs uppercase tracking-wider shrink-0 cursor-pointer shadow-xs hover:bg-slate-100"
          >
            {i18n.language === 'kn' ? 'ಲೈಟ್‌ಹೌಸ್ ಪರದೆ ತೆರೆಯಿರಿ →' : 'Open Lighthouse →'}
          </button>
        </div>
      )}

      {/* 2. Network status warning */}
      {!isOnline && (
        <div className="px-3.5 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-medium flex items-center gap-2">
          <WifiOff size={14} className="text-amber-600 shrink-0" />
          <span>{i18n.language === 'kn' ? 'ಆಫ್‌ಲೈನ್ ಮೋಡ್: ನಾವಿಕ ಸ್ಥಳೀಯ ಡೇಟಾ' : 'Offline Maritime Mode: Cached satellite alerts'}</span>
        </div>
      )}

      {/* 3. Fisherman Vessel & Sea Status Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-sky-900 to-slate-900 text-white border border-sky-700/50 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300 shrink-0">
              <Ship size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-400/20 text-sky-200 border border-sky-400/30">
                  {i18n.language === 'kn' ? 'ಮೀನುಗಾರಿಕಾ ಹಡಗು ಡ್ಯಾಶ್‌ಬೋರ್ಡ್' : 'Fisherman Maritime Terminal'}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  isAtSea 
                    ? 'bg-amber-500 text-amber-950 animate-pulse' 
                    : 'bg-emerald-500 text-emerald-950'
                }`}>
                  {isAtSea ? '● At Sea' : '● In Harbor'}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black mt-1 flex items-center gap-2">
                <span>{currentUser?.vessel_name || 'Vessel: Sea Falcon'}</span>
                {currentUser?.vessel_reg && (
                  <span className="text-xs font-normal text-sky-300">({currentUser.vessel_reg})</span>
                )}
              </h2>
              <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-0.5">
                <MapPin size={12} className="text-sky-400" />
                <span>Base Port: <strong>{currentUser?.port || 'Malpe Fishery Harbor (Udupi)'}</strong></span>
              </p>
            </div>
          </div>

          {/* Harbor / Sea Status Action Toggle */}
          <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleToggleVesselStatus}
              disabled={isUpdatingStatus}
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all shadow-sm ${
                isAtSea
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-900'
                  : 'bg-sky-500 hover:bg-sky-400 text-slate-900'
              }`}
            >
              {isUpdatingStatus ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Anchor size={14} />
              )}
              <span>{isAtSea ? 'Report Safe in Harbor' : 'Report Vessel at Sea'}</span>
            </button>
            {statusFeedback && (
              <span className="text-[11px] font-bold text-emerald-300 animate-fade-in">
                {statusFeedback}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 4. Real-time Sea Condition & Cyclone Warning Card */}
      {isRealCyclone ? (
        /* DANGEROUS SEAS CARD */
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-red-600/15 via-rose-500/10 to-white dark:to-slate-900 border-2 border-red-500 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                <AlertTriangle size={26} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white">
                    {advisory.level || 'CYCLONE HAZARD'}
                  </span>
                  <span className="text-xs font-bold text-red-600">
                    High Sea Warning
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-50 mt-1">
                  {advisory.cyclone_name}
                </h2>
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs font-bold text-red-700 dark:text-red-300">
                  <span className="flex items-center gap-1 bg-red-100 dark:bg-red-950/80 px-2 py-0.5 rounded-md">
                    <Wind size={13} />
                    <span>Winds: {windKt || 45} kt ({windKmh || 85} km/h)</span>
                  </span>
                  <span className="flex items-center gap-1 bg-red-100 dark:bg-red-950/80 px-2 py-0.5 rounded-md">
                    <Waves size={13} />
                    <span>Rough / Very Rough Seas</span>
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-bold text-red-800 dark:text-red-200 mt-2">
                  {advisory.fishermen_directive || 'IMD DIRECTIVE: Total suspension of fishing operations. All vessels return to harbor immediately.'}
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <VoiceAlertButton
                textToRead={voiceText}
                englishText={englishAdvisory}
                kannadaText={kannadaAdvisory}
              />
              <button
                onClick={() => onNavigate('/citizen/map')}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>Marine Radar</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* NORMAL MARITIME WEATHER CARD */
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-sky-500/10 via-blue-500/5 to-white dark:to-slate-800/90 border border-sky-500/30 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <ShieldCheck size={26} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-700 dark:text-sky-300">
                    {i18n.language === 'kn' ? 'ಸಮುದ್ರ ಸುರಕ್ಷಿತವಾಗಿದೆ' : 'Sea State: Safe / Normal'}
                  </span>
                  <span className="text-xs text-slate-400">IMD Marine Bulletin</span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-50 mt-0.5">
                  {i18n.language === 'kn' ? 'ಮೀನುಗಾರಿಕೆಗೆ ಕರಾವಳಿ ಅನುಕೂಲಕರ' : 'Normal Conditions for Coastal Fishing'}
                </h2>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1">
                    <Wind size={13} className="text-sky-500" />
                    <span>Wind: 10-15 kt</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Waves size={13} className="text-teal-500" />
                    <span>Waves: 0.8m - 1.2m</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Compass size={13} className="text-indigo-500" />
                    <span>Visibility: Good</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="shrink-0 self-start sm:self-auto">
              <VoiceAlertButton
                textToRead={voiceText}
                englishText={englishAdvisory}
                kannadaText={kannadaAdvisory}
              />
            </div>
          </div>
        </div>
      )}

      {/* 5. Navigation Tiles for Fishermen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Tile 1: Live Cyclone Marine Radar */}
        <button
          type="button"
          onClick={() => onNavigate('/citizen/map')}
          className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs hover:border-sky-500 hover:shadow-sm transition-all text-left flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <MapIcon size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {i18n.language === 'kn' ? 'ಕರಾವಳಿ ರೇಡಾರ್ ನಕ್ಷೆ' : 'Marine Cyclone Radar'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {i18n.language === 'kn' ? 'ಲೈವ್ ಟ್ರ್ಯಾಕಿಂಗ್ & ಹಾರ್ಬರ್‌ಗಳು' : 'Live storm track & safe harbors'}
              </p>
            </div>
          </div>
          <ArrowRight size={16} className="text-slate-400 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all shrink-0" />
        </button>

        {/* Tile 2: Sea Waves & 7-Day Forecast */}
        <button
          type="button"
          onClick={() => onNavigate('/citizen/weather')}
          className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs hover:border-teal-500 hover:shadow-sm transition-all text-left flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Waves size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {i18n.language === 'kn' ? 'ಅಲೆಗಳು ಮತ್ತು ಹವಾಮಾನ' : 'Wave Height & Tides'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {i18n.language === 'kn' ? '೭ ದಿನಗಳ ಸಮುದ್ರ ಮುನ್ಸೂಚನೆ' : '7-day sea swell & wind gusts'}
              </p>
            </div>
          </div>
          <ArrowRight size={16} className="text-slate-400 group-hover:text-teal-500 group-hover:translate-x-0.5 transition-all shrink-0" />
        </button>

        {/* Tile 3: Maritime SOS / Coast Guard */}
        <button
          type="button"
          onClick={() => onNavigate('/citizen/emergency')}
          className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs hover:border-rose-500 hover:shadow-sm transition-all text-left flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <PhoneCall size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {i18n.language === 'kn' ? 'ಕೋಸ್ಟ್‌ಗಾರ್ಡ್ SOS (೧೫೫೪)' : 'Coast Guard (1554)'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {i18n.language === 'kn' ? 'ತುರ್ತು ಕಡಲ ರಕ್ಷಣಾ ಪಡೆ' : 'Maritime Rescue Coordination'}
              </p>
            </div>
          </div>
          <ArrowRight size={16} className="text-slate-400 group-hover:text-rose-500 group-hover:translate-x-0.5 transition-all shrink-0" />
        </button>
      </div>

      {/* 6. Pre-Voyage Safety Checklist for Fishermen */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-3">
          <LifeBuoy size={16} className="text-sky-500" />
          <span>Pre-Voyage Vessel Safety Protocol</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300">
            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
            <span>Approved Life Jackets for all crew aboard</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300">
            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
            <span>VHF Marine Radio verified on Channel 16</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300">
            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
            <span>GPS, Navigation Lights & Compass checked</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300">
            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
            <span>Emergency Flares & DAT (Distress Alert Transmitter)</span>
          </div>
        </div>
      </div>

      {/* 7. Fisherman User Profile Status Bar */}
      <div className="px-4 py-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-sky-500/15 text-sky-500 flex items-center justify-center shrink-0">
            <Anchor size={14} />
          </div>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
            {currentUser ? (
              <>
                <strong className="text-slate-900 dark:text-slate-100">{currentUser.name}</strong> • Fisherman ({currentUser.port || 'Karnataka Coast'})
              </>
            ) : (
              'Fisherman Profile Active'
            )}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('/login')}
          className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer self-end sm:self-auto shrink-0"
        >
          <LogIn size={13} />
          <span>{currentUser ? 'Switch User' : 'Sign In / Register'}</span>
        </button>
      </div>

    </div>
  );
};

export default FishermanHome;
