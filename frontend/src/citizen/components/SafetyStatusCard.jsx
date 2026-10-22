import React from 'react';
import { ShieldAlert, ShieldCheck, AlertOctagon, HelpCircle, Anchor, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * SafetyStatusCard - Strict, truthful coastal marine warning status
 * Rule: If verified warning is unavailable, shows "Official safety status unavailable"
 * Never infers "Safe" automatically from lack of detection or ML confidence!
 */
const SafetyStatusCard = ({ advisory }) => {
  const { t } = useTranslation();

  // If no advisory supplied or status is explicitly unavailable:
  const isAvailable = advisory && advisory.available === true && advisory.level;

  if (!isAvailable) {
    return (
      <div className="w-full p-4 sm:p-5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border-2 border-slate-300 dark:border-slate-700 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
            <HelpCircle size={24} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {t('safety.official_warning')}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-200 mb-1">
              {t('safety.status_unavailable')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              No verified coastal bulletin is currently linked for this sector. Please check official IMD (India Meteorological Department) or local Port Officer signals before venturing into sea.
            </p>
            <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 flex items-center gap-1.5">
              <Info size={13} />
              <span>{t('safety.warning_source')}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Warning level styles
  const level = (advisory.level || '').toUpperCase();
  let levelConfig = {
    color: 'border-amber-500 bg-amber-500/10 text-amber-950 dark:text-amber-100',
    iconColor: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
    icon: AlertOctagon,
    title: t('safety.caution_sea'),
    badge: 'YELLOW / ADVISORY'
  };

  if (level === 'RED' || level === 'DANGER' || level === 'SEVERE') {
    levelConfig = {
      color: 'border-red-600 bg-red-600/10 text-red-950 dark:text-red-100',
      iconColor: 'bg-red-600/20 text-red-600 dark:text-red-400',
      icon: AlertOctagon,
      title: t('safety.danger_sea'),
      badge: 'RED ALERT / DANGER'
    };
  } else if (level === 'GREEN' || level === 'NORMAL') {
    levelConfig = {
      color: 'border-emerald-500 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100',
      iconColor: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
      icon: ShieldCheck,
      title: t('safety.safe_sea'),
      badge: 'NORMAL'
    };
  }

  const Icon = levelConfig.icon;

  return (
    <div className={`w-full p-4 sm:p-5 rounded-2xl border-2 ${levelConfig.color} shadow-sm transition-all`}>
      <div className="flex items-start gap-3.5">
        <div className={`p-3 rounded-xl ${levelConfig.iconColor} shrink-0`}>
          <Icon size={28} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/60 dark:bg-slate-900/60 border border-current">
              {levelConfig.badge}
            </span>
            {advisory.issued_at && (
              <span className="text-[11px] opacity-80">
                Issued: {new Date(advisory.issued_at).toLocaleString()}
              </span>
            )}
          </div>

          <h2 className="text-lg sm:text-2xl font-black tracking-tight mb-2">
            {advisory.title || levelConfig.title}
          </h2>

          <p className="text-xs sm:text-sm font-medium leading-relaxed mb-3">
            {advisory.message || (level === 'RED' ? t('safety.do_not_venture') : t('safety.caution_venture'))}
          </p>

          {/* Fishermen specific callout */}
          <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-current/20 flex items-start gap-2.5 text-xs sm:text-sm font-semibold">
            <Anchor size={18} className="shrink-0 mt-0.5 text-sky-500" />
            <div>
              <span className="font-bold underline uppercase">{t('safety.fishermen_warning')}:</span>{' '}
              {advisory.fishermen_directive || (level === 'RED' ? t('safety.do_not_venture') : t('safety.caution_venture'))}
            </div>
          </div>

          {/* Metadata Footer */}
          <div className="mt-3 pt-2 border-t border-current/20 flex flex-wrap items-center justify-between gap-2 text-[11px] opacity-80">
            <span>Area: {advisory.area || 'Coastal Waters'}</span>
            <span>Source: {advisory.source || 'IMD / Disaster Management'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SafetyStatusCard;
