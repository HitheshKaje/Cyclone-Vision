import React from 'react';
import { Server, Database, Globe, Cpu } from 'lucide-react';

const StatusItem = ({ icon: Icon, label }) => (
  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-navy-700/30 transition-colors">
    <div className="flex items-center gap-3">
      <div className="p-1.5 bg-navy-800 rounded-md text-slate-500 border border-slate-700">
        <Icon size={14} />
      </div>
      <span className="text-sm text-slate-400">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500">Connecting...</span>
      <div className="w-2 h-2 rounded-full bg-slate-600 animate-pulse" />
    </div>
  </div>
);

const SystemStatus = () => {
  return (
    <div className="glass-panel p-5">
      <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">System Status</h3>
      
      <div className="space-y-1">
        <StatusItem icon={Cpu} label="AI Model" />
        <StatusItem icon={Server} label="Backend API" />
        <StatusItem icon={Globe} label="Satellite Data" />
        <StatusItem icon={Database} label="Database" />
      </div>
    </div>
  );
};

export default SystemStatus;
