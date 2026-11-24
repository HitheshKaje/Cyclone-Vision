import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, AlertTriangle, AlertCircle, HelpCircle, Clock, ExternalLink } from 'lucide-react';

const FishingSafetyCard = ({
  status = 'UNAVAILABLE', // 'SAFE' | 'CAUTION' | 'DANGER' | 'UNAVAILABLE'
  title,
  explanation,
  recommendedAction,
  source = 'IMD & Marine Coastal Safety Authority',
  lastUpdated,
  isStale = false,
  onViewAlerts
}) => {
  const { t, i18n } = useTranslation();

  // Status configuration mapping
  const config = {
    SAFE: {
      bgColor: 'bg-[#16A36A]/10 dark:bg-[#16A36A]/20',
      borderColor: 'border-[#16A36A]/40 dark:border-[#16A36A]/50',
      textColor: 'text-[#16A36A] dark:text-emerald-400',
      badgeBg: 'bg-[#16A36A] text-white',
      badgeText: i18n.language === 'kn' ? 'ಸುರಕ್ಷಿತ' : i18n.language === 'hi' ? 'सुरक्षित' : 'SAFE',
      defaultTitle: t('fisherman.safe_title', 'SAFE – Favorable for Sea Venture'),
      defaultExplanation: t('fisherman.safe_msg', 'No active official warning identified for the selected area.'),
      defaultAction: i18n.language === 'kn' 
        ? 'ಸಾಮಾನ್ಯ ಮೀನುಗಾರಿಕೆಗೆ ಅನುಮತಿ ಇದೆ. ನಿಯಮಿತ ಹವಾಮಾನ ಬದಲಾವಣೆಗಳನ್ನು ಗಮನಿಸಿ.' 
        : i18n.language === 'hi'
        ? 'सामान्य मत्स्य पालन की अनुमति है। मौसम में बदलाव पर नज़र रखें।'
        : 'Normal fishing operations permitted. Stay attentive to weather changes.',
      Icon: ShieldCheck
    },
    CAUTION: {
      bgColor: 'bg-[#F2A900]/10 dark:bg-[#F2A900]/20',
      borderColor: 'border-[#F2A900]/50 dark:border-[#F2A900]/60',
      textColor: 'text-[#F2A900] dark:text-amber-400',
      badgeBg: 'bg-[#F2A900] text-slate-900',
      badgeText: i18n.language === 'kn' ? 'ಎಚ್ಚರಿಕೆ' : i18n.language === 'hi' ? 'सावधानी' : 'CAUTION',
      defaultTitle: t('fisherman.caution_title', 'CAUTION – Weather Requires Attention'),
      defaultExplanation: t('fisherman.caution_msg', 'Weather conditions require attention. Check the latest advisory.'),
      defaultAction: i18n.language === 'kn'
        ? 'ಜಾಗರೂಕರಾಗಿರಿ. ಸಣ್ಣ ದೋಣಿಗಳು ದೂರದ ಸಾಗರ ವಲಯಗಳಿಗೆ ಹೋಗುವುದನ್ನು ತಪ್ಪಿಸಿ.'
        : i18n.language === 'hi'
        ? 'सावधानी बरतें। छोटी नावें गहरे समुद्र में जाने से बचें और संचार उपकरण चालू रखें।'
        : 'Exercise caution. Small crafts avoid rough offshore sectors. Maintain radio contact.',
      Icon: AlertTriangle
    },
    DANGER: {
      bgColor: 'bg-[#D93636]/10 dark:bg-[#D93636]/25',
      borderColor: 'border-[#D93636]/50 dark:border-[#D93636]/60',
      textColor: 'text-[#D93636] dark:text-red-400',
      badgeBg: 'bg-[#D93636] text-white animate-pulse',
      badgeText: i18n.language === 'kn' ? 'ಅಪಾಯ!' : i18n.language === 'hi' ? 'खतरा!' : 'DANGER',
      defaultTitle: t('fisherman.danger_title', 'DANGER! Avoid Going to Sea'),
      defaultExplanation: t('fisherman.danger_msg', 'Danger! Avoid going to sea and follow official instructions.'),
      defaultAction: i18n.language === 'kn'
        ? 'ಸಮುದ್ರಕ್ಕೆ ಹೋಗಬೇಡಿ! ಸಮುದ್ರದಲ್ಲಿರುವ ಎಲ್ಲಾ ದೋಣಿಗಳು ತಕ್ಷಣ ಬಂದರಿಗೆ ಮರಳಬೇಕು.'
        : i18n.language === 'hi'
        ? 'समुद्र में न जाएं! समुद्र में मौजूद सभी नावें तुरंत बंदरगाह पर लौटें।'
        : 'Total ban on sea venture. All fishing vessels at sea must return to harbor immediately.',
      Icon: AlertCircle
    },
    UNAVAILABLE: {
      bgColor: 'bg-slate-100 dark:bg-slate-800/80',
      borderColor: 'border-slate-300 dark:border-slate-700',
      textColor: 'text-slate-700 dark:text-slate-300',
      badgeBg: 'bg-slate-600 text-white',
      badgeText: i18n.language === 'kn' ? 'ಪರಿಶೀಲಿಸಲಾಗಿಲ್ಲ' : i18n.language === 'hi' ? 'सत्यापित नहीं' : 'UNVERIFIED',
      defaultTitle: t('fisherman.unable_verify', 'Unable to verify current conditions'),
      defaultExplanation: t('fisherman.unable_verify_msg', 'Official weather data could not be verified. Check local port signals.'),
      defaultAction: i18n.language === 'kn'
        ? 'ದೋಣಿ ಬಿಡುವ ಮುನ್ನ ಸ್ಥಳೀಯ ಬಂದರು ಅಧಿಕಾರಿಗಳು ಅಥವಾ ಲೈಟ್‌ಹೌಸ್ ಸೂಚನೆಗಳನ್ನು ದೃಢೀಕರಿಸಿ.'
        : i18n.language === 'hi'
        ? 'समुद्र में जाने से पहले स्थानीय बंदरगाह अधिकारियों या लाइटहाउस संकेतों से पुष्टि करें।'
        : 'Confirm conditions with local harbor master or signal flags before sailing.',
      Icon: HelpCircle
    }
  };

  const current = config[status] || config.UNAVAILABLE;
  const StatusIcon = current.Icon;

  return (
    <div className={`p-4 sm:p-5 rounded-3xl border-2 transition-all shadow-md ${current.bgColor} ${current.borderColor}`}>
      
      {/* Top Banner: Badge, Status Title, Icon */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
            status === 'DANGER' ? 'bg-[#D93636] text-white' :
            status === 'CAUTION' ? 'bg-[#F2A900] text-slate-900' :
            status === 'SAFE' ? 'bg-[#16A36A] text-white' :
            'bg-slate-400 text-white'
          }`}>
            <StatusIcon size={26} className="stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${current.badgeBg}`}>
                {current.badgeText}
              </span>
              {isStale && (
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full">
                  ⚠️ Stale Data
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1 leading-snug">
              {title || current.defaultTitle}
            </h2>
          </div>
        </div>
      </div>

      {/* Explanation Text */}
      <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mt-3 leading-relaxed">
        {explanation || current.defaultExplanation}
      </p>

      {/* Recommended Action Card */}
      <div className="mt-3.5 p-3 rounded-2xl bg-white/90 dark:bg-[#0f172a]/90 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
          <span>{t('fisherman.recommended_action', 'Recommended Action')}</span>
          {onViewAlerts && (
            <button
              type="button"
              onClick={onViewAlerts}
              className="text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
            >
              <span>{t('fisherman.check_alerts', 'View Details')}</span>
              <ExternalLink size={10} />
            </button>
          )}
        </div>
        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">
          {recommendedAction || current.defaultAction}
        </p>
      </div>

      {/* Metadata Footer: Source & Timestamp */}
      <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
        <span className="truncate">
          <strong className="text-slate-700 dark:text-slate-300">{t('fisherman.advisory_source', 'Source')}:</strong> {source}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          <Clock size={11} className="text-slate-400" />
          <span>{lastUpdated ? `${t('fisherman.last_updated', 'Updated')}: ${lastUpdated}` : 'Live Synchronized'}</span>
        </span>
      </div>

    </div>
  );
};

export default FishingSafetyCard;
