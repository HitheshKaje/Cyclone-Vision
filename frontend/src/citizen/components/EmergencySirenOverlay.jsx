import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, 
  VolumeX, 
  AlertOctagon, 
  ShieldAlert, 
  Radio, 
  ExternalLink,
  BellRing
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fetchOfficialAdvisories } from '../services/citizenApi';
import sirenService from '../services/sirenService';

const EmergencySirenOverlay = ({ onNavigateToLighthouse }) => {
  const { t, i18n } = useTranslation();
  const [sirenActive, setSirenActive] = useState(false);
  const [cycloneName, setCycloneName] = useState('Severe Cyclonic Storm');
  const [warningMessage, setWarningMessage] = useState('');
  const [isLocallyMuted, setIsLocallyMuted] = useState(false);
  const [isAudioArmed, setIsAudioArmed] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Poll backend for siren trigger
  useEffect(() => {
    let isMounted = true;

    const checkSiren = async () => {
      const res = await fetchOfficialAdvisories();
      if (!isMounted) return;

      if (res.success && res.data) {
        const isSirenOn = res.data.siren_active === true;
        setSirenActive(isSirenOn);
        if (res.data.cyclone_name) setCycloneName(res.data.cyclone_name);
        if (res.data.message) setWarningMessage(res.data.message);

        // If siren was turned off by admin, reset local mute for the next event
        if (!isSirenOn) {
          setIsLocallyMuted(false);
        }
      }
    };

    checkSiren();
    const interval = setInterval(checkSiren, 1500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Track user interaction for audio unlocking
  useEffect(() => {
    const handleUserTouch = () => {
      sirenService.armAudio();
      setIsAudioArmed(true);
      setHasInteracted(true);
    };

    window.addEventListener('touchstart', handleUserTouch, { passive: true });
    window.addEventListener('click', handleUserTouch, { passive: true });
    window.addEventListener('keydown', handleUserTouch, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleUserTouch);
      window.removeEventListener('click', handleUserTouch);
      window.removeEventListener('keydown', handleUserTouch);
    };
  }, []);

  // Audio start/stop reaction to sirenActive and isLocallyMuted
  useEffect(() => {
    if (sirenActive && !isLocallyMuted) {
      sirenService.startSiren();
    } else {
      sirenService.stopSiren();
    }

    return () => {
      sirenService.stopSiren();
    };
  }, [sirenActive, isLocallyMuted]);

  // Manually unlock audio and start sound if user taps the emergency banner
  const handleEnableSound = () => {
    sirenService.armAudio();
    setIsAudioArmed(true);
    setHasInteracted(true);
    setIsLocallyMuted(false);
    sirenService.startSiren();
  };

  const handleToggleLocalMute = () => {
    if (isLocallyMuted) {
      setIsLocallyMuted(false);
      sirenService.startSiren();
    } else {
      setIsLocallyMuted(true);
      sirenService.stopSiren();
    }
  };

  // If no siren active, don't show the emergency overlay
  if (!sirenActive) {
    return null;
  }

  return (
    <div 
      role="alert" 
      aria-live="assertive"
      className="fixed top-0 inset-x-0 z-50 p-3 sm:p-4 bg-gradient-to-r from-red-700 via-red-600 to-rose-700 text-white shadow-2xl border-b-4 border-red-950 animate-in slide-in-from-top duration-300 select-none"
    >
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Left: Animated Icon + Title + Telemetry */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="p-3 rounded-2xl bg-white/20 text-white animate-bounce shrink-0 shadow-lg">
            <Volume2 size={28} className="animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white text-red-700 shadow-xs">
                {t('safety.badge_red')}
              </span>
              <span className="text-xs font-black uppercase tracking-widest text-red-100 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                {t('siren.active_phone')}
              </span>
            </div>
            
            <h2 className="text-sm sm:text-base font-black tracking-tight leading-tight mt-0.5 truncate text-white">
              {cycloneName}: {t('siren.warning_title')}
            </h2>
            <p className="text-[11px] sm:text-xs text-red-100/90 font-medium truncate max-w-lg mt-0.5">
              {i18n.language === 'kn' ? t('siren.warning_desc') : (warningMessage || 'Emergency foghorn siren triggered by Admin Command Center. All vessels return to harbor immediately!')}
            </p>
          </div>
        </div>

        {/* Right: Actions (Mute / Sound / Lighthouse) */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end shrink-0 pt-2 md:pt-0 border-t border-white/20 md:border-t-0">
          
          {/* Mute / Unmute Button for this device */}
          <button
            onClick={handleToggleLocalMute}
            className={`flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md active:scale-95 ${
              isLocallyMuted
                ? 'bg-white text-red-700 hover:bg-slate-100'
                : 'bg-black/30 hover:bg-black/50 text-white border border-white/30'
            }`}
            title={isLocallyMuted ? t('siren.unmute_phone') : t('siren.mute_phone')}
          >
            {isLocallyMuted ? (
              <>
                <Volume2 size={16} />
                <span>{t('siren.unmute_phone')}</span>
              </>
            ) : (
              <>
                <VolumeX size={16} />
                <span>{t('siren.mute_phone')}</span>
              </>
            )}
          </button>

          {/* Unblock sound button if browser blocked autoplay */}
          {!hasInteracted && (
            <button
              onClick={handleEnableSound}
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md animate-pulse active:scale-95"
            >
              <BellRing size={16} />
              <span>{t('siren.tap_to_blast')}</span>
            </button>
          )}

          {/* Jump to Lighthouse Station */}
          {onNavigateToLighthouse && (
            <button
              onClick={onNavigateToLighthouse}
              className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all cursor-pointer border border-white/30"
              title="Open full rotating lighthouse beacon screen"
            >
              <span>{t('siren.lighthouse_beacon')}</span>
              <ExternalLink size={13} />
            </button>
          )}

        </div>

      </div>
    </div>
  );
};

export default EmergencySirenOverlay;
