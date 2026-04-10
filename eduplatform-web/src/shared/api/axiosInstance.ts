import axios, { type AxiosInstance } from 'axios'
import { clearStoredAuth, readStoredToken } from '../authStorage'

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:5067/api'
export const apiOrigin = apiBaseUrl.replace(/\/api\/?$/, '')

export const resolveApiAssetUrl = (path?: string | null) => {
  if (!path) {
    return ''
  }

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  return `${apiOrigin}${path.startsWith('/') ? path : `/${path}`}`
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10000,
})

apiClient.interceptors.request.use(
  (config) => {
    const token = readStoredToken()

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => Promise.reject(error),
)

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = String(error.config?.url ?? '')
    const isAuthRequest =
      requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register')

    if (error.response?.status === 401 && !isAuthRequest) {
      clearStoredAuth()
      window.location.assign('/login')
    }

    return Promise.reject(error)
  },
)

export default apiClient
