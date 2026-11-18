import {NativeModules, Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import vi from './vi.json';
import en from './en.json';

export const LANGUAGES = ['vi', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];
const KEY = 'language';

const deviceLanguage = (): Language => {
  const locale: string =
    (Platform.OS === 'ios'
      ? NativeModules.SettingsManager?.settings?.AppleLocale ||
        NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]
      : NativeModules.I18nManager?.localeIdentifier) || 'vi';
  return locale.toLowerCase().startsWith('en') ? 'en' : 'vi';
};

i18n.use(initReactI18next).init({
  resources: {vi: {translation: vi}, en: {translation: en}},
  lng: deviceLanguage(),
  fallbackLng: 'vi',
  interpolation: {escapeValue: false},
  compatibilityJSON: 'v4',
});

// Saved choice wins over the device language.
export const loadLanguage = async () => {
  try {
    const saved = await AsyncStorage.getItem(KEY);
    if (saved === 'vi' || saved === 'en') {
      await i18n.changeLanguage(saved);
    }
  } catch {}
};

export const setLanguage = async (lng: Language) => {
  await i18n.changeLanguage(lng);
  try {
    await AsyncStorage.setItem(KEY, lng);
  } catch {}
};

export default i18n;
