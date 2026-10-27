import React from 'react';
import { Menu, Bell, User, LogOut, Sun, Moon, ShieldCheck } from 'lucide-react';
import cycloneLogo from '../assets/cyclone-logo.png';

const CycloSafeLogo = () => (
  <div className="flex items-center justify-center shrink-0">
    <img 
      src={cycloneLogo} 
      alt="CycloSafe Cyclone Logo" 
      className="w-10 h-10 sm:w-11 sm:h-11 object-contain animate-cyclone-spin" 
    />
  </div>
);

const Header = ({ toggleSidebar, isDarkMode, toggleDarkMode, onLogout, adminUser }) => {
  const adminName = adminUser?.name || 'Command Center Admin';

  return (
    <header className="h-16 bg-white dark:bg-[#0f172a] border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 w-full select-none transition-colors duration-300">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        
        {/* Left Side: Mobile Toggle + Logo + Brand Name */}
        <div className="flex items-center gap-3 min-w-0">
          {toggleSidebar && (
            <button
              onClick={toggleSidebar}
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg lg:hidden transition-colors cursor-pointer"
              aria-label="Toggle navigation"
            >
              <Menu size={20} />
            </button>
          )}

          <div className="flex items-center gap-3 min-w-0">
            <CycloSafeLogo />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight truncate">
                  Cyclo<span className="text-sky-500">Safe</span>
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                  <ShieldCheck size={11} />
                  <span>Admin</span>
                </span>
              </div>
              <span className="hidden sm:inline-block text-[11px] font-medium text-slate-600 dark:text-slate-400 tracking-normal truncate">
                Command & Early Warning Control
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Theme Toggle + Notifications + Admin Profile & Logout */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          
          {/* Theme Toggle */}
          <button 
            onClick={toggleDarkMode}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-sky-500 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            aria-label="Toggle Dark Mode"
            title="Toggle Dark Mode"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button 
            className="relative p-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-sky-500 rounded-full ring-2 ring-white dark:ring-[#0f172a]" />
          </button>

          <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-700 hidden sm:block mx-0.5" />

          {/* Admin User Info */}
          <div className="hidden sm:flex items-center gap-2 pl-1 py-1 pr-2 rounded-lg text-slate-700 dark:text-slate-300">
            <div className="w-8 h-8 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0">
              <User size={16} />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {adminName}
              </span>
              <span className="text-[10px] text-slate-400">
                System Administrator
              </span>
            </div>
          </div>

          {/* Admin Logout Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
              title="Sign Out of Admin Command Center"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          )}

        </div>

      </div>
    </header>
  );
};

export default Header;
