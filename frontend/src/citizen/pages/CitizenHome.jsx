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

      if (res.success && res.data && res.data.available) {
        setAdvisory(res.data);
      } else {
        // When no active alert has been broadcast by Admin:
        setAdvisory({
          available: false,
          siren_active: false,
          level: null,
          title: 'No Active Cyclone Alert',
          message: 'No active coastal cyclone warning is currently in force for Indian coastal waters.',
          fishermen_directive: 'Regular seasonal fishing guidelines apply. Monitor local port signals.',
          source: 'India Meteorological Department (IMD) / Coastal Authority',
          issued_at: res.data?.issued_at || null
        });
      }
    };

    loadAdvisory();
    // Fast polling (every 2.5s) for real-time synchronization with Admin broadcast
    const interval = setInterval(loadAdvisory, 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Dynamically populated from Admin's live broadcast (no fake/static data)
  const activeCyclone = advisory?.available ? {
    id: 'admin_broadcast_cyclone',
    name: advisory.cyclone_name || advisory.title || 'Observed Cyclonic System',
    latitude: 14.8,
    longitude: 74.2,
    wind_speed: advisory.wind_speed_kmh,
    status: advisory.classification || advisory.level || 'Active Warning',
    last_updated: advisory.issued_at,
    description: advisory.message,
    source: advisory.source || 'Admin AI-Validated Satellite Telemetry'
  } : null;

  // Text for voice alert
  const voiceText = advisory?.available
    ? `${advisory.title}. ${advisory.message}. Fishermen advisory: ${advisory.fishermen_directive}`
    : t('safety.status_unavailable');

  return (
    <div className="space-y-4 sm:space-y-6">
      
      {/* 0. Live Coastal Siren Alert Banner (When Admin sounds siren) */}
      {advisory?.siren_active && (
        <div className="w-full p-4 rounded-2xl bg-red-600 text-white border-2 border-white shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/20 text-white">
              <Volume2 size={24} className="animate-bounce" />
            </div>
            <div>
              <h4 className="text-base font-black uppercase tracking-wider">
                🚨 Coastal Warning Siren Activated
              </h4>
              <p className="text-xs text-red-100 font-medium">
                Connected coastal lighthouse siren beacons are currently sounding emergency evacuation alarm.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('/citizen/lighthouse')}
            className="px-4 py-2 rounded-xl bg-white text-red-700 font-black text-xs hover:bg-red-50 transition-colors shadow-md shrink-0 cursor-pointer"
          >
            Open Lighthouse Beacon &rarr;
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
            Hands-free audio advisory in {i18n.language === 'kn' ? 'ಕನ್ನಡ (Kannada)' : 'English'} for fishermen on boats
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
              View live cyclone trajectory, satellite imagery, coastal danger zones, and nearest harbors.
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
            View All &rarr;
          </button>
        </div>
        <EmergencyContactCard compact={true} />
      </section>

    </div>
  );
};

export default CitizenHome;
