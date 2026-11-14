import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import vi from '@/locales/vi.json';
import en from '@/locales/en.json';

// To add a language: create locales/<code>.json with the same keys as vi.json,
// import it here and add it to `languages` and `resources`.
export const languages = [
  {code: 'vi', label: 'Tiếng Việt', short: 'VI'},
  {code: 'en', label: 'English', short: 'EN'},
] as const;

export type LanguageCode = (typeof languages)[number]['code'];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      vi: {translation: vi},
      en: {translation: en},
    },
    fallbackLng: 'vi',
    supportedLngs: languages.map(l => l.code),
    load: 'languageOnly',
    interpolation: {escapeValue: false},
    // no promotional console message from i18next (browser console, test output)
    showSupportNotice: false,
    // Vietnamese unless the user picked another language (saved in localStorage)
    detection: {
      order: ['localStorage'],
      lookupLocalStorage: 'aloca.lang',
      caches: ['localStorage'],
    },
  });

const syncHtmlLang = (lng: string) => {
  document.documentElement.lang = lng.split('-')[0];
};
syncHtmlLang(i18n.resolvedLanguage ?? 'vi');
i18n.on('languageChanged', syncHtmlLang);

export default i18n;
