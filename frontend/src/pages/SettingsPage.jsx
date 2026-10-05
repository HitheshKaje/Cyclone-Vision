import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Server, 
  Database, 
  Cpu, 
  Globe, 
  Save, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Users,
  ShieldAlert,
  User,
  BrainCircuit,
  Map,
  Bell,
  Activity
} from 'lucide-react';
import { getApiBaseUrl, setApiBaseUrl } from '../utils/apiConfig';

const SettingsPage = () => {
  const [activeSection, setActiveSection] = useState('system');

  // List of all sections (Only System is functional)
  const sections = [
    { id: 'system', label: 'System', icon: Server },
    { id: 'account', label: 'Account settings', icon: User },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'logs', label: 'System Logs', icon: ShieldAlert },
    { id: 'ai', label: 'AI/Model Settings', icon: BrainCircuit },
    { id: 'map', label: 'Map Settings', icon: Map },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="flex min-h-[80vh] bg-slate-50 dark:bg-[#0f172a] rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800">
      {/* Settings Sidebar */}
      <div className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e293b] flex flex-col h-full shrink-0">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Settings size={20} className="text-sky-500" />
            CycloSafe Settings
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeSection === section.id
                  ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <section.icon size={18} className={activeSection === section.id ? 'text-sky-500' : 'text-slate-400'} />
              {section.label}
            </button>
          ))}
        </div>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
              {sections.find(s => s.id === activeSection)?.label}
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              {activeSection === 'system' 
                ? 'Manage core system configurations, view AI models, and monitor backend health.' 
                : 'This section is currently under development.'}
            </p>
          </div>

          {activeSection === 'system' ? (
            <SystemSection />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-[#1e293b]">
              <Settings size={48} className="text-slate-300 dark:text-slate-600 mb-4 animate-spin-slow" />
              <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-1">Coming Soon</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
                The {sections.find(s => s.id === activeSection)?.label} panel is not available in the current preview build.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SystemSection = () => {
  // API Config State
  const [apiUrl, setApiUrl] = useState(getApiBaseUrl());
  const [apiSaveStatus, setApiSaveStatus] = useState(null); // 'success', 'error', null

  // System Status State
  const [systemInfo, setSystemInfo] = useState(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  // Fetch System Status from backend
  const fetchSystemStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/system/status`);
      if (!response.ok) throw new Error('Failed to fetch status');
      const data = await response.json();
      setSystemInfo(data);
    } catch (error) {
      console.error('Error fetching system status:', error);
      setSystemInfo({
        status: { api: 'Offline', database: 'Offline', model: 'Unknown' },
        model_version: 'Unavailable',
        dataset: { name: 'Unavailable', images: 'N/A', classes: [], version: 'N/A', last_updated: 'N/A' }
      });
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchSystemStatus();
  }, []);

  // Handle API Save
  const handleSaveApi = () => {
    if (!apiUrl || !apiUrl.startsWith('http')) {
      setApiSaveStatus('error');
      setTimeout(() => setApiSaveStatus(null), 3000);
      return;
    }
    
    // Clean URL
    const cleanUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
    
    setApiBaseUrl(cleanUrl);
    setApiUrl(cleanUrl);
    setApiSaveStatus('success');
    
    // Refresh status using new URL
    setTimeout(() => {
      setApiSaveStatus(null);
      fetchSystemStatus();
    }, 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. API Configuration */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-3">
          <Globe className="text-sky-500" size={20} />
          <h3 className="font-semibold text-slate-800 dark:text-white">API Configuration</h3>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Backend API Base URL
            </label>
            <div className="flex gap-3">
              <input 
                type="text" 
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all"
                placeholder="http://127.0.0.1:8000"
              />
              <button 
                onClick={handleSaveApi}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
              >
                <Save size={16} /> Save
              </button>
            </div>
            
            {/* Save Status Message */}
            {apiSaveStatus === 'success' && (
              <p className="mt-2 text-sm text-green-600 dark:text-green-400 flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 size={14} /> API configuration saved successfully! System will now use this URL.
              </p>
            )}
            {apiSaveStatus === 'error' && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5 animate-in fade-in">
                <AlertCircle size={14} /> Invalid URL. Must start with http:// or https://
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 2 & 3. Model & Dataset Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Model Version */}
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-3">
            <Cpu className="text-violet-500" size={20} />
            <h3 className="font-semibold text-slate-800 dark:text-white">Active AI Model</h3>
          </div>
          <div className="p-5">
            {isLoadingStatus ? (
              <div className="animate-pulse flex space-x-4">
                <div className="flex-1 space-y-4 py-1">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Model Version</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{systemInfo?.model_version || 'Not available'}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Loaded Classes</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {systemInfo?.dataset?.classes?.length > 0 ? (
                      systemInfo.dataset.classes.map(cls => (
                        <span key={cls} className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {cls}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500">Not available</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dataset Information */}
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-3">
            <Database className="text-emerald-500" size={20} />
            <h3 className="font-semibold text-slate-800 dark:text-white">Dataset Info</h3>
          </div>
          <div className="p-5">
            {isLoadingStatus ? (
              <div className="animate-pulse flex space-x-4">
                <div className="flex-1 space-y-4 py-1">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Dataset Name</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{systemInfo?.dataset?.name || 'Not available'}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Version</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{systemInfo?.dataset?.version || 'Not available'}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Samples</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{systemInfo?.dataset?.images?.toLocaleString() || 'Not available'}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Last Updated</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white text-xs truncate" title={systemInfo?.dataset?.last_updated}>{systemInfo?.dataset?.last_updated || 'Not available'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 4. System Status */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="text-rose-500" size={20} />
            <h3 className="font-semibold text-slate-800 dark:text-white">Health Status</h3>
          </div>
          <button 
            onClick={fetchSystemStatus}
            disabled={isLoadingStatus}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            title="Refresh Status"
          >
            <RefreshCw size={16} className={isLoadingStatus ? 'animate-spin text-sky-500' : ''} />
          </button>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Backend API</span>
              {isLoadingStatus ? (
                <span className="w-2 h-2 rounded-full bg-slate-300 animate-pulse"></span>
              ) : (
                <span className={`w-2.5 h-2.5 rounded-full ${systemInfo?.status?.api === 'Online' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`}></span>
              )}
            </div>
            <p className={`text-sm font-bold ${systemInfo?.status?.api === 'Online' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {isLoadingStatus ? 'Checking...' : (systemInfo?.status?.api || 'Error')}
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Database</span>
              {isLoadingStatus ? (
                <span className="w-2 h-2 rounded-full bg-slate-300 animate-pulse"></span>
              ) : (
                <span className={`w-2.5 h-2.5 rounded-full ${systemInfo?.status?.database?.includes('Online') ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'}`}></span>
              )}
            </div>
            <p className={`text-sm font-bold ${systemInfo?.status?.database?.includes('Online') ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {isLoadingStatus ? 'Checking...' : (systemInfo?.status?.database || 'Unknown')}
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">ML Pipeline</span>
              {isLoadingStatus ? (
                <span className="w-2 h-2 rounded-full bg-slate-300 animate-pulse"></span>
              ) : (
                <span className={`w-2.5 h-2.5 rounded-full ${systemInfo?.status?.model === 'Online' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`}></span>
              )}
            </div>
            <p className={`text-sm font-bold ${systemInfo?.status?.model === 'Online' ? 'text-green-600 dark:text-green-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {isLoadingStatus ? 'Checking...' : (systemInfo?.status?.model || 'Offline')}
            </p>
          </div>

        </div>
      </div>

    </div>
  );
};

export default SettingsPage;
