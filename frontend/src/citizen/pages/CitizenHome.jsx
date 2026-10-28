import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Map as MapIcon, 
  ArrowRight, 
  ShieldCheck, 
  Volume2, 
  PhoneCall,
  User,
  Anchor,
  LogIn,
  CloudSun,
  AlertTriangle,
  WifiOff,
  Waves
} from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { fetchOfficialAdvisories } from '../services/citizenApi';
import VoiceAlertButton from '../components/VoiceAlertButton';

const CitizenHome = ({ onNavigate }) => {
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
    const pollInterval = setInterval(loadAdvisory, 2000);
    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, []);

  // Check if there is an actual active cyclone hazard
  const isRealCyclone = Boolean(
    advisory?.active && 
    advisory?.cyclone_name && 
    !advisory.cyclone_name.toLowerCase().includes('no cyclone') &&
    !advisory.cyclone_name.toLowerCase().includes('clear') &&
    !advisory.cyclone_name.toLowerCase().includes('normal') &&
    (advisory.level === 'RED' || advisory.level === 'ORANGE' || advisory.level === 'YELLOW' || advisory.level === 'DANGER')
  );

  // Text for audio broadcast (Bilingual with fallback)
  const englishAdvisory = isRealCyclone
    ? `Warning! Active cyclone alert for ${advisory.cyclone_name}. ${advisory.wind_speed_kmh ? `Wind speeds up to ${Math.round(advisory.wind_speed_kmh)} kilometers per hour.` : ''} ${advisory.fishermen_directive || advisory.message || 'All vessels return to harbor immediately.'}`
    : 'Coastal waters safe and normal. No active cyclone threats. Normal conditions for maritime and coastal operations.';

  const kannadaAdvisory = isRealCyclone
    ? `ಎಚ್ಚರಿಕೆ! ${advisory.cyclone_name} ಚಂಡಮಾರುತದ ಮುನ್ಸೂಚನೆ. ${advisory.fishermen_directive || advisory.message || 'ಎಲ್ಲಾ ದೋಣಿಗಳು ತಕ್ಷಣ ಬಂದರಿಗೆ ಹಿಂತಿರುಗಿ.'}`
    : 'ಕರಾವಳಿ ಸಮುದ್ರ ಸುರಕ್ಷಿತವಾಗಿದೆ. ಯಾವುದೇ ಚಂಡಮಾರುತದ ಅಪಾಯವಿಲ್ಲ. ಪರಿಸ್ಥಿತಿ ಸಹಜವಾಗಿದೆ.';

  const voiceText = i18n.language === 'kn' ? kannadaAdvisory : englishAdvisory;

  // Current logged in user info
  let currentUser = null;
  try {
    currentUser = JSON.parse(localStorage.getItem('cyclosafe_current_citizen_user'));
  } catch (_) {}

  return (
    <div className="space-y-4 sm:space-y-5 select-none">
      
      {/* 1. Emergency Siren Alarm Banner (Shown only when admin sounds the siren) */}
      {advisory?.siren_active && (
        <div className="p-4 rounded-2xl bg-red-600 text-white shadow-lg animate-pulse flex flex-col sm:flex-row items-center justify-between gap-3 border-2 border-red-300">
          <div className="flex items-center gap-3">
            <Volume2 size={26} className="animate-bounce shrink-0" />
            <div>
              <h3 className="text-sm font-black uppercase tracking-wide">
                {i18n.language === 'kn' ? 'ತುರ್ತು ಕರಾವಳಿ ಸೈರನ್ ಸಕ್ರಿಯವಾಗಿದೆ' : 'Coastal Emergency Siren Active'}
              </h3>
              <p className="text-xs font-semibold opacity-95">
                {i18n.language === 'kn' ? 'ಎಲ್ಲಾ ದೋಣಿಗಳು ತಕ್ಷಣ ಬಂದರಿಗೆ ಹಿಂತಿರುಗಿ!' : 'All vessels must return to harbor immediately!'}
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

      {/* 2. Offline Warning (Shown ONLY when actual network is disconnected) */}
      {!isOnline && (
        <div className="px-3.5 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-medium flex items-center gap-2">
          <WifiOff size={14} className="text-amber-600 shrink-0" />
          <span>{i18n.language === 'kn' ? 'ಆಫ್‌ಲೈನ್ ಮೋಡ್: ಉಳಿಸಲಾದ ಡೇಟಾ ಪ್ರದರ್ಶಿಸಲಾಗುತ್ತಿದೆ' : 'Offline Mode: Displaying saved local data'}</span>
        </div>
      )}

      {/* 3. Primary Safety Status Card (Simple, bold, instant clarity) */}
      {isRealCyclone ? (
        /* ACTIVE CYCLONE HAZARD CARD */
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-red-600/15 via-rose-500/10 to-white dark:to-slate-900 border-2 border-red-500 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                <AlertTriangle size={26} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white">
                    {advisory.level || 'CYCLONE ALERT'}
                  </span>
                  <span className="text-xs font-bold text-red-600">Active Threat</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-50 mt-1">
                  {advisory.cyclone_name} {advisory.wind_speed_kmh ? `(${Math.round(advisory.wind_speed_kmh)} km/h)` : ''}
                </h2>
                <p className="text-xs sm:text-sm font-bold text-red-700 dark:text-red-300 mt-1">
                  {advisory.fishermen_directive || advisory.message || 'Boats at sea must return to harbor immediately.'}
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
                <span>Track on Map</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* NORMAL / SAFE SEA CARD (Simple, Clean, Reassuring) */
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-white dark:to-slate-800/90 border border-emerald-500/30 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <ShieldCheck size={26} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                    {i18n.language === 'kn' ? 'ಸುರಕ್ಷಿತ ಸ್ಥಿತಿ' : 'All Clear • Safe'}
                  </span>
                  <span className="text-xs text-slate-400">Live Observation</span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-50 mt-0.5">
                  {i18n.language === 'kn' ? 'ಕರಾವಳಿ ಸಮುದ್ರ ಸುರಕ್ಷಿತವಾಗಿದೆ' : 'Coastal Waters Safe & Normal'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {i18n.language === 'kn'
                    ? 'ಯಾವುದೇ ಚಂಡಮಾರುತದ ಅಪಾಯವಿಲ್ಲ. ಮೀನುಗಾರಿಕೆಗೆ ಪರಿಸ್ಥಿತಿ ಸಹಜವಾಗಿದೆ.'
                    : 'No active cyclone threats. Normal conditions for maritime and coastal operations.'}
                </p>
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

      {/* 4. Quick Action Tiles (Simple 3-card grid - No Walls of Text) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Tile 1: Live Interactive Map */}
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
                {i18n.language === 'kn' ? 'ಕರಾವಳಿ ನಕ್ಷೆ' : 'Live Coastal Map'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {i18n.language === 'kn' ? 'ಲೈವ್ ಟ್ರ್ಯಾಕಿಂಗ್ & ಹಾರ್ಬರ್‌ಗಳು' : 'Live radar & coastal tracking'}
              </p>
            </div>
          </div>
          <ArrowRight size={16} className="text-slate-400 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all shrink-0" />
        </button>

        {/* Tile 2: Weather & Sea */}
        <button
          type="button"
          onClick={() => onNavigate('/citizen/weather')}
          className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs hover:border-emerald-500 hover:shadow-sm transition-all text-left flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <CloudSun size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {i18n.language === 'kn' ? 'ಹವಾಮಾನ ಮತ್ತು ಸಮುದ್ರ' : 'Weather & Sea'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {i18n.language === 'kn' ? '೭ ದಿನಗಳ ಮುನ್ಸೂಚನೆ & ಅಲೆಗಳು' : '7-day daily forecast & waves'}
              </p>
            </div>
          </div>
          <ArrowRight size={16} className="text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0" />
        </button>

        {/* Tile 3: Emergency SOS */}
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
                {i18n.language === 'kn' ? 'ತುರ್ತು ಸಂಪರ್ಕ (SOS)' : 'Emergency SOS'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {i18n.language === 'kn' ? 'ಕೋಸ್ಟ್‌ಗಾರ್ಡ್ & ೧೧೨ ಸಹಾಯವಾಣಿ' : 'Coast Guard & 112 Helplines'}
              </p>
            </div>
          </div>
          <ArrowRight size={16} className="text-slate-400 group-hover:text-rose-500 group-hover:translate-x-0.5 transition-all shrink-0" />
        </button>
      </div>

      {/* 5. Minimalist User Profile Status Bar */}
      <div className="px-4 py-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-sky-500/15 text-sky-500 flex items-center justify-center shrink-0">
            {currentUser?.user_type === 'fisherman' ? <Anchor size={14} /> : <User size={14} />}
          </div>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
            {currentUser ? (
              <>
                <strong className="text-slate-900 dark:text-slate-100">{currentUser.name}</strong> • {currentUser.user_type === 'fisherman' ? 'Fisherman' : 'Coastal Citizen'} ({currentUser.district || 'Coastal District'})
              </>
            ) : (
              i18n.language === 'kn' ? 'ನಾಗರಿಕ ಲಾಗಿನ್ ಆಗಿಲ್ಲ' : 'Direct Alerts Active in MongoDB'
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

export default CitizenHome;
