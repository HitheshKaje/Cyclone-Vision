import React from 'react';
import { 
  Home, 
  UploadCloud, 
  BarChart3, 
  FileText, 
  Database, 
  Users, 
  X,
  Globe2
} from 'lucide-react';

const navItems = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'analyze', label: 'Analyze Image', icon: UploadCloud },
  { id: 'results', label: 'Results', icon: BarChart3 },
  { id: 'about', label: 'About Project', icon: FileText },
  { id: 'dataset', label: 'Dataset', icon: Database },
  { id: 'team', label: 'Team', icon: Users },
];

const Sidebar = ({ isOpen, isMobile, closeSidebar, activeTab, setActiveTab }) => {
  return (
    <aside 
      className={`
        ${isMobile ? 'fixed inset-y-0 left-0 z-40 shadow-2xl' : 'relative z-20'}
        ${isOpen ? 'translate-x-0 w-60' : (isMobile ? '-translate-x-full w-60' : 'translate-x-0 w-20')}
        bg-white/95 backdrop-blur-md border-r border-sky-100/90 transition-all duration-300 ease-in-out flex flex-col h-full shrink-0
      `}
    >
      {isMobile && (
        <div className="flex items-center justify-between p-4 border-b border-sky-100 lg:hidden">
          <span className="font-bold text-slate-800 text-lg">Menu</span>
          <button 
            onClick={closeSidebar}
            className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>
      )}
      
      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto overflow-x-hidden">
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
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/25'
                  : 'text-slate-600 hover:bg-sky-50/80 hover:text-sky-700'
              } ${!isOpen && !isMobile ? 'justify-center px-0' : ''}`}
              title={!isOpen && !isMobile ? item.label : ''}
            >
              <Icon size={18} className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
              {(isOpen || isMobile) && (
                <span className="whitespace-nowrap overflow-hidden text-ellipsis text-left">
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      
      {/* Bottom Globe Graphic & Motto */}
      {(isOpen || isMobile) && (
        <div className="p-4 m-3 rounded-2xl bg-gradient-to-b from-sky-50/70 to-blue-50/90 border border-sky-100/80 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-sky-100 flex items-center justify-center mb-2.5 shadow-inner border border-sky-200">
            <Globe2 size={30} className="text-sky-600 animate-pulse" />
          </div>
          <p className="text-xs font-bold text-slate-700 leading-snug">
            "Understanding Cyclones Today for a Safer Tomorrow"
          </p>
          <div className="w-8 h-0.5 bg-sky-400 rounded-full mt-2" />
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
