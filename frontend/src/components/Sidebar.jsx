import React from 'react';
import { 
  LayoutDashboard, 
  Satellite, 
  Radar, 
  Activity, 
  AlertTriangle, 
  BellRing, 
  History, 
  Settings 
} from 'lucide-react';

const NavItem = ({ icon: Icon, label, active, isOpen }) => (
  <button 
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
      active 
        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
        : 'text-slate-400 hover:bg-navy-700 hover:text-slate-200'
    }`}
  >
    <Icon size={20} className={active ? 'text-cyan-400' : ''} />
    {isOpen && <span className="font-medium whitespace-nowrap">{label}</span>}
  </button>
);

const Sidebar = ({ isOpen }) => {
  return (
    <aside 
      className={`${
        isOpen ? 'w-64' : 'w-20'
      } bg-navy-800/50 border-r border-slate-700/50 transition-all duration-300 flex flex-col`}
    >
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden">
        <NavItem icon={LayoutDashboard} label="Dashboard" active={true} isOpen={isOpen} />
        <NavItem icon={Satellite} label="Satellite Monitoring" active={false} isOpen={isOpen} />
        <NavItem icon={Radar} label="Cyclone Detection" active={false} isOpen={isOpen} />
        <NavItem icon={Activity} label="Intensity & Class" active={false} isOpen={isOpen} />
        <NavItem icon={AlertTriangle} label="Risk Assessment" active={false} isOpen={isOpen} />
        <NavItem icon={BellRing} label="Alerts" active={false} isOpen={isOpen} />
        <NavItem icon={History} label="Historical Data" active={false} isOpen={isOpen} />
      </nav>
      
      <div className="p-4 border-t border-slate-700/50">
        <NavItem icon={Settings} label="Settings" active={false} isOpen={isOpen} />
      </div>
    </aside>
  );
};

export default Sidebar;
