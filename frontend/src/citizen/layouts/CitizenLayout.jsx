import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Home, 
  Map, 
  History, 
  CloudSun, 
  PhoneCall, 
  Globe, 
  Layers, 
  Wifi, 
  WifiOff,
  UserPlus,
  UserCheck,
  Anchor,
  User
} from 'lucide-react';
import cycloneLogo from '../../assets/cyclone-logo.png';
import { changeLanguage } from '../i18n/config';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import EmergencySirenOverlay from '../components/EmergencySirenOverlay';
import CitizenAuthModal from '../components/CitizenAuthModal';

const navItems = [
  { id: 'home', path: '/citizen', labelKey: 'nav.home', icon: Home },
  { id: 'map', path: '/citizen/map', labelKey: 'nav.map', icon: Map },
  { id: 'history', path: '/citizen/history', labelKey: 'nav.history', icon: History },
  { id: 'weather', path: '/citizen/weather', labelKey: 'nav.weather', icon: CloudSun },
  { id: 'emergency', path: '/citizen/emergency', labelKey: 'nav.emergency', icon: PhoneCall, highlight: true },
];

const CitizenLayout = ({ children, currentPath = '/citizen', onNavigate, onSwitchToAdmin }) => {
  const { t, i18n } = useTranslation();
  const { isOnline, isBackendReachable } = useNetworkStatus();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const raw = localStorage.getItem('cyclosafe_current_citizen_user');
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  });

  useEffect(() => {
    const handleUserRegistered = (e) => {
      if (e.detail) setCurrentUser(e.detail);
    };
    window.addEventListener('cyclosafe_user_registered', handleUserRegistered);
    return () => window.removeEventListener('cyclosafe_user_registered', handleUserRegistered);
  }, []);

  const handleLanguageChange = (e) => {
    changeLanguage(e.target.value);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#070d1e] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300 pb-20 sm:pb-0">
      
      {/* STICKY TOP CONTAINER: Keeps Siren + Header + Navigation Bar ALWAYS visible at the top */}
      <div className="sticky top-0 z-40 w-full shadow-xs">
        {/* Real-time Emergency Audio Siren: Automatically sounds alarm on citizen mobile phones when admin activates it */}
        <EmergencySirenOverlay onNavigateToLighthouse={() => onNavigate('/lighthouse')} />

        {/* 1. TOP APP BAR */}
        <header className="bg-white/95 dark:bg-[#0f172a]/95 border-b border-slate-200/80 dark:border-slate-800 backdrop-blur-md">
          <div className="max-w-4xl mx-auto px-3.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
            
            {/* Logo & Portal Identity */}
            <div 
              onClick={() => onNavigate('/citizen')}
              className="flex items-center gap-2.5 cursor-pointer min-w-0"
            >
              <img 
                src={cycloneLogo} 
                alt="CycloSafe Logo" 
                className="w-9 h-9 sm:w-10 sm:h-10 object-contain animate-cyclone-spin shrink-0" 
              />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-50 tracking-tight leading-tight">
                    Cyclo<span className="text-sky-500">Safe</span>
                  </span>
                  <span className="hidden xs:inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    {t('app.badge')}
                  </span>
                </div>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[200px] sm:max-w-none">
                  {t('app.subtitle')}
                </span>
              </div>
            </div>

            {/* Right Header Actions: Connectivity + Language + Admin Switcher */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Connectivity Badge */}
              <div 
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border ${
                  isOnline && isBackendReachable
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30'
                }`}
                title={isOnline && isBackendReachable ? 'Connected to live feed' : 'Offline / Local cache'}
              >
                {isOnline && isBackendReachable ? <Wifi size={14} /> : <WifiOff size={14} />}
                <span className="hidden md:inline">
                  {isOnline && isBackendReachable ? t('status.online') : t('status.offline')}
                </span>
              </div>

              {/* Language Selector */}
              <div className="relative flex items-center">
                <Globe size={15} className="absolute left-2 text-slate-400 pointer-events-none" />
                <select
                  value={i18n.language}
                  onChange={handleLanguageChange}
                  aria-label="Select Language"
                  className="pl-7 pr-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                >
                  <option value="en">English</option>
                  <option value="kn">ಕನ್ನಡ (Kannada)</option>
                </select>
              </div>

              {/* User Profile / Register Button */}
              {currentUser ? (
                <button
                  type="button"
                  onClick={() => setIsAuthOpen(true)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    currentUser.user_type === 'fisherman'
                      ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30'
                      : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                  }`}
                  title={currentUser.user_type === 'fisherman' ? `Fisherman: ${currentUser.vessel_name || currentUser.name}` : `Citizen: ${currentUser.name}`}
                >
                  {currentUser.user_type === 'fisherman' ? <Anchor size={13} /> : <User size={13} />}
                  <span className="max-w-[100px] truncate">{currentUser.name}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAuthOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                  title="Register as Fisherman or Citizen to receive direct emergency warnings"
                >
                  <UserPlus size={13} />
                  <span>{i18n.language === 'kn' ? 'ನೋಂದಣಿ' : 'Register'}</span>
                </button>
              )}

              {/* Lighthouse Station Screen Button */}
              <button
                onClick={() => onNavigate('/lighthouse')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 text-xs font-bold transition-all cursor-pointer"
                title={t('app.lighthouse')}
              >
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="hidden xs:inline">{t('app.lighthouse')}</span>
              </button>

              {/* Switch to Admin Portal Button */}
              {onSwitchToAdmin && (
                <button
                  onClick={onSwitchToAdmin}
                  className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                  title={t('app.switch_to_admin')}
                >
                  <Layers size={14} />
                  <span>{t('app.admin_view')}</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Top Desktop / Tablet Navigation Bar (Always visible at top) */}
        <nav 
          aria-label="Desktop Navigation"
          className="hidden sm:block border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md py-2 shadow-xs"
        >
          <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPath === item.path || (item.path === '/citizen' && currentPath === '/citizen/');

                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.path)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 shadow-xs' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                    } ${item.highlight ? 'text-red-600 dark:text-red-400' : ''}`}
                  >
                    <Icon size={14} className={isActive ? 'text-sky-500' : ''} />
                    <span>{t(item.labelKey)}</span>
                    {item.highlight && (
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>

            {onSwitchToAdmin && (
              <button
                onClick={onSwitchToAdmin}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold cursor-pointer flex items-center gap-1 hover:underline"
              >
                <span>{t('app.switch_to_admin')}</span>
                <span>&rarr;</span>
              </button>
            )}
          </div>
        </nav>
      </div>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-3.5 sm:p-6">
        {children}
      </main>

      {/* 3. MOBILE BOTTOM NAVIGATION BAR (Thumb-friendly for Android phones) */}
      <nav 
        aria-label="Mobile Navigation"
        className="fixed bottom-0 inset-x-0 z-50 bg-white/95 dark:bg-[#0f172a]/95 border-t border-slate-200 dark:border-slate-800 backdrop-blur-md shadow-lg sm:hidden select-none"
      >
        <div className="grid grid-cols-5 h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path || (item.path === '/citizen' && currentPath === '/citizen/');

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.path)}
                className={`flex flex-col items-center justify-center gap-1 py-1 transition-all cursor-pointer ${
                  isActive
                    ? 'text-sky-500 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                } ${item.highlight ? 'relative' : ''}`}
              >
                {item.highlight && (
                  <span className="absolute top-1.5 right-4 w-2 h-2 rounded-full bg-red-500 animate-ping" />
                )}
                <Icon size={20} className={isActive ? 'scale-110 text-sky-500' : ''} />
                <span className="text-[10px] leading-tight truncate px-1 font-semibold">
                  {t(item.labelKey)}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Coastal Citizen & Fisherman Authentication & Registration Modal */}
      <CitizenAuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onUserAuthenticated={(user) => setCurrentUser(user)}
      />
    </div>
  );
};

export default CitizenLayout;
