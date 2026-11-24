import React from 'react';
import { useTranslation } from 'react-i18next';
import { Map, Bell, PhoneCall, ShieldCheck, ChevronRight } from 'lucide-react';

const QuickActions = ({ onNavigateTab, onOpenEmergency }) => {
  const { t, i18n } = useTranslation();

  const actions = [
    {
      id: 'map',
      title: t('fisherman.view_cyclone_map', 'View Cyclone Map'),
      subtitle: i18n.language === 'kn' ? 'ಲೈವ್ ಟ್ರ್ಯಾಕಿಂಗ್ & ಎಚ್ಚರಿಕೆ ನಕ್ಷೆ' : i18n.language === 'hi' ? 'लाइव ट्रैकिंग एवं नक्शा' : 'Live storm track & coastal warning zone',
      icon: Map,
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      action: () => onNavigateTab('map')
    },
    {
      id: 'alerts',
      title: t('fisherman.check_alerts', 'Check Latest Alerts'),
      subtitle: i18n.language === 'kn' ? 'ಅಧಿಕೃತ ಬುಲೆಟಿನ್ & ಸಂದೇಶಗಳು' : i18n.language === 'hi' ? 'आधिकारिक बुलेटिन और सूचनाएं' : 'Official IMD bulletins & advisories',
      icon: Bell,
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      action: () => onNavigateTab('alerts')
    },
    {
      id: 'emergency',
      title: t('fisherman.emergency_contacts', 'Emergency Contacts'),
      subtitle: i18n.language === 'kn' ? 'ಕೋಸ್ಟ್‌ಗಾರ್ಡ್ 1554 & 112' : i18n.language === 'hi' ? 'तटरक्षक 1554 और 112' : 'Coast Guard 1554 & 112 helpline',
      icon: PhoneCall,
      color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      action: () => onOpenEmergency()
    },
    {
      id: 'safety',
      title: t('fisherman.safety_guidelines', 'Safety Guidelines'),
      subtitle: i18n.language === 'kn' ? 'ಸಮುದ್ರಕ್ಕೆ ಹೋಗುವ ಮುನ್ನ ಮಾರ್ಗಸೂಚಿ' : i18n.language === 'hi' ? 'समुद्र में जाने से पूर्व निर्देश' : 'Essential checks before casting nets',
      icon: ShieldCheck,
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      action: () => onNavigateTab('safety')
    }
  ];

  return (
    <div className="space-y-2">
      <div className="px-1">
        <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200">
          {t('fisherman.quick_actions', 'Quick Actions')}
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.id}
              type="button"
              onClick={act.action}
              className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 hover:border-sky-400 dark:hover:border-sky-600 shadow-xs hover:shadow-sm transition-all flex items-center justify-between text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${act.color} group-hover:scale-105 transition-transform`}>
                  <Icon size={22} className="stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                    {act.title}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {act.subtitle}
                  </div>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-400 group-hover:text-sky-600 group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuickActions;
