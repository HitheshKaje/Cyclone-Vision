import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, AlertTriangle, AlertCircle, Info, CheckCircle2, ArrowLeft, Clock, MapPin, Check } from 'lucide-react';

const FishermanAlerts = ({ alerts = [], selectedPort, onBack }) => {
  const { t, i18n } = useTranslation();
  const [filter, setFilter] = useState('active'); // 'active' | 'previous'
  const [readIds, setReadIds] = useState(() => {
    try {
      const saved = localStorage.getItem('cyclosafe_read_alerts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const markAsRead = (id) => {
    setReadIds(prev => {
      const next = [...new Set([...prev, id])];
      try {
        localStorage.setItem('cyclosafe_read_alerts', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const markAllAsRead = () => {
    const allIds = alerts.map(a => a.id);
    setReadIds(allIds);
    try {
      localStorage.setItem('cyclosafe_read_alerts', JSON.stringify(allIds));
    } catch {}
  };

  // Split alerts
  const activeAlerts = alerts.filter(a => !readIds.includes(a.id));
  const previousAlerts = alerts.filter(a => readIds.includes(a.id));

  const displayList = filter === 'active' ? activeAlerts : previousAlerts;

  const getPriorityStyle = (priority) => {
    const p = (priority || '').toUpperCase();
    if (p.includes('RED') || p.includes('DANGER') || p.includes('CRITICAL')) {
      return {
        border: 'border-red-500/40 dark:border-red-900/60 bg-red-500/5 dark:bg-red-950/20',
        badge: 'bg-[#D93636] text-white',
        badgeLabel: 'DANGER',
        icon: AlertCircle,
        iconColor: 'text-red-600'
      };
    }
    if (p.includes('ORANGE') || p.includes('YELLOW') || p.includes('CAUTION')) {
      return {
        border: 'border-amber-500/40 dark:border-amber-900/60 bg-amber-500/5 dark:bg-amber-950/20',
        badge: 'bg-[#F2A900] text-slate-900',
        badgeLabel: 'CAUTION',
        icon: AlertTriangle,
        iconColor: 'text-amber-600'
      };
    }
    return {
      border: 'border-sky-500/40 dark:border-sky-900/60 bg-sky-500/5 dark:bg-sky-950/20',
      badge: 'bg-[#1677B8] text-white',
      badgeLabel: 'INFORMATION',
      icon: Info,
      iconColor: 'text-sky-600'
    };
  };

  return (
    <div className="space-y-3 pb-16 animate-in fade-in duration-200">
      
      {/* Top Header & Back */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <ArrowLeft size={15} />
          <span>{t('fisherman.back_to_home', '← Back to Home')}</span>
        </button>

        <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Bell size={16} className="text-amber-500" />
          <span>{t('fisherman.alerts_page_title', 'Official Alerts')}</span>
        </h2>

        {activeAlerts.length > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Segmented Filter: Active vs Previous */}
      <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
        <button
          type="button"
          onClick={() => setFilter('active')}
          className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            filter === 'active' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Active Alerts</span>
          {activeAlerts.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center">
              {activeAlerts.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setFilter('previous')}
          className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            filter === 'previous' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Previous Alerts</span>
          <span className="text-[10px] text-slate-400">({previousAlerts.length})</span>
        </button>
      </div>

      {/* Alerts List */}
      {displayList.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-[#16A36A] flex items-center justify-center mx-auto">
            <CheckCircle2 size={28} className="stroke-[2.5]" />
          </div>
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">
            {filter === 'active' ? t('fisherman.no_alerts', 'No active alerts for your selected area.') : 'No previous alerts recorded.'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {filter === 'active' 
              ? 'Weather conditions are normal. The dashboard continuously monitors official meteorological bulletins.' 
              : 'Alerts marked as read will appear here for your reference.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayList.map((alert) => {
            const style = getPriorityStyle(alert.priority || alert.level);
            const Icon = style.icon;
            const isRead = readIds.includes(alert.id);

            return (
              <div
                key={alert.id}
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all shadow-xs ${style.border}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${style.iconColor} bg-white dark:bg-slate-800 shadow-2xs`}>
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${style.badge}`}>
                          {style.badgeLabel}
                        </span>
                        {alert.cyclone_name && (
                          <span className="text-xs font-black text-red-600 dark:text-red-400">
                            🌀 {alert.cyclone_name}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400">
                          {alert.alert_type || 'Weather Advisory'}
                        </span>
                      </div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white mt-1 leading-snug">
                        {alert.title || alert.message || 'Coastal Weather Advisory'}
                      </h3>
                    </div>
                  </div>

                  {!isRead && (
                    <button
                      type="button"
                      onClick={() => markAsRead(alert.id)}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                      title="Mark as Read"
                    >
                      <Check size={12} />
                      <span className="hidden xs:inline">Mark read</span>
                    </button>
                  )}
                </div>

                {/* Explanation */}
                {alert.explanation && (
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-2.5 leading-relaxed">
                    {alert.explanation}
                  </p>
                )}

                {/* Recommended Action */}
                <div className="mt-3 p-3 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                    Recommended Action
                  </span>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {alert.recommended_action || alert.directive || 'Follow local harbor master instructions and monitor signal flags.'}
                  </p>
                </div>

                {/* Footer Metadata */}
                <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 font-medium">
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin size={11} className="text-sky-500" />
                    <span>Area: {alert.affected_area || selectedPort?.district || 'Coastal District'}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="truncate">Source: {alert.source || 'IMD Official Bulletin'}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      <span>{alert.issued_at ? new Date(alert.issued_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Live'}</span>
                    </span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

export default FishermanAlerts;
