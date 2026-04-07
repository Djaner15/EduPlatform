import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type AuthUser = {
  id: number
  fullName?: string
  username: string
  role: string
  grade?: number | null
  section?: string | null
  classDisplay?: string | null
}

type LoginPayload = {
  token: string
  user: AuthUser
}

type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  login: (payload: LoginPayload) => void
  logout: () => void
  isAuthenticated: () => boolean
}

const AUTH_TOKEN_KEY = 'token'
const AUTH_USER_KEY = 'authUser'

const AuthContext = createContext<AuthContextValue | null>(null)

const parseStoredUser = (): AuthUser | null => {
  const raw = localStorage.getItem(AUTH_USER_KEY)

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    localStorage.removeItem(AUTH_USER_KEY)
    return null
  }
}

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    setToken(localStorage.getItem(AUTH_TOKEN_KEY))
    setUser(parseStoredUser())
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      login: ({ token: nextToken, user: nextUser }) => {
        localStorage.setItem(AUTH_TOKEN_KEY, nextToken)
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser))
        localStorage.setItem('username', nextUser.username)
        localStorage.setItem('userRole', nextUser.role)
        setToken(nextToken)
        setUser(nextUser)
      },
      logout: () => {
        localStorage.removeItem(AUTH_TOKEN_KEY)
        localStorage.removeItem(AUTH_USER_KEY)
        localStorage.removeItem('username')
        localStorage.removeItem('userRole')
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
