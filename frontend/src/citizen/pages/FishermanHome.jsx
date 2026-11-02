import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Anchor, 
  Ship, 
  MapPin, 
  Wind, 
  Waves, 
  AlertTriangle, 
  ShieldCheck, 
  Volume2, 
  VolumeX,
  Compass, 
  Clock, 
  RefreshCw, 
  LogOut, 
  Bell, 
  Eye, 
  Droplets, 
  Thermometer, 
  Gauge, 
  CloudRain, 
  Sun, 
  Cloud, 
  CloudSun, 
  CloudFog, 
  CloudLightning,
  ChevronRight,
  Target,
  ArrowUpRight,
  Shield,
  Activity,
  Calendar,
  Layers,
  Info
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';

import cycloneLogo from '../../assets/cyclone-logo.png';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { logoutUser } from '../../utils/authService';
import { fetchOfficialAdvisories } from '../services/citizenApi';
import sirenService from '../services/sirenService';
import { 
  fetchCycloneIntel, 
  fetchSeaConditions, 
  fetchWeatherTelemetry 
} from '../services/fishermanApi';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Harbor Icon
const harborIcon = new L.divIcon({
  html: `<div style="background-color: #0284c7; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(2,132,199,0.8); display: flex; align-items: center; justify-content: center; color: white; font-size: 11px;">⚓</div>`,
  className: 'custom-harbor-marker',
  iconSize: [22, 22],
  iconAnchor: [11, 11]
});

// Custom Cyclone Threat Icon
const stormIcon = new L.divIcon({
  html: `<div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
    <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(239, 68, 68, 0.4); border: 2px solid #ef4444; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
    <div style="width: 20px; height: 20px; border-radius: 50%; background: #dc2626; border: 2px solid #ffffff; box-shadow: 0 0 12px rgba(220,38,38,0.9); display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: bold;">🌪️</div>
  </div>`,
  className: 'custom-storm-marker',
  iconSize: [36, 36],
  iconAnchor: [18, 18]
});

// WMO Code interpretation helper
const getWmoIcon = (code) => {
  if (code === 0) return <Sun className="text-amber-500" size={20} />;
  if (code <= 2) return <CloudSun className="text-sky-500" size={20} />;
  if (code === 3) return <Cloud className="text-slate-400" size={20} />;
  if (code >= 51 && code <= 67) return <CloudRain className="text-blue-500" size={20} />;
  if (code >= 80 && code <= 82) return <CloudRain className="text-indigo-500" size={20} />;
  if (code >= 95) return <CloudLightning className="text-purple-600" size={20} />;
  if (code >= 45 && code <= 48) return <CloudFog className="text-slate-400" size={20} />;
  return <CloudSun className="text-sky-500" size={20} />;
};

const getWmoLabel = (code) => {
  if (code === 0) return 'Clear Sky';
  if (code <= 2) return 'Partly Cloudy';
  if (code === 3) return 'Overcast';
  if (code >= 51 && code <= 55) return 'Drizzle';
  if (code >= 61 && code <= 65) return 'Rain Showers';
  if (code >= 80 && code <= 82) return 'Heavy Rain';
  if (code >= 95) return 'Thunderstorm Warning';
  if (code >= 45 && code <= 48) return 'Foggy / Mist';
  return 'Variable Marine Weather';
};

const FishermanHome = ({ onNavigate }) => {
  const { t, i18n } = useTranslation();
  const { isOnline } = useNetworkStatus();

  // Logged in Fisherman Profile
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const raw = localStorage.getItem('cyclosafe_current_citizen_user');
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  });

  // Selected Coastal Port (Default to user's registered port or Malpe)
  const [selectedPortId, setSelectedPortId] = useState(() => {
    try {
      const user = JSON.parse(localStorage.getItem('cyclosafe_current_citizen_user'));
      if (user?.port) {
        const p = user.port.toLowerCase();
        if (p.includes('mangalore')) return 'mangalore';
        if (p.includes('karwar')) return 'karwar';
        if (p.includes('gangolli') || p.includes('kundapura')) return 'gangolli';
        if (p.includes('honnavar')) return 'honnavar';
        if (p.includes('tadadi') || p.includes('kumta')) return 'tadadi';
        if (p.includes('bhatkal')) return 'bhatkal';
        if (p.includes('chennai')) return 'chennai';
        if (p.includes('visakhapatnam')) return 'visakhapatnam';
        if (p.includes('paradip')) return 'paradip';
      }
    } catch (_) {}
    return 'malpe';
  });

  // Main 3 Navigation Tabs (STRICTLY THREE: 'cyclone' | 'sea' | 'weather')
  const [activeTab, setActiveTab] = useState('cyclone');

  // Real-time Clock
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Telemetry States
  const [cycloneIntel, setCycloneIntel] = useState(null);
  const [seaData, setSeaData] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Dynamic Siren and Real-time Broadcast State from Admin
  const [adminBroadcast, setAdminBroadcast] = useState(null);
  const [isSirenSounding, setIsSirenSounding] = useState(false);

  // Load All 3 Telemetry Services
  const loadDashboardData = useCallback(async (portId) => {
    setIsRefreshing(true);
    try {
      const [cycRes, seaRes, wRes] = await Promise.allSettled([
        fetchCycloneIntel(portId),
        fetchSeaConditions(portId),
        fetchWeatherTelemetry(portId)
      ]);

      if (cycRes.status === 'fulfilled' && cycRes.value.success) {
        setCycloneIntel(cycRes.value.data);
      }
      if (seaRes.status === 'fulfilled' && seaRes.value.success) {
        setSeaData(seaRes.value.data);
      }
      if (wRes.status === 'fulfilled' && wRes.value.success) {
        setWeatherData(wRes.value.data);
      }
      setLastUpdated(new Date());
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Load on mount and when port changes
  useEffect(() => {
    loadDashboardData(selectedPortId);
  }, [selectedPortId, loadDashboardData]);

  // Real-Time Admin Broadcast Poller (runs every 2 seconds for instant siren reaction)
  useEffect(() => {
    let isMounted = true;
    const pollBroadcast = async () => {
      const res = await fetchOfficialAdvisories();
      if (!isMounted) return;
      if (res.success && res.data) {
        setAdminBroadcast(res.data);
        const sirenState = res.data.siren_active === true;
        setIsSirenSounding(sirenState);

        // Sound or mute acoustic siren dynamically
        if (sirenState) {
          sirenService.startSiren();
        } else {
          sirenService.stopSiren();
        }

        // If broadcast active state changes, refresh cyclone intel dynamically
        if (res.data.active) {
          setCycloneIntel(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              status_indicator: (res.data.level || 'RED').toUpperCase(),
              status_text: `ACTIVE THREAT: ${res.data.cyclone_name || 'Tropical Cyclone'}`,
              official_warning: res.data.fishermen_directive || res.data.message,
              has_active_system: true,
              active_cyclone: {
                name: res.data.cyclone_name || 'Tropical Cyclone System',
                latitude: res.data.coordinates?.lat || 15.4,
                longitude: res.data.coordinates?.lng || 84.5,
                category: res.data.classification || 'Severe Cyclonic Storm',
                wind_speed_kt: res.data.wind_speed_kt || 75.0,
                wind_speed_kmh: res.data.wind_speed_kmh || 140.0,
                distance_km: 420.0,
                distance_nm: 226.8,
                expected_landfall: res.data.area || 'Coastal Zone',
                siren_active: sirenState,
                status: 'Admin Live Warning'
              }
            };
          });
        }
      }
    };

    pollBroadcast();
    const interval = setInterval(pollBroadcast, 2000);
    return () => {
      isMounted = false;
      clearInterval(interval);
      sirenService.stopSiren();
    };
  }, []);

  const handleLogout = () => {
    sirenService.stopSiren();
    logoutUser();
    setCurrentUser(null);
    onNavigate('/fisherman/login');
  };

  // Coastal ports dropdown list
  const availablePorts = cycloneIntel?.available_ports || [
    { id: 'malpe', name: 'Malpe Fishery Harbor (Udupi)', lat: 13.3508, lng: 74.7042 },
    { id: 'mangalore', name: 'Mangalore Old Port (Dakshina Kannada)', lat: 12.8698, lng: 74.8431 },
    { id: 'karwar', name: 'Karwar Baitkhol Fishery Harbor', lat: 14.8136, lng: 74.1298 },
    { id: 'gangolli', name: 'Gangolli Fishing Harbor (Kundapura)', lat: 13.6346, lng: 74.6725 },
    { id: 'honnavar', name: 'Honnavar Port (Uttara Kannada)', lat: 14.2811, lng: 74.4447 },
    { id: 'tadadi', name: 'Tadadi Port (Kumta)', lat: 14.5262, lng: 74.3644 },
    { id: 'bhatkal', name: 'Bhatkal Coastal Port', lat: 13.9764, lng: 74.5503 }
  ];

  const currentPort = availablePorts.find(p => p.id === selectedPortId) || availablePorts[0];

  // Active storm coordinates or center
  const activeStorm = cycloneIntel?.active_cyclone;
  const cycloneStatus = cycloneIntel?.status_indicator || 'GREEN'; // RED, ORANGE, GREEN
  const seaStatus = seaData?.sea_status || 'GREEN';

  // Notification count
  const notificationCount = (cycloneStatus === 'RED' ? 1 : cycloneStatus === 'ORANGE' ? 1 : 0) +
    (seaStatus === 'RED' ? 1 : 0) +
    (isSirenSounding ? 1 : 0);

  return (
    <div className="space-y-4 sm:space-y-5 select-none text-slate-800 dark:text-slate-100">

      {/* =========================================================================
          DYNAMIC ACOUSTIC SIREN ALERT BANNER (Triggers ONLY when Admin clicks)
          ========================================================================= */}
      {isSirenSounding && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white shadow-xl animate-pulse border-2 border-red-300 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-white text-red-600 flex items-center justify-center shrink-0 shadow-md animate-bounce">
              <Volume2 size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/40">
                  HARBOR SIREN BROADCAST ACTIVE
                </span>
                <span className="text-xs font-bold text-red-100">Sounding Alarm</span>
              </div>
              <h2 className="text-base sm:text-lg font-black mt-0.5">
                {adminBroadcast?.title || 'Emergency Cyclone Warning Broadcast'}
              </h2>
              <p className="text-xs text-red-100 font-semibold mt-0.5">
                {adminBroadcast?.fishermen_directive || 'IMD Directive: All fishing vessels return to harbor immediately! Total ban on sea venture.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                sirenService.stopSiren();
                setIsSirenSounding(false);
              }}
              className="px-3.5 py-2 rounded-xl bg-white text-red-700 hover:bg-red-50 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
            >
              <VolumeX size={15} />
              <span>Mute Siren</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          DASHBOARD HEADER
          - CycloSafe Logo & App Name
          - Welcome message & Fisherman's Name
          - Vessel Registration Number
          - Real-Time Clock & Date
          - Coastal Port Selector
          - Notification indicator & Logout
          ========================================================================= */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Left: Identity & Vessel Information */}
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500/15 to-blue-600/15 border border-sky-400/30 flex items-center justify-center shrink-0 shadow-sm">
              <img 
                src={cycloneLogo} 
                alt="CycloSafe Logo" 
                className="w-9 h-9 object-contain animate-cyclone-spin" 
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
                  Cyclo<span className="text-sky-500">Safe</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30">
                  ⚓ Fisherman Dashboard
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-bold text-slate-700 dark:text-slate-200 mt-0.5">
                Welcome aboard, <strong className="text-slate-950 dark:text-white">{currentUser?.name || 'Captain Naik'}</strong>
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Ship size={13} className="text-sky-500" />
                  <span>Vessel: <strong>{currentUser?.vessel_name || 'Sea Falcon'}</strong></span>
                </span>
                <span>•</span>
                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Reg: {currentUser?.vessel_reg || 'IND-KA-02-MM-1029'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Port Selector, Live Clock, Notifications & Logout */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Coastal Location Selector */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <MapPin size={11} className="text-sky-500" />
                <span>Selected Coastal Port</span>
              </label>
              <select
                value={selectedPortId}
                onChange={(e) => setSelectedPortId(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500 cursor-pointer shadow-xs"
              >
                {availablePorts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Current Date & Live Clock */}
            <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Clock size={11} className="text-sky-500" />
                <span>IST Time</span>
              </div>
              <div className="font-black text-slate-800 dark:text-slate-200 mt-0.5">
                {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              <div className="text-[10px] text-slate-500">
                {currentTime.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
              </div>
            </div>

            {/* Notification Badge */}
            <div className="relative">
              <button
                type="button"
                className={`p-2.5 rounded-xl border flex items-center justify-center transition-all ${
                  notificationCount > 0
                    ? 'border-red-400 bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300'
                    : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800'
                }`}
                title={`${notificationCount} Active Marine Notifications`}
              >
                <Bell size={18} />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 text-white font-black text-[10px] flex items-center justify-center animate-ping">
                    {notificationCount}
                  </span>
                )}
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 text-white font-black text-[10px] flex items-center justify-center">
                    {notificationCount}
                  </span>
                )}
              </button>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => loadDashboardData(selectedPortId)}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw size={17} className={isRefreshing ? 'animate-spin text-sky-500' : ''} />
            </button>

            {/* Logout Option */}
            <button
              type="button"
              onClick={handleLogout}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/30 dark:text-slate-300 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Log out of Fisherman Dashboard"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>

          </div>
        </div>
      </div>

      {/* =========================================================================
          MAIN NAVIGATION: STRICTLY 3 PROMINENT TABS / CARDS
          1. 🌪️ Cyclone Information
          2. 🌊 Sea Information
          3. 🌤️ Weather Information
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        
        {/* Tab 1: Cyclone Information */}
        <button
          type="button"
          onClick={() => setActiveTab('cyclone')}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
            activeTab === 'cyclone'
              ? 'border-sky-500 bg-gradient-to-br from-sky-500/10 via-sky-500/5 to-white dark:to-slate-900 shadow-md ring-2 ring-sky-500/30'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform ${
              activeTab === 'cyclone' ? 'bg-sky-600 text-white scale-105' : 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
            }`}>
              <span className="text-xl">🌪️</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  Cyclone Information
                </h3>
                {cycloneStatus === 'RED' && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Storm tracking, winds & distance
              </p>
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
            cycloneStatus === 'RED'
              ? 'bg-red-500 text-white animate-pulse'
              : cycloneStatus === 'ORANGE'
              ? 'bg-amber-500 text-white'
              : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
          }`}>
            {cycloneStatus}
          </span>
        </button>

        {/* Tab 2: Sea Information */}
        <button
          type="button"
          onClick={() => setActiveTab('sea')}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
            activeTab === 'sea'
              ? 'border-teal-500 bg-gradient-to-br from-teal-500/10 via-teal-500/5 to-white dark:to-slate-900 shadow-md ring-2 ring-teal-500/30'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform ${
              activeTab === 'sea' ? 'bg-teal-600 text-white scale-105' : 'bg-teal-500/15 text-teal-600 dark:text-teal-400'
            }`}>
              <span className="text-xl">🌊</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  Sea Information
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Waves, period, currents & SST
              </p>
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
            seaStatus === 'RED'
              ? 'bg-red-500 text-white'
              : seaStatus === 'ORANGE'
              ? 'bg-amber-500 text-white'
              : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
          }`}>
            {seaStatus}
          </span>
        </button>

        {/* Tab 3: Weather Information */}
        <button
          type="button"
          onClick={() => setActiveTab('weather')}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
            activeTab === 'weather'
              ? 'border-blue-500 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-white dark:to-slate-900 shadow-md ring-2 ring-blue-500/30'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform ${
              activeTab === 'weather' ? 'bg-blue-600 text-white scale-105' : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
            }`}>
              <span className="text-xl">🌤️</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  Weather Information
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Current temp, rain & 7-day forecast
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/15 text-blue-700 dark:text-blue-300">
            {weatherData?.current ? `${weatherData.current.temperature_c}°C` : 'Live'}
          </span>
        </button>

      </div>

      {/* =========================================================================
          FEATURE ONE: CYCLONE INFORMATION
          ========================================================================= */}
      {activeTab === 'cyclone' && (
        <div className="space-y-4">
          
          {/* Status Indicator Card */}
          <div className={`p-5 sm:p-6 rounded-3xl border transition-all ${
            cycloneStatus === 'RED'
              ? 'bg-gradient-to-br from-red-600/15 via-rose-500/10 to-white dark:to-slate-900 border-red-500 shadow-md'
              : cycloneStatus === 'ORANGE'
              ? 'bg-gradient-to-br from-amber-500/15 via-yellow-500/10 to-white dark:to-slate-900 border-amber-500 shadow-md'
              : 'bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-white dark:to-slate-900 border-emerald-500/30 shadow-xs'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                  cycloneStatus === 'RED'
                    ? 'bg-red-600 text-white animate-pulse'
                    : cycloneStatus === 'ORANGE'
                    ? 'bg-amber-500 text-white'
                    : 'bg-emerald-500 text-white'
                }`}>
                  {cycloneStatus === 'GREEN' ? <ShieldCheck size={28} /> : <AlertTriangle size={28} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white ${
                      cycloneStatus === 'RED' ? 'bg-red-600' : cycloneStatus === 'ORANGE' ? 'bg-amber-600' : 'bg-emerald-600'
                    }`}>
                      {cycloneStatus === 'RED' ? 'RED: Severe Cyclone Warning' : cycloneStatus === 'ORANGE' ? 'ORANGE: Cyclone Alert / Caution' : 'GREEN: No Active Cyclone Warning'}
                    </span>
                    <span className="text-xs text-slate-400">Official Status</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-50 mt-1">
                    {cycloneIntel?.status_text || 'Monitoring Indian Coastal Waters'}
                  </h2>
                  <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mt-1 max-w-3xl">
                    {cycloneIntel?.official_warning || 'Coastal waters clear of tropical cyclone systems.'}
                  </p>
                </div>
              </div>

              {/* Mandatory Safety Rule */}
              <div className="p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs max-w-sm shrink-0">
                <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400 mb-1">
                  <Info size={14} />
                  <span>Important Maritime Safety Rule</span>
                </div>
                <p className="text-[11px] leading-tight">
                  {cycloneIntel?.disclaimer || 'Do not interpret the absence of a cyclone warning as confirmation that the sea is safe. Always verify local sea condition and wave period.'}
                </p>
              </div>
            </div>
          </div>

          {/* Active Storm Parameter Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Cyclone</div>
              <div className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 mt-1 truncate">
                {activeStorm?.name || 'None Active'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">{activeStorm?.category || 'No threat'}</div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Distance to Harbor</div>
              <div className="text-base sm:text-lg font-black text-sky-600 dark:text-sky-400 mt-1">
                {activeStorm ? `${activeStorm.distance_km} km` : 'Safe Range'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {activeStorm ? `(${activeStorm.distance_nm} Nautical Miles)` : currentPort.name}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Peak Sustained Wind</div>
              <div className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 mt-1">
                {activeStorm ? `${activeStorm.wind_speed_kt} kt` : 'Normal Winds'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {activeStorm ? `(${activeStorm.wind_speed_kmh} km/h)` : 'Under 15 kt'}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Movement & Landfall</div>
              <div className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 mt-1 truncate">
                {activeStorm?.movement_direction || 'Standard Drift'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5 truncate">
                {activeStorm?.expected_landfall || 'No landfall forecasted'}
              </div>
            </div>
          </div>

          {/* Interactive Cyclone Map */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-base">🗺️</span>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  Interactive Marine Cyclone Tracker Map
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                Centered at: {currentPort.name} ({currentPort.lat}°N, {currentPort.lng}°E)
              </span>
            </div>

            <div className="w-full h-[360px] sm:h-[420px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 relative z-0">
              <MapContainer
                center={[currentPort.lat, currentPort.lng]}
                zoom={6}
                scrollWheelZoom={false}
                style={{ width: '100%', height: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap contributors'
                />

                {/* Selected Harbor Marker */}
                <Marker position={[currentPort.lat, currentPort.lng]} icon={harborIcon}>
                  <Popup>
                    <div className="p-1 text-xs">
                      <strong>{currentPort.name}</strong>
                      <p className="text-[11px] text-slate-600 mt-0.5">Your Base Fishery Harbor</p>
                    </div>
                  </Popup>
                </Marker>

                {/* Other Coastal Harbors */}
                {availablePorts.filter(p => p.id !== selectedPortId).map(p => (
                  <Marker key={p.id} position={[p.lat, p.lng]} icon={harborIcon}>
                    <Popup>
                      <div className="p-1 text-xs">
                        <strong>{p.name}</strong>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* Active Storm Marker if present */}
                {activeStorm && activeStorm.latitude && activeStorm.longitude && (
                  <>
                    <Marker position={[activeStorm.latitude, activeStorm.longitude]} icon={stormIcon}>
                      <Popup>
                        <div className="p-1 text-xs">
                          <strong className="text-red-600">{activeStorm.name}</strong>
                          <p className="mt-0.5">Category: {activeStorm.category}</p>
                          <p>Winds: {activeStorm.wind_speed_kt} kt ({activeStorm.wind_speed_kmh} km/h)</p>
                          <p>Distance: {activeStorm.distance_km} km to harbor</p>
                        </div>
                      </Popup>
                    </Marker>

                    {/* Geodesic Distance Line */}
                    <Polyline
                      positions={[
                        [currentPort.lat, currentPort.lng],
                        [activeStorm.latitude, activeStorm.longitude]
                      ]}
                      color="#ef4444"
                      dashArray="4, 8"
                    />

                    {/* Warning Radius Circle */}
                    <Circle
                      center={[activeStorm.latitude, activeStorm.longitude]}
                      radius={250000} // 250km danger radius
                      pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.15 }}
                    />
                  </>
                )}
              </MapContainer>
            </div>
          </div>

          {/* AI Detection Insight Card from MongoDB */}
          {cycloneIntel?.ai_detection_insight && (
            <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Target size={18} className="text-sky-600 shrink-0" />
                <div>
                  <span className="font-bold text-sky-900 dark:text-sky-200">
                    Latest AI Satellite Scan Ingestion: {cycloneIntel.ai_detection_insight.name}
                  </span>
                  <p className="text-[11px] text-sky-700 dark:text-sky-400 mt-0.5">
                    Category: {cycloneIntel.ai_detection_insight.category} • Peak Intensity: {cycloneIntel.ai_detection_insight.wind_speed_kt} kt • Distance from selected harbor: {cycloneIntel.ai_detection_insight.distance_km} km
                  </p>
                </div>
              </div>
              <span className="px-2 py-1 rounded-md bg-white dark:bg-slate-800 text-[10px] font-bold text-sky-600 border border-sky-200 shrink-0">
                Verified AI Model
              </span>
            </div>
          )}

        </div>
      )}

      {/* =========================================================================
          FEATURE TWO: SEA INFORMATION (8 Marine Parameters & Douglas Scale)
          ========================================================================= */}
      {activeTab === 'sea' && (
        <div className="space-y-4">
          
          {/* Sea Status & Douglas Rating Card */}
          <div className={`p-5 sm:p-6 rounded-3xl border transition-all ${
            seaStatus === 'RED'
              ? 'bg-gradient-to-br from-red-600/15 via-rose-500/10 to-white dark:to-slate-900 border-red-500'
              : seaStatus === 'ORANGE'
              ? 'bg-gradient-to-br from-amber-500/15 via-yellow-500/10 to-white dark:to-slate-900 border-amber-500'
              : 'bg-gradient-to-br from-teal-500/15 via-emerald-500/10 to-white dark:to-slate-900 border-teal-500/30'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm ${
                  seaStatus === 'RED' ? 'bg-red-600' : seaStatus === 'ORANGE' ? 'bg-amber-500' : 'bg-teal-600'
                }`}>
                  <Waves size={26} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase text-white ${
                      seaStatus === 'RED' ? 'bg-red-600' : seaStatus === 'ORANGE' ? 'bg-amber-600' : 'bg-teal-600'
                    }`}>
                      {seaData?.sea_status || 'GREEN'}: {seaData?.sea_condition_text || 'Favourable'}
                    </span>
                    <span className="text-xs text-slate-400">Douglas Sea State</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-50 mt-1">
                    Marine Conditions at {currentPort.name}
                  </h2>
                  <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mt-1 max-w-2xl">
                    {seaData?.safety_advisory || 'Normal coastal wave height and tidal movements. Routine fishing operations permitted.'}
                  </p>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Data Source</div>
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Copernicus Marine / Open-Meteo</div>
              </div>
            </div>
          </div>

          {/* ALL 8 MARINE PARAMETERS IN CLEAR CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            
            {/* 1. Wave Height */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <span>1. Wave Height</span>
                <Waves size={14} className="text-teal-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {seaData?.parameters?.wave_height_m ?? 0.85} <span className="text-sm font-normal text-slate-400">m</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Significant wave height</div>
            </div>

            {/* 2. Wave Direction */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <span>2. Wave Direction</span>
                <Compass size={14} className="text-indigo-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {seaData?.parameters?.wave_direction_compass ?? 'SSW'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {seaData?.parameters?.wave_direction_deg ?? 202}° Swell vector
              </div>
            </div>

            {/* 3. Wave Period */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <span>3. Wave Period</span>
                <Clock size={14} className="text-sky-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {seaData?.parameters?.wave_period_seconds ?? 6.8} <span className="text-sm font-normal text-slate-400">s</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Peak swell period</div>
            </div>

            {/* 4. Wind Speed */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <span>4. Marine Wind Speed</span>
                <Wind size={14} className="text-blue-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {seaData?.parameters?.wind_speed_kt ?? 8.5} <span className="text-sm font-normal text-slate-400">kt</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                ({seaData?.parameters?.wind_speed_kmh ?? 15.7} km/h)
              </div>
            </div>

            {/* 5. Wind Direction */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <span>5. Wind Direction</span>
                <Navigation size={14} className="text-amber-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {seaData?.parameters?.wind_direction_compass ?? 'SW'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {seaData?.parameters?.wind_direction_deg ?? 210}° Bearing
              </div>
            </div>

            {/* 6. Sea Surface Temperature */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <span>6. Sea Surface Temp</span>
                <Thermometer size={14} className="text-rose-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {seaData?.parameters?.sea_surface_temperature_c ?? 29.2} <span className="text-sm font-normal text-slate-400">°C</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Coastal oceanic SST</div>
            </div>

            {/* 7. Ocean Current Speed */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <span>7. Ocean Current Speed</span>
                <Activity size={14} className="text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {seaData?.parameters?.ocean_current_speed_ms ?? 0.38} <span className="text-sm font-normal text-slate-400">m/s</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                ({seaData?.parameters?.ocean_current_speed_kmh ?? 1.37} km/h)
              </div>
            </div>

            {/* 8. Ocean Current Direction */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <span>8. Ocean Current Dir</span>
                <Compass size={14} className="text-purple-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {seaData?.parameters?.ocean_current_direction_compass ?? 'N'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {seaData?.parameters?.ocean_current_direction_deg ?? 0}° Eulerian drift
              </div>
            </div>

          </div>

          {/* 24-Hour Wave Height & Ocean Current Chart */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  24-Hour Wave Height & Current Speed Trends
                </h3>
                <p className="text-xs text-slate-400">Hourly sea progression for coastal vessels</p>
              </div>
              <div className="flex items-center gap-3 text-xs font-bold">
                <span className="flex items-center gap-1 text-teal-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                  <span>Wave Height (m)</span>
                </span>
                <span className="flex items-center gap-1 text-sky-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                  <span>Current Speed (km/h)</span>
                </span>
              </div>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={seaData?.hourly_trends_24h || []}>
                  <defs>
                    <linearGradient id="waveGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="currentGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="wave_height_m" stroke="#0d9488" strokeWidth={2} fillOpacity={1} fill="url(#waveGradient)" name="Wave Height (m)" />
                  <Area type="monotone" dataKey="current_speed_kmh" stroke="#0284c7" strokeWidth={2} fillOpacity={1} fill="url(#currentGradient)" name="Current Speed (km/h)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* =========================================================================
          FEATURE THREE: WEATHER INFORMATION
          ========================================================================= */}
      {activeTab === 'weather' && (
        <div className="space-y-4">
          
          {/* Current Weather Card */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-blue-600/10 via-sky-500/5 to-white dark:to-slate-900 border border-blue-500/20 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-sm">
                  {getWmoIcon(weatherData?.current?.weather_code ?? 0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/15 text-blue-700 dark:text-blue-300">
                      Live Coastal Weather
                    </span>
                    <span className="text-xs text-slate-400">{currentPort.name}</span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-slate-50">
                      {weatherData?.current?.temperature_c ?? 29.4}°C
                    </span>
                    <span className="text-xs text-slate-500">
                      Feels like {weatherData?.current?.feels_like_c ?? 32.5}°C
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                    {getWmoLabel(weatherData?.current?.weather_code ?? 0)}
                  </p>
                </div>
              </div>

              {/* Weather parameters bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Humidity</div>
                  <div className="font-bold text-slate-800 dark:text-slate-100">{weatherData?.current?.relative_humidity ?? 78}%</div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Wind Gusts</div>
                  <div className="font-bold text-slate-800 dark:text-slate-100">{weatherData?.current?.wind_gusts_kmh ?? 28} km/h</div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Pressure</div>
                  <div className="font-bold text-slate-800 dark:text-slate-100">{weatherData?.current?.surface_pressure_hpa ?? 1012} hPa</div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Rainfall</div>
                  <div className="font-bold text-slate-800 dark:text-slate-100">{weatherData?.current?.precipitation_mm ?? 0.0} mm</div>
                </div>
              </div>
            </div>
          </div>

          {/* 24-Hour Temperature & Rainfall Forecast Chart */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  24-Hour Hourly Forecast (Temperature & Rain Probability)
                </h3>
                <p className="text-xs text-slate-400">Hourly weather projection</p>
              </div>
              <div className="flex items-center gap-3 text-xs font-bold">
                <span className="flex items-center gap-1 text-amber-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Temp (°C)</span>
                </span>
                <span className="flex items-center gap-1 text-blue-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span>Rain Chance (%)</span>
                </span>
              </div>
            </div>

            <div className="h-60 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weatherData?.hourly_forecast || []}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="temp_c" stroke="#f59e0b" strokeWidth={2} fill="#f59e0b" fillOpacity={0.15} name="Temperature (°C)" />
                  <Area type="monotone" dataKey="rain_prob" stroke="#3b82f6" strokeWidth={2} fill="#3b82f6" fillOpacity={0.15} name="Rain Probability (%)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 7-Day Multi-Day Forecast Grid */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-sky-500" />
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                7-Day Multi-Day Coastal Forecast
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-7 gap-2.5">
              {(weatherData?.daily_forecast || []).map((day, idx) => (
                <div 
                  key={idx}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex flex-col items-center text-center text-xs"
                >
                  <span className="font-bold text-slate-900 dark:text-slate-100">{day.day}</span>
                  <span className="text-[10px] text-slate-400 mb-2">{day.date}</span>
                  <div className="my-1">{getWmoIcon(day.weather_code)}</div>
                  <div className="font-black text-slate-800 dark:text-slate-200 mt-1">
                    {day.temp_max}° <span className="text-[11px] font-normal text-slate-400">{day.temp_min}°</span>
                  </div>
                  <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mt-1">
                    💧 {day.rain_chance}%
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    💨 {day.wind_max_kt} kt
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 text-right text-[11px] text-slate-400">
              Source: {weatherData?.official_source || 'IMD Regional Meteorological Center & Open-Meteo'}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

export default FishermanHome;
