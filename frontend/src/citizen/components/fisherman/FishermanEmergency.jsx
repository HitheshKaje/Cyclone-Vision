import React from 'react';
import { useTranslation } from 'react-i18next';
import { Phone, Shield, Radio, ArrowLeft, LifeBuoy, AlertCircle, MapPin, ExternalLink } from 'lucide-react';

const FishermanEmergency = ({ selectedPort, onBack }) => {
  const { t, i18n } = useTranslation();

  const emergencyContacts = [
    {
      id: 'icg',
      number: '1554',
      title: 'Indian Coast Guard (ICG)',
      desc: 'National Maritime Search & Rescue (Toll-Free, 24x7 Emergency)',
      color: 'bg-red-600 hover:bg-red-700 text-white',
      badge: 'Maritime Priority',
      badgeColor: 'bg-red-100 text-red-800'
    },
    {
      id: 'all112',
      number: '112',
      title: 'National Emergency Helpline (112)',
      desc: 'Police, Fire, Ambulance & State Disaster Emergency Response',
      color: 'bg-blue-600 hover:bg-blue-700 text-white',
      badge: 'All-in-One 24x7',
      badgeColor: 'bg-blue-100 text-blue-800'
    },
    {
      id: 'marine_police',
      number: '1093',
      title: 'Coastal Marine Police',
      desc: 'Inshore boat patrol, harbor assistance & coastal security',
      color: 'bg-indigo-600 hover:bg-indigo-700 text-white',
      badge: 'Coastal Security',
      badgeColor: 'bg-indigo-100 text-indigo-800'
    },
    {
      id: 'disaster',
      number: '1077',
      title: 'District Disaster Control Room',
      desc: `Coastal District Emergency Operations Center (${selectedPort?.district || 'Coastal'})`,
      color: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      badge: 'District Helpline',
      badgeColor: 'bg-emerald-100 text-emerald-800'
    }
  ];

  return (
    <div className="space-y-4 pb-16 animate-in fade-in duration-200">
      
      {/* Top Header & Back */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <ArrowLeft size={15} />
          <span>{t('fisherman.back_to_home', '← Back to Home')}</span>
        </button>

        <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Phone size={16} className="text-red-500" />
          <span>{t('fisherman.emergency_page_title', 'Emergency Contacts')}</span>
        </h2>
      </div>

      {/* Emergency Notice Banner */}
      <div className="p-4 rounded-2xl bg-red-500/10 border-2 border-red-500/30 text-red-900 dark:text-red-200 text-xs">
        <div className="flex items-center gap-2 font-black text-sm text-red-600 dark:text-red-400 mb-1">
          <AlertCircle size={18} />
          <span>Immediate Distress at Sea</span>
        </div>
        <p className="leading-relaxed">
          If your vessel is taking on water, engine disabled in rough sea, or crew injured offshore, dial <strong>1554</strong> immediately or broadcast a <strong>MAYDAY</strong> on <strong>VHF Channel 16 (156.8 MHz)</strong>.
        </p>
      </div>

      {/* Clickable Emergency Direct-Dial Cards */}
      <div className="space-y-2.5">
        <div className="px-1 text-[11px] font-black uppercase tracking-wider text-slate-400">
          Tap to Call Direct (Toll-Free)
        </div>

        {emergencyContacts.map((contact) => (
          <a
            key={contact.id}
            href={`tel:${contact.number}`}
            className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 hover:border-red-400 dark:hover:border-red-600 shadow-sm transition-all flex items-center justify-between gap-3 group cursor-pointer block"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full">
                  {contact.badge}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                {contact.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {contact.desc}
              </p>
            </div>

            <div className={`px-4 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 shrink-0 shadow-xs transition-transform group-hover:scale-105 ${contact.color}`}>
              <Phone size={15} />
              <span>{contact.number}</span>
            </div>
          </a>
        ))}
      </div>

      {/* Emergency Protocols Guide */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <LifeBuoy size={14} className="text-sky-500" />
          <span>Vessel Emergency Action Steps</span>
        </div>

        <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
          <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <span className="w-5 h-5 rounded-full bg-sky-500 text-white font-bold text-[10px] flex items-center justify-center shrink-0">1</span>
            <span><strong>Don Life Jackets:</strong> Ensure all fishermen and crew put on certified life jackets with whistles immediately.</span>
          </div>

          <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <span className="w-5 h-5 rounded-full bg-sky-500 text-white font-bold text-[10px] flex items-center justify-center shrink-0">2</span>
            <span><strong>VHF Channel 16 Broadcast:</strong> State your Boat Name, Registration Number, GPS Latitude/Longitude, and Nature of Distress.</span>
          </div>

          <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <span className="w-5 h-5 rounded-full bg-sky-500 text-white font-bold text-[10px] flex items-center justify-center shrink-0">3</span>
            <span><strong>Anchor Securely:</strong> If near shore or shallow reefs, drop sea-anchor to avoid broaching sideways in swells.</span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default FishermanEmergency;
