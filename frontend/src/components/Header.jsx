import React from 'react';
import { Menu, Bell, User, Settings, Wind } from 'lucide-react';

const Header = ({ toggleSidebar }) => {
  return (
    <header className="h-14 sm:h-16 bg-navy-800/90 backdrop-blur-md border-b border-slate-700/50 flex items-center justify-between px-3 sm:px-4 z-20 sticky top-0 w-full">
      <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
        <button 
          onClick={toggleSidebar}
          className="p-1.5 sm:p-2 hover:bg-navy-700 rounded-lg transition-colors text-slate-300 hover:text-cyan-400 shrink-0"
        >
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="bg-cyan-500/20 p-1.5 sm:p-2 rounded-lg text-cyan-400 shrink-0">
            <Wind size={20} className="sm:w-6 sm:h-6" />
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate">CycloneVision</h1>
            <p className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider hidden md:block truncate">AI Based Tropical Cyclone Monitoring</p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-2">
        <button className="p-1.5 sm:p-2 hover:bg-navy-700 rounded-lg transition-colors text-slate-400 hover:text-white">
          <Bell size={18} className="sm:w-5 sm:h-5" />
        </button>
        <button className="p-1.5 sm:p-2 hover:bg-navy-700 rounded-lg transition-colors text-slate-400 hover:text-white hidden xs:block">
          <Settings size={18} className="sm:w-5 sm:h-5" />
        </button>
        <div className="h-7 w-7 sm:h-8 sm:w-8 ml-1 sm:ml-2 bg-navy-700 rounded-full flex items-center justify-center border border-slate-600 shrink-0">
          <User size={14} className="sm:w-4 sm:h-4 text-slate-300" />
        </div>
      </div>
    </header>
  );
};

export default Header;
