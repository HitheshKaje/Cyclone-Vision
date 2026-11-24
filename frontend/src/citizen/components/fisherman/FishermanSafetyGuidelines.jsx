import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Anchor, Ship, AlertTriangle, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';

const FishermanSafetyGuidelines = ({ onBack }) => {
  const { t, i18n } = useTranslation();
  const [activeCategory, setActiveCategory] = useState('before'); // 'before' | 'during' | 'cyclone'

  const guidelinesData = {
    before: {
      title: i18n.language === 'kn' ? 'ಸಮುದ್ರಕ್ಕೆ ಹೋಗುವ ಮುನ್ನ' : i18n.language === 'hi' ? 'समुद्र में जाने से पहले' : 'Before Going to Sea',
      icon: Anchor,
      color: 'text-sky-600 bg-sky-500/10 border-sky-500/20',
      rules: [
        {
          title: i18n.language === 'kn' ? 'ಅಧಿಕೃತ ಹವಾಮಾನ ಎಚ್ಚರಿಕೆ ಪರಿಶೀಲಿಸಿ' : i18n.language === 'hi' ? 'आधिकारिक मौसम चेतावनियों की जांच करें' : 'Check official weather warnings',
          desc: i18n.language === 'kn' ? 'ಬಂದರು ಬಿಡುವ ಮುನ್ನ ಐಎಂಡಿ ಅಥವಾ ಸೈಕ್ಲೋಸೇಫ್ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ಹಳದಿ/ಕೆಂಪು ಎಚ್ಚರಿಕೆಗಳನ್ನು ಗಮನಿಸಿ.' : i18n.language === 'hi' ? 'बंदरगाह छोड़ने से पहले मौसम विभाग के अलर्ट और सिग्नल फ्लैग्स की जांच करें।' : 'Check IMD signals and the CycloSafe app for yellow or red alerts before casting nets.'
        },
        {
          title: i18n.language === 'kn' ? 'ಸ್ಥಳೀಯ ಸಮುದ್ರ ಪರಿಸ್ಥಿತಿ ಗಮನಿಸಿ' : i18n.language === 'hi' ? 'स्थानीय समुद्र की स्थिति की जांच करें' : 'Check local sea conditions',
          desc: i18n.language === 'kn' ? 'ಅಲೆಗಳ ಎತ್ತರ 2 ಮೀಟರ್‌ಗಿಂತ ಹೆಚ್ಚಾಗಿದ್ದರೆ ಸಣ್ಣ ಬೋಟ್‌ಗಳನ್ನು ಸಮುದ್ರಕ್ಕೆ ಇಳಿಸಬೇಡಿ.' : i18n.language === 'hi' ? 'यदि लहरों की ऊंचाई 2 मीटर से अधिक हो, तो छोटी नावों को समुद्र में न उतारें।' : 'If wave height exceeds 2 meters, avoid venturing into offshore waters.'
        },
        {
          title: i18n.language === 'kn' ? 'ಕುಟುಂಬ ಸದಸ್ಯರಿಗೆ ಮಾಹಿತಿ ನೀಡಿ' : i18n.language === 'hi' ? 'परिवार को अपनी योजना की जानकारी दें' : 'Inform family members about fishing plans',
          desc: i18n.language === 'kn' ? 'ನೀವು ಯಾವ ದಿಕ್ಕಿಗೆ ಹೋಗುತ್ತಿದ್ದೀರಿ ಮತ್ತು ಮರಳುವ ಅಂದಾಜು ಸಮಯವನ್ನು ತಿಳಿಸಿ.' : i18n.language === 'hi' ? 'अपने परिवार या समाज को बताएं कि आप किस दिशा में जा रहे हैं और कब लौटेंगे।' : 'Tell your family your sailing route, coordinates and expected return time.'
        },
        {
          title: i18n.language === 'kn' ? 'ಸಂಪರ್ಕ ಸಾಧನಗಳನ್ನು ಕೊಂಡೊಯ್ಯಿರಿ' : i18n.language === 'hi' ? 'संचार उपकरण साथ रखें' : 'Carry communication equipment',
          desc: i18n.language === 'kn' ? 'ವಿಎಚ್‌ಎಫ್ ಮರೈನ್ ರೇಡಿಯೋ (ಚಾನೆಲ್ 16), ಜಿಪಿಎಸ್ ಮತ್ತು ಬ್ಯಾಟರಿ ಟಾರ್ಚ್ ಪರಿಶೀಲಿಸಿ.' : i18n.language === 'hi' ? 'वीएचएफ मरीन रेडियो (चैनल 16), जीपीएस और टॉर्च पूरी तरह चार्ज रखें।' : 'Carry VHF Marine Radio (Channel 16), charged GPS and waterproof torches.'
        }
      ]
    },
    during: {
      title: i18n.language === 'kn' ? 'ಮೀನುಗಾರಿಕೆ ನಡೆಸುವಾಗ' : i18n.language === 'hi' ? 'मछली पकड़ने के दौरान' : 'During Fishing',
      icon: Ship,
      color: 'text-indigo-600 bg-indigo-500/10 border-indigo-500/20',
      rules: [
        {
          title: i18n.language === 'kn' ? 'ಹವಾಮಾನ ಬುಲೆಟಿನ್ ಗಮನಿಸಿ' : i18n.language === 'hi' ? 'आधिकारिक मौसम अपडेट सुनते रहें' : 'Monitor official weather updates',
          desc: i18n.language === 'kn' ? 'ಪ್ರತಿ 3-4 ಗಂಟೆಗಳಿಗೊಮ್ಮೆ ರೇಡಿಯೋ ಅಥವಾ ಮೊಬೈಲ್ ಮೂಲಕ ಮುನ್ಸೂಚನೆ ಪಡೆಯಿರಿ.' : i18n.language === 'hi' ? 'रेडियो या सेलुलर नेटवर्क पर हर कुछ घंटों में मौसम की चेतावनी सुनते रहें।' : 'Keep your radio tuned to coastal marine broadcasts for sudden gale alerts.'
        },
        {
          title: i18n.language === 'kn' ? 'ಸೂಚನೆ ಬಂದಾಗ ತಕ್ಷಣ ಬಂದರಿಗೆ ಮರಳಿ' : i18n.language === 'hi' ? 'निर्देश मिलने पर तुरंत किनारे लौटें' : 'Return to shore when instructed',
          desc: i18n.language === 'kn' ? 'ಅಧಿಕಾರಿಗಳು ಅಥವಾ ಲೈಟ್‌ಹೌಸ್ ಸೈರನ್ ಮೊಳಗಿದರೆ ತಕ್ಷಣ ಮೀನುಗಾರಿಕೆ ನಿಲ್ಲಿಸಿ ಮರಳಿ.' : i18n.language === 'hi' ? 'यदि प्रशासन या लाइटहाउस सायरन चेतावनी दे, तो बिना देर किए तट की ओर लौटें।' : 'If authorities issue an advisory or siren sounds, cease fishing and navigate to port.'
        },
        {
          title: i18n.language === 'kn' ? 'ಅಪಾಯಕಾರಿ ಸಾಗರ ಪರಿಸ್ಥಿತಿ ತಪ್ಪಿಸಿ' : i18n.language === 'hi' ? 'खराब मौसम और ऊंची लहरों से बचें' : 'Avoid dangerous weather conditions',
          desc: i18n.language === 'kn' ? 'ಕಪ್ಪು ಮೋಡಗಳು ಮತ್ತು ಬಿರುಗಾಳಿ ಕಂಡುಬಂದರೆ ಸುರಕ್ಷಿತ ತೀರದ ಹತ್ತಿರ ಬನ್ನಿ.' : i18n.language === 'hi' ? 'काले घने बादल और तेज हवाएं दिखने पर खुले समुद्र से दूर किनारे की ओर बढ़ें।' : 'Head towards sheltered bays if sudden dark convective squalls appear on the horizon.'
        }
      ]
    },
    cyclone: {
      title: i18n.language === 'kn' ? 'ಚಂಡಮಾರುತ ಎಚ್ಚರಿಕೆಯ ಸಮಯದಲ್ಲಿ' : i18n.language === 'hi' ? 'चक्रवात चेतावनी के दौरान' : 'During a Cyclone Warning',
      icon: AlertTriangle,
      color: 'text-red-600 bg-red-500/10 border-red-500/20',
      rules: [
        {
          title: i18n.language === 'kn' ? 'ಸಂಪೂರ್ಣವಾಗಿ ಸಮುದ್ರಕ್ಕೆ ಇಳಿಯಬೇಡಿ' : i18n.language === 'hi' ? 'समुद्र में जाने से पूरी तरह बचें' : 'Avoid going to sea completely',
          desc: i18n.language === 'kn' ? 'ಕಿತ್ತಳೆ ಅಥವಾ ಕೆಂಪು ಎಚ್ಚರಿಕೆಯ ವೇಳೆ ಯಾವುದೇ ಕಾರಣಕ್ಕೂ ಬೋಟ್ ತೆಗೆಯಬೇಡಿ.' : i18n.language === 'hi' ? 'रेड या ऑरेंज अलर्ट के दौरान समुद्र में नाव उतारने पर पूर्ण प्रतिबंध का पालन करें।' : 'Adhere strictly to official fishing bans during Orange and Red cyclone alerts.'
        },
        {
          title: i18n.language === 'kn' ? 'ಸ್ಥಳಾಂತರ ಸೂಚನೆಗಳನ್ನು ಪಾಲಿಸಿ' : i18n.language === 'hi' ? 'सुरक्षित आश्रय स्थलों में जाएं' : 'Follow official evacuation instructions',
          desc: i18n.language === 'kn' ? 'ಕರಾವಳಿ ತಗ್ಗು ಪ್ರದೇಶಗಳಲ್ಲಿದ್ದರೆ ಚಂಡಮಾರುತ ಆಶ್ರಯ ತಾಣಗಳಿಗೆ ತೆರಳಿ.' : i18n.language === 'hi' ? 'तटीय निचले इलाकों के निवासी नजदीकी पक्के चक्रवात राहत आश्रयों में चले जाएं।' : 'Move to designated pucca cyclone shelters if living in low-lying coastal areas.'
        },
        {
          title: i18n.language === 'kn' ? 'ದೋಣಿಗಳನ್ನು ಸುರಕ್ಷಿತವಾಗಿ ಕಟ್ಟಿಹಾಕಿ' : i18n.language === 'hi' ? 'नावों को डबल रस्सियों से बांधें' : 'Moor boats securely with double lines',
          desc: i18n.language === 'kn' ? 'ಬಂದರಿನಲ್ಲಿ ಬೋಟ್‌ಗಳನ್ನು ಡಬಲ್ ಹಗ್ಗಗಳಿಂದ ಗಟ್ಟಿಯಾಗಿ ಕಟ್ಟಿ, ಎಂಜಿನ್ ಸುರಕ್ಷಿತವಾಗಿಡಿ.' : i18n.language === 'hi' ? 'बंदरगाह में खड़ी नावों को मजबूत रस्सियों से सुरक्षित करें ताकि वे बह न जाएं।' : 'Secure all trawlers and catamarans with heavy double ropes on high harbor ramps.'
        },
        {
          title: i18n.language === 'kn' ? 'ಅಧಿಕೃತ ಮಾಹಿತಿಯನ್ನೇ ನಂಬಿ' : i18n.language === 'hi' ? 'अफवाहों पर ध्यान न दें' : 'Do not ignore official warnings',
          desc: i18n.language === 'kn' ? 'ವದಂತಿಗಳನ್ನು ನಂಬಬೇಡಿ. ಸೈಕ್ಲೋಸೇಫ್, ಐಎಂಡಿ ಅಥವಾ ಆಕಾಶವಾಣಿ ಮಾಹಿತಿಯನ್ನೇ ಪರಿಶೀಲಿಸಿ.' : i18n.language === 'hi' ? 'सोशल मीडिया की अफवाहों से बचें और केवल अधिकृत सरकारी बुलेटिन का पालन करें।' : 'Never rely on unverified social media rumors; follow official disaster bulletins.'
        }
      ]
    }
  };

  const currentCategory = guidelinesData[activeCategory];

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
          <ShieldCheck size={16} className="text-emerald-500" />
          <span>{t('fisherman.safety_page_title', 'Safety Guidelines')}</span>
        </h2>
      </div>

      {/* Category Segmented Tabs */}
      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveCategory('before')}
          className={`py-2 rounded-xl transition-all cursor-pointer text-center ${
            activeCategory === 'before' ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          {t('fisherman.before_sea', 'Before Sea')}
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory('during')}
          className={`py-2 rounded-xl transition-all cursor-pointer text-center ${
            activeCategory === 'during' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          {t('fisherman.during_fishing', 'During Fishing')}
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory('cyclone')}
          className={`py-2 rounded-xl transition-all cursor-pointer text-center ${
            activeCategory === 'cyclone' ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-300 shadow-xs' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          {t('fisherman.during_cyclone', 'Cyclone Warning')}
        </button>
      </div>

      {/* Active Rules List */}
      <div className="space-y-3">
        {currentCategory.rules.map((rule, idx) => (
          <div
            key={idx}
            className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xs flex items-start gap-3.5"
          >
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
              {idx + 1}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-slate-900 dark:text-white leading-snug">
                {rule.title}
              </h3>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {rule.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default FishermanSafetyGuidelines;
