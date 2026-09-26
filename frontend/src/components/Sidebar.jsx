import React from 'react';
import { 
  Home, 
  UploadCloud, 
  BarChart3, 
  Map, 
  History, 
  X 
} from 'lucide-react';

const navItems = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'analyze', label: 'Analyze Image', icon: UploadCloud },
  { id: 'results', label: 'Results', icon: BarChart3 },
  { id: 'map', label: 'Cyclone Map', icon: Map },
  { id: 'history', label: 'History', icon: History },
];

const Sidebar = ({ isOpen, isMobile, closeSidebar, activeTab, setActiveTab }) => {
  return (
    <aside 
      className={`
        ${isMobile ? 'fixed inset-y-0 left-0 z-40 shadow-xl' : 'relative z-20'}
        ${isOpen ? 'translate-x-0 w-56 sm:w-60' : (isMobile ? '-translate-x-full w-60' : 'translate-x-0 w-16')}
        bg-white border-r border-slate-200 transition-all duration-200 ease-in-out flex flex-col h-full shrink-0 select-none
      `}
    >
      {/* Mobile Close Button Header */}
      {isMobile && (
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 lg:hidden">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Navigation</span>
          <button 
            onClick={closeSidebar}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Main Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {(isOpen || isMobile) && (
          <p className="px-3 pt-2 pb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Main
          </p>
        )}

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (isMobile) closeSidebar();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sky-50 text-sky-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              } ${!isOpen && !isMobile ? 'justify-center px-0' : ''}`}
              title={!isOpen && !isMobile ? item.label : ''}
            >
              <Icon 
                size={18} 
                className={`shrink-0 ${isActive ? 'text-sky-600' : 'text-slate-400'}`} 
              />
              {(isOpen || isMobile) && (
                <span className="truncate text-left">
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      {/* Empty space at the bottom intentionally left clean as requested */}
    </aside>
  );
};

export default Sidebar;
