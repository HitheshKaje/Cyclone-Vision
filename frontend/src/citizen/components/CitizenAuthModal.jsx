import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Anchor, 
  User, 
  Phone, 
  MapPin, 
  Ship, 
  ShieldCheck, 
  X, 
  CheckCircle2, 
  Loader2, 
  ArrowRight,
  Radio,
  LogIn,
  UserPlus
} from 'lucide-react';
import { registerCitizenUser } from '../services/citizenApi';

const PORTS = [
  'Malpe Fishery Harbor (Udupi)',
  'Mangalore Old Port (Dakshina Kannada)',
  'Karwar Baitkhol Fishery Harbor',
  'Tadadi Port (Kumta)',
  'Honnavar Port (Uttara Kannada)',
  'Gangolli Fishing Harbor (Kundapura)',
  'Bhatkal Coastal Port',
  'Belekeri Port'
];

const DISTRICTS = [
  'Udupi',
  'Dakshina Kannada',
  'Uttara Kannada'
];

const CitizenAuthModal = ({ isOpen, onClose, onUserAuthenticated }) => {
  const { t, i18n } = useTranslation();
  const isKn = i18n.language === 'kn';

  const [mode, setMode] = useState('register'); // 'register' or 'login'
  const [userType, setUserType] = useState('fisherman'); // 'fisherman' or 'citizen'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [port, setPort] = useState(PORTS[0]);
  const [district, setDistrict] = useState(DISTRICTS[0]);
  const [vesselName, setVesselName] = useState('');
  const [vesselReg, setVesselReg] = useState('');
  const [vesselType, setVesselType] = useState('Deep Sea Trawler');
  const [status, setStatus] = useState('IN_HARBOR');
  const [ward, setWard] = useState('');
  const [alertsEnabled, setAlertsEnabled] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!phone || phone.trim().length < 8) {
      setErrorMsg(isKn ? 'ದಯವಿಟ್ಟು ಮಾನ್ಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ' : 'Please enter a valid mobile phone number.');
      return;
    }

    if (mode === 'register' && !name.trim()) {
      setErrorMsg(isKn ? 'ದಯವಿಟ್ಟು ಪೂರ್ಣ ಹೆಸರನ್ನು ನಮೂದಿಸಿ' : 'Please enter your full name.');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      name: name.trim() || `User ${phone.slice(-4)}`,
      phone: phone.trim(),
      user_type: userType,
      status: userType === 'fisherman' ? status : 'ACTIVE',
      alerts_enabled: alertsEnabled,
      district: district,
      port: userType === 'fisherman' ? port : null,
      vessel_name: userType === 'fisherman' ? vesselName.trim() : null,
      vessel_reg: userType === 'fisherman' ? vesselReg.trim() : null,
      vessel_type: userType === 'fisherman' ? vesselType : null,
      ward: userType === 'citizen' ? ward.trim() : null
    };

    const res = await registerCitizenUser(payload);
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMsg(
        isKn 
          ? 'ನೋಂದಣಿ ಯಶಸ್ವಿಯಾಗಿದೆ! ಕರಾವಳಿ ಎಚ್ಚರಿಕೆಗಳನ್ನು ಸಕ್ರಿಯಗೊಳಿಸಲಾಗಿದೆ.' 
          : 'Registration successful! Direct emergency cyclone alerts are active.'
      );
      if (onUserAuthenticated) {
        onUserAuthenticated(res.data);
      }
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1500);
    } else {
      setErrorMsg(res.error || 'Registration failed. Please check connection.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3.5 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 my-8">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${userType === 'fisherman' ? 'bg-sky-500/10 text-sky-500 border-sky-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
              {userType === 'fisherman' ? <Anchor size={20} /> : <User size={20} />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {isKn ? 'ಕರಾವಳಿ ನಾಗರಿಕ / ಮತ್ಸ್ಯೋದ್ಯಮಿ ಲಾಗಿನ್' : 'Coastal Community Emergency Registry'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isKn ? 'ನೇರ ಚಂಡಮಾರುತ ಮುನ್ನೆಚ್ಚರಿಕೆ & ಸೈರನ್ ಸಂದೇಶ ಪಡೆಯಿರಿ' : 'Receive immediate SMS siren alerts & emergency coastal advisories'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* User Type Segmented Selector */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
          <button
            type="button"
            onClick={() => setUserType('fisherman')}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              userType === 'fisherman'
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Anchor size={15} />
            <span>{isKn ? 'ಮತ್ಸ್ಯೋದ್ಯಮಿ (Fisherman)' : 'Fisherman / Vessel'}</span>
          </button>

          <button
            type="button"
            onClick={() => setUserType('citizen')}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              userType === 'citizen'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <User size={15} />
            <span>{isKn ? 'ನಾಗರಿಕ (Resident)' : 'Coastal Citizen'}</span>
          </button>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold border border-rose-500/20">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20 flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Registration / Login Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isKn ? 'ಪೂರ್ಣ ಹೆಸರು' : 'Full Name'} *
            </label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={userType === 'fisherman' ? 'e.g. Ramesh Kharvi' : 'e.g. Priya Nayak'}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Mobile Phone Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isKn ? 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ (SMS & ಸೈರನ್ ಎಚ್ಚರಿಕೆಗಾಗಿ)' : 'Mobile Phone Number (For SMS & Siren Broadcasts)'} *
            </label>
            <div className="relative">
              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98450 12345"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Conditional Fisherman Fields */}
          {userType === 'fisherman' && (
            <div className="space-y-3 p-3 rounded-xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40">
              <div className="text-[11px] font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                <Ship size={14} />
                <span>{isKn ? 'ದೋಣಿ / ಬೋಟು ವಿವರಗಳು' : 'Vessel & Harbor Information'}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Vessel Name */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    {isKn ? 'ದೋಣಿ ಹೆಸರು' : 'Vessel / Boat Name'}
                  </label>
                  <input
                    type="text"
                    value={vesselName}
                    onChange={(e) => setVesselName(e.target.value)}
                    placeholder="e.g. Sea Queen IV"
                    className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-medium"
                  />
                </div>

                {/* Vessel Registration */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    {isKn ? 'ಬೋಟು ನೋಂದಣಿ ಸಂಖ್ಯೆ' : 'Vessel Reg. No (IND-KA-...)'}
                  </label>
                  <input
                    type="text"
                    value={vesselReg}
                    onChange={(e) => setVesselReg(e.target.value)}
                    placeholder="e.g. IND-KA-02-MM-1049"
                    className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Base Harbor / Port */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    {isKn ? 'ಮೂಲ ಬಂದರು' : 'Home Port / Harbor'}
                  </label>
                  <select
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-medium cursor-pointer"
                  >
                    {PORTS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                {/* Sea Safety Status */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    {isKn ? 'ಪ್ರಸ್ತುತ ಸ್ಥಿತಿ' : 'Current Status'}
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold cursor-pointer"
                  >
                    <option value="IN_HARBOR">⚓ In Safe Harbor (ಸುರಕ್ಷಿತ ಬಂದರಿನಲ್ಲಿದೆ)</option>
                    <option value="AT_SEA">🌊 At Sea (ಆಳ ಸಮುದ್ರದಲ್ಲಿದೆ)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Conditional Citizen Fields */}
          {userType === 'citizen' && (
            <div className="space-y-3 p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
              <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={14} />
                <span>{isKn ? 'ವಾಸಸ್ಥಳ ವಿವರಗಳು' : 'Coastal Locality Information'}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Coastal District */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    {isKn ? 'ಜಿಲ್ಲೆ' : 'Coastal District'}
                  </label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-medium cursor-pointer"
                  >
                    {DISTRICTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Coastal Ward / Locality */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    {isKn ? 'ಕರಾವಳಿ ವಾರ್ಡ್ / ಗ್ರಾಮ' : 'Coastal Ward / Locality'}
                  </label>
                  <input
                    type="text"
                    value={ward}
                    onChange={(e) => setWard(e.target.value)}
                    placeholder="e.g. Kaup Ward #03, Panambur"
                    className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Direct Alert Notification Toggle */}
          <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 cursor-pointer">
            <input
              type="checkbox"
              checked={alertsEnabled}
              onChange={(e) => setAlertsEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-sky-500 focus:ring-sky-500 border-slate-300 dark:border-slate-600"
            />
            <div className="text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                {isKn ? 'ತುರ್ತು ಸೈರನ್ & ಚಂಡಮಾರುತ SMS ಪಡೆಯಿರಿ' : 'Receive Emergency Siren & Broadcast Alerts'}
              </span>
              <span className="text-[11px] text-slate-400 block">
                {isKn ? 'ಅಡ್ಮಿನ್ ನೀಡುವ ಚಂಡಮಾರುತ ಎಚ್ಚರಿಕೆಗಳು ನೇರವಾಗಿ ಬರುತ್ತವೆ' : 'Real-time alert notifications when cyclone approaches coast'}
              </span>
            </div>
          </label>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
                userType === 'fisherman'
                  ? 'bg-sky-500 hover:bg-sky-600 active:scale-98'
                  : 'bg-emerald-500 hover:bg-emerald-600 active:scale-98'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{isKn ? 'ನೋಂದಾಯಿಸಲಾಗುತ್ತಿದೆ...' : 'Registering in Command Directory...'}</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  <span>
                    {isKn 
                      ? 'ನೋಂದಾಯಿಸಿ ಮತ್ತು ಎಚ್ಚರಿಕೆ ಸಕ್ರಿಯಗೊಳಿಸಿ' 
                      : `Register as ${userType === 'fisherman' ? 'Fisherman' : 'Citizen'} & Sync`}
                  </span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default CitizenAuthModal;
