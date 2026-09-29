import React from 'react';
import { 
  Home, 
  UploadCloud, 
  BarChart3, 
  Map, 
  History, 
  X,
  Users,
  ShieldAlert,
  Settings
} from 'lucide-react';

const navItems = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'analyze', label: 'Analyze Image', icon: UploadCloud },
  { id: 'results', label: 'Results', icon: BarChart3 },
  { id: 'map', label: 'Cyclone Map', icon: Map },
  { id: 'history', label: 'History', icon: History },
];

const managementItems = [
  { id: 'users', label: 'User Management', icon: Users },
  { id: 'logs', label: 'System Logs', icon: ShieldAlert },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const Sidebar = ({ isOpen, isMobile, closeSidebar, activeTab, setActiveTab }) => {
  return (
    <aside 
      className={`
        ${isMobile ? 'fixed inset-y-0 left-0 z-40 shadow-xl' : 'relative z-20'}
        ${isOpen ? 'translate-x-0 w-56 sm:w-60' : (isMobile ? '-translate-x-full w-60' : 'translate-x-0 w-16')}
        bg-slate-50 dark:bg-[#0f172a] border-r border-slate-200 dark:border-slate-800 transition-all duration-200 ease-in-out flex flex-col h-full shrink-0 select-none
      `}
    >
      {/* Mobile Close Button Header */}
      {isMobile && (
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 lg:hidden">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Navigation</span>
          <button 
            onClick={closeSidebar}
            className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Main Navigation */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {(isOpen || isMobile) && (
          <p className="px-3 pt-2 pb-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
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
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-sky-500/10 text-sky-400 font-semibold shadow-xs border border-sky-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
              } ${!isOpen && !isMobile ? 'justify-center px-0' : ''}`}
              title={!isOpen && !isMobile ? item.label : ''}
            >
              <Icon 
                size={18} 
                className={`shrink-0 ${isActive ? 'text-sky-400' : 'text-slate-500'}`} 
              />
              {(isOpen || isMobile) && (
                <span className="truncate text-left">
                  {item.label}
                </span>
              )}
            </button>
          );
        })}

        {/* Management Section */}
        <div className="pt-6">
          {(isOpen || isMobile) && (
            <p className="px-3 pt-2 pb-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Management
            </p>
          )}

          {managementItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (isMobile) closeSidebar();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-sky-500/10 text-sky-400 font-semibold shadow-xs border border-sky-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
                } ${!isOpen && !isMobile ? 'justify-center px-0' : ''}`}
                title={!isOpen && !isMobile ? item.label : ''}
              >
                <Icon 
                  size={18} 
                  className={`shrink-0 ${isActive ? 'text-sky-400' : 'text-slate-500'}`} 
                />
                {(isOpen || isMobile) && (
                  <span className="truncate text-left">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
