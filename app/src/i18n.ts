import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import zhTW from './locales/zh-TW.json';
import zhCN from './locales/zh-CN.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';

i18n
    // detect user language
    // learn more: https://github.com/i18next/i18next-browser-languagedetector
    .use(LanguageDetector)
    // pass the i18n instance to react-i18next.
    .use(initReactI18next)
    // init i18next
    // for all options read: https://www.i18next.com/overview/configuration-options
    .init({
        debug: true,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false, // not needed for react as it escapes by default
        },
        resources: {
            en: {
                translation: en
            },
            'zh-TW': {
                translation: zhTW
            },
            'zh-CN': {
                translation: zhCN
            },
            // Map other Chinese locales
            'zh': {
                translation: zhCN
            },
            'zh-HK': {
                translation: zhTW
            },
            'ja': {
                translation: ja
            },
            'ko': {
                translation: ko
            }
        }
    });

export default i18n;
