import React from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, CheckCircle2, Clock, AlertTriangle, HelpCircle } from 'lucide-react';
import { DATA_FRESHNESS } from '../services/cycloneCache';

const LastUpdatedIndicator = ({ freshness, timestamp, onRefresh, loading }) => {
  const { t, i18n } = useTranslation();

  const getBadgeConfig = () => {
    switch (freshness?.status) {
      case DATA_FRESHNESS.LIVE:
        return {
          icon: CheckCircle2,
          colorClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
          dotClass: 'bg-emerald-500 animate-pulse',
          text: t('status.live')
        };
      case DATA_FRESHNESS.LAST_KNOWN:
        return {
          icon: Clock,
          colorClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
          dotClass: 'bg-amber-500',
          text: t('status.last_known')
        };
      case DATA_FRESHNESS.STALE:
        return {
          icon: AlertTriangle,
          colorClass: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
          dotClass: 'bg-orange-500',
          text: t('status.stale')
        };
      case DATA_FRESHNESS.UNAVAILABLE:
      default:
        return {
          icon: HelpCircle,
          colorClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
          dotClass: 'bg-slate-400',
          text: t('status.unavailable')
        };
    }
  };

  const getLocalizedMessage = () => {
    if (!freshness) return '';
    const mins = freshness.ageMinutes ?? 0;
    switch (freshness.status) {
      case DATA_FRESHNESS.LIVE:
        return mins === 0 ? t('freshness.updated_just_now') : t('freshness.updated_mins_ago', { mins });
      case DATA_FRESHNESS.LAST_KNOWN:
        return t('freshness.last_known_mins', { mins });
      case DATA_FRESHNESS.STALE:
        return t('freshness.stale_hours', { hours: Math.max(1, Math.round(mins / 60)) });
      default:
        return freshness.message || '';
    }
  };

  const badge = getBadgeConfig();

  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 backdrop-blur-sm text-xs">
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold border text-[11px] uppercase tracking-wider ${badge.colorClass}`}>
          <span className={`w-2 h-2 rounded-full ${badge.dotClass}`} />
          {badge.text}
        </span>
        <span className="text-slate-600 dark:text-slate-400 font-medium hidden sm:inline">
          {getLocalizedMessage()}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {timestamp && (
          <span className="text-slate-500 dark:text-slate-400 text-[11px]">
            {t('status.last_updated')}: {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            aria-label="Refresh data"
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/70 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-sky-500' : ''} />
          </button>
        )}
      </div>
    </div>
  );
};

export default LastUpdatedIndicator;
