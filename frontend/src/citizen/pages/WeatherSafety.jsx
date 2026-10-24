import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  CloudSun, 
  Wind, 
  Waves, 
  Droplets, 
  Compass, 
  AlertTriangle, 
  Info,
  ShieldAlert,
  Clock
} from 'lucide-react';
import { useCycloneData } from '../hooks/useCycloneData';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import OfflineStatusBanner from '../components/OfflineStatusBanner';

const WeatherSafety = () => {
  const { t } = useTranslation();
  const { isOnline } = useNetworkStatus();
  const { cyclones, metadata, isCached, freshness } = useCycloneData();

  const activeCyclone = cyclones.length > 0 ? cyclones[0] : null;

  return (
    <div className="space-y-4 sm:space-y-6 pb-6">
      
      {/* 1. Page Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <CloudSun size={22} className="text-emerald-500" />
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {t('weather.title')}
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500">
          {t('weather.subtitle')}
        </p>
      </div>

      {/* 2. Offline Banner if needed */}
      <OfflineStatusBanner 
        isOnline={isOnline}
        isCached={isCached}
        freshness={freshness}
        metadata={metadata}
      />

      {/* 3. Strict Truth in Weather Data Notice */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2.5">
        <Info size={16} className="text-sky-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>{t('weather.standards_title')}</strong> {t('weather.standards_desc')}
        </p>
      </div>

      {/* 4. Active Meteorological Conditions (from GDACS / IMD Feed) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-3">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Wind size={18} className="text-red-500" />
            <span>{t('weather.active_feed')}</span>
          </h3>
          {metadata?.source && (
            <span className="text-[11px] text-slate-500 font-medium">
              {t('status.source')}: {metadata.source}
            </span>
          )}
        </div>

        {activeCyclone ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                {t('weather.wind_speed')}
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {activeCyclone.wind_speed != null ? `${Math.round(activeCyclone.wind_speed)} km/h` : 'Telemetry not specified'}
              </div>
              {activeCyclone.wind_speed != null && (
                <span className="text-xs text-slate-500">
                  Approx. {Math.round(activeCyclone.wind_speed / 1.852)} knots
                </span>
              )}
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                {t('weather.location')}
              </span>
              <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                {activeCyclone.latitude}°N, {activeCyclone.longitude}°E
              </div>
              <span className="text-xs text-slate-500">
                Identified: {activeCyclone.name} ({activeCyclone.status || 'Active'})
              </span>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-slate-500 text-sm">
            {t('weather.no_severe_storm')}
          </div>
        )}
      </div>

      {/* 5. Coastal Marine Telemetry (Wave Height, Swell, Tide) - Honest Unavailable Status */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Waves size={18} className="text-sky-500" />
          <span>{t('weather.ocean_telemetry')}</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Wave Height Status */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-300 dark:border-slate-700">
            <span className="text-xs font-bold text-slate-500 block mb-1">
              {t('weather.wave_height')}
            </span>
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              {t('weather.wave_unavailable')}
            </span>
          </div>

          {/* Tide Information */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-300 dark:border-slate-700">
            <span className="text-xs font-bold text-slate-500 block mb-1">
              {t('weather.tide_title')}
            </span>
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              {t('weather.tide_desc')}
            </span>
          </div>
        </div>
      </div>

      {/* 6. Official Fishing Advisory Directives */}
      <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-200">
        <h3 className="text-sm font-bold flex items-center gap-2 mb-2">
          <ShieldAlert size={18} className="text-amber-600 dark:text-amber-400" />
          <span>{t('weather.fishermen_guidelines')}</span>
        </h3>
        <ul className="text-xs space-y-2 font-medium leading-relaxed list-disc list-inside">
          <li>{t('weather.guideline_1')}</li>
          <li>{t('weather.guideline_2')}</li>
          <li>{t('weather.guideline_3')}</li>
        </ul>
      </div>

    </div>
  );
};

export default WeatherSafety;
