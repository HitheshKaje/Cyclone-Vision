import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Users, 
  Anchor, 
  User, 
  Ship, 
  Search, 
  Phone, 
  MapPin, 
  Download, 
  Trash2, 
  RefreshCw, 
  Radio, 
  CheckCircle2, 
  AlertTriangle, 
  LifeBuoy, 
  Bell, 
  ChevronRight,
  Send,
  Shield,
  Compass,
  ArrowUpDown,
  Volume2,
  VolumeX,
  Loader2
} from 'lucide-react';
import { 
  fetchRegisteredUsers, 
  deleteRegisteredUser, 
  updateUserStatus,
  clearAllRegisteredUsers,
  fetchOfficialAdvisories,
  toggleLighthouseSiren
} from '../citizen/services/citizenApi';

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState('all'); // 'all', 'fisherman', 'citizen'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'AT_SEA', 'IN_HARBOR', 'ACTIVE'
  const [alertSentUser, setAlertSentUser] = useState(null);
  const [sirenActive, setSirenActive] = useState(false);
  const [sirenLoading, setSirenLoading] = useState(false);

  // Poll siren status and sync with local toggle events
  useEffect(() => {
    let isMounted = true;
    const checkSiren = async () => {
      try {
        const res = await fetchOfficialAdvisories();
        if (isMounted && res.success && res.data) {
          setSirenActive(res.data.siren_active === true);
        }
      } catch (_) {}
    };

    checkSiren();
    const interval = setInterval(checkSiren, 2500);

    const handleSirenEvent = (e) => {
      if (e.detail?.siren_active !== undefined) {
        setSirenActive(e.detail.siren_active === true);
      }
    };
    window.addEventListener('cyclosafe_siren_toggled', handleSirenEvent);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('cyclosafe_siren_toggled', handleSirenEvent);
    };
  }, []);

  const handleTurnOffSiren = async () => {
    setSirenLoading(true);
    try {
      const res = await toggleLighthouseSiren(false);
      if (res.success) {
        setSirenActive(false);
        window.dispatchEvent(new CustomEvent('cyclosafe_siren_toggled', { detail: { siren_active: false } }));
      }
    } catch (err) {
      console.error('Failed to silence siren from users page:', err);
    } finally {
      setSirenLoading(false);
    }
  };

  // Load registered community users from backend and localStorage
  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    const res = await fetchRegisteredUsers();
    if (res.success && res.data) {
      setUsers(res.data);
    } else {
      setUsers([]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadUsers();

    // Listen for live user registration events from the citizen portal
    const handleNewUser = (e) => {
      if (e.detail) {
        setUsers(prev => {
          const filtered = prev.filter(u => u.phone !== e.detail.phone);
          return [e.detail, ...filtered];
        });
      }
    };

    const handleDeletedUser = (e) => {
      if (e.detail) {
        setUsers(prev => prev.filter(u => u.id !== e.detail));
      }
    };

    const handleUsersCleared = () => {
      setUsers([]);
    };

    window.addEventListener('cyclosafe_user_registered', handleNewUser);
    window.addEventListener('cyclosafe_user_deleted', handleDeletedUser);
    window.addEventListener('cyclosafe_users_cleared', handleUsersCleared);

    return () => {
      window.removeEventListener('cyclosafe_user_registered', handleNewUser);
      window.removeEventListener('cyclosafe_user_deleted', handleDeletedUser);
      window.removeEventListener('cyclosafe_users_cleared', handleUsersCleared);
    };
  }, [loadUsers]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadUsers();
    setTimeout(() => setIsRefreshing(false), 400);
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all registered users from the directory?')) return;
    await clearAllRegisteredUsers();
    setUsers([]);
  };

  const handleDelete = async (userId) => {
    if (!window.confirm(`Are you sure you want to remove user ${userId} from the directory?`)) return;
    await deleteRegisteredUser(userId);
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handleToggleStatus = async (user) => {
    if (user.user_type === 'fisherman') {
      const nextStatus = user.status === 'AT_SEA' ? 'IN_HARBOR' : 'AT_SEA';
      const res = await updateUserStatus(user.id, { status: nextStatus });
      if (res.success) {
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: nextStatus } : u));
      }
    }
  };

  const handleSendDirectAlert = (user) => {
    setAlertSentUser(user.id);
    setTimeout(() => setAlertSentUser(null), 3000);
  };

  // Filtered lists
  const fishermenUsers = useMemo(() => users.filter(u => u.user_type === 'fisherman'), [users]);
  const citizenUsers = useMemo(() => users.filter(u => u.user_type === 'citizen'), [users]);

  const displayedUsers = useMemo(() => {
    let list = users;
    if (activeSection === 'fisherman') list = fishermenUsers;
    else if (activeSection === 'citizen') list = citizenUsers;

    if (statusFilter !== 'ALL') {
      list = list.filter(u => u.status === statusFilter);
    }

    const q = searchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter(u => 
        u.name?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q) ||
        u.vessel_name?.toLowerCase().includes(q) ||
        u.vessel_reg?.toLowerCase().includes(q) ||
        u.port?.toLowerCase().includes(q) ||
        u.district?.toLowerCase().includes(q) ||
        u.ward?.toLowerCase().includes(q) ||
        u.id?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [users, activeSection, fishermenUsers, citizenUsers, statusFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const fishermenTotal = fishermenUsers.length;
    const atSea = fishermenUsers.filter(u => u.status === 'AT_SEA').length;
    const inHarbor = fishermenUsers.filter(u => u.status === 'IN_HARBOR').length;
    const citizensTotal = citizenUsers.length;
    const alertsActive = users.filter(u => u.alerts_enabled !== false).length;
    return { total, fishermenTotal, atSea, inHarbor, citizensTotal, alertsActive };
  }, [users, fishermenUsers, citizenUsers]);

  // Export to CSV
  const handleExportCSV = () => {
    if (displayedUsers.length === 0) return;
    const headers = ['User ID', 'Type', 'Name', 'Phone', 'Vessel Name', 'Vessel Reg', 'Port/Harbor', 'District', 'Ward', 'Status', 'Registered At'];
    const rows = displayedUsers.map(u => [
      u.id,
      u.user_type,
      `"${u.name || ''}"`,
      `"${u.phone || ''}"`,
      `"${u.vessel_name || 'N/A'}"`,
      `"${u.vessel_reg || 'N/A'}"`,
      `"${u.port || 'N/A'}"`,
      `"${u.district || 'N/A'}"`,
      `"${u.ward || 'N/A'}"`,
      u.status || 'ACTIVE',
      u.registered_at || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cyclosafe_${activeSection}_directory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 pb-12 animate-in fade-in duration-300">
      
      {/* 1. Header with Live Dynamic Info (NO ADD BUTTON) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-500 border border-sky-500/20">
              <Users size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Coastal Community User Management
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Dynamic directory of registered fishermen, active vessels, and coastal residents connected to live early warning broadcasts
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls: Refresh & Export (No manual add button) */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
            title="Refresh community registry"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-sky-500' : ''} />
            <span>Sync Directory</span>
          </button>

          {users.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-200 dark:border-rose-900/50 transition-colors cursor-pointer"
              title="Clear all registered community records"
            >
              <Trash2 size={14} />
              <span>Clear Directory</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={displayedUsers.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer disabled:opacity-40"
            title="Export CSV list for Disaster Management Teams"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Dynamic Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        
        {/* Total Users */}
        <div className="app-card p-4 flex items-center gap-3.5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="p-3 rounded-xl bg-sky-500/10 text-sky-500">
            <Users size={20} />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Community</div>
            <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
              {stats.total} Users
            </div>
          </div>
        </div>

        {/* Fishermen & Vessels */}
        <div className="app-card p-4 flex items-center gap-3.5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
            <Anchor size={20} />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Fishermen Directory</div>
            <div className="text-lg font-black text-blue-600 dark:text-blue-400 mt-0.5">
              {stats.fishermenTotal} Vessels
            </div>
            <div className="text-[10px] text-slate-400 font-medium">
              {stats.atSea} at sea | {stats.inHarbor} in port
            </div>
          </div>
        </div>

        {/* Coastal Citizens */}
        <div className="app-card p-4 flex items-center gap-3.5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
            <User size={20} />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Coastal Residents</div>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {stats.citizensTotal} Citizens
            </div>
          </div>
        </div>

        {/* Alert Readiness & Siren Off Control */}
        <div className={`app-card p-4 flex items-center justify-between gap-3 border shadow-xs transition-colors ${
          sirenActive 
            ? 'border-red-500/50 bg-red-500/5 dark:bg-red-950/20' 
            : 'border-slate-200 dark:border-slate-800'
        }`}>
          <div className="flex items-center gap-3.5">
            <div className={`p-3 rounded-xl ${
              sirenActive ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-amber-500/10 text-amber-500'
            }`}>
              {sirenActive ? <Volume2 size={20} /> : <Bell size={20} />}
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                User Siren Status
              </div>
              <div className={`text-sm font-black mt-0.5 ${
                sirenActive ? 'text-red-600 dark:text-red-400 animate-pulse' : 'text-slate-800 dark:text-slate-200'
              }`}>
                {sirenActive ? '🔴 Siren Sounding' : '🟢 Standby (Off)'}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                {stats.alertsActive} Active Alerts
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleTurnOffSiren}
            disabled={sirenLoading}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
              sirenActive
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm active:scale-95'
                : 'border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
            title="Turn off siren on all user dashboards"
          >
            {sirenLoading ? <Loader2 size={12} className="animate-spin" /> : <VolumeX size={12} />}
            <span>{sirenActive ? 'Turn OFF Siren' : 'Force Off'}</span>
          </button>
        </div>

      </div>

      {/* 3. Section Separator Tabs: Fishermen vs Citizens vs All */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        
        {/* Segmented Section Switcher */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
          
          {/* Section 1: Fishermen */}
          <button
            type="button"
            onClick={() => setActiveSection('fisherman')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'fisherman'
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Anchor size={15} />
            <span>Fishermen & Vessels</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeSection === 'fisherman' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
            }`}>
              {stats.fishermenTotal}
            </span>
          </button>

          {/* Section 2: Citizens */}
          <button
            type="button"
            onClick={() => setActiveSection('citizen')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'citizen'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <User size={15} />
            <span>Coastal Citizens</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeSection === 'citizen' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
            }`}>
              {stats.citizensTotal}
            </span>
          </button>

          {/* View All */}
          <button
            type="button"
            onClick={() => setActiveSection('all')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'all'
                ? 'bg-blue-600 text-white shadow-sm dark:bg-blue-600 dark:text-white'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users size={14} />
            <span>All Users</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeSection === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
            }`}>
              {stats.total}
            </span>
          </button>

        </div>

        {/* Live Registration Notice */}
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-[11px]">
            Dynamic Auto-Sync: When fishermen or citizens register in the User Portal, they appear here automatically.
          </span>
        </div>

      </div>

      {/* 4. Search and Filter Bar */}
      <div className="app-card p-3.5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeSection === 'fisherman'
                ? "Search fishermen by boat name, reg ID (IND-KA-...), harbor, or phone..."
                : activeSection === 'citizen'
                ? "Search citizens by name, district, coastal ward, or phone..."
                : "Search all community records by name, vessel, phone, or location..."
            }
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status Quick Filter */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold text-slate-500 hidden sm:inline-block">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            {activeSection !== 'citizen' && <option value="AT_SEA">At Sea (🌊 ಆಳ ಸಮುದ್ರ)</option>}
            {activeSection !== 'citizen' && <option value="IN_HARBOR">In Harbor (⚓ ಬಂದರಿನಲ್ಲಿದೆ)</option>}
            <option value="ACTIVE">Active (ಸಕ್ರಿಯ)</option>
          </select>
        </div>

      </div>

      {/* 5. USER DIRECTORY: EMPTY STATE OR DEDICATED SECTIONS */}
      {users.length === 0 ? (
        <div className="app-card rounded-2xl border border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-sm min-h-[360px]">
          <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500">
            <Users size={32} />
          </div>
          <div className="max-w-md space-y-1.5">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              No Registered Community Users Yet
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Fishermen and coastal citizens will appear here automatically in their respective sections when they register or log in on the Citizen Portal.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live MongoDB synchronization active</span>
          </div>
        </div>
      ) : (
        <>
          {/* SECTION A: FISHERMEN DIRECTORY */}
          {(activeSection === 'fisherman' || activeSection === 'all') && (
            <div className="space-y-2">
              {activeSection === 'all' && (
                <div className="flex items-center justify-between pt-2">
                  <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Anchor size={16} className="text-sky-500" />
                    <span>Fishermen & Coastal Vessels Registry ({fishermenUsers.length})</span>
                  </h2>
                  <span className="text-xs text-slate-400 font-medium">Navigational & Harbor Telemetry</span>
                </div>
              )}

              <div className="app-card rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    
                    <thead>
                      <tr className="bg-sky-500/5 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">Fisherman</th>
                        <th className="py-3 px-4">Vessel & Reg Number</th>
                        <th className="py-3 px-4">Base Port / Harbor</th>
                        <th className="py-3 px-3 text-center">Safety Status</th>
                        <th className="py-3 px-4">Alert Channel</th>
                        <th className="py-3 px-4 text-right">Emergency Actions</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                      {fishermenUsers.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-slate-400">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Ship size={28} className="text-slate-300 dark:text-slate-600" />
                              <p className="font-semibold text-sm">No fishermen registered yet</p>
                              <p className="text-xs text-slate-400">Fishermen registering in the Citizen Portal will automatically populate here.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        (activeSection === 'fisherman' ? displayedUsers : fishermenUsers).map((user) => {
                          const isAtSea = user.status === 'AT_SEA';
                          return (
                            <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                              
                              {/* Fisherman Name & ID */}
                              <td className="py-3.5 px-4">
                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <span>{user.name}</span>
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                  ID: {user.id} • {user.district || 'Coastal Zone'}
                                </div>
                              </td>

                              {/* Vessel Name & Reg No */}
                              <td className="py-3.5 px-4">
                                <div className="font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1">
                                  <Ship size={13} />
                                  <span>{user.vessel_name || 'Vessel Not Specified'}</span>
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                  {user.vessel_reg || 'N/A'} • {user.vessel_type || 'Trawler'}
                                </div>
                              </td>

                              {/* Base Port */}
                              <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-semibold">
                                <div className="flex items-center gap-1">
                                  <MapPin size={13} className="text-slate-400 shrink-0" />
                                  <span className="truncate max-w-[200px]">{user.port || 'Coastal Harbor'}</span>
                                </div>
                              </td>

                              {/* Sea Safety Status Pill & Toggle */}
                              <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(user)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border cursor-pointer transition-all ${
                                    isAtSea
                                      ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                                      : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                  }`}
                                  title="Click to toggle between At Sea and In Harbor"
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${isAtSea ? 'bg-blue-500 animate-ping' : 'bg-emerald-500'}`} />
                                  <span>{isAtSea ? 'At Sea (ಆಳ ಸಮುದ್ರ)' : 'In Harbor (ಸುರಕ್ಷಿತ)'}</span>
                                </button>
                              </td>

                              {/* Alert Channel */}
                              <td className="py-3.5 px-4">
                                <div className="font-mono text-xs text-slate-700 dark:text-slate-300 font-bold">
                                  {user.phone}
                                </div>
                                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                                  <CheckCircle2 size={11} />
                                  <span>SMS & Siren Alerts On</span>
                                </div>
                              </td>

                              {/* Actions */}
                              <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleSendDirectAlert(user)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    alertSentUser === user.id
                                      ? 'bg-emerald-500 text-white'
                                      : 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/60'
                                  }`}
                                  title="Send direct early warning VHF/SMS alert to vessel"
                                >
                                  {alertSentUser === user.id ? 'Dispatched!' : 'Send Advisory'}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDelete(user.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                  title="Remove from directory"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>

                            </tr>
                          );
                        })
                      )}
                    </tbody>

                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SECTION B: CITIZENS & RESIDENTS DIRECTORY */}
          {(activeSection === 'citizen' || activeSection === 'all') && (
            <div className="space-y-2 pt-2">
              {activeSection === 'all' && (
                <div className="flex items-center justify-between pt-4">
                  <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <User size={16} className="text-emerald-500" />
                    <span>Coastal Citizens & Residents Registry ({citizenUsers.length})</span>
                  </h2>
                  <span className="text-xs text-slate-400 font-medium">Public Evacuation & Alert Registry</span>
                </div>
              )}

              <div className="app-card rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    
                    <thead>
                      <tr className="bg-emerald-500/5 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">Resident</th>
                        <th className="py-3 px-4">Coastal District & Ward</th>
                        <th className="py-3 px-4">Contact Number</th>
                        <th className="py-3 px-3 text-center">Siren SMS Alert</th>
                        <th className="py-3 px-4">Registration Date</th>
                        <th className="py-3 px-4 text-right">Emergency Actions</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                      {citizenUsers.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-slate-400">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <User size={28} className="text-slate-300 dark:text-slate-600" />
                              <p className="font-semibold text-sm">No citizens registered yet</p>
                              <p className="text-xs text-slate-400">Residents registering in the Citizen Portal will automatically populate here.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        (activeSection === 'citizen' ? displayedUsers : citizenUsers).map((user) => {
                          return (
                            <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                              
                              {/* Resident Name & ID */}
                              <td className="py-3.5 px-4">
                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <span>{user.name}</span>
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                  ID: {user.id}
                                </div>
                              </td>

                              {/* Coastal District & Ward */}
                              <td className="py-3.5 px-4">
                                <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                                  <MapPin size={13} className="text-emerald-500 shrink-0" />
                                  <span>{user.district || 'Coastal District'}</span>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[220px]">
                                  {user.ward || 'Coastal Locality'}
                                </div>
                              </td>

                              {/* Contact Number */}
                              <td className="py-3.5 px-4">
                                <div className="font-mono text-xs text-slate-800 dark:text-slate-200 font-bold flex items-center gap-1">
                                  <Phone size={12} className="text-slate-400" />
                                  <span>{user.phone}</span>
                                </div>
                                {user.emergency_contact && (
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    Kin: {user.emergency_contact}
                                  </div>
                                )}
                              </td>

                              {/* Siren Alert Status */}
                              <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                                  <CheckCircle2 size={11} />
                                  <span>Active Coverage</span>
                                </span>
                              </td>

                              {/* Registered Timestamp */}
                              <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap text-[11px]">
                                {user.registered_at ? new Date(user.registered_at).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                }) : 'Recent'}
                              </td>

                              {/* Actions */}
                              <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleSendDirectAlert(user)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    alertSentUser === user.id
                                      ? 'bg-emerald-500 text-white'
                                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                                  }`}
                                  title="Send emergency broadcast advisory via SMS"
                                >
                                  {alertSentUser === user.id ? 'Alert Sent!' : 'Dispatch SMS'}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDelete(user.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                  title="Remove resident from directory"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>

                            </tr>
                          );
                        })
                      )}
                    </tbody>

                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Footer Info */}
      <div className="p-3 bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-500">
        <span>Showing {displayedUsers.length} of {users.length} registered community records</span>
        <span className="font-semibold">Integrated with Coastal Disaster Management Authority & Marine Police</span>
      </div>

    </div>
  );
};

export default UserManagementPage;
