import type { ReactNode } from 'react'
import { AppSettingsProvider } from './AppSettingsContext'
import { AuthProvider } from './AuthContext'
import { NotificationProvider } from './NotificationContext'

type AppProvidersProps = {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <NotificationProvider>
      <AppSettingsProvider>
        <AuthProvider>{children}</AuthProvider>
      </AppSettingsProvider>
    </NotificationProvider>
  )
}
