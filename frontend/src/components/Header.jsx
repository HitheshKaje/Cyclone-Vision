import React from 'react';
import { Menu, Bell, User, Settings, Wind } from 'lucide-react';

const Header = ({ toggleSidebar }) => {
  return (
    <header className="h-16 bg-navy-800/80 backdrop-blur-md border-b border-slate-700/50 flex items-center justify-between px-4 z-10 sticky top-0">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          className="p-2 hover:bg-navy-700 rounded-lg transition-colors text-slate-300 hover:text-cyan-400"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="bg-cyan-500/20 p-2 rounded-lg text-cyan-400">
            <Wind size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">CycloneVision</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider hidden sm:block">AI Based Tropical Cyclone Monitoring</p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <button className="p-2 hover:bg-navy-700 rounded-lg transition-colors text-slate-400 hover:text-white">
          <Bell size={20} />
        </button>
        <button className="p-2 hover:bg-navy-700 rounded-lg transition-colors text-slate-400 hover:text-white">
          <Settings size={20} />
        </button>
        <div className="h-8 w-8 ml-2 bg-navy-700 rounded-full flex items-center justify-center border border-slate-600">
          <User size={16} className="text-slate-300" />
        </div>
      </div>
    </header>
  );
};

export default Header;
