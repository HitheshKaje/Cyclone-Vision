import React from 'react';
import { Menu, Bell, User, ChevronDown } from 'lucide-react';
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

const Header = ({ toggleSidebar }) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 w-full select-none">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        
        {/* Left Side: Mobile Toggle + Logo + Brand Name */}
        <div className="flex items-center gap-3 min-w-0">
          {toggleSidebar && (
            <button
              onClick={toggleSidebar}
              className="p-1.5 text-slate-600 hover:text-sky-600 hover:bg-slate-100 rounded-lg lg:hidden transition-colors cursor-pointer"
              aria-label="Toggle navigation"
            >
              <Menu size={20} />
            </button>
          )}

          <div className="flex items-center gap-3 min-w-0">
            <CycloSafeLogo />
            <div className="flex flex-col min-w-0">
              <span className="text-xl font-bold text-slate-900 tracking-tight leading-tight truncate">
                Cyclo<span className="text-sky-600">Safe</span>
              </span>
              <span className="hidden sm:inline-block text-[11px] font-medium text-slate-500 tracking-normal truncate">
                AI-Based Tropical Cyclone Monitoring
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Notification Icon + User Menu */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button 
            className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-sky-500 rounded-full ring-2 ring-white" />
          </button>

          <div className="h-5 w-[1px] bg-slate-200 hidden sm:block" />

          {/* User Profile Menu */}
          <div className="flex items-center gap-2 pl-1 py-1 pr-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-slate-700">
            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
              <User size={15} />
            </div>
            <span className="hidden md:inline text-xs font-semibold text-slate-800">
              Hi, User
            </span>
            <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
          </div>
        </div>

      </div>
    </header>
  );
};

export default Header;
