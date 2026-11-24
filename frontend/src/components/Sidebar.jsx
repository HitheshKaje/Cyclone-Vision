import React, { useState } from 'react';
import { 
  Home, 
  UploadCloud, 
  BarChart3, 
  Map, 
  History, 
  X,
  Users,
  ShieldAlert,
  Settings,
  TrendingUp,
  Satellite,
  Radar,
  CloudRain,
  Wind,
  Thermometer,
  Droplets,
  Compass,
  Check,
  ChevronDown,
  Layers,
  Navigation,
  Anchor,
  User,
  ExternalLink
} from 'lucide-react';

const navItems = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'analyze', label: 'Analyze Image', icon: UploadCloud },
  { id: 'results', label: 'Results', icon: BarChart3 },
  { id: 'map', label: 'Cyclone Map', icon: Map },
  { id: 'history', label: 'History', icon: History },
  { id: 'prediction', label: '5-Day Track Prediction', icon: TrendingUp },
];

const managementItems = [
  { id: 'users', label: 'User Management', icon: Users },
  { id: 'logs', label: 'System Logs', icon: ShieldAlert },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const liveMaps = [
  { id: 'satellite', name: 'Satellite', icon: Satellite },
  { id: 'radar', name: 'Radar', icon: Radar }
];

const forecastMaps = [
  { id: 'precipitation', name: 'Precipitation', icon: CloudRain },
  { id: 'wind', name: 'Wind', icon: Wind },
  { id: 'temperature', name: 'Temperature', icon: Thermometer },
  { id: 'humidity', name: 'Humidity', icon: Droplets },
  { id: 'pressure', name: 'Pressure', icon: Compass }
];

const baseMaps = [
  { id: 'street', name: 'Street' },
  { id: 'satellite_base', name: 'Satellite' },
  { id: 'ocean', name: 'Ocean' },
  { id: 'terrain', name: 'Terrain' }
];

const Sidebar = ({ 
  isOpen, 
  isMobile, 
  closeSidebar, 
  activeTab, 
  setActiveTab,
  mapViewMode = 'tactical',
  setMapViewMode,
  activeMapLayer = 'wind',
  setActiveMapLayer,
  activeBaseMap = 'satellite_base',
  setActiveBaseMap,
  futureTrackActive = false,
  setFutureTrackActive
}) => {
  const [isMapMenuOpen, setIsMapMenuOpen] = useState(false);

  return (
    <aside 
      className={`
        ${isMobile ? 'fixed inset-y-0 left-0 z-40 shadow-xl' : 'relative z-20'}
        ${isOpen ? 'translate-x-0 w-60 sm:w-64' : (isMobile ? '-translate-x-full w-64' : 'translate-x-0 w-16')}
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
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto custom-scrollbar">
        {(isOpen || isMobile) && (
          <p className="px-3 pt-2 pb-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Main
          </p>
        )}

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isMapItem = item.id === 'map';

          return (
            <div key={item.id} className="space-y-1">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    if (isMobile && item.id !== 'map') closeSidebar();
                  }}
                  className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-sky-500/10 text-sky-500 dark:text-sky-400 font-semibold shadow-xs border border-sky-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
                  } ${!isOpen && !isMobile ? 'justify-center px-0' : ''}`}
                  title={!isOpen && !isMobile ? item.label : ''}
                >
                  <Icon 
                    size={18} 
                    className={`shrink-0 ${isActive ? 'text-sky-500 dark:text-sky-400' : 'text-slate-500'}`} 
                  />
                  {(isOpen || isMobile) && (
                    <span className="truncate text-left flex-1">
                      {item.label}
                    </span>
                  )}
                  {isMapItem && isActive && (isOpen || isMobile) && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  )}
                </button>

                {/* Arrow toggle button to open / close Cyclone Map layer options */}
                {isMapItem && (isOpen || isMobile) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (activeTab !== 'map') {
                        setActiveTab('map');
                      }
                      setIsMapMenuOpen(prev => !prev);
                    }}
                    className={`p-2 rounded-lg transition-all cursor-pointer shrink-0 ${
                      isMapMenuOpen
                        ? 'bg-sky-500/20 text-sky-500 dark:text-sky-400'
                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                    }`}
                    title={isMapMenuOpen ? "Click arrow to close options" : "Click arrow to open options"}
                    aria-label="Toggle map options"
                  >
                    <ChevronDown 
                      size={16} 
                      className={`transition-transform duration-200 ${isMapMenuOpen ? 'rotate-180 text-sky-500 dark:text-sky-400' : 'text-slate-400'}`} 
                    />
                  </button>
                )}
              </div>

              {/* Meteorological Submenu: ONLY opens when arrow is clicked (isMapMenuOpen === true) */}
              {isMapItem && isMapMenuOpen && (isOpen || isMobile) && (
                <div className="ml-3 pl-2.5 border-l-2 border-sky-500/30 my-2 space-y-2.5 text-xs select-none">
                  
                  {/* Future Track Submenu Item (ONLY occurs when Radar Engine is selected) */}
                  {mapViewMode === 'windy_engine' && (
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (activeTab !== 'map') {
                            setActiveTab('map');
                          }
                          if (setFutureTrackActive) {
                            setFutureTrackActive(prev => !prev);
                          }
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          futureTrackActive && activeTab === 'map'
                            ? 'bg-sky-500 text-white shadow-xs font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                        }`}
                        title="Show official Spire Future Forecast Track on Radar Engine"
                      >
                        <span className="flex items-center gap-2">
                          <Navigation size={14} className={futureTrackActive && activeTab === 'map' ? 'text-white' : 'text-sky-500'} />
                          <span>Future Track</span>
                        </span>
                        {futureTrackActive && activeTab === 'map' && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Live Maps Group */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                      <span>Live Maps</span>
                    </div>
                    <div className="space-y-0.5">
                      {liveMaps.map((layer) => {
                        const LayerIcon = layer.icon;
                        const isSelected = activeMapLayer === layer.id;
                        return (
                          <button
                            key={layer.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (setActiveMapLayer) setActiveMapLayer(layer.id);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-sky-500 text-white shadow-xs font-bold'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <LayerIcon size={14} className={isSelected ? 'text-white' : 'text-sky-500'} />
                              <span>{layer.name}</span>
                            </span>
                            {isSelected && <Check size={13} className="text-white" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Forecast Maps Group */}
                  <div className="space-y-1">
                    <div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Forecast Maps
                    </div>
                    <div className="space-y-0.5">
                      {forecastMaps.map((layer) => {
                        const LayerIcon = layer.icon;
                        const isSelected = activeMapLayer === layer.id;
                        return (
                          <button
                            key={layer.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (setActiveMapLayer) setActiveMapLayer(layer.id);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-sky-500 text-white shadow-xs font-bold'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <LayerIcon size={14} className={isSelected ? 'text-white' : 'text-teal-500'} />
                              <span>{layer.name}</span>
                            </span>
                            {isSelected && <Check size={13} className="text-white" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Base Cartography: ONLY displayed in Tactical Map mode, NOT in Radar Engine mode */}
                  {mapViewMode === 'tactical' && (
                    <div className="space-y-1 pt-1 border-t border-slate-200 dark:border-slate-800">
                      <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Base Map
                      </div>
                      <div className="grid grid-cols-2 gap-1 px-1">
                        {baseMaps.map((base) => {
                          const isSelected = activeBaseMap === base.id;
                          return (
                            <button
                              key={base.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (setActiveBaseMap) setActiveBaseMap(base.id);
                              }}
                              className={`px-1.5 py-1 rounded text-[10px] font-semibold text-center truncate transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-teal-600 text-white shadow-xs font-bold'
                                  : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
                              }`}
                            >
                              {base.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          );
        })}

        {/* Management Section */}
        <div className="pt-5 border-t border-slate-200 dark:border-slate-800 mt-2">
          {(isOpen || isMobile) && (
            <p className="px-3 pt-1 pb-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
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
                    ? 'bg-sky-500/10 text-sky-500 dark:text-sky-400 font-semibold shadow-xs border border-sky-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
                } ${!isOpen && !isMobile ? 'justify-center px-0' : ''}`}
                title={!isOpen && !isMobile ? item.label : ''}
              >
                <Icon 
                  size={18} 
                  className={`shrink-0 ${isActive ? 'text-sky-500 dark:text-sky-400' : 'text-slate-500'}`} 
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

        {/* Public Coastal Gateways */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mt-2">
          {(isOpen || isMobile) && (
            <p className="px-3 pt-1 pb-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Coastal Gateways
            </p>
          )}

          {/* Fisherman Gateway */}
          <a
            href="/fisherman"
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 cursor-pointer ${
              !isOpen && !isMobile ? 'justify-center px-0' : ''
            }`}
            title="Open Fisherman Coastal Gateway"
          >
            <Anchor size={18} className="shrink-0 text-sky-500" />
            {(isOpen || isMobile) && (
              <span className="truncate text-left flex-1 font-bold">
                Fisherman Gateway
              </span>
            )}
            {(isOpen || isMobile) && (
              <ExternalLink size={12} className="opacity-60" />
            )}
          </a>

          {/* Citizen Portal */}
          <a
            href="/citizen"
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer ${
              !isOpen && !isMobile ? 'justify-center px-0' : ''
            }`}
            title="Open Coastal Citizen Portal"
          >
            <User size={18} className="shrink-0 text-emerald-500" />
            {(isOpen || isMobile) && (
              <span className="truncate text-left flex-1 font-bold">
                Citizen Portal
              </span>
            )}
            {(isOpen || isMobile) && (
              <ExternalLink size={12} className="opacity-60" />
            )}
          </a>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
