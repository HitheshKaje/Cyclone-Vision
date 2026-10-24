import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Map as MapIcon, 
  ArrowRight, 
  ShieldAlert, 
  AlertTriangle, 
  Volume2, 
  PhoneCall,
  Wind
} from 'lucide-react';
import { useCycloneData } from '../hooks/useCycloneData';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { fetchOfficialAdvisories } from '../services/citizenApi';
import OfflineStatusBanner from '../components/OfflineStatusBanner';
import LastUpdatedIndicator from '../components/LastUpdatedIndicator';
import SafetyStatusCard from '../components/SafetyStatusCard';
import CycloneSummaryCard from '../components/CycloneSummaryCard';
import VoiceAlertButton from '../components/VoiceAlertButton';
import EmergencyContactCard from '../components/EmergencyContactCard';

const CitizenHome = ({ onNavigate }) => {
  const { t, i18n } = useTranslation();
  const { isOnline } = useNetworkStatus();
  const { cyclones, metadata, loading, isCached, freshness, refresh } = useCycloneData();
  const [advisory, setAdvisory] = useState({
    available: false,
    level: null,
    title: '',
    message: '',
    fishermen_directive: '',
    area: '',
    source: '',
    issued_at: null
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

  // Derive active cyclone strictly from live Admin broadcast (no static/unrelated data)
  const activeCyclone = (advisory?.active && advisory?.cyclone_name)
    ? {
        name: advisory.cyclone_name,
        status: advisory.level === 'RED' ? 'Severe Cyclone (Live Broadcast)' : 'Cyclone Alert',
        latitude: advisory.coordinates?.lat || 14.8,
        longitude: advisory.coordinates?.lng || 73.5,
        wind_speed: advisory.wind_speed_kmh,
        last_updated: advisory.issued_at,
        description: advisory.message,
        source: advisory.source
      }
    : null;

  // Text for voice alert
  const voiceText = advisory?.available
    ? `${advisory.title}. ${advisory.message}. Fishermen advisory: ${advisory.fishermen_directive}`
    : activeCyclone
    ? `Active cyclone ${activeCyclone.name}. Maximum wind speed ${Math.round(activeCyclone.wind_speed || 0)} kilometers per hour.`
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

      {/* 3. Coastal Safety Indicator (Strict official status) */}
      <section aria-label="Marine Safety Advisory">
        <SafetyStatusCard advisory={advisory} />
      </section>

      {/* 4. Voice Advisory Broadcast Button (Hands-free for fishermen) */}
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

      {/* 5. Active Cyclone Information */}
      <section aria-label="Active Cyclone Overview">
        <CycloneSummaryCard cyclone={activeCyclone} isCached={isCached} />
      </section>

      {/* 6. Quick Map Preview & Navigation */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-sky-500/10 via-white to-emerald-500/10 dark:from-sky-950/40 dark:via-slate-800 dark:to-emerald-950/40 border border-sky-500/20 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-xl bg-sky-500 text-white shadow-xs">
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
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer"
        >
          <span>{t('home.open_full_map')}</span>
          <ArrowRight size={18} />
        </button>
      </div>

      {/* 7. Quick Emergency Helplines */}
      <section aria-label="Emergency Helplines" className="pt-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <PhoneCall size={18} className="text-red-500" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {t('home.quick_emergency')}
            </h3>
          </div>
          <button
            onClick={() => onNavigate('/citizen/emergency')}
            className="text-xs font-bold text-sky-500 hover:underline cursor-pointer"
          >
            {t('home.view_all')}
          </button>
        </div>
        <EmergencyContactCard compact={true} />
      </section>

    </div>
  );
};

export default CitizenHome;
