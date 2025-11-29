import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en';
import pt from './pt';

const RESOURCES = {
  'pt-BR': { translation: pt },
  'en-US': { translation: en },
};

i18n.use(initReactI18next).init({
  resources: RESOURCES,
  lng: 'pt-BR',
  fallbackLng: 'pt-BR',
  interpolation: {
    escapeValue: false,
  },
});

AsyncStorage.getItem('language').then((savedLanguage) => {
  if (savedLanguage) {
    i18n.changeLanguage(savedLanguage);
  } else {
    const deviceLang = Localization.getLocales()[0].languageTag;
    if (deviceLang && (deviceLang === 'en-US' || deviceLang === 'pt-BR')) {
      i18n.changeLanguage(deviceLang);
    }
  }
});

export default i18n;
