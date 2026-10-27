import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  Phone, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  KeyRound,
  ShieldAlert
} from 'lucide-react';
import cycloneLogo from '../assets/cyclone-logo.png';
import { loginUser } from '../utils/authService';

const AdminLoginPage = ({ onLoginSuccess, onNavigate }) => {
  const [loginType, setLoginType] = useState('email'); // 'email' or 'mobile'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Field validation errors
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    const cleanId = identifier.trim();

    if (!cleanId) {
      errs.identifier = loginType === 'email' ? 'Admin email address is required' : 'Admin mobile number is required';
    } else if (loginType === 'email') {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(cleanId)) {
        errs.identifier = 'Please enter a valid admin email (e.g. admin@cyclosafe.org)';
      }
    } else if (loginType === 'mobile') {
      const phoneDigits = cleanId.replace(/\D/g, '');
      if (phoneDigits.length !== 10) {
        errs.identifier = 'Admin mobile number must be exactly 10 digits';
      }
    }

    if (!password) {
      errs.password = 'Admin password is required';
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const res = await loginUser({
        loginType,
        identifier: identifier.trim(),
        password,
        roleTarget: 'admin'
      });

      if (res.success) {
        setSuccessMessage('Admin clearance verified. Entering Command Center...');
        setTimeout(() => {
          if (onLoginSuccess) {
            onLoginSuccess();
          } else if (onNavigate) {
            onNavigate('/admin');
          }
        }, 700);
      } else {
        setErrorMessage(res.error || 'Authentication rejected. Please verify credentials.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Unable to connect to authorization server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillQuickCredentials = (type) => {
    setLoginType(type);
    setIdentifier(type === 'email' ? 'admin@cyclosafe.org' : '9999999999');
    setPassword('Admin@123SecurePassword');
    setErrors({});
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-950 text-slate-100 relative overflow-hidden select-none">
      {/* Background Cyber Accents */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500/20 to-emerald-500/20 border border-sky-500/30 flex items-center justify-center shadow-lg">
              <img 
                src={cycloneLogo} 
                alt="CycloSafe Logo" 
                className="w-9 h-9 object-contain animate-cyclone-spin" 
              />
            </div>
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-emerald-400">
              <ShieldCheck size={12} />
            </span>
          </div>

          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Cyclo<span className="text-sky-400">Safe</span>
            </h1>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/30">
              Admin Terminal
            </span>
          </div>
          <span className="text-xs text-slate-400 font-medium mt-1">
            Command Center Operational Gateway
          </span>
        </div>

        {/* Status Alerts */}
        {errorMessage && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2 animate-shake">
            <AlertCircle size={16} className="shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* 1. Selector: Mobile Number vs Email */}
        <div className="mb-5">
          <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setLoginType('email');
                setIdentifier('');
                setErrors({});
                setErrorMessage('');
              }}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                loginType === 'email'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mail size={14} />
              <span>Email Address</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setLoginType('mobile');
                setIdentifier('');
                setErrors({});
                setErrorMessage('');
              }}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                loginType === 'mobile'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Phone size={14} />
              <span>Mobile Number</span>
            </button>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Identifier Input (Email or Mobile) */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              {loginType === 'email' ? 'Admin Email' : 'Admin Mobile'}
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-500 pointer-events-none">
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
                autoComplete={loginType === 'email' ? 'username' : 'tel'}
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-2 transition-all ${
                  errors.identifier
                    ? 'border-rose-500/80 focus:ring-rose-500/40 bg-rose-500/5'
                    : 'border-slate-800 focus:border-sky-500 focus:ring-sky-500/20'
                }`}
              />
            </div>
            {errors.identifier && (
              <p className="text-[11px] font-semibold text-rose-400 mt-1 pl-1">
                {errors.identifier}
              </p>
            )}
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Admin Password
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-500 pointer-events-none">
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
                autoComplete="current-password"
                className={`w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950/70 border text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-2 transition-all ${
                  errors.password
                    ? 'border-rose-500/80 focus:ring-rose-500/40 bg-rose-500/5'
                    : 'border-slate-800 focus:border-sky-500 focus:ring-sky-500/20'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-slate-500 hover:text-slate-300 transition-colors p-1 cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-[11px] font-semibold text-rose-400 mt-1 pl-1">
                {errors.password}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-400 hover:to-emerald-400 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-sky-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Authorizing...</span>
              </>
            ) : (
              <>
                <KeyRound size={16} />
                <span>Verify & Enter Dashboard</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Credentials Quick Autofill */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col gap-2">
          <span className="text-[11px] text-slate-400 text-center font-medium">
            Demo Credentials
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fillQuickCredentials('email')}
              className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 text-[11px] text-slate-300 font-semibold transition-colors cursor-pointer text-center"
            >
              Fill Admin Email
            </button>
            <button
              type="button"
              onClick={() => fillQuickCredentials('mobile')}
              className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 text-[11px] text-slate-300 font-semibold transition-colors cursor-pointer text-center"
            >
              Fill Admin Mobile
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminLoginPage;
