import React, { useState } from 'react';
import { 
  User, 
  Anchor, 
  ShieldCheck, 
  Lock, 
  Mail, 
  Phone, 
  Eye, 
  EyeOff, 
  Ship, 
  MapPin, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  LogIn, 
  UserPlus, 
  KeyRound,
  Shield
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

const AuthPage = ({ initialRole = 'user', initialMode = 'register', onAdminSuccess, onUserSuccess, onNavigate }) => {
  // Role Selection: 'user' (Citizen/Fisherman) vs 'admin'
  const [role, setRole] = useState(initialRole);

  // User Mode: 'register' first, or 'login'
  const [authMode, setAuthMode] = useState(initialMode); // 'register' or 'login'

  // Credential Type: 'mobile' vs 'email'
  const [loginType, setLoginType] = useState('mobile');

  // Community User Type: 'fisherman' vs 'citizen'
  const [userType, setUserType] = useState('fisherman');

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

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errors, setErrors] = useState({});

  // Reset errors when switching role or mode
  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setErrors({});
    setErrorMessage('');
    setSuccessMessage('');
    setIdentifier('');
    setPassword('');
  };

  const handleModeChange = (newMode) => {
    setAuthMode(newMode);
    setErrors({});
    setErrorMessage('');
    setSuccessMessage('');
  };

  const validate = () => {
    const errs = {};

    if (role === 'admin') {
      const cleanId = identifier.trim();
      if (!cleanId) {
        errs.identifier = loginType === 'email' ? 'Admin email address is required' : 'Admin mobile number is required';
      } else if (loginType === 'email') {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(cleanId)) {
          errs.identifier = 'Enter a valid admin email (e.g. admin@cyclosafe.org)';
        }
      } else if (loginType === 'mobile') {
        const digits = cleanId.replace(/\D/g, '');
        if (digits.length !== 10) {
          errs.identifier = 'Admin mobile number must be exactly 10 digits';
        }
      }

      if (!password) {
        errs.password = 'Admin password is required';
      }
    } else {
      // User Role validations
      if (authMode === 'login') {
        const cleanId = identifier.trim();
        if (!cleanId) {
          errs.identifier = loginType === 'email' ? 'Email address is required' : 'Mobile number is required';
        } else if (loginType === 'email') {
          const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
          if (!emailRegex.test(cleanId)) {
            errs.identifier = 'Enter a valid email address';
          }
        } else if (loginType === 'mobile') {
          const digits = cleanId.replace(/\D/g, '');
          if (digits.length !== 10) {
            errs.identifier = 'Enter a valid 10-digit mobile number';
          }
        }

        if (!password) {
          errs.password = 'Password is required';
        }
      } else {
        // User Register validation
        if (!name.trim() || name.trim().length < 2) {
          errs.name = 'Full name is required (min 2 characters)';
        }

        const digits = phone.replace(/\D/g, '');
        if (digits.length !== 10) {
          errs.phone = '10-digit mobile number is required';
        }

        if (email.trim()) {
          let cleanEmail = email.trim();
          if (cleanEmail.includes('@') && !cleanEmail.split('@')[1].includes('.')) {
            cleanEmail = `${cleanEmail}.com`;
          }
          const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
          if (!emailRegex.test(cleanEmail)) {
            errs.email = 'Enter a valid email format (e.g. user@gmail.com) or leave blank';
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
          errs.vesselName = 'Vessel or Boat name is required for fishermen';
        }
      }
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setErrorMessage(Object.values(errs)[0]);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (role === 'admin') {
        // Admin Login
        const res = await loginUser({
          loginType,
          identifier: identifier.trim(),
          password,
          roleTarget: 'admin'
        });

        if (res.success) {
          setSuccessMessage('Admin clearance verified. Entering Admin Dashboard...');
          setTimeout(() => {
            if (onAdminSuccess) onAdminSuccess();
            else if (onNavigate) onNavigate('/admin');
          }, 600);
        } else {
          setErrorMessage(res.error || 'Authentication failed. Please verify admin credentials.');
        }
      } else if (authMode === 'login') {
        // User Login
        const res = await loginUser({
          loginType,
          identifier: identifier.trim(),
          password,
          roleTarget: 'user'
        });

        if (res.success) {
          setSuccessMessage('Login successful! Entering coastal dashboard...');
          setTimeout(() => {
            if (onUserSuccess) onUserSuccess();
            else if (onNavigate) onNavigate('/citizen');
          }, 600);
        } else {
          setErrorMessage(res.error || 'Login failed. Please check credentials or register.');
        }
      } else {
        // User Register
        let cleanEmail = email.trim() || null;
        if (cleanEmail && cleanEmail.includes('@') && !cleanEmail.split('@')[1].includes('.')) {
          cleanEmail = `${cleanEmail}.com`;
        }

        const payload = {
          name: name.trim(),
          login_type: loginType,
          phone: phone.replace(/\D/g, ''),
          email: cleanEmail,
          password,
          user_type: userType,
          status: userType === 'fisherman' ? 'IN_HARBOR' : 'ACTIVE',
          district,
          port: userType === 'fisherman' ? port : null,
          vessel_name: userType === 'fisherman' ? vesselName.trim() : null,
          vessel_reg: userType === 'fisherman' ? vesselReg.trim() : null,
          ward: userType === 'citizen' ? ward.trim() : null
        };

        const res = await registerUser(payload);
        if (res.success) {
          setSuccessMessage('Registration successful! Direct alerts active in MongoDB.');
          setTimeout(() => {
            if (onUserSuccess) onUserSuccess();
            else if (onNavigate) onNavigate('/citizen');
          }, 700);
        } else {
          setErrorMessage(res.error || 'Registration failed. Please check form details.');
        }
      }
    } catch (err) {
      setErrorMessage(err.message || 'Server connection error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillQuickAdmin = () => {
    setRole('admin');
    setLoginType('email');
    setIdentifier('admin@cyclosafe.org');
    setPassword('Admin@123SecurePassword');
    setErrors({});
    setErrorMessage('');
  };

  const fillQuickUser = () => {
    setRole('user');
    setAuthMode('login');
    setLoginType('mobile');
    setIdentifier('9845112233');
    setPassword('Password@123');
    setErrors({});
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 via-sky-50/60 to-blue-50 text-slate-800 select-none">
      
      {/* Subtle light ambient glow */}
      <div className="absolute top-12 left-12 w-96 h-96 bg-sky-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-12 right-12 w-96 h-96 bg-emerald-200/40 rounded-full blur-3xl pointer-events-none" />

      {/* PURE LIGHT CARD (NOT DARK) */}
      <div className="w-full max-w-lg bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-sky-950/10 relative z-10 transition-all">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500/15 to-emerald-500/15 border border-sky-400/30 flex items-center justify-center shadow-sm mb-3">
            <img 
              src={cycloneLogo} 
              alt="CycloSafe Logo" 
              className="w-9 h-9 object-contain animate-cyclone-spin" 
            />
          </div>

          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              Cyclo<span className="text-sky-600">Safe</span>
            </h1>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
              role === 'admin' 
                ? 'bg-rose-50 text-rose-700 border-rose-300'
                : 'bg-emerald-50 text-emerald-700 border-emerald-300'
            }`}>
              {role === 'admin' ? 'Admin Portal' : 'User Portal'}
            </span>
          </div>

          <p className="text-xs text-slate-500 font-medium mt-1">
            {role === 'admin' 
              ? 'Command Center Operational Gateway' 
              : 'Coastal Citizen & Fisherman Safety Gateway'}
          </p>
        </div>

        {/* 1. TOP ROLE SWITCHER: User vs Admin */}
        <div className="mb-5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 text-center">
            Select Portal Access
          </label>
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => handleRoleChange('user')}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                role === 'user'
                  ? 'bg-white text-sky-700 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <User size={14} className={role === 'user' ? 'text-sky-600' : 'text-slate-400'} />
              <span>User / Citizen</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleChange('admin')}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                role === 'admin'
                  ? 'bg-white text-rose-700 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShieldCheck size={14} className={role === 'admin' ? 'text-rose-600' : 'text-slate-400'} />
              <span>Admin Portal</span>
            </button>
          </div>
        </div>

        {/* Status Alerts */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2 animate-shake">
            <AlertCircle size={16} className="shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* 2. FOR USER: Option to Register first, or Login */}
        {role === 'user' && (
          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 mb-4">
            <button
              type="button"
              onClick={() => handleModeChange('register')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                authMode === 'register'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus size={13} />
              <span>New Registration</span>
            </button>

            <button
              type="button"
              onClick={() => handleModeChange('login')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                authMode === 'login'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogIn size={13} />
              <span>Sign In</span>
            </button>
          </div>
        )}

        {/* 3. OPTION SELECTOR: Mobile Number vs Email */}
        <div className="mb-4">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Login Credential Method
          </label>
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setLoginType('mobile');
                setErrors({});
                setErrorMessage('');
              }}
              className={`flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                loginType === 'mobile'
                  ? 'bg-white text-sky-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-800'
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
                  ? 'bg-white text-sky-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Mail size={13} />
              <span>Email Address</span>
            </button>
          </div>
        </div>

        {/* FOR USER REGISTRATION: Role (Fisherman vs Citizen) */}
        {role === 'user' && authMode === 'register' && (
          <div className="mb-4">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Select Coastal Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUserType('fisherman')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  userType === 'fisherman'
                    ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Anchor size={14} className="text-sky-600" />
                <span>Fisherman</span>
              </button>

              <button
                type="button"
                onClick={() => setUserType('citizen')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  userType === 'citizen'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <User size={14} className="text-emerald-600" />
                <span>Coastal Citizen</span>
              </button>
            </div>
          </div>
        )}

        {/* DYNAMIC FORM */}
        <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>

          {/* ADMIN FORM */}
          {role === 'admin' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {loginType === 'email' ? 'Admin Email Address' : 'Admin Mobile Number'}
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
                    placeholder={loginType === 'email' ? 'admin@cyclosafe.org' : '9999999999'}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs sm:text-sm bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 transition-all ${
                      errors.identifier
                        ? 'border-rose-400 focus:ring-rose-200 bg-rose-50/50'
                        : 'border-slate-200 focus:border-rose-500 focus:ring-rose-500/20'
                    }`}
                  />
                </div>
                {errors.identifier && (
                  <p className="text-[11px] font-semibold text-rose-600 mt-1 pl-1">
                    {errors.identifier}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Admin Secure Password
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
                    placeholder="Enter admin password"
                    className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-xs sm:text-sm bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 transition-all ${
                      errors.password
                        ? 'border-rose-400 focus:ring-rose-200 bg-rose-50/50'
                        : 'border-slate-200 focus:border-rose-500 focus:ring-rose-500/20'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-[11px] font-semibold text-rose-600 mt-1 pl-1">
                    {errors.password}
                  </p>
                )}
              </div>
            </>
          )}

          {/* USER SIGN IN FORM */}
          {role === 'user' && authMode === 'login' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
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
                    placeholder={loginType === 'email' ? 'ramesh.naik@gmail.com' : '9845112233'}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs sm:text-sm bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 transition-all ${
                      errors.identifier
                        ? 'border-rose-400 focus:ring-rose-200 bg-rose-50/50'
                        : 'border-slate-200 focus:border-sky-500 focus:ring-sky-500/20'
                    }`}
                  />
                </div>
                {errors.identifier && (
                  <p className="text-[11px] font-semibold text-rose-600 mt-1 pl-1">
                    {errors.identifier}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
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
                    placeholder="Enter your account password"
                    className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-xs sm:text-sm bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 transition-all ${
                      errors.password
                        ? 'border-rose-400 focus:ring-rose-200 bg-rose-50/50'
                        : 'border-slate-200 focus:border-sky-500 focus:ring-sky-500/20'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-[11px] font-semibold text-rose-600 mt-1 pl-1">
                    {errors.password}
                  </p>
                )}
              </div>
            </>
          )}

          {/* USER REGISTRATION FORM */}
          {role === 'user' && authMode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
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
                    className={`w-full pl-10 pr-4 py-2 rounded-xl border text-xs sm:text-sm bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 transition-all ${
                      errors.name ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200 focus:border-sky-500 focus:ring-sky-500/20'
                    }`}
                  />
                </div>
                {errors.name && (
                  <p className="text-[11px] font-semibold text-rose-600 mt-0.5 pl-1">
                    {errors.name}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
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
                      className={`w-full pl-10 pr-4 py-2 rounded-xl border text-xs sm:text-sm bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 transition-all ${
                        errors.phone ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200 focus:border-sky-500 focus:ring-sky-500/20'
                      }`}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-0.5 pl-1">
                      {errors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Address (Optional)
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-slate-400 pointer-events-none">
                      <Mail size={16} />
                    </span>
                    <input
                      type="text"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errors.email) setErrors({ ...errors, email: null });
                      }}
                      placeholder="user@gmail.com"
                      className={`w-full pl-10 pr-4 py-2 rounded-xl border text-xs sm:text-sm bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 transition-all ${
                        errors.email ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200 focus:border-sky-500 focus:ring-sky-500/20'
                      }`}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-0.5 pl-1">
                      {errors.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Fisherman Fields */}
              {userType === 'fisherman' ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Base Port / Harbor
                      </label>
                      <select
                        value={port}
                        onChange={(e) => setPort(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm bg-slate-50 text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-sky-500/20 cursor-pointer"
                      >
                        {PORTS.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Boat / Vessel Name
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
                          className={`w-full pl-10 pr-4 py-2 rounded-xl border text-xs sm:text-sm bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 transition-all ${
                            errors.vesselName ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200 focus:border-sky-500 focus:ring-sky-500/20'
                          }`}
                        />
                      </div>
                      {errors.vesselName && (
                        <p className="text-[11px] font-semibold text-rose-600 mt-0.5 pl-1">
                          {errors.vesselName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Vessel Registration Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={vesselReg}
                      onChange={(e) => setVesselReg(e.target.value)}
                      placeholder="e.g. IND-KA-02-MM-1029"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>
                </>
              ) : (
                /* Citizen Fields */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Coastal District
                    </label>
                    <select
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm bg-slate-50 text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-sky-500/20 cursor-pointer"
                    >
                      {DISTRICTS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Coastal Ward / Village
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-slate-400 pointer-events-none">
                        <MapPin size={16} />
                      </span>
                      <input
                        type="text"
                        value={ward}
                        onChange={(e) => setWard(e.target.value)}
                        placeholder="e.g. Malpe Beach Ward 3"
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-sky-500/20"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Password & Confirm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
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
                    className={`w-full px-3 py-2 rounded-xl border text-xs sm:text-sm bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 transition-all ${
                      errors.password ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200 focus:border-sky-500 focus:ring-sky-500/20'
                    }`}
                  />
                  {errors.password && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-0.5 pl-1">
                      {errors.password}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: null });
                    }}
                    placeholder="Confirm password"
                    className={`w-full px-3 py-2 rounded-xl border text-xs sm:text-sm bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 transition-all ${
                      errors.confirmPassword ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200 focus:border-sky-500 focus:ring-sky-500/20'
                    }`}
                  />
                  {errors.confirmPassword && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-0.5 pl-1">
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
            className={`w-full mt-3 py-3 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              role === 'admin'
                ? 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 shadow-rose-500/20'
                : 'bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 shadow-sky-500/20'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                {role === 'admin' ? (
                  <>
                    <KeyRound size={16} />
                    <span>Authorize Admin Login</span>
                  </>
                ) : authMode === 'login' ? (
                  <>
                    <LogIn size={16} />
                    <span>Sign In to Citizen Dashboard</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    <span>Register into MongoDB & Enter</span>
                  </>
                )}
              </>
            )}
          </button>
        </form>

        {/* Quick Autofill Helper Buttons */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>Quick Demo Fill:</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={fillQuickUser}
              className="text-sky-600 hover:text-sky-800 font-bold hover:underline cursor-pointer"
            >
              Fill Fisherman (9845112233)
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={fillQuickAdmin}
              className="text-rose-600 hover:text-rose-800 font-bold hover:underline cursor-pointer"
            >
              Fill Admin
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AuthPage;
