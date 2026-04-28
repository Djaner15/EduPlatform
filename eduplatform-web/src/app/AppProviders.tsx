import type { ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'
import { AppSettingsProvider } from './AppSettingsContext'
import { AuthProvider } from './AuthContext'
import i18n from './i18n'
import { NotificationProvider } from './NotificationContext'
import { DolphinCursorEffects } from '../shared/components/DolphinCursorEffects'

type AppProvidersProps = {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <I18nextProvider i18n={i18n}>
      <NotificationProvider>
        <AuthProvider>
          <AppSettingsProvider>
            {children}
            <DolphinCursorEffects />
          </AppSettingsProvider>
        </AuthProvider>
      </NotificationProvider>
    </I18nextProvider>
  )
}
