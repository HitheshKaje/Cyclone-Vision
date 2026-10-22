import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const VoiceAlertButton = ({ textToRead }) => {
  const { t, i18n } = useTranslation();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsSupported(false);
    }

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleToggleVoice = () => {
    if (!isSupported || !textToRead) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel(); // Stop any pending utterances

    const utterance = new SpeechSynthesisUtterance(textToRead);
    
    // Select language tag based on i18next current language
    const currentLang = i18n.language || 'en';
    if (currentLang === 'kn') {
      utterance.lang = 'kn-IN';
    } else {
      utterance.lang = 'en-IN';
    }
    
    utterance.rate = 0.9; // Slightly slower for clarity outdoors
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
      console.warn('Voice advisory error:', e);
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
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
      onClick={handleToggleVoice}
      aria-label={isSpeaking ? t('home.stop_audio') : t('home.listen_advisory')}
      className={`w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl font-bold text-sm transition-all shadow-sm cursor-pointer select-none ${
        isSpeaking
          ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
          : 'bg-emerald-600 hover:bg-emerald-500 text-white hover:shadow-md'
      }`}
    >
      {isSpeaking ? (
        <>
          <VolumeX size={20} />
          <span>{t('home.stop_audio')}</span>
        </>
      ) : (
        <>
          <Volume2 size={20} />
          <span>{t('home.listen_advisory')}</span>
        </>
      )}
    </button>
  );
};

export default VoiceAlertButton;
