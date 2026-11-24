import React from 'react';
import { useTranslation } from 'react-i18next';
import { Home, Map, Bell, Shield } from 'lucide-react';

const FishermanBottomNav = ({ activeTab, onSelectTab, unreadAlertCount = 0 }) => {
  const { t, i18n } = useTranslation();

  const navItems = [
    {
      id: 'home',
      label: t('nav.home', 'Home'),
      icon: Home
    },
    {
      id: 'map',
      label: t('nav.map', 'Cyclone Map'),
      icon: Map
    },
    {
      id: 'alerts',
      label: t('nav.alerts', 'Alerts'),
      icon: Bell,
      badge: unreadAlertCount
    },
    {
      id: 'safety',
      label: t('nav.safety', 'Safety'),
      icon: Shield
    }
  ];

  return (
    <nav 
      aria-label="Fisherman Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0f172a]/95 border-t border-slate-200/90 dark:border-slate-800 backdrop-blur-md shadow-lg py-1.5 px-3 transition-colors"
    >
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 sm:px-4 rounded-2xl transition-all cursor-pointer min-w-[64px] ${
                isActive
                  ? 'text-[#1677B8] dark:text-sky-400 font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  size={20}
                  className={`transition-transform duration-200 ${
                    isActive ? 'scale-110 stroke-[2.5]' : 'stroke-[2]'
                  }`}
                />
                {item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-[#D93636] text-white text-[9px] font-black flex items-center justify-center animate-pulse">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-0.5 tracking-tight ${isActive ? 'font-black' : 'font-semibold'}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#1677B8] dark:bg-sky-400 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default FishermanBottomNav;
