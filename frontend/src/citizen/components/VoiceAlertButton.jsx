import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Synthesizes an authentic broadcast PA chime via Web Audio API.
 * Ensures instant audible confirmation on any browser even before TTS loads.
 */
const playAnnouncementChime = () => {
  return new Promise((resolve) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        resolve();
        return;
      }
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // Tone 1: 587.33 Hz (D5) - Public address chime start
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.4, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.22);

      // Tone 2: 880.00 Hz (A5) - Ding-dong resolution
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.0, now + 0.18);
      gain2.gain.setValueAtTime(0.45, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.18);
      osc2.stop(now + 0.5);

      setTimeout(() => {
        try {
          ctx.close();
        } catch (_) {}
        resolve();
      }, 450);
    } catch (e) {
      console.warn('[VoiceAlert] Chime playback warning:', e);
      resolve();
    }
  });
};

const VoiceAlertButton = ({ textToRead, englishText, kannadaText }) => {
  const { t, i18n } = useTranslation();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [voices, setVoices] = useState([]);
  const keepAliveTimerRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsSupported(false);
      return;
    }

    const loadVoices = () => {
      try {
        const v = window.speechSynthesis.getVoices();
        if (v && v.length > 0) {
          setVoices(v);
        }
      } catch (_) {}
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      stopSpeaking();
    };
  }, []);

  const stopSpeaking = () => {
    if (keepAliveTimerRef.current) {
      clearInterval(keepAliveTimerRef.current);
      keepAliveTimerRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }
    window._cyclosafeCurrentUtterance = null;
    setIsSpeaking(false);
  };

  const handleToggleVoice = async () => {
    if (!isSupported) return;

    if (isSpeaking) {
      stopSpeaking();
      return;
    }

    // Cancel any previous pending audio cleanly
    try {
      window.speechSynthesis.cancel();
    } catch (_) {}

    setIsSpeaking(true);

    // 1. Play immediate audible chime through speakers/headphones
    await playAnnouncementChime();

    // 2. Refresh available voices if needed
    let availableVoices = voices;
    if (!availableVoices || availableVoices.length === 0) {
      try {
        availableVoices = window.speechSynthesis.getVoices() || [];
      } catch (_) {}
    }

    // 3. Determine language text and best matching voice
    const currentLang = i18n.language || 'en';
    let chosenText = '';
    let chosenVoice = null;

    if (currentLang === 'kn') {
      const knVoice = availableVoices.find(
        (v) =>
          v.lang &&
          (v.lang.toLowerCase().startsWith('kn') ||
            v.lang.toLowerCase().includes('kannada') ||
            v.name.toLowerCase().includes('kannada'))
      );

      if (knVoice) {
        chosenVoice = knVoice;
        chosenText = kannadaText || textToRead;
      } else {
        // Fallback to clear English speech so user hears audible guidance
        // rather than silent failure from missing Windows Kannada voice package
        chosenText =
          englishText ||
          textToRead ||
          'Coastal waters safe and normal. No active cyclone threats.';
        chosenVoice =
          availableVoices.find(
            (v) => v.lang && (v.lang === 'en-IN' || v.lang === 'en_IN')
          ) ||
          availableVoices.find((v) => v.lang && v.lang.startsWith('en')) ||
          availableVoices.find((v) => v.default) ||
          availableVoices[0] ||
          null;
      }
    } else {
      chosenText =
        englishText ||
        textToRead ||
        'Coastal waters safe and normal. No active cyclone threats.';
      chosenVoice =
        availableVoices.find(
          (v) => v.lang && (v.lang === 'en-IN' || v.lang === 'en_IN')
        ) ||
        availableVoices.find((v) => v.lang && v.lang.startsWith('en')) ||
        availableVoices.find((v) => v.default) ||
        availableVoices[0] ||
        null;
    }

    // 4. Speak with a 60ms delay after chime & cancel so Chromium's speech synthesizer settles
    setTimeout(() => {
      try {
        // Unpause Chrome if in paused state
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }

        const utterance = new SpeechSynthesisUtterance(chosenText);
        if (chosenVoice) {
          utterance.voice = chosenVoice;
          utterance.lang = chosenVoice.lang;
        } else {
          utterance.lang = 'en-US';
        }

        utterance.rate = 0.92;
        utterance.pitch = 1.0;
        utterance.volume = 1.0; // 100% volume

        // Prevent Chromium GC bug
        window._cyclosafeCurrentUtterance = utterance;

        utterance.onstart = () => {
          setIsSpeaking(true);
        };

        utterance.onend = () => {
          stopSpeaking();
        };

        utterance.onerror = (e) => {
          console.warn('[VoiceAlert] Speech error:', e);
          stopSpeaking();
        };

        window.speechSynthesis.speak(utterance);

        // Chrome keep-alive: prevent pause on long speeches
        keepAliveTimerRef.current = setInterval(() => {
          if (!window.speechSynthesis.speaking) {
            clearInterval(keepAliveTimerRef.current);
            keepAliveTimerRef.current = null;
          } else {
            window.speechSynthesis.resume();
          }
        }, 4000);
      } catch (err) {
        console.error('[VoiceAlert] Execution error:', err);
        stopSpeaking();
      }
    }, 60);
  };

  if (!isSupported) {
    return (
      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
        <AlertCircle size={14} />
        <span>{t('home.audio_not_supported')}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggleVoice}
      aria-label={isSpeaking ? t('home.stop_audio') : t('home.listen_advisory')}
      className={`w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl font-bold text-sm transition-all shadow-sm cursor-pointer select-none ${
        isSpeaking
          ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse shadow-md shadow-rose-600/30'
          : 'bg-emerald-600 hover:bg-emerald-500 text-white hover:shadow-md'
      }`}
    >
      {isSpeaking ? (
        <>
          <VolumeX size={20} className="shrink-0" />
          <span>{t('home.stop_audio')}</span>
          <span className="w-2 h-2 rounded-full bg-white animate-ping ml-1" />
        </>
      ) : (
        <>
          <Volume2 size={20} className="shrink-0" />
          <span>{t('home.listen_advisory')}</span>
        </>
      )}
    </button>
  );
};

export default VoiceAlertButton;
