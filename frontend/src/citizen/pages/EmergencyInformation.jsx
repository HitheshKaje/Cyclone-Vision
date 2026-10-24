import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  PhoneCall, 
  ShieldCheck, 
  AlertOctagon, 
  LifeBuoy, 
  Anchor, 
  Home, 
  CheckCircle2, 
  XCircle,
  Info
} from 'lucide-react';
import EmergencyContactCard from '../components/EmergencyContactCard';

const EmergencyInformation = () => {
  const { t } = useTranslation();

  const dos = [
    t('emergency.dos.0'),
    t('emergency.dos.1'),
    t('emergency.dos.2'),
    t('emergency.dos.3')
  ];

  const donts = [
    t('emergency.donts.0'),
    t('emergency.donts.1'),
    t('emergency.donts.2')
  ];

  return (
    <div className="space-y-5 sm:space-y-6 pb-6">
      
      {/* 1. Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <PhoneCall size={22} className="text-red-500" />
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {t('emergency.title')}
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500">
          {t('emergency.subtitle')}
        </p>
      </div>

      {/* 2. Offline Available Notice */}
      <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-2 font-medium">
        <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
        <span>{t('emergency.offline_available_notice')}</span>
      </div>

      {/* 3. Verified Emergency Directory */}
      <section aria-label="Official Coastal Emergency Helplines">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          {t('emergency.verified_helplines')}
        </h2>
        <EmergencyContactCard compact={false} />
      </section>

      {/* 4. Official Do's and Don'ts */}
      <section aria-label="Official Cyclone Safety Instructions" className="space-y-4">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <LifeBuoy size={20} className="text-sky-500" />
          <span>{t('emergency.safety_dos_donts')}</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* DO's */}
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/30">
            <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-2 mb-3">
              <CheckCircle2 size={18} className="text-emerald-500" />
              <span>{t('emergency.dos_title')}</span>
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
              {dos.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold shrink-0 mt-0.5">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* DONT's */}
          <div className="p-4 sm:p-5 rounded-2xl bg-red-500/5 dark:bg-red-950/20 border border-red-500/30">
            <h3 className="text-sm font-bold text-red-800 dark:text-red-300 uppercase tracking-wider flex items-center gap-2 mb-3">
              <XCircle size={18} className="text-red-500" />
              <span>{t('emergency.donts_title')}</span>
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
              {donts.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-red-500 font-bold shrink-0 mt-0.5">✕</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </section>

      {/* 5. Coastal Shelter Information */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Home size={18} className="text-sky-500" />
          <span>{t('emergency.shelters_title')}</span>
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          {t('emergency.shelters_desc')}
        </p>
      </div>

    </div>
  );
};

export default EmergencyInformation;
