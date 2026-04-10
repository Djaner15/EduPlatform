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

  useEffect(() => {
    const storedAuth = readStoredAuth()
    setToken(storedAuth?.token ?? null)
    setUser(storedAuth?.user ?? null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      login: ({ token: nextToken, user: nextUser, rememberMe = false }) => {
        persistAuth({ token: nextToken, user: nextUser, rememberMe })
        setToken(nextToken)
        setUser(nextUser)
      },
      logout: () => {
        clearStoredAuth()
        setToken(null)
        setUser(null)
      },
      isAuthenticated: () => Boolean(token),
    }),
    [token, user],
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
