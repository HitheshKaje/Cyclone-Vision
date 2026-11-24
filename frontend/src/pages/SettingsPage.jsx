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
  User,
  BrainCircuit,
  Map,
  Bell,
  Activity,
  ShieldCheck,
  Shield,
  Lock,
  Key,
  Mail,
  Phone,
  MapPin,
  Eye,
  EyeOff,
  Zap,
  Sliders,
  Sparkles,
  RotateCcw,
  Gauge,
  Check,
  ExternalLink,
  Volume2,
  VolumeX,
  Layers,
  Compass,
  Navigation,
  Radio
} from 'lucide-react';
import { getApiBaseUrl, setApiBaseUrl } from '../utils/apiConfig';
import { getAdminAuth, updateUserProfile, changeUserPassword, fetchUserProfile } from '../utils/authService';
import { 
  fetchAiSettings, 
  updateAiSettings, 
  testGeminiKey, 
  resetAiSettings,
  fetchMapSettings,
  updateMapSettings,
  fetchNotificationSettings,
  updateNotificationSettings
} from '../utils/aiSettingsApi';

const SettingsPage = ({ adminUser }) => {
  const [activeSection, setActiveSection] = useState('system');

  // List of all sections (Only System is functional)
  const sections = [
    { id: 'system', label: 'System', icon: Server },
    { id: 'account', label: 'Account settings', icon: User },
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
                : activeSection === 'account'
                ? 'Manage administrator profile information, change credentials, and view system permissions.'
                : activeSection === 'ai'
                ? 'Configure AI vision models and detection thresholds.'
                : activeSection === 'map'
                ? 'Configure default cyclone map view engine, layers, and forecast tracks.'
                : activeSection === 'notifications'
                ? 'Manage emergency siren alarms, audio alerts, and coastal warning broadcasts.'
                : 'Manage system settings.'}
            </p>
          </div>

          {activeSection === 'system' ? (
            <SystemSection />
          ) : activeSection === 'account' ? (
            <AccountSection adminUser={adminUser} />
          ) : activeSection === 'ai' ? (
            <AIModelSection />
          ) : activeSection === 'map' ? (
            <MapSettingsSection />
          ) : activeSection === 'notifications' ? (
            <NotificationsSection />
          ) : null}
        </div>
      </div>
    </div>
  );
};

const AccountSection = ({ adminUser: propAdminUser }) => {
  const [currentUser, setCurrentUser] = useState(() => propAdminUser || getAdminAuth() || {
    id: 'ADM-001',
    name: 'Hithesh K',
    email: 'admin@cyclosafe.org',
    phone: '8217546424',
    role: 'admin',
    coastal_region: 'National Operations Center (IMD & Coast Guard Unified)'
  });

  // Profile Form State
  const [name, setName] = useState(currentUser.name || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [phone, setPhone] = useState(currentUser.phone || currentUser.mobile || '');
  const [coastalRegion, setCoastalRegion] = useState(currentUser.coastal_region || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileStatus, setProfileStatus] = useState(null); // { type: 'success' | 'error', message: '' }

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState(null);

  // Sync with prop changes or custom update events
  useEffect(() => {
    if (propAdminUser) {
      setCurrentUser(propAdminUser);
      setName(propAdminUser.name || '');
      setEmail(propAdminUser.email || '');
      setPhone(propAdminUser.phone || propAdminUser.mobile || '');
      setCoastalRegion(propAdminUser.coastal_region || '');
    }
  }, [propAdminUser]);

  // Fetch latest MongoDB-backed profile on mount
  useEffect(() => {
    fetchUserProfile({ role: 'admin' }).then((res) => {
      if (res.success && res.user) {
        setCurrentUser(res.user);
        setName(res.user.name || '');
        setEmail(res.user.email || '');
        setPhone(res.user.phone || res.user.mobile || '');
        setCoastalRegion(res.user.coastal_region || '');
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handleProfileUpdate = (e) => {
      if (e.detail) {
        setCurrentUser(e.detail);
        setName(e.detail.name || '');
        setEmail(e.detail.email || '');
        setPhone(e.detail.phone || e.detail.mobile || '');
        setCoastalRegion(e.detail.coastal_region || '');
      }
    };
    window.addEventListener('cyclosafe_user_profile_updated', handleProfileUpdate);
    return () => window.removeEventListener('cyclosafe_user_profile_updated', handleProfileUpdate);
  }, []);

  // Save Profile Handler
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileStatus(null);
    setIsSavingProfile(true);

    try {
      const res = await updateUserProfile({
        id: currentUser.id,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        coastal_region: coastalRegion.trim()
      });

      if (res.success) {
        setProfileStatus({ type: 'success', message: res.message || 'Account profile saved successfully.' });
        if (res.user) {
          setCurrentUser(res.user);
        }
      } else {
        setProfileStatus({ type: 'error', message: res.error || 'Failed to update profile.' });
      }
    } catch (err) {
      setProfileStatus({ type: 'error', message: err.message || 'An unexpected error occurred.' });
    } finally {
      setIsSavingProfile(false);
      setTimeout(() => setProfileStatus(null), 5000);
    }
  };

  // Change Password Handler
  const handleSavePassword = async (e) => {
    e.preventDefault();
    setPasswordStatus(null);

    if (!currentPassword) {
      setPasswordStatus({ type: 'error', message: 'Please enter your current password.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordStatus({ type: 'error', message: 'New password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'New passwords do not match. Please verify.' });
      return;
    }

    setIsSavingPassword(true);
    try {
      const res = await changeUserPassword({
        currentPassword,
        newPassword,
        id: currentUser.id,
        identifier: currentUser.email || currentUser.phone
      });

      if (res.success) {
        setPasswordStatus({ type: 'success', message: res.message || 'Password updated successfully.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordStatus({ type: 'error', message: res.error || 'Failed to change password.' });
      }
    } catch (err) {
      setPasswordStatus({ type: 'error', message: err.message || 'An unexpected error occurred.' });
    } finally {
      setIsSavingPassword(false);
      setTimeout(() => setPasswordStatus(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Profile Header Overview Card */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20 text-2xl font-black shrink-0">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                  {currentUser?.name || 'Command Center Admin'}
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                  <ShieldCheck size={12} />
                  <span>Admin</span>
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {currentUser?.email || 'admin@cyclosafe.org'}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-2">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Active Session
                </span>
                <span>•</span>
                <span>ID: {currentUser?.id || 'ADM-001'}</span>
                <span>•</span>
                <span>Region: {currentUser?.coastal_region || 'National Ops Center'}</span>
              </div>
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-600 dark:text-slate-400">
            Last Login: {currentUser?.last_login ? new Date(currentUser.last_login).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Active Now'}
          </div>
        </div>
      </div>

      {/* 2. Personal & Operational Details Form */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <User className="text-sky-500" size={19} />
            <h3 className="font-semibold text-slate-800 dark:text-white">Administrator Profile</h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            MongoDB Backed Profile
          </span>
        </div>

        <form onSubmit={handleSaveProfile} className="p-5 space-y-4">
          {profileStatus && (
            <div className={`p-3.5 rounded-lg flex items-center gap-2 text-sm ${
              profileStatus.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
            }`}>
              {profileStatus.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{profileStatus.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Command Center Admin"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@cyclosafe.org"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Mobile Number
              </label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="10-digit mobile number"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Coastal Jurisdiction / Operations Center
              </label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={coastalRegion}
                  onChange={(e) => setCoastalRegion(e.target.value)}
                  placeholder="National Operations Center"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSavingProfile}
              className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors cursor-pointer"
            >
              {isSavingProfile ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              <span>{isSavingProfile ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 3. Security & Password Update Card */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Lock className="text-amber-500" size={19} />
            <h3 className="font-semibold text-slate-800 dark:text-white">Security & Password</h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            PBKDF2-HMAC-SHA256 Encryption
          </span>
        </div>

        <form onSubmit={handleSavePassword} className="p-5 space-y-4">
          {passwordStatus && (
            <div className={`p-3.5 rounded-lg flex items-center gap-2 text-sm ${
              passwordStatus.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
            }`}>
              {passwordStatus.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{passwordStatus.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Current Password
              </label>
              <div className="relative">
                <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full pl-9 pr-9 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full pl-9 pr-9 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Password changes update MongoDB immediately and protect administrative actions.
            </span>
            <button
              type="submit"
              disabled={isSavingPassword || !currentPassword || !newPassword}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
            >
              {isSavingPassword ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Shield size={16} />
              )}
              <span>{isSavingPassword ? 'Updating...' : 'Update Password'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 4. Administrative Permissions & Privileges Card */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-emerald-500" size={19} />
            <h3 className="font-semibold text-slate-800 dark:text-white">Active Operational Privileges</h3>
          </div>
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
            Full Access
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">AI Vision Inference</span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Authorized
            </span>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Live Doppler Radar</span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Authorized
            </span>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Lighthouse Siren</span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Authorized
            </span>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Citizen Registry</span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Authorized
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};

const AIModelSection = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  // Core Essential Settings
  const [primaryEngine, setPrimaryEngine] = useState('gemini_vision');
  const [geminiModel, setGeminiModel] = useState('gemini-flash-lite-latest');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [maskedGeminiKey, setMaskedGeminiKey] = useState('');
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(50);

  // Testing Key
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Load current settings from MongoDB
  useEffect(() => {
    let isMounted = true;
    const loadSettings = async () => {
      setLoading(true);
      const res = await fetchAiSettings();
      if (isMounted && res.success && res.settings) {
        const s = res.settings;
        setPrimaryEngine(s.primary_engine || 'gemini_vision');
        setGeminiModel(s.gemini_model || 'gemini-flash-lite-latest');
        setMaskedGeminiKey(s.gemini_api_key_masked || '');
        setHasGeminiKey(s.has_gemini_key || false);
        setConfidenceThreshold(s.detection_confidence_threshold ?? 50);
      }
      if (isMounted) setLoading(false);
    };
    loadSettings();
    return () => { isMounted = false; };
  }, []);

  // Save handler
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSaveStatus(null);

    try {
      const payload = {
        primary_engine: primaryEngine,
        gemini_model: geminiModel,
        detection_confidence_threshold: Number(confidenceThreshold)
      };

      if (geminiApiKey && !geminiApiKey.includes('...')) {
        payload.gemini_api_key = geminiApiKey.trim();
      }

      const res = await updateAiSettings(payload);
      if (res.success) {
        setSaveStatus({ type: 'success', message: 'AI model settings saved successfully!' });
        if (res.settings) {
          setMaskedGeminiKey(res.settings.gemini_api_key_masked || '');
          setHasGeminiKey(res.settings.has_gemini_key || false);
          setGeminiApiKey('');
        }
      } else {
        setSaveStatus({ type: 'error', message: res.error || 'Failed to save settings.' });
      }
    } catch (err) {
      setSaveStatus({ type: 'error', message: err.message || 'Error saving settings.' });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus(null), 4000);
    }
  };

  // Test API Key handler
  const handleTestKey = async () => {
    setTestingKey(true);
    setTestResult(null);
    try {
      const res = await testGeminiKey({
        apiKey: geminiApiKey || undefined,
        model: geminiModel
      });
      setTestResult(res);
    } catch (err) {
      setTestResult({ success: false, message: err.message || 'Connection test failed.' });
    } finally {
      setTestingKey(false);
      setTimeout(() => setTestResult(null), 6000);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <RefreshCw size={28} className="text-sky-500 animate-spin mb-2" />
        <span className="text-xs font-medium text-slate-500">Loading AI settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">

      {/* Save Status Notification */}
      {saveStatus && (
        <div className={`p-3 rounded-lg border flex items-center justify-between text-xs font-semibold shadow-xs ${
          saveStatus.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {saveStatus.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            <span>{saveStatus.message}</span>
          </div>
          <button onClick={() => setSaveStatus(null)} className="opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* 1. Inference Engine & Model */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
          <BrainCircuit className="text-sky-500" size={18} />
          <h3 className="font-semibold text-slate-800 dark:text-white text-sm">AI Vision Engine</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Engine Mode
            </label>
            <select
              value={primaryEngine}
              onChange={(e) => setPrimaryEngine(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            >
              <option value="gemini_vision">Google Gemini Vision (Cloud API)</option>
              <option value="hybrid">Hybrid (Gemini + Local Fallback)</option>
              <option value="offline_physics">Offline Physics Ingestion</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Model Variant
            </label>
            <select
              value={geminiModel}
              onChange={(e) => setGeminiModel(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            >
              <option value="gemini-flash-lite-latest">gemini-flash-lite-latest (Fastest)</option>
              <option value="gemini-3-flash-preview">gemini-3-flash-preview (Balanced)</option>
              <option value="gemini-2.5-flash">gemini-2.5-flash (Standard)</option>
              <option value="gemini-pro-latest">gemini-pro-latest (High Precision)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Google Gemini API Key */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Key className="text-amber-500" size={18} />
            <h3 className="font-semibold text-slate-800 dark:text-white text-sm">Google Gemini API Key</h3>
          </div>
          {hasGeminiKey && (
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Active Key Connected
            </span>
          )}
        </div>

        <div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showGeminiKey ? 'text' : 'password'}
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder={hasGeminiKey ? `Active Key: ${maskedGeminiKey}` : 'Paste API Key'}
                className="w-full pl-3 pr-10 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
              <button
                type="button"
                onClick={() => setShowGeminiKey(!showGeminiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                {showGeminiKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <button
              type="button"
              onClick={handleTestKey}
              disabled={testingKey}
              className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shrink-0"
            >
              {testingKey ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} />}
              <span>{testingKey ? 'Testing...' : 'Test Key'}</span>
            </button>
          </div>

          {testResult && (
            <p className={`mt-2 text-xs flex items-center gap-1.5 ${testResult.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {testResult.success ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
              <span>{testResult.message}</span>
            </p>
          )}
        </div>
      </div>

      {/* 3. Detection Confidence Threshold */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Sliders className="text-indigo-500" size={18} />
            <h3 className="font-semibold text-slate-800 dark:text-white text-sm">Detection Confidence Threshold</h3>
          </div>
          <span className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded">
            {confidenceThreshold}%
          </span>
        </div>

        <div>
          <input
            type="range"
            min="10"
            max="90"
            step="5"
            value={confidenceThreshold}
            onChange={(e) => setConfidenceThreshold(parseInt(e.target.value, 10))}
            className="w-full accent-sky-500 cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-slate-400 mt-1">
            <span>10% (Sensitive)</span>
            <span>50% (Recommended)</span>
            <span>90% (Strict)</span>
          </div>
        </div>
      </div>

      {/* 4. Active Pipeline Overview */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 block">Detection</span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Operational
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 block">Intensity</span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Operational
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 block">Track Forecast</span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Operational
            </span>
          </div>
        </div>
      </div>

      {/* 5. Save Button */}
      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-lg text-sm font-semibold shadow-xs cursor-pointer transition-colors"
        >
          {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
          <span>{saving ? 'Saving...' : 'Save AI Settings'}</span>
        </button>
      </div>

    </div>
  );
};

const MapSettingsSection = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  // Map settings state
  const [defaultViewMode, setDefaultViewMode] = useState('tactical');
  const [defaultLayer, setDefaultLayer] = useState('wind');
  const [defaultBasemap, setDefaultBasemap] = useState('satellite_base');
  const [showForecastTrack, setShowForecastTrack] = useState(true);
  const [windParticles, setWindParticles] = useState(true);

  // Load from MongoDB
  useEffect(() => {
    let isMounted = true;
    const loadSettings = async () => {
      setLoading(true);
      const res = await fetchMapSettings();
      if (isMounted && res.success && res.settings) {
        const s = res.settings;
        setDefaultViewMode(s.default_view_mode || 'tactical');
        setDefaultLayer(s.default_layer || 'wind');
        setDefaultBasemap(s.default_basemap || 'satellite_base');
        setShowForecastTrack(s.show_forecast_track !== undefined ? s.show_forecast_track : true);
        setWindParticles(s.wind_particles !== undefined ? s.wind_particles : true);
      }
      if (isMounted) setLoading(false);
    };
    loadSettings();
    return () => { isMounted = false; };
  }, []);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSaveStatus(null);
    try {
      const payload = {
        default_view_mode: defaultViewMode,
        default_layer: defaultLayer,
        default_basemap: defaultBasemap,
        show_forecast_track: Boolean(showForecastTrack),
        wind_particles: Boolean(windParticles)
      };
      const res = await updateMapSettings(payload);
      if (res.success) {
        setSaveStatus({ type: 'success', message: 'Map settings saved to MongoDB and dynamically updated!' });
      } else {
        setSaveStatus({ type: 'error', message: res.error || 'Failed to save map settings.' });
      }
    } catch (err) {
      setSaveStatus({ type: 'error', message: err.message || 'Error saving settings.' });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus(null), 4000);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <RefreshCw size={28} className="text-sky-500 animate-spin mb-2" />
        <span className="text-xs font-medium text-slate-500">Loading map settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {saveStatus && (
        <div className={`p-3 rounded-lg border flex items-center justify-between text-xs font-semibold shadow-xs ${
          saveStatus.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {saveStatus.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            <span>{saveStatus.message}</span>
          </div>
          <button onClick={() => setSaveStatus(null)} className="opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* 1. Map View Engine & Layers */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
          <Map className="text-sky-500" size={18} />
          <h3 className="font-semibold text-slate-800 dark:text-white text-sm">Default Cyclone Map Engine</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Default Map View Mode
            </label>
            <select
              value={defaultViewMode}
              onChange={(e) => setDefaultViewMode(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            >
              <option value="tactical">Tactical Map (India Coastal Monitor)</option>
              <option value="windy_engine">Radar Engine (Live Doppler / Numerical NWP)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Default Forecast Layer
            </label>
            <select
              value={defaultLayer}
              onChange={(e) => setDefaultLayer(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            >
              <option value="wind">Wind Speed & Vectors</option>
              <option value="precipitation">Precipitation & Rain</option>
              <option value="temperature">Sea Surface Temperature</option>
              <option value="humidity">Relative Humidity</option>
              <option value="pressure">Atmospheric Pressure</option>
              <option value="radar">Live Doppler Radar</option>
              <option value="satellite">Infrared Satellite Imagery</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Default Base Map
          </label>
          <select
            value={defaultBasemap}
            onChange={(e) => setDefaultBasemap(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
          >
            <option value="satellite_base">High-Resolution Satellite Basemap</option>
            <option value="street">Tactical Street & Navigation</option>
            <option value="ocean">Bathymetric Ocean Floor</option>
            <option value="terrain">Coastal Elevation & Terrain</option>
          </select>
        </div>
      </div>

      {/* 2. Trajectory & Visual Overlays */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
          <Compass className="text-indigo-500" size={18} />
          <h3 className="font-semibold text-slate-800 dark:text-white text-sm">Overlays & Trajectory</h3>
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 cursor-pointer">
            <div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                Show 5-Day Forecast Track by Default
              </span>
              <span className="text-[11px] text-slate-500">
                Automatically render the 24h–120h predicted trajectory line on active storms
              </span>
            </div>
            <input
              type="checkbox"
              checked={showForecastTrack}
              onChange={(e) => setShowForecastTrack(e.target.checked)}
              className="w-4 h-4 text-sky-500 rounded focus:ring-sky-500"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 cursor-pointer">
            <div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                Wind Particle Animation (Wind Page Only)
              </span>
              <span className="text-[11px] text-slate-500">
                Enable moving particle vectors on wind layers while preserving clean maps for other forecast layers
              </span>
            </div>
            <input
              type="checkbox"
              checked={windParticles}
              onChange={(e) => setWindParticles(e.target.checked)}
              className="w-4 h-4 text-sky-500 rounded focus:ring-sky-500"
            />
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-lg text-sm font-semibold shadow-xs cursor-pointer transition-colors"
        >
          {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
          <span>{saving ? 'Saving...' : 'Save Map Settings'}</span>
        </button>
      </div>
    </div>
  );
};

const NotificationsSection = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  // Notification state
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [autoSirenTrigger, setAutoSirenTrigger] = useState(true);
  const [smsBroadcast, setSmsBroadcast] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [coastalBulletins, setCoastalBulletins] = useState(true);
  const [soundVolume, setSoundVolume] = useState(80);

  // Load from MongoDB
  useEffect(() => {
    let isMounted = true;
    const loadSettings = async () => {
      setLoading(true);
      const res = await fetchNotificationSettings();
      if (isMounted && res.success && res.settings) {
        const s = res.settings;
        setSoundAlerts(s.sound_alerts !== undefined ? s.sound_alerts : true);
        setAutoSirenTrigger(s.auto_siren_trigger !== undefined ? s.auto_siren_trigger : true);
        setSmsBroadcast(s.sms_broadcast !== undefined ? s.sms_broadcast : true);
        setEmailAlerts(s.email_alerts !== undefined ? s.email_alerts : true);
        setCoastalBulletins(s.coastal_bulletins !== undefined ? s.coastal_bulletins : true);
        setSoundVolume(s.sound_volume ?? 80);
      }
      if (isMounted) setLoading(false);
    };
    loadSettings();
    return () => { isMounted = false; };
  }, []);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSaveStatus(null);
    try {
      const payload = {
        sound_alerts: Boolean(soundAlerts),
        auto_siren_trigger: Boolean(autoSirenTrigger),
        sms_broadcast: Boolean(smsBroadcast),
        email_alerts: Boolean(emailAlerts),
        coastal_bulletins: Boolean(coastalBulletins),
        sound_volume: Number(soundVolume)
      };
      const res = await updateNotificationSettings(payload);
      if (res.success) {
        setSaveStatus({ type: 'success', message: 'Notification preferences saved to MongoDB!' });
      } else {
        setSaveStatus({ type: 'error', message: res.error || 'Failed to save notifications.' });
      }
    } catch (err) {
      setSaveStatus({ type: 'error', message: err.message || 'Error saving settings.' });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus(null), 4000);
    }
  };

  const handleTestSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime((soundVolume / 100) * 0.3, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (_) {}
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <RefreshCw size={28} className="text-sky-500 animate-spin mb-2" />
        <span className="text-xs font-medium text-slate-500">Loading notifications...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {saveStatus && (
        <div className={`p-3 rounded-lg border flex items-center justify-between text-xs font-semibold shadow-xs ${
          saveStatus.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {saveStatus.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            <span>{saveStatus.message}</span>
          </div>
          <button onClick={() => setSaveStatus(null)} className="opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* 1. Siren & Sound Alerts */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
          <Volume2 className="text-rose-500" size={18} />
          <h3 className="font-semibold text-slate-800 dark:text-white text-sm">Emergency Siren & Audio</h3>
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 cursor-pointer">
            <div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                Audible Emergency Sirens
              </span>
              <span className="text-[11px] text-slate-500">
                Play siren audio when severe cyclonic storms are detected
              </span>
            </div>
            <input
              type="checkbox"
              checked={soundAlerts}
              onChange={(e) => setSoundAlerts(e.target.checked)}
              className="w-4 h-4 text-rose-500 rounded focus:ring-rose-500"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 cursor-pointer">
            <div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                Auto-Trigger Lighthouse Siren
              </span>
              <span className="text-[11px] text-slate-500">
                Automatically sound coastal lighthouse sirens upon Super Cyclone detection
              </span>
            </div>
            <input
              type="checkbox"
              checked={autoSirenTrigger}
              onChange={(e) => setAutoSirenTrigger(e.target.checked)}
              className="w-4 h-4 text-rose-500 rounded focus:ring-rose-500"
            />
          </label>

          {/* Volume Slider with Test Button */}
          <div className="pt-2">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span>Siren & Alarm Volume: <strong className="text-slate-700 dark:text-slate-200">{soundVolume}%</strong></span>
              <button
                type="button"
                onClick={handleTestSound}
                className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Volume2 size={13} />
                <span>Test Beep</span>
              </button>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={soundVolume}
              onChange={(e) => setSoundVolume(parseInt(e.target.value, 10))}
              className="w-full accent-rose-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 2. Coastal Early Warning Channels */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
          <Bell className="text-sky-500" size={18} />
          <h3 className="font-semibold text-slate-800 dark:text-white text-sm">Early Warning Channels</h3>
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 cursor-pointer">
            <div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                Official IMD Coastal Bulletins
              </span>
              <span className="text-[11px] text-slate-500">
                Receive live updates when official meteorological advisories are posted
              </span>
            </div>
            <input
              type="checkbox"
              checked={coastalBulletins}
              onChange={(e) => setCoastalBulletins(e.target.checked)}
              className="w-4 h-4 text-sky-500 rounded focus:ring-sky-500"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 cursor-pointer">
            <div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                Emergency Coastal SMS Broadcasts
              </span>
              <span className="text-[11px] text-slate-500">
                Send gale warnings to registered fishermen and harbor vessels
              </span>
            </div>
            <input
              type="checkbox"
              checked={smsBroadcast}
              onChange={(e) => setSmsBroadcast(e.target.checked)}
              className="w-4 h-4 text-sky-500 rounded focus:ring-sky-500"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 cursor-pointer">
            <div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                Email Alert Notifications
              </span>
              <span className="text-[11px] text-slate-500">
                Forward critical cyclone red alerts to administrator email address
              </span>
            </div>
            <input
              type="checkbox"
              checked={emailAlerts}
              onChange={(e) => setEmailAlerts(e.target.checked)}
              className="w-4 h-4 text-sky-500 rounded focus:ring-sky-500"
            />
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-lg text-sm font-semibold shadow-xs cursor-pointer transition-colors"
        >
          {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
          <span>{saving ? 'Saving...' : 'Save Notification Preferences'}</span>
        </button>
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
                placeholder="http://127.0.0.1:8001"
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
