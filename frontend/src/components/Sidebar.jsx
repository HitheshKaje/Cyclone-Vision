import React from 'react';
import { 
  LayoutDashboard, 
  Satellite, 
  Radar, 
  Activity, 
  AlertTriangle, 
  BellRing, 
  History, 
  Settings,
  X
} from 'lucide-react';

const NavItem = ({ icon: Icon, label, active, isOpen, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
      active 
        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
        : 'text-slate-400 hover:bg-navy-700 hover:text-slate-200'
    } ${!isOpen ? 'justify-center px-0' : ''}`}
    title={!isOpen ? label : ''}
  >
    <Icon size={20} className={`shrink-0 ${active ? 'text-cyan-400' : ''}`} />
    {isOpen && <span className="font-medium whitespace-nowrap overflow-hidden text-ellipsis text-left">{label}</span>}
  </button>
);

const Sidebar = ({ isOpen, isMobile, closeSidebar }) => {
  return (
    <aside 
      className={`
        ${isMobile ? 'fixed inset-y-0 left-0 z-40' : 'relative z-20'}
        ${isOpen ? 'translate-x-0 w-64' : (isMobile ? '-translate-x-full w-64' : 'translate-x-0 w-20')}
        bg-navy-800 border-r border-slate-700/50 transition-all duration-300 ease-in-out flex flex-col h-full
      `}
    >
      {isMobile && (
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50 lg:hidden">
          <span className="font-bold text-white text-lg">Menu</span>
          <button 
            onClick={closeSidebar}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-navy-700"
          >
            <X size={20} />
          </button>
        </div>
      )}
      
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto overflow-x-hidden">
        <NavItem icon={LayoutDashboard} label="Dashboard" active={true} isOpen={isOpen || isMobile} onClick={closeSidebar} />
        <NavItem icon={Satellite} label="Satellite Monitoring" active={false} isOpen={isOpen || isMobile} onClick={closeSidebar} />
        <NavItem icon={Radar} label="Cyclone Detection" active={false} isOpen={isOpen || isMobile} onClick={closeSidebar} />
        <NavItem icon={Activity} label="Intensity & Class" active={false} isOpen={isOpen || isMobile} onClick={closeSidebar} />
        <NavItem icon={AlertTriangle} label="Risk Assessment" active={false} isOpen={isOpen || isMobile} onClick={closeSidebar} />
        <NavItem icon={BellRing} label="Alerts" active={false} isOpen={isOpen || isMobile} onClick={closeSidebar} />
        <NavItem icon={History} label="Historical Data" active={false} isOpen={isOpen || isMobile} onClick={closeSidebar} />
      </nav>
      
      <div className="p-3 border-t border-slate-700/50">
        <NavItem icon={Settings} label="Settings" active={false} isOpen={isOpen || isMobile} onClick={closeSidebar} />
      </div>
    </aside>
  );
};

export default Sidebar;
