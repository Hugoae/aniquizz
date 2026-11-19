import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resolveAppLocale, type AppLocale } from '@aniquizz/shared';
import { readDeviceLocale } from '@/lib/i18n/localeStorage';
import { I18N_NAMESPACES, resourcesEn, resourcesFr } from '@/lib/i18n/resources';

const bootLocale = resolveAppLocale({
  device: readDeviceLocale(),
  navigatorLanguages: typeof navigator === 'undefined' ? [] : navigator.languages,
});

void i18n.use(initReactI18next).init({
  resources: { fr: resourcesFr, en: resourcesEn },
  lng: bootLocale,
  fallbackLng: 'fr',
  supportedLngs: ['fr', 'en'],
  ns: [...I18N_NAMESPACES],
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export function applyDocumentLocale(locale: AppLocale): void {
  document.documentElement.lang = locale;
}

applyDocumentLocale(bootLocale);

export { I18N_NAMESPACES };
export default i18n;
