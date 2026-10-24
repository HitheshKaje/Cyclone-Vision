import React from 'react';
import { Wind, Compass, AlertCircle, Navigation } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const CycloneSummaryCard = ({ cyclone, isCached = false }) => {
  const { t, i18n } = useTranslation();

  if (!cyclone) {
    return (
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center">
        <p className="text-sm text-slate-500 font-medium">
          {t('home.no_active_cyclone')}
        </p>
      </div>
    );
  }

  // Calculate km/h if wind_speed is provided
  // GDACS wind_speed is typically in km/h or knots depending on property
  const windKmh = cyclone.wind_speed != null ? Math.round(cyclone.wind_speed) : null;
  const windKnots = windKmh != null ? Math.round(windKmh / 1.852) : null;

  const displayStatus = i18n.language === 'kn' && cyclone.status
    ? (cyclone.status.toUpperCase() === 'ACTIVE' || cyclone.status.toUpperCase() === 'ALERT'
        ? t('map.live_threat')
        : (cyclone.status.toUpperCase() === 'NORMAL' ? t('safety.badge_normal') : cyclone.status))
    : cyclone.status;

  return (
    <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
      {/* Decorative accent top bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 via-amber-500 to-sky-500" />

      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {t('home.active_cyclone')}
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {cyclone.name || (i18n.language === 'kn' ? 'ಹೆಸರಿಲ್ಲದ ಉಷ್ಣವಲಯದ ಪ್ರಕ್ಷುಬ್ಧತೆ' : 'Unnamed Tropical Disturbance')}
          </h3>
        </div>

        {cyclone.status && (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30">
            {displayStatus}
          </span>
        )}
      </div>

      {/* Grid of Key Telemetry */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        {/* Coordinates */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
            <Compass size={14} className="text-sky-500" />
            <span>{t('summary.position')}</span>
          </div>
          <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
            {cyclone.latitude?.toFixed(2)}°N, {cyclone.longitude?.toFixed(2)}°E
          </div>
        </div>

        {/* Sustained Wind */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
            <Wind size={14} className="text-red-500" />
            <span>{t('summary.sustained_wind')}</span>
          </div>
          <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
            {windKmh != null ? (
              <>
                {windKmh} <span className="text-xs font-normal text-slate-500">km/h</span>
                {windKnots != null && (
                  <span className="text-xs text-slate-500 block font-normal">
                    ({windKnots} kt)
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs text-slate-500">{t('summary.not_recorded')}</span>
            )}
          </div>
        </div>

        {/* Observation Timestamp */}
        <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
            <Navigation size={14} className="text-emerald-500" />
            <span>{t('summary.observation_time')}</span>
          </div>
          <div className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
            {cyclone.last_updated ? new Date(cyclone.last_updated).toLocaleString(i18n.language === 'kn' ? 'kn-IN' : 'en-US') : t('summary.recent')}
          </div>
        </div>
      </div>

      {cyclone.description && (
        <p className="text-xs text-slate-600 dark:text-slate-400 border-t border-slate-200/60 dark:border-slate-700/60 pt-3 leading-relaxed">
          {i18n.language === 'kn' && (cyclone.description.toLowerCase().includes('cyclone') || cyclone.description.toLowerCase().includes('alert'))
            ? t('safety.do_not_venture')
            : cyclone.description}
        </p>
      )}
    </div>
  );
};

export default CycloneSummaryCard;
