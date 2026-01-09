import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import zhCN from './locales/zh-CN.json';
import enUS from './locales/en-US.json';

i18n
  .use(LanguageDetector) // 检测用户浏览器语言
  .use(initReactI18next) // 初始化react-i18next
  .init({
    resources: {
      'zh-CN': {
        translation: zhCN
      },
      'en-US': {
        translation: enUS
      }
    },
    fallbackLng: 'zh-CN', // 默认语言为中文
    lng: 'zh-CN', // 设置默认语言
    interpolation: {
      escapeValue: false // React已经转义了
    }
  });

export default i18n;


