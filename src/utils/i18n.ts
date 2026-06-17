import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

import en from '../constants/translations/en';
import si from '../constants/translations/si';

const RESOURCES = {
  en: { translation: en },
  si: { translation: si }
};

const LANGUAGE_KEY = 'sarupol_user_lang';

export const initI18n = async () => {
  let savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
  
  if (!savedLanguage) {
    // Detect device language
    const locales = Localization.getLocales();
    const deviceLanguage = locales && locales.length > 0 ? locales[0].languageCode : 'en';
    savedLanguage = deviceLanguage === 'si' ? 'si' : 'en';
  }

  await i18n
    .use(initReactI18next)
    .init({
      resources: RESOURCES,
      lng: savedLanguage,
      fallbackLng: 'en',
      compatibilityJSON: 'v3', // Required for React Native compatibility
      interpolation: {
        escapeValue: false // React already escapes values
      }
    } as any);
};

export const changeLanguage = async (lang: 'en' | 'si') => {
  await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  await i18n.changeLanguage(lang);
};

export default i18n;
