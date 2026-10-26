import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Map as MapIcon, 
  ArrowRight, 
  ShieldCheck, 
  Volume2, 
  CheckCircle2,
  PhoneCall
} from 'lucide-react';
import { useCycloneData } from '../hooks/useCycloneData';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { fetchOfficialAdvisories } from '../services/citizenApi';
import OfflineStatusBanner from '../components/OfflineStatusBanner';
import LastUpdatedIndicator from '../components/LastUpdatedIndicator';
import SafetyStatusCard from '../components/SafetyStatusCard';
import CycloneSummaryCard from '../components/CycloneSummaryCard';
import VoiceAlertButton from '../components/VoiceAlertButton';

const CitizenHome = ({ onNavigate }) => {
  const { t, i18n } = useTranslation();
  const { isOnline } = useNetworkStatus();
  const { metadata, loading, isCached, freshness, refresh } = useCycloneData();
  const [advisory, setAdvisory] = useState({
    available: false,
    active: false,
    level: null,
    title: '',
    message: '',
    fishermen_directive: '',
    area: '',
    source: '',
    issued_at: null,
    coordinates: null
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
    const pollInterval = setInterval(loadAdvisory, 1500);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, []);

  const isAlertActive = Boolean(advisory?.active && advisory?.cyclone_name);

  // Derive active cyclone strictly from live Admin broadcast without hardcoded fallback coordinates
  const activeCyclone = isAlertActive
    ? {
        name: advisory.cyclone_name,
        status: advisory.level === 'RED' ? 'Severe Cyclone (Live Broadcast)' : 'Cyclone Alert',
        latitude: advisory.coordinates?.lat ?? null,
        longitude: advisory.coordinates?.lng ?? null,
        wind_speed: advisory.wind_speed_kmh,
        last_updated: advisory.issued_at,
        description: advisory.message,
        source: advisory.source
      }
    : null;

  // Text for voice alert - only speaks active live warnings
  const voiceText = isAlertActive
    ? `${advisory.title || 'Cyclone Alert'}. ${advisory.message || ''}. Fishermen advisory: ${advisory.fishermen_directive || ''}`
    : t('safety.status_unavailable');

  return (
    <div className="space-y-4 sm:space-y-6">
      
      {/* Active Coastal Lighthouse Siren Emergency Banner */}
      {advisory?.siren_active && (
        <div className="p-4 rounded-2xl bg-red-600 text-white shadow-xl animate-pulse flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-2 border-red-400">
          <div className="flex items-center gap-3">
            <Volume2 size={30} className="animate-bounce shrink-0" />
            <div>
              <h3 className="text-sm sm:text-base font-black tracking-wide uppercase flex items-center gap-2">
                <span>{t('siren.siren_banner_title')}</span>
                <span className="px-2 py-0.5 rounded-sm bg-white text-red-700 text-[10px] font-black">{t('safety.badge_red')}</span>
              </h3>
              <p className="text-xs font-semibold opacity-95 mt-0.5">
                {t('siren.siren_banner_desc')}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('/lighthouse')}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white text-red-700 font-bold text-xs uppercase tracking-wider shrink-0 shadow-sm hover:bg-slate-100 transition-colors cursor-pointer text-center"
          >
            {t('siren.open_lighthouse')}
          </button>
        </div>
      )}
      
      {/* 1. Offline & Stale Data Warning Banner */}
      <OfflineStatusBanner 
        isOnline={isOnline}
        isCached={isCached}
        freshness={freshness}
        metadata={metadata}
      />

      {/* 2. Freshness & Last Updated Bar */}
      <LastUpdatedIndicator 
        freshness={freshness}
        timestamp={metadata?.updated_at || metadata?.cached_at}
        onRefresh={refresh}
        loading={loading}
      />

      {/* DYNAMIC SECTIONS: Rendered only when an active cyclone alert is live */}
      {isAlertActive ? (
        <>
          {/* Active Coastal Safety Warning Indicator */}
          <section aria-label="Marine Safety Advisory">
            <SafetyStatusCard advisory={advisory} />
          </section>

          {/* Voice Advisory Broadcast Button (Hands-free for fishermen) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Volume2 size={18} className="text-emerald-500" />
                <span>{t('home.listen_advisory')}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('home.hands_free_sub')}
              </p>
            </div>
            <VoiceAlertButton textToRead={voiceText} />
          </div>

          {/* Active Cyclone Telemetry Information */}
          {activeCyclone && (
            <section aria-label="Active Cyclone Overview">
              <CycloneSummaryCard cyclone={activeCyclone} isCached={isCached} />
            </section>
          )}

          {/* Map Quick Action for Active Threat */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-red-500/10 via-white to-amber-500/10 dark:from-red-950/40 dark:via-slate-800 dark:to-amber-950/40 border border-red-500/20 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-xl bg-red-500 text-white shadow-xs">
                <MapIcon size={24} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  {t('home.map_preview_title')}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5 max-w-md">
                  {t('home.map_preview_sub')}
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('/citizen/map')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <span>{t('home.open_full_map')}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </>
      ) : (
        /* Normal Conditions / No Active Alert Dynamic Banner */
        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-500 mx-auto flex items-center justify-center">
            <CheckCircle2 size={26} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              {i18n.language === 'kn' ? 'ಯಾವುದೇ ಸಕ್ರಿಯ ಚಂಡಮಾರುತ ಎಚ್ಚರಿಕೆ ಇಲ್ಲ' : 'No Active Cyclone Advisory'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
              {i18n.language === 'kn' 
                ? 'ಕರಾವಳಿ ಮತ್ತು ಸಾಗರ ವಲಯಗಳಲ್ಲಿ ಪರಿಸ್ಥಿತಿ ಸಹಜವಾಗಿದೆ. ಅಧಿಕೃತ ಎಚ್ಚರಿಕೆ ಪ್ರಸಾರವಾದಾಗ ಇಲ್ಲಿ ನೇರವಾಗಿ ಪ್ರದರ್ಶಿಸಲಾಗುತ್ತದೆ.'
                : 'Monitored coastal maritime sectors report normal conditions. Official warnings will appear here dynamically when broadcasted by the early warning center.'}
            </p>
          </div>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => onNavigate('/citizen/map')}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <MapIcon size={14} />
              <span>{t('home.open_full_map')}</span>
            </button>
            <button
              onClick={() => onNavigate('/citizen/emergency')}
              className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-semibold text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <PhoneCall size={14} />
              <span>{t('home.quick_emergency')}</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default CitizenHome;
