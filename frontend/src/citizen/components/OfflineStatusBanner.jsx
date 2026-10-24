import React from 'react';
import { WifiOff, AlertTriangle, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DATA_FRESHNESS } from '../services/cycloneCache';

const OfflineStatusBanner = ({ isOnline, isCached, freshness, metadata }) => {
  const { t, i18n } = useTranslation();

  // If online and live data is being shown, do not render warning banner
  if (isOnline && !isCached && freshness.status === DATA_FRESHNESS.LIVE) {
    return null;
  }

  const observationTime = metadata?.updated_at 
    ? new Date(metadata.updated_at).toLocaleString(i18n.language === 'kn' ? 'kn-IN' : 'en-US') 
    : (i18n.language === 'kn' ? 'ತಿಳಿದಿಲ್ಲ' : 'Unknown');
    
  const cachedTime = metadata?.cached_at 
    ? new Date(metadata.cached_at).toLocaleTimeString(i18n.language === 'kn' ? 'kn-IN' : 'en-US') 
    : null;

  const isStale = freshness.status === DATA_FRESHNESS.STALE;

  return (
    <div 
      role="alert"
      className={`w-full p-3.5 sm:p-4 rounded-xl border mb-4 shadow-sm transition-all duration-300 ${
        isStale || !isOnline
          ? 'bg-amber-500/15 border-amber-500/30 text-amber-950 dark:text-amber-200'
          : 'bg-sky-500/10 border-sky-500/30 text-sky-950 dark:text-sky-200'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
          {!isOnline ? <WifiOff size={20} /> : <AlertTriangle size={20} />}
        </div>
        
        <div className="flex-1 text-xs sm:text-sm">
          <div className="font-bold flex flex-wrap items-center gap-2 mb-1">
            <span className="uppercase tracking-wider">
              {!isOnline ? t('status.offline') : t('status.last_known')}
            </span>
            {isStale && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/30">
                {t('status.stale')}
              </span>
            )}
          </div>
          
          <p className="leading-relaxed font-medium">
            {!isOnline 
              ? t('freshness.offline_showing_saved', { time: observationTime })
              : t('freshness.showing_saved', { time: observationTime })
            }
          </p>
          
          <div className="flex flex-wrap items-center gap-4 mt-2 text-[11px] text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {t('status.last_updated')}: {observationTime}
            </span>
            {cachedTime && (
              <span>
                {t('status.cached_at')}: {cachedTime}
              </span>
            )}
            {metadata?.source && (
              <span>
                {t('status.source')}: {metadata.source}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfflineStatusBanner;
