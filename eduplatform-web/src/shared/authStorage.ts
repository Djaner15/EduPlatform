import type { AuthUser } from '../app/AuthContext'

export const AUTH_TOKEN_KEY = 'token'
export const AUTH_USER_KEY = 'authUser'
export const AUTH_EXPIRES_AT_KEY = 'authExpiresAt'
export const AUTH_PERSIST_KEY = 'authPersistent'
export const AUTH_USERNAME_KEY = 'username'
export const AUTH_USER_ROLE_KEY = 'userRole'
export const AUTH_PERSIST_DURATION_MS = 7 * 24 * 60 * 60 * 1000

type StoredAuth = {
  token: string
  user: AuthUser
}

const safeParseUser = (value: string | null): AuthUser | null => {
  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as AuthUser
  } catch {
    return null
  }
}

const clearStorageSet = (storage: Storage) => {
  storage.removeItem(AUTH_TOKEN_KEY)
  storage.removeItem(AUTH_USER_KEY)
  storage.removeItem(AUTH_EXPIRES_AT_KEY)
  storage.removeItem(AUTH_PERSIST_KEY)
  storage.removeItem(AUTH_USERNAME_KEY)
  storage.removeItem(AUTH_USER_ROLE_KEY)
}

export const clearStoredAuth = () => {
  clearStorageSet(localStorage)
  clearStorageSet(sessionStorage)
}

export const persistAuth = ({
  token,
  user,
  rememberMe,
}: {
  token: string
  user: AuthUser
  rememberMe: boolean
}) => {
  clearStoredAuth()

  const storage = rememberMe ? localStorage : sessionStorage
  storage.setItem(AUTH_TOKEN_KEY, token)
  storage.setItem(AUTH_USER_KEY, JSON.stringify(user))
  storage.setItem(AUTH_USERNAME_KEY, user.username)
  storage.setItem(AUTH_USER_ROLE_KEY, user.role)

  if (rememberMe) {
    storage.setItem(AUTH_PERSIST_KEY, '1')
    storage.setItem(AUTH_EXPIRES_AT_KEY, String(Date.now() + AUTH_PERSIST_DURATION_MS))
  }
}

export const readStoredAuth = (): StoredAuth | null => {
  const sessionToken = sessionStorage.getItem(AUTH_TOKEN_KEY)
  const sessionUser = safeParseUser(sessionStorage.getItem(AUTH_USER_KEY))

  if (sessionToken && sessionUser) {
    return { token: sessionToken, user: sessionUser }
  }

  const persistentToken = localStorage.getItem(AUTH_TOKEN_KEY)
  const persistentUser = safeParseUser(localStorage.getItem(AUTH_USER_KEY))
  const expiresAt = Number(localStorage.getItem(AUTH_EXPIRES_AT_KEY) ?? 0)

  if (localStorage.getItem(AUTH_PERSIST_KEY) === '1') {
    if (!persistentToken || !persistentUser || !expiresAt || Date.now() > expiresAt) {
      clearStoredAuth()
      return null
    }

    return { token: persistentToken, user: persistentUser }
  }

  return null
}

export const readStoredToken = () => readStoredAuth()?.token ?? null
