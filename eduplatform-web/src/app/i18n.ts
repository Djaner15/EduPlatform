import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import bg from '../locales/bg.json'
import en from '../locales/en.json'

const supportedLanguages = ['en', 'bg'] as const

const normalizeLanguage = (value?: string | null) => {
  if (!value) {
    return 'en'
  }

  const normalized = value.toLowerCase()
  return normalized.startsWith('bg') ? 'bg' : 'en'
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      bg: { translation: bg },
    },
    fallbackLng: 'en',
    supportedLngs: [...supportedLanguages],
    load: 'languageOnly',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'eduplatformLanguage',
      caches: ['localStorage'],
      convertDetectedLanguage: (value: string) => normalizeLanguage(value),
    },
  })

export { normalizeLanguage, supportedLanguages }
export default i18n
