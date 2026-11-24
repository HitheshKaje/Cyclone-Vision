import React from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Bell, User, Globe, ChevronDown } from 'lucide-react';
import cycloneLogo from '../../../assets/cyclone-logo.png';
import { changeLanguage } from '../../i18n/config';

const FishermanHeader = ({
  currentUser,
  selectedPort,
  onOpenLocationModal,
  onOpenProfileModal,
  onOpenAlerts,
  unreadAlertCount = 0
}) => {
  const { t, i18n } = useTranslation();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('fisherman.good_morning', 'Good Morning!');
    if (hour < 17) return t('fisherman.good_afternoon', 'Good Afternoon!');
    return t('fisherman.good_evening', 'Good Evening!');
  };

  const displayName = currentUser?.name ? currentUser.name : t('fisherman.welcome', 'Hello, Fisherman!');

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#0f172a]/95 border-b border-slate-200/80 dark:border-slate-800 backdrop-blur-md shadow-xs transition-colors">
      <div className="max-w-4xl mx-auto px-3.5 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2.5">
        
        {/* Left: Logo & Greeting */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0 flex items-center justify-center">
            <img
              src={cycloneLogo}
              alt="CycloSafe Logo"
              className="w-9 h-9 sm:w-10 sm:h-10 object-contain animate-cyclone-spin"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-base sm:text-lg font-black text-[#102A43] dark:text-slate-50 tracking-tight">
                Cyclo<span className="text-[#1677B8] dark:text-sky-400">Safe</span>
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/25">
                Fisherman
              </span>
            </div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">
              {getGreeting()} <span className="font-extrabold text-sky-600 dark:text-sky-400">{displayName}</span>
            </div>
          </div>
        </div>

        {/* Right Actions: Location, Language, Notifications, Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          
          {/* Location Selector Pill */}
          <button
            type="button"
            onClick={onOpenLocationModal}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#EAF5FC] dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 border border-sky-200 dark:border-sky-800 text-[#1677B8] dark:text-sky-300 font-bold text-xs transition-all cursor-pointer shadow-2xs max-w-[130px] sm:max-w-[190px]"
            title="Change selected coastal location"
          >
            <MapPin size={13} className="shrink-0 text-[#1677B8] dark:text-sky-400" />
            <span className="truncate">{selectedPort?.name?.split(' ')[0] || 'Port'}</span>
            <ChevronDown size={12} className="shrink-0 opacity-70" />
          </button>

          {/* Language Selector */}
          <div className="relative flex items-center">
            <select
              value={i18n.language}
              onChange={(e) => changeLanguage(e.target.value)}
              aria-label="Language"
              className="py-1.5 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-hidden"
            >
              <option value="en">EN</option>
              <option value="kn">ಕನ್ನಡ</option>
              <option value="hi">हिंदी</option>
            </select>
          </div>

          {/* Notification Button */}
          <button
            type="button"
            onClick={onOpenAlerts}
            className="relative p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            aria-label="Alerts"
          >
            <Bell size={16} />
            {unreadAlertCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#D93636] text-white text-[9px] font-black flex items-center justify-center animate-pulse">
                {unreadAlertCount}
              </span>
            )}
          </button>

          {/* Profile Button */}
          <button
            type="button"
            onClick={onOpenProfileModal}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            aria-label="Fisherman Profile"
          >
            <User size={16} />
          </button>

        </div>

      </div>
    </header>
  );
};

export default FishermanHeader;
