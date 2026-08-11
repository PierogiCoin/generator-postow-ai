// i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations directly as modules instead of fetching them
import plTranslations from './locales/pl/translation.json';
import enTranslations from './locales/en/translation.json';

// This is an async IIFE that initializes i18n and its promise is exported as the default
const initPromise = (async () => {
    await i18n
      .use(initReactI18next)
      .use(LanguageDetector)
      .init({
        fallbackLng: 'pl',
        resources: {
          pl: { translation: plTranslations },
          en: { translation: enTranslations }
        },
        defaultNS: 'translation',
        interpolation: {
          escapeValue: false, // React is XSS-safe
        },
        detection: {
            order: ['localStorage', 'navigator', 'htmlTag'],
            caches: ['localStorage'],
        },
        react: {
          useSuspense: true,
        }
      });
})();

export default initPromise;
// Also export the configured i18n instance for use with I18nextProvider
export { i18n };