import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { clearStoredAuth, persistAuth, readStoredAuth } from '../shared/authStorage'

export type AuthUser = {
  id: number
  fullName?: string
  username: string
  role: string
  profileImageUrl?: string | null
  grade?: number | null
  section?: string | null
  classDisplay?: string | null
}

type LoginPayload = {
  token: string
  user: AuthUser
  rememberMe?: boolean
}

type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  isReady: boolean
  login: (payload: LoginPayload) => void
  logout: () => void
  isAuthenticated: () => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const storedAuth = readStoredAuth()
    setToken(storedAuth?.token ?? null)
    setUser(storedAuth?.user ?? null)
    setIsReady(true)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isReady,
      login: ({ token: nextToken, user: nextUser, rememberMe = false }) => {
        persistAuth({ token: nextToken, user: nextUser, rememberMe })
        setToken(nextToken)
        setUser(nextUser)
        setIsReady(true)
      },
      logout: () => {
        clearStoredAuth()
        setToken(null)
        setUser(null)
        setIsReady(true)
      },
      isAuthenticated: () => Boolean(token),
    }),
    [isReady, token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
