import React from 'react';
import { useTranslation } from 'react-i18next';
import { User, Ship, MapPin, Phone, LogOut, X, ShieldCheck } from 'lucide-react';
import { logoutUser } from '../../../utils/authService';

const FishermanProfileModal = ({ isOpen, onClose, currentUser, currentPort, onLogout }) => {
  const { t, i18n } = useTranslation();

  if (!isOpen) return null;

  const handleSignOut = () => {
    logoutUser();
    onClose();
    if (onLogout) onLogout();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full sm:max-w-md bg-white dark:bg-[#0f172a] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
        role="dialog"
        aria-labelledby="profile-modal-title"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <User size={18} />
            </div>
            <div>
              <h2 id="profile-modal-title" className="text-base font-black text-slate-900 dark:text-white">
                {currentUser?.name || 'Fisherman Profile'}
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
                Verified Maritime Vessel Owner
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-3.5">
          {/* Vessel Card */}
          <div className="p-3.5 rounded-2xl bg-sky-500/5 dark:bg-sky-950/30 border border-sky-500/20 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Ship size={20} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Registered Fishing Vessel</span>
              <div className="text-sm font-black text-slate-900 dark:text-white truncate">
                {currentUser?.vessel_name || 'Sea Falcon'}
              </div>
              <div className="text-xs font-mono text-slate-600 dark:text-slate-300 mt-0.5">
                Reg: {currentUser?.vessel_reg || 'IND-KA-02-MM-1029'}
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <MapPin size={13} className="text-sky-500" />
                <span>Base Harbor</span>
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {currentPort?.name || currentUser?.port || 'Malpe Harbor'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Phone size={13} className="text-sky-500" />
                <span>Mobile Helpline</span>
              </span>
              <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                {currentUser?.mobile || '+91 98451 22340'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-emerald-500" />
                <span>Emergency Broadcast Alert</span>
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                Active (Auto-Siren Enabled)
              </span>
            </div>
          </div>

          {/* Sign Out Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full py-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-center gap-2 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
            >
              <LogOut size={14} />
              <span>Sign Out of Fisherman Account</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FishermanProfileModal;
