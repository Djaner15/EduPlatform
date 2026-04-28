import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation as useI18nextTranslation } from 'react-i18next'
import i18n, { normalizeLanguage } from './i18n'
import { setUiSoundsEnabled } from '../shared/uiAudio'
import { useAuth } from './AuthContext'

export type AppTheme = 'light' | 'dark'
export type AppLanguage = 'en' | 'bg'
export type AppCursorMode = 'default' | 'dolphin' | 'pro-circle'
export type AppBrandTone = 'teal' | 'blue' | 'coral'

type AppSettingsContextValue = {
  theme: AppTheme
  language: AppLanguage
  cursorMode: AppCursorMode
  glassLevel: number
  brandTone: AppBrandTone
  uiSoundsEnabled: boolean
  setTheme: (theme: AppTheme) => void
  setLanguage: (language: AppLanguage) => void
  setCursorMode: (cursorMode: AppCursorMode) => void
  setGlassLevel: (glassLevel: number) => void
  setBrandTone: (brandTone: AppBrandTone) => void
  setUiSoundsEnabled: (enabled: boolean) => void
}

const THEME_KEY = 'eduplatformTheme'
const LANGUAGE_KEY = 'eduplatformLanguage'
const DEFAULT_PERSONALIZATION_SETTINGS = {
  cursorMode: 'dolphin' as AppCursorMode,
  glassLevel: 58,
  brandTone: 'teal' as AppBrandTone,
  uiSoundsEnabled: true,
}

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null)

const brandToneStyles: Record<
  AppBrandTone,
  {
    color: string
    rgb: string
    deep: string
    soft: string
    contrast: string
  }
> = {
  teal: {
    color: '#40E0D0',
    rgb: '64 224 208',
    deep: '#0f8b8d',
    soft: '#dffcf8',
    contrast: '#0f8b8d',
  },
  blue: {
    color: '#5BA8FF',
    rgb: '91 168 255',
    deep: '#2563eb',
    soft: '#e0efff',
    contrast: '#1d4ed8',
  },
  coral: {
    color: '#FF8A7A',
    rgb: '255 138 122',
    deep: '#f97360',
    soft: '#ffe8e2',
    contrast: '#d85b46',
  },
}

const readStoredTheme = (): AppTheme => {
  const storedTheme = localStorage.getItem(THEME_KEY)
  return storedTheme === 'dark' ? 'dark' : 'light'
}

const readStoredLanguage = (): AppLanguage => {
  return normalizeLanguage(localStorage.getItem(LANGUAGE_KEY) ?? i18n.resolvedLanguage)
}

const resolveUserSettingsKey = (username?: string | null) => {
  const normalizedUsername = username?.trim().toLowerCase()
  return normalizedUsername ? `eduplatform_settings_${normalizedUsername}` : null
}

const readStoredPersonalization = (username?: string | null) => {
  const storageKey = resolveUserSettingsKey(username)

  if (!storageKey) {
    return DEFAULT_PERSONALIZATION_SETTINGS
  }

  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) {
      return DEFAULT_PERSONALIZATION_SETTINGS
    }

    const parsed = JSON.parse(raw) as Partial<{
      cursorMode: AppCursorMode
      glassLevel: number
      brandTone: AppBrandTone
      uiSoundsEnabled: boolean
    }>

    return {
      cursorMode:
        parsed.cursorMode === 'default' || parsed.cursorMode === 'dolphin' || parsed.cursorMode === 'pro-circle'
          ? parsed.cursorMode
          : DEFAULT_PERSONALIZATION_SETTINGS.cursorMode,
      glassLevel:
        typeof parsed.glassLevel === 'number' && Number.isFinite(parsed.glassLevel) && parsed.glassLevel >= 0 && parsed.glassLevel <= 100
          ? parsed.glassLevel
          : DEFAULT_PERSONALIZATION_SETTINGS.glassLevel,
      brandTone:
        parsed.brandTone === 'teal' || parsed.brandTone === 'blue' || parsed.brandTone === 'coral'
          ? parsed.brandTone
          : DEFAULT_PERSONALIZATION_SETTINGS.brandTone,
      uiSoundsEnabled:
        typeof parsed.uiSoundsEnabled === 'boolean'
          ? parsed.uiSoundsEnabled
          : DEFAULT_PERSONALIZATION_SETTINGS.uiSoundsEnabled,
    }
  } catch {
    return DEFAULT_PERSONALIZATION_SETTINGS
  }
}

type AppSettingsProviderProps = {
  children: ReactNode
}

export function AppSettingsProvider({ children }: AppSettingsProviderProps) {
  const { user } = useAuth()
  const [theme, setThemeState] = useState<AppTheme>('light')
  const [language, setLanguageState] = useState<AppLanguage>('en')
  const [cursorMode, setCursorModeState] = useState<AppCursorMode>(DEFAULT_PERSONALIZATION_SETTINGS.cursorMode)
  const [glassLevel, setGlassLevelState] = useState(DEFAULT_PERSONALIZATION_SETTINGS.glassLevel)
  const [brandTone, setBrandToneState] = useState<AppBrandTone>(DEFAULT_PERSONALIZATION_SETTINGS.brandTone)
  const [uiSoundsEnabled, setUiSoundsEnabledState] = useState(DEFAULT_PERSONALIZATION_SETTINGS.uiSoundsEnabled)

  useEffect(() => {
    setThemeState(readStoredTheme())
    setLanguageState(readStoredLanguage())
  }, [])

  useEffect(() => {
    const personalization = readStoredPersonalization(user?.username)
    setCursorModeState(personalization.cursorMode)
    setGlassLevelState(personalization.glassLevel)
    setBrandToneState(personalization.brandTone)
    setUiSoundsEnabledState(personalization.uiSoundsEnabled)
  }, [user?.username])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.body.dataset.theme = theme
    document.body.classList.toggle('theme-dark', theme === 'dark')
    document.body.classList.toggle('theme-light', theme === 'light')
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.lang = language
    localStorage.setItem(LANGUAGE_KEY, language)
  }, [language])

  useEffect(() => {
    const blur = 8 + glassLevel * 0.18
    const opacity = 0.56 + glassLevel * 0.0028
    document.documentElement.style.setProperty('--glass-blur', `${blur.toFixed(1)}px`)
    document.documentElement.style.setProperty('--glass-opacity', opacity.toFixed(2))
    document.documentElement.style.setProperty('--glass-strong-opacity', Math.min(opacity + 0.1, 0.94).toFixed(2))
  }, [glassLevel])

  useEffect(() => {
    const selected = brandToneStyles[brandTone]
    document.documentElement.style.setProperty('--primary-color', selected.color)
    document.documentElement.style.setProperty('--primary-rgb', selected.rgb)
    document.documentElement.style.setProperty('--primary-deep', selected.deep)
    document.documentElement.style.setProperty('--primary-soft', selected.soft)
    document.documentElement.style.setProperty('--primary-contrast', selected.contrast)
  }, [brandTone])

  useEffect(() => {
    setUiSoundsEnabled(uiSoundsEnabled)
  }, [uiSoundsEnabled])

  useEffect(() => {
    const storageKey = resolveUserSettingsKey(user?.username)
    if (!storageKey) {
      return
    }

    localStorage.setItem(
      storageKey,
      JSON.stringify({
        cursorMode,
        glassLevel,
        brandTone,
        uiSoundsEnabled,
      }),
    )
  }, [brandTone, cursorMode, glassLevel, uiSoundsEnabled, user?.username])

  useEffect(() => {
    const handleLanguageChanged = (nextLanguage: string) => {
      setLanguageState(normalizeLanguage(nextLanguage))
    }

    i18n.on('languageChanged', handleLanguageChanged)

    return () => {
      i18n.off('languageChanged', handleLanguageChanged)
    }
  }, [])

  const setLanguage = (nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage)
    void i18n.changeLanguage(nextLanguage)
  }

  const value = useMemo<AppSettingsContextValue>(
    () => ({
      theme,
      language,
      cursorMode,
      glassLevel,
      brandTone,
      uiSoundsEnabled,
      setTheme: setThemeState,
      setLanguage,
      setCursorMode: setCursorModeState,
      setGlassLevel: setGlassLevelState,
      setBrandTone: setBrandToneState,
      setUiSoundsEnabled: setUiSoundsEnabledState,
    }),
    [brandTone, cursorMode, glassLevel, language, theme, uiSoundsEnabled],
  )

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext)

  if (!context) {
    throw new Error('useAppSettings must be used within an AppSettingsProvider')
  }

  return context
}

export function useTranslation() {
  const { language } = useAppSettings()
  const { t, i18n: translationInstance } = useI18nextTranslation()

  return {
    language,
    t,
    i18n: translationInstance,
  }
}
