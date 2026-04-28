import { Alert, Snackbar } from '@mui/material'
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
  type SyntheticEvent,
} from 'react'
import { playUiSuccessSound } from '../shared/uiAudio'

type NotificationSeverity = 'success' | 'error'

type NotificationState = {
  open: boolean
  message: string
  severity: NotificationSeverity
}

type NotificationContextValue = {
  showNotification: (message: string, severity: NotificationSeverity) => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

type NotificationProviderProps = {
  children: ReactNode
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    message: '',
    severity: 'success',
  })

  const showNotification = useCallback((message: string, severity: NotificationSeverity) => {
    if (severity === 'success') {
      playUiSuccessSound()
    }

    setNotification({
      open: true,
      message,
      severity,
    })
  }, [])

  const handleClose = (_event?: Event | SyntheticEvent, reason?: string) => {
    if (reason === 'clickaway') {
      return
    }

    setNotification((current) => ({
      ...current,
      open: false,
    }))
  }

  const value = useMemo<NotificationContextValue>(
    () => ({
      showNotification,
    }),
    [showNotification],
  )

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Snackbar
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        autoHideDuration={3500}
        onClose={handleClose}
        open={notification.open}
      >
        <Alert
          onClose={handleClose}
          severity={notification.severity}
          sx={{ width: '100%', minWidth: 280, boxShadow: 6 }}
          variant="filled"
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const context = useContext(NotificationContext)

  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }

  return context
}
