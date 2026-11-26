import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  fetchCycloneIntel, 
  fetchSeaConditions, 
  fetchWeatherTelemetry 
} from '../services/fishermanApi';
import { fetchOfficialAdvisories, fetchLiveCyclones } from '../services/citizenApi';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { logoutUser } from '../../utils/authService';

// Modular Fisherman Dashboard Components
import FishermanHeader from '../components/fisherman/FishermanHeader';
import FishingSafetyCard from '../components/fisherman/FishingSafetyCard';
import ActiveCycloneCard from '../components/fisherman/ActiveCycloneCard';
import WeatherCards from '../components/fisherman/WeatherCards';
import QuickActions from '../components/fisherman/QuickActions';
import FishermanCycloneMap from '../components/fisherman/FishermanCycloneMap';
import FishermanAlerts from '../components/fisherman/FishermanAlerts';
import FishermanEmergency from '../components/fisherman/FishermanEmergency';
import FishermanSafetyGuidelines from '../components/fisherman/FishermanSafetyGuidelines';
import FishermanBottomNav from '../components/fisherman/FishermanBottomNav';
import LocationModal, { COASTAL_PORTS } from '../components/fisherman/LocationModal';
import FishermanProfileModal from '../components/fisherman/FishermanProfileModal';

const getTabFromPath = (path) => {
  if (!path) return 'home';
  if (path.startsWith('/fisherman/map')) return 'map';
  if (path.startsWith('/fisherman/alerts')) return 'alerts';
  if (path.startsWith('/fisherman/safety')) return 'safety';
  return 'home';
};

const FishermanHome = ({ currentPath = '/fisherman', onNavigate }) => {
  const { t, i18n } = useTranslation();
  const { isOnline, isBackendReachable } = useNetworkStatus();

  // Navigation tab: 'home' | 'map' | 'alerts' | 'safety'
  const [prevPath, setPrevPath] = useState(currentPath);
  const [activeTab, setActiveTab] = useState(() => getTabFromPath(currentPath));

  // Modals
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(
    () => typeof currentPath === 'string' && currentPath.startsWith('/fisherman/emergency')
  );

  if (currentPath !== prevPath) {
    setPrevPath(currentPath);
    setActiveTab(getTabFromPath(currentPath));
    if (typeof currentPath === 'string' && currentPath.startsWith('/fisherman/emergency')) {
      setIsEmergencyModalOpen(true);
    }
  }

  // Current logged in user
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const raw = localStorage.getItem('cyclosafe_current_citizen_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // Selected coastal port
  const [selectedPort, setSelectedPort] = useState(() => {
    try {
      const savedPortId = localStorage.getItem('cyclosafe_selected_port_id');
      if (savedPortId) {
        const found = COASTAL_PORTS.find(p => p.id === savedPortId);
        if (found) return found;
      }
      const savedUser = JSON.parse(localStorage.getItem('cyclosafe_current_citizen_user') || '{}');
      if (savedUser?.port) {
        const matched = COASTAL_PORTS.find(p => p.id === savedUser.port.toLowerCase() || p.name.toLowerCase().includes(savedUser.port.toLowerCase()));
        if (matched) return matched;
      }
    } catch {}
    return COASTAL_PORTS[0]; // Default: Malpe Harbor
  });

  // Telemetry states
  const [cycloneIntel, setCycloneIntel] = useState(null);
  const [seaData, setSeaData] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [officialAdvisories, setOfficialAdvisories] = useState(null);
  const [liveCyclonesList, setLiveCyclonesList] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isStale, setIsStale] = useState(false);

  // Sync selected port to localStorage
  const handleSelectPort = (port) => {
    setSelectedPort(port);
    try {
      localStorage.setItem('cyclosafe_selected_port_id', port.id);
    } catch {}
  };

  // Main telemetry loader from verified backend endpoints
  const loadPortTelemetry = useCallback(async (port) => {
    setIsLoading(true);
    const portId = port?.id || 'malpe';
    const lat = port?.lat || 13.3508;
    const lng = port?.lng || 74.7042;

    try {
      const [intelRes, seaRes, weatherRes, advRes, cyclonesRes] = await Promise.all([
        fetchCycloneIntel(portId, lat, lng).catch(() => ({ success: false })),
        fetchSeaConditions(portId, lat, lng).catch(() => ({ success: false })),
        fetchWeatherTelemetry(portId, lat, lng).catch(() => ({ success: false })),
        fetchOfficialAdvisories().catch(() => ({ success: false })),
        fetchLiveCyclones().catch(() => ({ success: false }))
      ]);

      if (intelRes.success && intelRes.data) {
        setCycloneIntel(intelRes.data);
      }
      if (seaRes.success && seaRes.data) {
        setSeaData(seaRes.data);
      }
      if (weatherRes.success && weatherRes.data) {
        setWeatherData(weatherRes.data);
      }
      if (advRes.success && advRes.data) {
        setOfficialAdvisories(advRes.data);
      }
      if (cyclonesRes.success && cyclonesRes.data && Array.isArray(cyclonesRes.data.cyclones)) {
        setLiveCyclonesList(cyclonesRes.data.cyclones);
      }

      const now = new Date();
      setLastUpdated(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setIsStale(!isOnline);
    } catch (err) {
      console.warn('[FishermanHome] Telemetry fetch notice:', err);
      setIsStale(true);
    } finally {
      setIsLoading(false);
    }
  }, [isOnline]);

  // Load telemetry on mount and when port changes
  useEffect(() => {
    loadPortTelemetry(selectedPort);
  }, [selectedPort, loadPortTelemetry]);

  // Auto-refresh periodically (every 90s)
  useEffect(() => {
    const interval = setInterval(() => {
      loadPortTelemetry(selectedPort);
    }, 90000);
    return () => clearInterval(interval);
  }, [selectedPort, loadPortTelemetry]);

  // Check if there is an active cyclone relevant to this port
  const activeCyclone = useMemo(() => {
    // 1. From official broadcast if active
    if (officialAdvisories?.active && officialAdvisories.cyclone_name) {
      return {
        name: officialAdvisories.cyclone_name,
        storm_name: officialAdvisories.cyclone_name,
        category: officialAdvisories.classification || 'Severe Cyclonic Storm',
        wind_speed_kt: officialAdvisories.wind_speed_kt,
        wind_speed_kmh: officialAdvisories.wind_speed_kmh,
        movement_direction: 'Moving towards Coast',
        distance_km: null,
        is_active: true
      };
    }
    // 2. From cycloneIntel (backend distance calculation)
    if (cycloneIntel?.active_cyclone && cycloneIntel.has_active_system) {
      return { ...cycloneIntel.active_cyclone, is_active: true };
    }
    // 3. From live cyclones list
    if (liveCyclonesList && liveCyclonesList.length > 0) {
      const activeOne = liveCyclonesList.find(c => c.is_active === true);
      if (activeOne) return activeOne;
    }
    return null;
  }, [officialAdvisories, cycloneIntel, liveCyclonesList]);

  // Build unified alerts list
  const alertsList = useMemo(() => {
    const list = [];
    // Official broadcast alerts: ONLY when officialAdvisories is active
    if (officialAdvisories?.active && officialAdvisories.message) {
      list.push({
        id: 'official-broadcast',
        priority: officialAdvisories.level || 'DANGER',
        alert_type: 'Official Disaster Broadcast',
        cyclone_name: officialAdvisories.cyclone_name,
        affected_area: officialAdvisories.area || selectedPort.region,
        title: officialAdvisories.message,
        explanation: officialAdvisories.fishermen_directive || 'All fishing vessels return to harbor immediately!',
        recommended_action: officialAdvisories.fishermen_directive || 'Follow emergency orders.',
        source: officialAdvisories.source || 'CycloSafe Early Warning Command Center (Live Admin Broadcast)',
        issued_at: officialAdvisories.issued_at || new Date().toISOString()
      });
    }

    // Cyclone specific alert: ONLY when activeCyclone is active
    if (activeCyclone && (officialAdvisories?.active || activeCyclone.is_active)) {
      list.push({
        id: `cyclone-${activeCyclone.atcf_id || activeCyclone.name || 'active'}`,
        priority: activeCyclone.intensity_category === 'Super Cyclonic Storm' || (activeCyclone.wind_speed_kt && activeCyclone.wind_speed_kt >= 64) ? 'DANGER' : 'CAUTION',
        alert_type: 'Tropical Cyclone Track Warning',
        cyclone_name: activeCyclone.storm_name || activeCyclone.name,
        affected_area: selectedPort.region,
        title: `${activeCyclone.storm_name || 'Tropical Cyclone'} active in ${activeCyclone.basin || 'Regional Waters'}`,
        explanation: `Sustained winds of ${activeCyclone.wind_speed_kmh || 85} km/h moving towards coastal zones.`,
        recommended_action: 'Small crafts and mechanized trawlers must remain anchored in port.',
        source: 'India Meteorological Department (IMD)',
        issued_at: activeCyclone.updated_at || new Date().toISOString()
      });
    }

    // Sea state caution if wave height is high (>= 2.8m)
    if (seaData?.current?.wave_height != null && Number(seaData.current.wave_height) >= 2.8) {
      list.push({
        id: 'rough-sea-advisory',
        priority: 'CAUTION',
        alert_type: 'Rough Sea Advisory',
        affected_area: selectedPort.name,
        title: `High Swell Warning: ${Number(seaData.current.wave_height).toFixed(1)}m Waves`,
        explanation: 'Elevated wave height and strong ocean currents observed near coastal fishing grounds.',
        recommended_action: 'Avoid setting nets in deep offshore waters.',
        source: 'INCOIS Marine Ocean Forecast',
        issued_at: new Date().toISOString()
      });
    }

    return list;
  }, [officialAdvisories, activeCyclone, seaData, selectedPort]);

  // Calculate unread alerts count
  const unreadAlertCount = useMemo(() => {
    try {
      const readIds = JSON.parse(localStorage.getItem('cyclosafe_read_alerts') || '[]');
      return alertsList.filter(a => !readIds.includes(a.id)).length;
    } catch {
      return alertsList.length;
    }
  }, [alertsList]);

  // Determine Main Safety Status (GREEN, YELLOW, RED, or UNAVAILABLE)
  const safetyStatus = useMemo(() => {
    // Priority 1: Official Emergency Broadcast or Siren active from Admin
    if (officialAdvisories?.active) {
      const lvl = (officialAdvisories.level || '').toUpperCase();
      if (lvl === 'RED' || lvl === 'DANGER' || officialAdvisories.siren_active) return 'DANGER';
      if (lvl === 'ORANGE' || lvl === 'YELLOW' || lvl === 'CAUTION') return 'CAUTION';
      return 'DANGER';
    }

    // Priority 2: Active Cyclone proximity (if admin broadcasted or live cyclone detected)
    if (activeCyclone && activeCyclone.is_active) {
      const dist = activeCyclone.distance_km;
      const windKt = activeCyclone.wind_speed_kt || 45;
      if (dist != null && dist <= 200) return 'DANGER';
      if (windKt >= 64) return 'DANGER';
      return 'CAUTION';
    }

    // Priority 3: Sea conditions
    if (seaData?.current) {
      const wave = Number(seaData.current.wave_height || 0);
      const windKmh = Number(seaData.current.wind_speed_kmh || weatherData?.current?.wind_speed_10m || 0);
      if (wave >= 3.5 || windKmh >= 60) return 'DANGER';
      if (wave >= 2.5 || windKmh >= 40) return 'CAUTION';
    }

    // If offline or data failed to load
    if (isLoading && !cycloneIntel && !seaData) {
      return 'UNAVAILABLE';
    }

    // Default when no warnings are in effect
    return 'SAFE';
  }, [isLoading, officialAdvisories, activeCyclone, seaData, weatherData, cycloneIntel]);

  // Handle Logout
  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    if (onNavigate) onNavigate('/fisherman/login');
  };

  return (
    <div className="min-h-screen bg-[#F5F8FC] dark:bg-[#070d1e] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* 1. Header */}
      <FishermanHeader
        currentUser={currentUser}
        selectedPort={selectedPort}
        onOpenLocationModal={() => setIsLocationModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onOpenAlerts={() => setActiveTab('alerts')}
        unreadAlertCount={unreadAlertCount}
      />

      {/* Main Content Area: Responsive Container (Mobile-First 360px-430px, Tablet & Desktop) */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-3.5 sm:px-6 py-3 sm:py-5 pb-24">
        
        {/* VIEW 1: HOME PAGE */}
        {activeTab === 'home' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            
            {/* A. Main Fishing Safety Status Card */}
            <FishingSafetyCard
              status={safetyStatus}
              title={
                safetyStatus === 'DANGER' ? t('fisherman.danger_title') :
                safetyStatus === 'CAUTION' ? t('fisherman.caution_title') :
                safetyStatus === 'SAFE' ? t('fisherman.safe_title') :
                t('fisherman.unable_verify')
              }
              explanation={
                safetyStatus === 'DANGER' || safetyStatus === 'CAUTION'
                  ? (officialAdvisories?.active ? officialAdvisories.message : (activeCyclone ? `Severe weather threat: ${activeCyclone.storm_name || 'Cyclone'} monitored in regional waters.` : t('fisherman.caution_msg')))
                  : (safetyStatus === 'SAFE' ? t('fisherman.safe_msg') : t('fisherman.unable_verify_msg'))
              }
              recommendedAction={
                safetyStatus === 'DANGER' || safetyStatus === 'CAUTION'
                  ? (officialAdvisories?.active ? officialAdvisories.fishermen_directive : (activeCyclone ? 'Avoid deep offshore venture. Maintain radio contact with port.' : null))
                  : null
              }
              source={
                officialAdvisories?.active
                  ? (officialAdvisories.source || 'CycloSafe Early Warning Command Center (Live Admin Broadcast)')
                  : 'CycloSafe Coastal Monitoring & IMD'
              }
              lastUpdated={lastUpdated}
              isStale={isStale}
              onViewAlerts={() => setActiveTab('alerts')}
            />

            {/* B. Active Cyclone Alert */}
            <ActiveCycloneCard
              cyclone={activeCyclone}
              selectedPort={selectedPort}
              onViewMap={() => setActiveTab('map')}
            />

            {/* C. Weather Conditions (4 simple cards: Wind Speed, Wind Direction, Rainfall, Wave Height) */}
            <WeatherCards
              weatherData={weatherData}
              seaData={seaData}
            />

            {/* D. Quick Actions (4 large touch-friendly buttons) */}
            <QuickActions
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenEmergency={() => setIsEmergencyModalOpen(true)}
            />

          </div>
        )}

        {/* VIEW 2: CYCLONE MAP PAGE */}
        {activeTab === 'map' && (
          <FishermanCycloneMap
            selectedPort={selectedPort}
            cyclone={activeCyclone}
            onBack={() => setActiveTab('home')}
          />
        )}

        {/* VIEW 3: ALERTS PAGE */}
        {activeTab === 'alerts' && (
          <FishermanAlerts
            alerts={alertsList}
            selectedPort={selectedPort}
            onBack={() => setActiveTab('home')}
          />
        )}

        {/* VIEW 4: SAFETY GUIDELINES PAGE */}
        {activeTab === 'safety' && (
          <FishermanSafetyGuidelines
            onBack={() => setActiveTab('home')}
          />
        )}

      </main>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <FishermanBottomNav
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        unreadAlertCount={unreadAlertCount}
      />

      {/* Emergency Assistance Modal / View */}
      {isEmergencyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full sm:max-w-md max-h-[90vh] bg-white dark:bg-[#0f172a] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-y-auto p-4 sm:p-5">
            <FishermanEmergency
              selectedPort={selectedPort}
              onBack={() => setIsEmergencyModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Location Selection Drawer / Modal */}
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        selectedPortId={selectedPort.id}
        onSelectPort={handleSelectPort}
      />

      {/* Fisherman Profile Modal */}
      <FishermanProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        currentPort={selectedPort}
        onLogout={handleLogout}
      />

    </div>
  );
};

export default FishermanHome;
