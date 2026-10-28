import React, { useState } from 'react';
import { 
  User, 
  Anchor, 
  Phone, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Ship, 
  MapPin, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  LogIn, 
  UserPlus
} from 'lucide-react';
import cycloneLogo from '../assets/cyclone-logo.png';
import { loginUser, registerUser } from '../utils/authService';

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

const UserLoginPage = ({ onLoginSuccess, onNavigate }) => {
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [loginType, setLoginType] = useState('mobile'); // 'mobile' or 'email'
  const [userType, setUserType] = useState('fisherman'); // 'fisherman' or 'citizen'

  // Form Fields
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [port, setPort] = useState(PORTS[0]);
  const [district, setDistrict] = useState(DISTRICTS[0]);
  const [ward, setWard] = useState('');
  const [vesselName, setVesselName] = useState('');
  const [vesselReg, setVesselReg] = useState('');
  const [vesselType, setVesselType] = useState('Deep Sea Trawler');

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const errs = {};

    if (authMode === 'login') {
      const cleanId = identifier.trim();
      if (!cleanId) {
        errs.identifier = loginType === 'email' ? 'Email address is required' : 'Mobile number is required';
      } else if (loginType === 'email') {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(cleanId)) {
          errs.identifier = 'Please enter a valid email address';
        }
      } else if (loginType === 'mobile') {
        const digits = cleanId.replace(/\D/g, '');
        if (digits.length !== 10) {
          errs.identifier = 'Please enter a valid 10-digit mobile number';
        }
      }

      if (!password) {
        errs.password = 'Password is required';
      }
    } else {
      // Registration validation
      if (!name.trim() || name.trim().length < 2) {
        errs.name = 'Full name is required (min 2 characters)';
      }

      const digits = phone.replace(/\D/g, '');
      if (digits.length !== 10) {
        errs.phone = 'Valid 10-digit mobile number is required';
      }

      if (email.trim()) {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email.trim())) {
          errs.email = 'Please enter a valid email format';
        }
      }

      if (!password) {
        errs.password = 'Password is required';
      } else if (password.length < 6) {
        errs.password = 'Password must be at least 6 characters';
      }

      if (password !== confirmPassword) {
        errs.confirmPassword = 'Passwords do not match';
      }

      if (userType === 'fisherman' && !vesselName.trim()) {
        errs.vesselName = 'Vessel / Boat name is required for fishermen';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      if (authMode === 'login') {
        const res = await loginUser({
          loginType,
          identifier: identifier.trim(),
          password,
          roleTarget: 'user'
        });

        if (res.success) {
          setSuccessMessage('Login successful! Entering coastal dashboard...');
          setTimeout(() => {
            if (onLoginSuccess) {
              onLoginSuccess();
            } else if (onNavigate) {
              onNavigate('/citizen');
            }
          }, 600);
        } else {
          setErrorMessage(res.error || 'Login failed. Please check your credentials.');
        }
      } else {
        // Register Mode
        const rawPhone = phone.replace(/\D/g, '');
        const savedPassword = password;
        const registeredLoginType = loginType;
        const cleanEmail = email.trim() || null;

        const payload = {
          name: name.trim(),
          login_type: loginType,
          phone: rawPhone,
          email: cleanEmail,
          password: savedPassword,
          user_type: userType,
          status: userType === 'fisherman' ? 'IN_HARBOR' : 'ACTIVE',
          district,
          port: userType === 'fisherman' ? port : null,
          vessel_name: userType === 'fisherman' ? vesselName.trim() : null,
          vessel_reg: userType === 'fisherman' ? vesselReg.trim() : null,
          vessel_type: userType === 'fisherman' ? vesselType : null,
          ward: userType === 'citizen' ? ward.trim() : null
        };

        const res = await registerUser(payload, { autoLogin: false });
        if (res.success) {
          setAuthMode('login');
          if (registeredLoginType === 'email' && cleanEmail) {
            setLoginType('email');
            setIdentifier(cleanEmail);
          } else {
            setLoginType('mobile');
            setIdentifier(rawPhone);
          }
          setPassword(savedPassword);
          setConfirmPassword('');
          setErrors({});
          setSuccessMessage('Registration successful! Your login credentials have been pre-filled. Please click "Sign In" below to enter.');
        } else {
          setErrorMessage(res.error || 'Registration could not be completed.');
        }
      }
    } catch (err) {
      setErrorMessage(err.message || 'Server connection error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoAccount = () => {
    setAuthMode('login');
    setLoginType('mobile');
    setIdentifier('9845112233');
    setPassword('Password@123');
    setErrors({});
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-100 dark:bg-[#070d1e] text-slate-900 dark:text-slate-100 relative overflow-hidden select-none">
      {/* Background glow effects */}
      <div className="absolute top-10 left-10 w-80 h-80 bg-sky-500/10 dark:bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl backdrop-blur-xl relative z-10 transition-all">
        
        {/* Portal Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500/20 to-emerald-500/20 border border-sky-500/30 flex items-center justify-center shadow-md">
              <img 
                src={cycloneLogo} 
                alt="CycloSafe Logo" 
                className="w-9 h-9 object-contain animate-cyclone-spin" 
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Cyclo<span className="text-sky-500">Safe</span>
            </h1>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
              Community Portal
            </span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
            Coastal Citizen & Fisherman Safety Gateway
          </span>
        </div>

        {/* Status Alerts */}
        {errorMessage && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Auth Mode Toggle (Login vs Register) */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800 mb-5">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setErrors({});
              setErrorMessage('');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              authMode === 'login'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <LogIn size={14} />
            <span>Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode('register');
              setErrors({});
              setErrorMessage('');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              authMode === 'register'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <UserPlus size={14} />
            <span>New Registration</span>
          </button>
        </div>

        {/* 1. Selector: Mobile Number vs Email */}
        <div className="mb-4">
          <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
            Login Credential Method
          </label>
          <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setLoginType('mobile');
                setErrors({});
                setErrorMessage('');
              }}
              className={`flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                loginType === 'mobile'
                  ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Phone size={13} />
              <span>Mobile Number</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setLoginType('email');
                setErrors({});
                setErrorMessage('');
              }}
              className={`flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                loginType === 'email'
                  ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Mail size={13} />
              <span>Email Address</span>
            </button>
          </div>
        </div>

        {/* Registration Specific: User Type Selection */}
        {authMode === 'register' && (
          <div className="mb-4">
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Select Coastal Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUserType('fisherman')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  userType === 'fisherman'
                    ? 'border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Anchor size={14} className="text-sky-500" />
                <span>Fisherman</span>
              </button>

              <button
                type="button"
                onClick={() => setUserType('citizen')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  userType === 'citizen'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-slate-600 dark:text-slate-400'
                }`}
              >
                <User size={14} className="text-emerald-500" />
                <span>Coastal Citizen</span>
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
          {authMode === 'login' ? (
            <>
              {/* LOGIN MODE FIELDS */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {loginType === 'email' ? 'Registered Email' : 'Registered Mobile Number'}
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-slate-400 pointer-events-none">
                    {loginType === 'email' ? <Mail size={16} /> : <Phone size={16} />}
                  </span>
                  <input
                    type={loginType === 'email' ? 'email' : 'tel'}
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (errors.identifier) setErrors({ ...errors, identifier: null });
                    }}
                    placeholder={loginType === 'email' ? 'user@domain.com' : '9876543210'}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs sm:text-sm bg-slate-50 dark:bg-slate-950/70 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 transition-all ${
                      errors.identifier
                        ? 'border-rose-500/80 focus:ring-rose-500/30'
                        : 'border-slate-300 dark:border-slate-800 focus:border-sky-500 focus:ring-sky-500/20'
                    }`}
                  />
                </div>
                {errors.identifier && (
                  <p className="text-[11px] font-semibold text-rose-500 mt-1 pl-1">
                    {errors.identifier}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-slate-400 pointer-events-none">
                    <Lock size={16} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors({ ...errors, password: null });
                    }}
                    placeholder="Enter account password"
                    className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-xs sm:text-sm bg-slate-50 dark:bg-slate-950/70 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 transition-all ${
                      errors.password
                        ? 'border-rose-500/80 focus:ring-rose-500/30'
                        : 'border-slate-300 dark:border-slate-800 focus:border-sky-500 focus:ring-sky-500/20'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-[11px] font-semibold text-rose-500 mt-1 pl-1">
                    {errors.password}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              {/* REGISTER MODE FIELDS */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-slate-400 pointer-events-none">
                    <User size={16} />
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors({ ...errors, name: null });
                    }}
                    placeholder="e.g. Ramesh Naik"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 text-xs sm:text-sm bg-slate-50 dark:bg-slate-950/70 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>
                {errors.name && (
                  <p className="text-[11px] font-semibold text-rose-500 mt-1 pl-1">
                    {errors.name}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mobile Number (10 digits)
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-slate-400 pointer-events-none">
                      <Phone size={16} />
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (errors.phone) setErrors({ ...errors, phone: null });
                      }}
                      placeholder="9876543210"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 text-xs sm:text-sm bg-slate-50 dark:bg-slate-950/70 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-[11px] font-semibold text-rose-500 mt-1 pl-1">
                      {errors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address (Optional)
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-slate-400 pointer-events-none">
                      <Mail size={16} />
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errors.email) setErrors({ ...errors, email: null });
                      }}
                      placeholder="user@gmail.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 text-xs sm:text-sm bg-slate-50 dark:bg-slate-950/70 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-[11px] font-semibold text-rose-500 mt-1 pl-1">
                      {errors.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Fisherman specific fields */}
              {userType === 'fisherman' ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Base Harbor / Port
                      </label>
                      <select
                        value={port}
                        onChange={(e) => setPort(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 text-xs sm:text-sm bg-slate-50 dark:bg-slate-950/70 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 cursor-pointer"
                      >
                        {PORTS.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Vessel / Boat Name
                      </label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3.5 text-slate-400 pointer-events-none">
                          <Ship size={16} />
                        </span>
                        <input
                          type="text"
                          value={vesselName}
                          onChange={(e) => {
                            setVesselName(e.target.value);
                            if (errors.vesselName) setErrors({ ...errors, vesselName: null });
                          }}
                          placeholder="e.g. Sea Falcon"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 text-xs sm:text-sm bg-slate-50 dark:bg-slate-950/70 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
                        />
                      </div>
                      {errors.vesselName && (
                        <p className="text-[11px] font-semibold text-rose-500 mt-1 pl-1">
                          {errors.vesselName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Vessel Reg Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={vesselReg}
                      onChange={(e) => setVesselReg(e.target.value)}
                      placeholder="e.g. IND-KA-02-MM-1029"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 text-xs sm:text-sm bg-slate-50 dark:bg-slate-950/70 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>
                </>
              ) : (
                /* Citizen specific fields */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Coastal District
                    </label>
                    <select
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 text-xs sm:text-sm bg-slate-50 dark:bg-slate-950/70 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 cursor-pointer"
                    >
                      {DISTRICTS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Coastal Ward / Locality
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-slate-400 pointer-events-none">
                        <MapPin size={16} />
                      </span>
                      <input
                        type="text"
                        value={ward}
                        onChange={(e) => setWard(e.target.value)}
                        placeholder="e.g. Ward 3 - Malpe Beach"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 text-xs sm:text-sm bg-slate-50 dark:bg-slate-950/70 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Password (min 6 chars)
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors({ ...errors, password: null });
                    }}
                    placeholder="Create password"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 text-xs sm:text-sm bg-slate-50 dark:bg-slate-950/70 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
                  />
                  {errors.password && (
                    <p className="text-[11px] font-semibold text-rose-500 mt-1 pl-1">
                      {errors.password}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: null });
                    }}
                    placeholder="Repeat password"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 text-xs sm:text-sm bg-slate-50 dark:bg-slate-950/70 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
                  />
                  {errors.confirmPassword && (
                    <p className="text-[11px] font-semibold text-rose-500 mt-1 pl-1">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-400 hover:to-emerald-400 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-sky-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>{authMode === 'login' ? 'Authenticating...' : 'Registering in MongoDB...'}</span>
              </>
            ) : (
              <>
                {authMode === 'login' ? <LogIn size={16} /> : <UserPlus size={16} />}
                <span>{authMode === 'login' ? 'Sign In to Dashboard' : 'Complete Registration'}</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Account Filler */}
        <div className="mt-5 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>Testing?</span>
          <button
            type="button"
            onClick={fillDemoAccount}
            className="text-sky-500 hover:text-sky-600 dark:hover:text-sky-400 font-bold cursor-pointer"
          >
            Autofill Registered Fisherman (9845112233)
          </button>
        </div>

      </div>
    </div>
  );
};

export default UserLoginPage;
