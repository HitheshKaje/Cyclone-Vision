import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Info,
  Navigation,
  Fish,
  Ban,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, Polygon } from 'react-leaflet';
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
  fetchWeatherTelemetry,
  fetchPotentialFishingZones,
  fetchFishingBansAdvisory
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

// IMD Observed Track Point Icon
const obsTrackIcon = new L.divIcon({
  html: `<div style="background-color: #2563eb; width: 10px; height: 10px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 6px rgba(37,99,235,0.9);"></div>`,
  className: 'custom-obs-marker',
  iconSize: [10, 10],
  iconAnchor: [5, 5]
});

// IMD Forecast Track Point Icon
const fcTrackIcon = new L.divIcon({
  html: `<div style="background-color: #ea580c; width: 10px; height: 10px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 6px rgba(234,88,12,0.9);"></div>`,
  className: 'custom-fc-marker',
  iconSize: [10, 10],
  iconAnchor: [5, 5]
});

// PFZ Hotspot Icons
const pfzHighIcon = new L.divIcon({
  html: `<div style="background-color: #059669; width: 26px; height: 26px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(5,150,105,0.9); display: flex; align-items: center; justify-content: center; color: white; font-size: 13px;">🐟</div>`,
  className: 'custom-pfz-high',
  iconSize: [26, 26],
  iconAnchor: [13, 13]
});

const pfzModIcon = new L.divIcon({
  html: `<div style="background-color: #0284c7; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 8px rgba(2,132,199,0.8); display: flex; align-items: center; justify-content: center; color: white; font-size: 12px;">🐟</div>`,
  className: 'custom-pfz-mod',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const pfzLowIcon = new L.divIcon({
  html: `<div style="background-color: #64748b; width: 22px; height: 22px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 6px rgba(100,116,139,0.7); display: flex; align-items: center; justify-content: center; color: white; font-size: 11px;">🐟</div>`,
  className: 'custom-pfz-low',
  iconSize: [22, 22],
  iconAnchor: [11, 11]
});

// Helper to parse GeoJSON Polygon/MultiPolygon to Leaflet positions [[lat, lng], ...]
const parseGeoJsonToLeafletPositions = (geom) => {
  if (!geom || !geom.coordinates) return [];
  const coords = geom.coordinates;
  const result = [];
  try {
    if (geom.type === 'MultiPolygon') {
      coords.forEach(poly => {
        poly.forEach(ring => {
          const ringPositions = ring
            .map(pt => [parseFloat(pt[1]), parseFloat(pt[0])])
            .filter(p => !isNaN(p[0]) && !isNaN(p[1]));
          if (ringPositions.length >= 3) {
            result.push(ringPositions);
          }
        });
      });
    } else if (geom.type === 'Polygon') {
      coords.forEach(ring => {
        const ringPositions = ring
          .map(pt => [parseFloat(pt[1]), parseFloat(pt[0])])
          .filter(p => !isNaN(p[0]) && !isNaN(p[1]));
        if (ringPositions.length >= 3) {
          result.push(ringPositions);
        }
      });
    }
  } catch (err) {
    console.warn('[parseGeoJsonToLeafletPositions error]:', err);
  }
  return result;
};

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
  if (code === 1) return 'Mainly Clear';
  if (code === 2) return 'Partly Cloudy';
  if (code === 3) return 'Overcast';
  if (code >= 51 && code <= 55) return 'Light Drizzle';
  if (code >= 61 && code <= 65) return 'Rain Showers';
  if (code >= 80 && code <= 82) return 'Squally Marine Rain';
  if (code >= 95) return 'Severe Thunderstorm';
  return 'Fair Coastal Weather';
};

// Safe Error Boundary
class FishermanErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[FishermanErrorBoundary Caught Error]:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-3xl bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-sm">
          <div className="flex items-center gap-2 font-black text-base text-rose-700 mb-1">
            <AlertCircle size={20} />
            <span>Fisherman Portal Display Recovery</span>
          </div>
          <p className="text-xs text-rose-600 dark:text-rose-300 mb-3">
            An issue occurred while rendering marine components: {this.state.error?.message || 'Unexpected display error'}.
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-rose-700 transition-all cursor-pointer shadow-sm"
          >
            Reload Dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const FishermanDashboardContent = ({ onNavigate }) => {
  const { i18n } = useTranslation();
  const { isOnline, isBackendReachable } = useNetworkStatus();

  // Current logged in fisherman user
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const raw = localStorage.getItem('cyclosafe_current_citizen_user');
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  });

  // Coastal port selection
  const [selectedPortId, setSelectedPortId] = useState(() => {
    try {
      const savedUser = JSON.parse(localStorage.getItem('cyclosafe_current_citizen_user'));
      if (savedUser?.port) {
        const p = savedUser.port.toLowerCase();
        if (p.includes('malpe')) return 'malpe';
        if (p.includes('mangalore')) return 'mangalore';
        if (p.includes('karwar')) return 'karwar';
        if (p.includes('gangolli')) return 'gangolli';
        if (p.includes('honnavar')) return 'honnavar';
        if (p.includes('tadadi')) return 'tadadi';
        if (p.includes('bhatkal')) return 'bhatkal';
        if (p.includes('chennai')) return 'chennai';
        if (p.includes('visakhapatnam')) return 'visakhapatnam';
        if (p.includes('paradip')) return 'paradip';
      }
    } catch (_) {}
    return 'malpe';
  });

  // Navigation Tabs: 'cyclone' | 'sea' | 'pfz' | 'bans' | 'weather'
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
  const [pfzData, setPfzData] = useState(null);
  const [bansData, setBansData] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isImdDemoActive, setIsImdDemoActive] = useState(false);

  // Dynamic Siren and Real-time Broadcast State from Admin
  const [adminBroadcast, setAdminBroadcast] = useState(null);
  const [isSirenSounding, setIsSirenSounding] = useState(false);

  // Load All Telemetry Services
  const loadDashboardData = useCallback(async (portId, demoImd = isImdDemoActive) => {
    setIsRefreshing(true);
    try {
      const [cycRes, seaRes, pfzRes, bansRes, wRes] = await Promise.allSettled([
        fetchCycloneIntel(portId, null, null, demoImd),
        fetchSeaConditions(portId),
        fetchPotentialFishingZones(portId),
        fetchFishingBansAdvisory(portId),
        fetchWeatherTelemetry(portId)
      ]);

      if (cycRes.status === 'fulfilled' && cycRes.value.success) {
        setCycloneIntel(cycRes.value.data);
      }
      if (seaRes.status === 'fulfilled' && seaRes.value.success) {
        setSeaData(seaRes.value.data);
      }
      if (pfzRes.status === 'fulfilled' && pfzRes.value.success) {
        setPfzData(pfzRes.value.data);
      }
      if (bansRes.status === 'fulfilled' && bansRes.value.success) {
        setBansData(bansRes.value.data);
      }
      if (wRes.status === 'fulfilled' && wRes.value.success) {
        setWeatherData(wRes.value.data);
      }
      setLastUpdated(new Date());
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isImdDemoActive]);

  const toggleImdDemo = () => {
    const nextState = !isImdDemoActive;
    setIsImdDemoActive(nextState);
    loadDashboardData(selectedPortId, nextState);
  };

  // Load on mount and when port changes
  useEffect(() => {
    loadDashboardData(selectedPortId, isImdDemoActive);
  }, [selectedPortId, loadDashboardData, isImdDemoActive]);

  const lastAlertSignatureRef = useRef(null);

  // Real-Time Admin Broadcast Poller (every 2s for instant siren & storm synchronization)
  useEffect(() => {
    let isMounted = true;
    const pollBroadcast = async () => {
      try {
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

          // Build signature of active state and cyclone details
          const signature = res.data.active 
            ? `${res.data.active}_${res.data.siren_active}_${res.data.cyclone_name}_${res.data.coordinates?.lat}_${res.data.coordinates?.lng}_${res.data.level}_${res.data.wind_speed_kt}`
            : `INACTIVE_${res.data.siren_active}`;

          if (lastAlertSignatureRef.current !== signature) {
            lastAlertSignatureRef.current = signature;
            // Instantly refresh cyclone intel from backend so the map, cards, and coordinates update live!
            const cycRes = await fetchCycloneIntel(selectedPortId, null, null, isImdDemoActive);
            if (isMounted && cycRes.success && cycRes.data) {
              setCycloneIntel(cycRes.data);
            }
          }
        }
      } catch (err) {
        console.warn('[Fisherman poller error]:', err);
      }
    };

    pollBroadcast();
    const interval = setInterval(pollBroadcast, 2000);
    return () => {
      isMounted = false;
      clearInterval(interval);
      sirenService.stopSiren();
    };
  }, [selectedPortId, isImdDemoActive]);

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
  const activeStorm = cycloneIntel?.active_cyclone;
  const cycloneStatus = cycloneIntel?.status_indicator || 'GREEN';
  const seaStatus = seaData?.sea_status || 'GREEN';

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
          ========================================================================= */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Identity & Vessel Info */}
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
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
                  Cyclo<span className="text-sky-500">Safe</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30">
                  ⚓ FISHERMAN DASHBOARD
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                Welcome aboard, <strong className="text-slate-900 dark:text-slate-100">{currentUser?.name || 'Fisherman'}</strong>
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                <span className="flex items-center gap-1 font-semibold text-sky-600 dark:text-sky-400">
                  <Ship size={13} />
                  <span>Vessel: {currentUser?.vessel_name || 'Sea Falcon'}</span>
                </span>
                <span>•</span>
                <span>Reg: <strong className="text-slate-700 dark:text-slate-300">{currentUser?.vessel_reg || 'IND-KA-02-MM-1029'}</strong></span>
              </div>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            
            {/* Coastal Harbor Selector */}
            <div className="relative">
              <label htmlFor="port-select" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                Selected Coastal Port
              </label>
              <div className="relative flex items-center">
                <MapPin size={14} className="absolute left-2.5 text-sky-500 pointer-events-none" />
                <select
                  id="port-select"
                  value={selectedPortId}
                  onChange={(e) => setSelectedPortId(e.target.value)}
                  className="pl-8 pr-7 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-sky-500 shadow-xs"
                >
                  {availablePorts.map((port) => (
                    <option key={port.id} value={port.id}>
                      {port.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Live Clock (IST) */}
            <div className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col items-end shrink-0">
              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                <Clock size={11} className="text-sky-500" />
                <span>IST Time</span>
              </div>
              <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              <div className="text-[10px] text-slate-500">
                {currentTime.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
              </div>
            </div>

            {/* Notification Bell */}
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
          MAIN NAVIGATION TABS:
          1. 🌪️ Cyclone Information
          2. 🌊 Sea Information
          3. 🐟 Potential Fishing Zones (PFZ)
          4. 🐠 Breeding & Fishing Bans
          5. 🌤️ Weather Information
          ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        
        {/* Tab 1: Cyclone Information */}
        <button
          type="button"
          onClick={() => setActiveTab('cyclone')}
          className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
            activeTab === 'cyclone'
              ? 'border-sky-500 bg-gradient-to-br from-sky-500/10 via-sky-500/5 to-white dark:to-slate-900 shadow-md ring-2 ring-sky-500/30'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform ${
              activeTab === 'cyclone' ? 'bg-sky-600 text-white scale-105' : 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
            }`}>
              <span className="text-lg">🌪️</span>
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
                Cyclone Intel
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Storm track & winds
              </p>
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
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
          className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
            activeTab === 'sea'
              ? 'border-teal-500 bg-gradient-to-br from-teal-500/10 via-teal-500/5 to-white dark:to-slate-900 shadow-md ring-2 ring-teal-500/30'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform ${
              activeTab === 'sea' ? 'bg-teal-600 text-white scale-105' : 'bg-teal-500/15 text-teal-600 dark:text-teal-400'
            }`}>
              <span className="text-lg">🌊</span>
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
                Sea Condition
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Waves, SST & currents
              </p>
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
            seaStatus === 'RED'
              ? 'bg-red-500 text-white'
              : seaStatus === 'ORANGE'
              ? 'bg-amber-500 text-white'
              : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
          }`}>
            {seaStatus}
          </span>
        </button>

        {/* Tab 3: Potential Fishing Zones (PFZ) */}
        <button
          type="button"
          onClick={() => setActiveTab('pfz')}
          className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
            activeTab === 'pfz'
              ? 'border-emerald-500 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-white dark:to-slate-900 shadow-md ring-2 ring-emerald-500/30'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform ${
              activeTab === 'pfz' ? 'bg-emerald-600 text-white scale-105' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            }`}>
              <span className="text-lg">🐟</span>
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
                Fishing Zones
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Chlorophyll & PFZ maps
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
            {pfzData?.zones ? `${pfzData.zones.length} Zones` : 'PFZ Live'}
          </span>
        </button>

        {/* Tab 4: Breeding & Fishing Bans */}
        <button
          type="button"
          onClick={() => setActiveTab('bans')}
          className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
            activeTab === 'bans'
              ? 'border-purple-500 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-white dark:to-slate-900 shadow-md ring-2 ring-purple-500/30'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform ${
              activeTab === 'bans' ? 'bg-purple-600 text-white scale-105' : 'bg-purple-500/15 text-purple-600 dark:text-purple-400'
            }`}>
              <span className="text-lg">🐠</span>
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
                Breeding & Bans
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Seasonal regulations
              </p>
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
            bansData?.is_ban_active ? 'bg-red-500 text-white' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
          }`}>
            {bansData?.is_ban_active ? 'Banned' : 'Open'}
          </span>
        </button>

        {/* Tab 5: Weather Information */}
        <button
          type="button"
          onClick={() => setActiveTab('weather')}
          className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
            activeTab === 'weather'
              ? 'border-blue-500 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-white dark:to-slate-900 shadow-md ring-2 ring-blue-500/30'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform ${
              activeTab === 'weather' ? 'bg-blue-600 text-white scale-105' : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
            }`}>
              <span className="text-lg">🌤️</span>
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
                Weather Intel
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Temp, rain & 7-day
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-500/15 text-blue-700 dark:text-blue-300">
            {weatherData?.current ? `${weatherData.current.temperature_c}°C` : 'Live'}
          </span>
        </button>

      </div>

      {/* =========================================================================
          TAB 1: CYCLONE INFORMATION
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

          {/* Interactive Cyclone Tracker Map */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-base">🗺️</span>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  Interactive Marine Cyclone Tracker Map
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleImdDemo}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                    isImdDemoActive 
                      ? 'bg-sky-600 text-white border-sky-600 shadow-xs' 
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                  }`}
                  title="Toggle Official IMD Track, Cone of Uncertainty, and Wind Warning contours"
                >
                  <span>📡 {isImdDemoActive ? 'IMD Official Track: Active' : 'Show IMD Track & Cone'}</span>
                </button>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  Base: {currentPort.name}
                </span>
              </div>
            </div>

            <div className="w-full h-[380px] sm:h-[440px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 relative z-0">
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

                {/* IMD Cone of Uncertainty (COU) Polygon */}
                {activeStorm?.cone_of_uncertainty?.coordinates && (
                  <Polygon
                    positions={activeStorm.cone_of_uncertainty.coordinates.map(pt => [pt[1], pt[0]])}
                    pathOptions={{ color: '#f59e0b', fillColor: '#fbbf24', fillOpacity: 0.22, dashArray: '5, 5', weight: 2 }}
                  />
                )}

                {/* IMD Wind Warning MultiPolygons (Official GeoJSON from https://api.imd.gov.in/api/v1/cyclone_wind) */}
                {activeStorm?.wind_warning && (
                  <>
                    {activeStorm.wind_warning['27kt'] && parseGeoJsonToLeafletPositions(activeStorm.wind_warning['27kt']).map((positions, idx) => (
                      <Polygon
                        key={`imd-wind-27kt-${idx}`}
                        positions={positions}
                        pathOptions={{ color: '#f59e0b', fillColor: '#fbbf24', fillOpacity: 0.16, weight: 1.5 }}
                      >
                        <Popup>
                          <div className="p-1 text-xs">
                            <strong className="text-amber-600">IMD 27 kt (50 km/h) Wind Warning</strong>
                            <p className="text-[11px] text-slate-600">Moderate gale force area. Small crafts stay in port.</p>
                          </div>
                        </Popup>
                      </Polygon>
                    ))}
                    {activeStorm.wind_warning['34kt'] && parseGeoJsonToLeafletPositions(activeStorm.wind_warning['34kt']).map((positions, idx) => (
                      <Polygon
                        key={`imd-wind-34kt-${idx}`}
                        positions={positions}
                        pathOptions={{ color: '#ea580c', fillColor: '#f97316', fillOpacity: 0.20, weight: 1.5 }}
                      >
                        <Popup>
                          <div className="p-1 text-xs">
                            <strong className="text-orange-600">IMD 34 kt (63 km/h) Gale Warning</strong>
                            <p className="text-[11px] text-slate-600">Gale force winds. Fishermen strictly prohibited.</p>
                          </div>
                        </Popup>
                      </Polygon>
                    ))}
                    {activeStorm.wind_warning['50kt'] && parseGeoJsonToLeafletPositions(activeStorm.wind_warning['50kt']).map((positions, idx) => (
                      <Polygon
                        key={`imd-wind-50kt-${idx}`}
                        positions={positions}
                        pathOptions={{ color: '#e11d48', fillColor: '#f43f5e', fillOpacity: 0.25, weight: 2 }}
                      >
                        <Popup>
                          <div className="p-1 text-xs">
                            <strong className="text-rose-600">IMD 50 kt (93 km/h) Storm Force Zone</strong>
                            <p className="text-[11px] text-slate-600">Violent storm conditions. Severe damage risk to vessels.</p>
                          </div>
                        </Popup>
                      </Polygon>
                    ))}
                    {activeStorm.wind_warning['64kt'] && parseGeoJsonToLeafletPositions(activeStorm.wind_warning['64kt']).map((positions, idx) => (
                      <Polygon
                        key={`imd-wind-64kt-${idx}`}
                        positions={positions}
                        pathOptions={{ color: '#dc2626', fillColor: '#b91c1c', fillOpacity: 0.30, weight: 2 }}
                      >
                        <Popup>
                          <div className="p-1 text-xs">
                            <strong className="text-red-700">IMD 64 kt (118 km/h) Hurricane Core</strong>
                            <p className="text-[11px] text-slate-600">Hurricane force eyewall. Phenomenal seas.</p>
                          </div>
                        </Popup>
                      </Polygon>
                    ))}
                  </>
                )}

                {/* IMD Wind Warning Radii (concentric circles) */}
                {activeStorm?.wind_warning_radii && (
                  <>
                    {activeStorm.wind_warning_radii['27kt'] && (
                      <Circle
                        center={[activeStorm.latitude, activeStorm.longitude]}
                        radius={activeStorm.wind_warning_radii['27kt'] * 1000}
                        pathOptions={{ color: '#f59e0b', fillColor: '#fbbf24', fillOpacity: 0.07, weight: 1.5 }}
                      />
                    )}
                    {activeStorm.wind_warning_radii['34kt'] && (
                      <Circle
                        center={[activeStorm.latitude, activeStorm.longitude]}
                        radius={activeStorm.wind_warning_radii['34kt'] * 1000}
                        pathOptions={{ color: '#f97316', fillColor: '#ea580c', fillOpacity: 0.09, weight: 1.5 }}
                      />
                    )}
                    {activeStorm.wind_warning_radii['50kt'] && (
                      <Circle
                        center={[activeStorm.latitude, activeStorm.longitude]}
                        radius={activeStorm.wind_warning_radii['50kt'] * 1000}
                        pathOptions={{ color: '#e11d48', fillColor: '#e11d48', fillOpacity: 0.12, weight: 1.5 }}
                      />
                    )}
                    {activeStorm.wind_warning_radii['64kt'] && (
                      <Circle
                        center={[activeStorm.latitude, activeStorm.longitude]}
                        radius={activeStorm.wind_warning_radii['64kt'] * 1000}
                        pathOptions={{ color: '#dc2626', fillColor: '#dc2626', fillOpacity: 0.18, weight: 2 }}
                      />
                    )}
                  </>
                )}

                {/* Observed Track Polyline & Observation Points */}
                {Array.isArray(activeStorm?.observed_track) && activeStorm.observed_track.length > 0 && (
                  <>
                    <Polyline
                      positions={activeStorm.observed_track
                        .map(pt => {
                          const lat = parseFloat(pt.lat ?? pt.latitude);
                          const lon = parseFloat(pt.lon ?? pt.longitude ?? pt.lng);
                          return (!isNaN(lat) && !isNaN(lon)) ? [lat, lon] : null;
                        })
                        .filter(Boolean)
                      }
                      pathOptions={{ color: '#2563eb', weight: 3 }}
                    />
                    {activeStorm.observed_track.map((pt, idx) => {
                      const lat = parseFloat(pt.lat ?? pt.latitude);
                      const lon = parseFloat(pt.lon ?? pt.longitude ?? pt.lng);
                      if (isNaN(lat) || isNaN(lon)) return null;
                      return (
                        <Marker
                          key={`obs-${idx}`}
                          position={[lat, lon]}
                          icon={obsTrackIcon}
                        >
                          <Popup>
                            <div className="p-1 text-xs">
                              <strong className="text-blue-600">Observed: {pt.CYCLONE_NAME || activeStorm.name}</strong>
                              <p>Time: {pt['Date/Time'] || pt.Hour || pt.arrival_time}</p>
                              <p>Category: {pt.Category || pt.stage || activeStorm.category}</p>
                              <p>Sustained Wind: {pt['MSW (kt)'] || pt.msw_kt || activeStorm.wind_speed_kt} kt ({pt['Mean MSW (kmph)'] || pt.msw_kmh || activeStorm.wind_speed_kmh} km/h)</p>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}
                  </>
                )}

                {/* Forecast Track Polyline & Forecast Points */}
                {Array.isArray(activeStorm?.forecast_track) && activeStorm.forecast_track.length > 0 && (
                  <>
                    <Polyline
                      positions={activeStorm.forecast_track
                        .map(pt => {
                          const lat = parseFloat(pt.lat ?? pt.latitude);
                          const lon = parseFloat(pt.lon ?? pt.longitude ?? pt.lng);
                          return (!isNaN(lat) && !isNaN(lon)) ? [lat, lon] : null;
                        })
                        .filter(Boolean)
                      }
                      pathOptions={{ color: '#ea580c', weight: 3, dashArray: '6, 6' }}
                    />
                    {activeStorm.forecast_track.map((pt, idx) => {
                      const lat = parseFloat(pt.lat ?? pt.latitude);
                      const lon = parseFloat(pt.lon ?? pt.longitude ?? pt.lng);
                      if (isNaN(lat) || isNaN(lon)) return null;
                      return (
                        <Marker
                          key={`fc-${idx}`}
                          position={[lat, lon]}
                          icon={fcTrackIcon}
                        >
                          <Popup>
                            <div className="p-1 text-xs">
                              <strong className="text-orange-600">Forecast (+{pt.horizon_hours ? `${pt.horizon_hours}h` : pt.Hour}): {pt.CYCLONE_NAME || activeStorm.name}</strong>
                              <p>Projected: {pt['Date/Time'] || (pt.arrival_time ? new Date(pt.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : `${pt.horizon_hours || pt.Hour}h`)}</p>
                              <p>Category: {pt.Category || pt.stage || 'Projected Severe Cyclone'}</p>
                              <p>Projected Wind: {pt['MSW (kt)'] || pt.msw_kt || activeStorm.wind_speed_kt} kt ({pt['Mean MSW (kmph)'] || pt.msw_kmh || activeStorm.wind_speed_kmh} km/h)</p>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}
                  </>
                )}

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

                    {/* Default Danger Radius Circle */}
                    {!activeStorm?.wind_warning_radii && (
                      <Circle
                        center={[activeStorm.latitude, activeStorm.longitude]}
                        radius={250000}
                        pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.15 }}
                      />
                    )}
                  </>
                )}
              </MapContainer>
            </div>

            {/* Map Layer Legend */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-600 inline-block" /> Base Port
                </span>
                <span className="flex items-center gap-1 font-semibold text-blue-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> IMD Observed Track
                </span>
                <span className="flex items-center gap-1 font-semibold text-orange-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-600 inline-block" /> IMD Forecast Track
                </span>
                <span className="flex items-center gap-1 font-semibold text-amber-600">
                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-400 inline-block" /> Cone of Uncertainty
                </span>
                <span className="flex items-center gap-1 font-semibold text-red-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" /> Gale Wind Field (64 kt)
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                Source: {activeStorm?.source || 'IMD Official / Regional Meteorological Center'}
              </span>
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
          TAB 2: SEA INFORMATION (8 Marine Parameters & Douglas Scale)
          ========================================================================= */}
      {activeTab === 'sea' && (
        <div className="space-y-4">
          
          {/* Sea Status & Douglas Rating Card */}
          <div className={`p-5 sm:p-6 rounded-3xl border transition-all ${
            seaStatus === 'RED'
              ? 'bg-gradient-to-br from-red-600/15 via-rose-500/10 to-white dark:to-slate-900 border-red-500 shadow-md'
              : seaStatus === 'ORANGE'
              ? 'bg-gradient-to-br from-amber-500/15 via-yellow-500/10 to-white dark:to-slate-900 border-amber-500 shadow-md'
              : 'bg-gradient-to-br from-teal-500/15 via-emerald-500/10 to-white dark:to-slate-900 border-teal-500/30 shadow-xs'
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
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Copernicus Marine / INCOIS</div>
              </div>
            </div>
          </div>

          {/* ALL 8 MARINE PARAMETERS (Slide 3) */}
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

            {/* 2. Marine Wind Speed */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <span>2. Wind Speed</span>
                <Wind size={14} className="text-blue-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {seaData?.parameters?.wind_speed_kmh ?? 15.7} <span className="text-sm font-normal text-slate-400">km/h</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                ({seaData?.parameters?.wind_speed_kt ?? 8.5} knots)
              </div>
            </div>

            {/* 3. Wind Direction */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <span>3. Wind Direction</span>
                <Navigation size={14} className="text-amber-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {seaData?.parameters?.wind_direction_compass ?? 'SW'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {seaData?.parameters?.wind_direction_deg ?? 210}° Bearing
              </div>
            </div>

            {/* 4. Sea Surface Temperature */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <span>4. Sea Temperature</span>
                <Thermometer size={14} className="text-rose-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {seaData?.parameters?.sea_surface_temperature_c ?? 29.2} <span className="text-sm font-normal text-slate-400">°C</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Coastal oceanic SST</div>
            </div>

            {/* 5. Wave Period */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <span>5. Wave Period</span>
                <Clock size={14} className="text-sky-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {seaData?.parameters?.wave_period_seconds ?? 6.8} <span className="text-sm font-normal text-slate-400">s</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Time between wave crests</div>
            </div>

            {/* 6. Ocean Currents */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <span>6. Ocean Currents</span>
                <Compass size={14} className="text-purple-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {seaData?.parameters?.ocean_current_speed_kmh ?? 1.37} <span className="text-sm font-normal text-slate-400">km/h</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Heading {seaData?.parameters?.ocean_current_direction_compass ?? 'N'} ({seaData?.parameters?.ocean_current_speed_ms ?? 0.38} m/s)
              </div>
            </div>

            {/* 7. Expected Rainfall */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <span>7. Rainfall</span>
                <CloudRain size={14} className="text-blue-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {seaData?.parameters?.rainfall_mm ?? 0.0} <span className="text-sm font-normal text-slate-400">mm</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Expected coastal rainfall</div>
            </div>

            {/* 8. Visibility Conditions */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <span>8. Visibility</span>
                <Eye size={14} className="text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {seaData?.parameters?.visibility_km ?? 10.0} <span className="text-sm font-normal text-slate-400">km</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {seaData?.parameters?.visibility_condition ?? 'Good Visibility (>10 km)'}
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
          TAB 3: POTENTIAL FISHING ZONES (PFZ) (Slide 4)
          ========================================================================= */}
      {activeTab === 'pfz' && (
        <div className="space-y-4">
          
          {/* Header & ML Science Card */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-emerald-600/15 via-teal-500/10 to-white dark:to-slate-900 border border-emerald-500/30 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Fish size={26} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-600 text-white">
                      Satellite Oceanic Convergence Analysis
                    </span>
                    <span className="text-xs text-slate-400">ML PFZ Model</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-50 mt-1">
                    Potential Fishing Zones for {currentPort.name}
                  </h2>
                  <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mt-1 max-w-2xl">
                    Satellite Chlorophyll-a concentration and Sea Surface Temperature (SST) thermal front mapping to identify high-density pelagic feeding zones.
                  </p>
                </div>
              </div>

              {/* Crucial Disclaimer from Slide 4 */}
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs max-w-xs shrink-0">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <Info size={14} className="text-amber-600 shrink-0" />
                  <span>Important Note</span>
                </div>
                <p className="text-[11px] leading-tight">
                  {pfzData?.disclaimer || 'Remember: These are estimates based on satellite Chlorophyll-a and SST ocean fronts, not guaranteed fish locations.'}
                </p>
              </div>
            </div>
          </div>

          {/* PFZ Interactive Leaflet Map */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-base">🗺️</span>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  Potential Fishing Zones & Thermal Fronts Map
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                Showing Zone A, Zone B & Zone C off {currentPort.name}
              </span>
            </div>

            <div className="w-full h-[360px] sm:h-[400px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 relative z-0">
              <MapContainer
                center={[currentPort.lat, currentPort.lng]}
                zoom={9}
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
                      <p className="text-[11px] text-slate-600 mt-0.5">Base Harbor Departure Point</p>
                    </div>
                  </Popup>
                </Marker>

                {/* PFZ Zone Markers */}
                {(pfzData?.zones || []).map((zone) => {
                  const icon = zone.fishing_potential === 'High' ? pfzHighIcon : zone.fishing_potential === 'Moderate' ? pfzModIcon : pfzLowIcon;
                  const color = zone.fishing_potential === 'High' ? '#059669' : zone.fishing_potential === 'Moderate' ? '#0284c7' : '#64748b';
                  return (
                    <React.Fragment key={zone.zone_id}>
                      <Marker position={[zone.latitude, zone.longitude]} icon={icon}>
                        <Popup>
                          <div className="p-1.5 text-xs max-w-xs">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="font-black text-slate-900">{zone.zone_id}: {zone.name}</span>
                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-black text-white ${
                                zone.fishing_potential === 'High' ? 'bg-emerald-600' : zone.fishing_potential === 'Moderate' ? 'bg-sky-600' : 'bg-slate-500'
                              }`}>
                                {zone.fishing_potential}
                              </span>
                            </div>
                            <p><strong>Distance:</strong> {zone.distance_km} km ({zone.distance_nm} NM) • {zone.bearing}</p>
                            <p><strong>Chlorophyll-a:</strong> {zone.chlorophyll_concentration_mg_m3} mg/m³</p>
                            <p><strong>SST:</strong> {zone.sea_surface_temperature_c} °C</p>
                            <p><strong>Currents:</strong> {zone.ocean_current_speed_kmh} km/h ({zone.ocean_current_direction})</p>
                            <p className="mt-1 text-[11px] text-slate-600"><strong>Target:</strong> {zone.target_species.join(', ')}</p>
                          </div>
                        </Popup>
                      </Marker>

                      {/* Vector Polyline to Harbor */}
                      <Polyline
                        positions={[
                          [currentPort.lat, currentPort.lng],
                          [zone.latitude, zone.longitude]
                        ]}
                        color={color}
                        dashArray="3, 6"
                        weight={2}
                      />

                      {/* Convergence radius circle */}
                      <Circle
                        center={[zone.latitude, zone.longitude]}
                        radius={zone.fishing_potential === 'High' ? 6000 : 4000}
                        pathOptions={{ color: color, fillColor: color, fillOpacity: 0.15 }}
                      />
                    </React.Fragment>
                  );
                })}
              </MapContainer>
            </div>

            {/* Map Legend */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" /> Zone A (High Potential)
                </span>
                <span className="flex items-center gap-1 font-semibold text-sky-700 dark:text-sky-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-600 inline-block" /> Zone B (Moderate Potential)
                </span>
                <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block" /> Zone C (Low Potential)
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                Satellite Chlorophyll-a / INCOIS Ocean Front Algorithm
              </span>
            </div>
          </div>

          {/* PFZ Detailed Parameter Table (Matching Slide 4 Example) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(pfzData?.zones || []).map((zone) => (
              <div
                key={zone.zone_id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  zone.fishing_potential === 'High'
                    ? 'border-emerald-400 bg-gradient-to-br from-emerald-500/10 via-white to-white dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900 shadow-xs'
                    : zone.fishing_potential === 'Moderate'
                    ? 'border-sky-400 bg-gradient-to-br from-sky-500/10 via-white to-white dark:from-sky-950/20 dark:via-slate-900 dark:to-slate-900 shadow-xs'
                    : 'border-slate-300 bg-white dark:bg-slate-900/80 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                    {zone.zone_id}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase text-white ${
                    zone.fishing_potential === 'High' ? 'bg-emerald-600' : zone.fishing_potential === 'Moderate' ? 'bg-sky-600' : 'bg-slate-500'
                  }`}>
                    {zone.fishing_potential} Potential
                  </span>
                </div>

                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 mt-1">
                  {zone.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {zone.distance_km} km ({zone.distance_nm} NM) • {zone.bearing}
                </p>

                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Chlorophyll-a</span>
                    <div className="font-black text-slate-800 dark:text-slate-200 mt-0.5">
                      {zone.chlorophyll_concentration_mg_m3} <span className="text-[10px] font-normal text-slate-400">mg/m³</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Sea Temp (SST)</span>
                    <div className="font-black text-slate-800 dark:text-slate-200 mt-0.5">
                      {zone.sea_surface_temperature_c} <span className="text-[10px] font-normal text-slate-400">°C</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Current Speed</span>
                    <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {zone.ocean_current_speed_kmh} km/h
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Bathymetry</span>
                    <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {zone.depth_range}
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Target Pelagic Species:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {zone.target_species.map((sp, idx) => (
                      <span key={idx} className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                        {sp}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* =========================================================================
          TAB 4: FISH BREEDING & FISHING BAN INFORMATION (Slide 5)
          ========================================================================= */}
      {activeTab === 'bans' && (
        <div className="space-y-4">
          
          {/* Government Fishing Ban Status Banner */}
          <div className={`p-5 sm:p-6 rounded-3xl border transition-all ${
            bansData?.is_ban_active
              ? 'bg-gradient-to-br from-red-600/15 via-rose-500/10 to-white dark:to-slate-900 border-red-500 shadow-md'
              : 'bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-white dark:to-slate-900 border-emerald-500/30 shadow-xs'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm ${
                  bansData?.is_ban_active ? 'bg-red-600 animate-pulse' : 'bg-emerald-600'
                }`}>
                  {bansData?.is_ban_active ? <Ban size={26} /> : <CheckCircle size={26} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase text-white ${
                      bansData?.is_ban_active ? 'bg-red-600' : 'bg-emerald-600'
                    }`}>
                      {bansData?.ban_status_text || 'FISHING PERMITTED (REGULAR SEASON OPEN)'}
                    </span>
                    <span className="text-xs text-slate-400">Department of Fisheries</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-50 mt-1">
                    {bansData?.government_order?.title || 'Karnataka Marine Fisheries Regulation Order'}
                  </h2>
                  <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mt-1 max-w-2xl">
                    {bansData?.ban_summary || 'No general monsoon fishing ban is currently in force. Mechanized and motorized vessels permitted.'}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs shrink-0 max-w-xs">
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Annual Uniform Monsoon Ban</span>
                <strong className="text-slate-800 dark:text-slate-200">
                  {bansData?.government_order?.annual_ban_period || 'June 1 to July 31 (61 Days)'}
                </strong>
                <p className="text-[11px] text-slate-500 mt-1 leading-tight">
                  Enforced by: Coastal Security Police & Indian Coast Guard. Traditional non-mechanized craft exempted.
                </p>
              </div>
            </div>
          </div>

          {/* Species-Specific Breeding & Spawning Grid (Indian Oil Sardine, Mackerel, Prawns, Seer Fish) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {(bansData?.species_advisories || []).map((species) => (
              <div 
                key={species.id}
                className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                        {species.common_name}
                      </h3>
                      <p className="text-xs italic text-slate-400">
                        {species.scientific_name} • {species.local_kannada_name}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300">
                      MLS: {species.minimum_legal_size_cm} cm
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Spawning Period</span>
                      <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                        {species.spawning_period}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Breeding Classification</span>
                      <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                        {species.breeding_status}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 text-xs text-slate-600 dark:text-slate-300">
                    <strong className="text-slate-800 dark:text-slate-200 block mb-0.5 font-bold">Conservation Directive:</strong>
                    {species.conservation_advisory}
                  </div>
                </div>

                <div className="mt-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  ✓ {species.current_season_recommendation}
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* =========================================================================
          TAB 5: WEATHER INFORMATION
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

const FishermanHome = (props) => {
  return (
    <FishermanErrorBoundary>
      <FishermanDashboardContent {...props} />
    </FishermanErrorBoundary>
  );
};

export default FishermanHome;
