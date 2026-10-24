import React from 'react';
import { Phone, Shield, Anchor, LifeBuoy, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const EMERGENCY_CONTACTS = [
  {
    id: 'coast_guard',
    titleKey: 'emergency.coast_guard',
    descKey: 'emergency.coast_guard_desc',
    phone: '1554',
    displayPhone: '1554 (Toll-Free 24x7)',
    icon: Anchor,
    priority: true,
    color: 'bg-red-500 hover:bg-red-600 text-white'
  },
  {
    id: 'marine_police',
    titleKey: 'emergency.marine_police',
    descKey: 'emergency.marine_police_desc',
    phone: '1093',
    displayPhone: '1093',
    icon: Shield,
    priority: true,
    color: 'bg-sky-600 hover:bg-sky-500 text-white'
  },
  {
    id: 'disaster_management',
    titleKey: 'emergency.disaster_management',
    descKey: 'emergency.disaster_management_desc',
    phone: '1070',
    displayPhone: '1070 / 1077 (District)',
    icon: LifeBuoy,
    priority: false,
    color: 'bg-emerald-600 hover:bg-emerald-500 text-white'
  },
  {
    id: 'national_emergency',
    titleKey: 'emergency.national_emergency',
    descKey: 'emergency.national_emergency_desc',
    phone: '112',
    displayPhone: '112 (Pan-India)',
    icon: Phone,
    priority: false,
    color: 'bg-slate-700 hover:bg-slate-600 text-white'
  }
];

const EmergencyContactCard = ({ compact = false }) => {
  const { t } = useTranslation();
  const contacts = compact ? EMERGENCY_CONTACTS.slice(0, 2) : EMERGENCY_CONTACTS;

  return (
    <div className="space-y-3">
      {contacts.map((contact) => {
        const Icon = contact.icon;
        const title = contact.titleKey.startsWith('emergency.') ? t(contact.titleKey) : contact.titleKey;
        const desc = contact.descKey.startsWith('emergency.') ? t(contact.descKey) : contact.descKey;

        return (
          <div
            key={contact.id}
            className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
                <Icon size={22} />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                  {title}
                </h4>
                <p className="text-xs text-slate-500 leading-snug mt-0.5">
                  {desc}
                </p>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 sm:hidden block mt-1">
                  {contact.displayPhone}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`tel:${contact.phone}`}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-transform active:scale-95 cursor-pointer ${contact.color}`}
                aria-label={`Call ${title} at ${contact.phone}`}
              >
                <Phone size={16} />
                <span>{t('emergency.call_now')}: {contact.phone}</span>
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default EmergencyContactCard;
