import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslations from './locales/en.json';
import knTranslations from './locales/kn.json';

const savedLanguage = typeof window !== 'undefined' 
  ? localStorage.getItem('cyclosafe_language') || 'en'
  : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      kn: { translation: knTranslations }
    },
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes values
    }
  });

export const changeLanguage = (lng) => {
  i18n.changeLanguage(lng);
  if (typeof window !== 'undefined') {
    localStorage.setItem('cyclosafe_language', lng);
  }
};

export default i18n;
