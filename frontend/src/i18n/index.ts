import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
// Kích hoạt TypeScript type augmentation cho translation keys
import './types';

// Vietnamese locale imports
import viCommon from './locales/vi/common.json';
import viAuth from './locales/vi/auth.json';
import viSettings from './locales/vi/settings.json';
import viTasks from './locales/vi/tasks.json';
import viWorkspace from './locales/vi/workspace.json';
import viLanding from './locales/vi/landing.json';

// English locale imports
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enSettings from './locales/en/settings.json';
import enTasks from './locales/en/tasks.json';
import enWorkspace from './locales/en/workspace.json';
import enLanding from './locales/en/landing.json';

const resources = {
  vi: {
    common: viCommon,
    auth: viAuth,
    settings: viSettings,
    tasks: viTasks,
    workspace: viWorkspace,
    landing: viLanding,
  },
  en: {
    common: enCommon,
    auth: enAuth,
    settings: enSettings,
    tasks: enTasks,
    workspace: enWorkspace,
    landing: enLanding,
  },
};

const savedLanguage = localStorage.getItem('app_language') || 'vi';

i18n.use(initReactI18next).init({
  resources,
  lng: savedLanguage,
  fallbackLng: 'vi',
  ns: ['common', 'auth', 'settings', 'tasks', 'workspace', 'landing'],
  defaultNS: 'common',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
