import axios, { type AxiosInstance } from 'axios'
import { clearStoredAuth, readStoredToken } from '../authStorage'

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:5067/api'
const apiBaseUrlStorageKey = 'eduplatform_api_base_url'
const defaultApiCandidates = [
  apiBaseUrl,
  'http://localhost:5067/api',
  'http://localhost:5080/api',
  'http://127.0.0.1:5067/api',
  'http://127.0.0.1:5080/api',
]
const storedApiBaseUrl =
  typeof window !== 'undefined' ? window.localStorage.getItem(apiBaseUrlStorageKey) : null
const fallbackApiBaseUrls = Array.from(new Set([storedApiBaseUrl, ...defaultApiCandidates].filter(Boolean) as string[]))
const initialApiBaseUrl = storedApiBaseUrl && fallbackApiBaseUrls.includes(storedApiBaseUrl) ? storedApiBaseUrl : apiBaseUrl

const getOriginFromBaseUrl = (baseUrl: string) => baseUrl.replace(/\/api\/?$/, '')

export const apiOrigin = getOriginFromBaseUrl(apiBaseUrl)

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
  baseURL: initialApiBaseUrl,
  timeout: 6000,
})

type RetriableAxiosConfig = {
  _apiTriedBaseUrls?: string[]
}

apiClient.interceptors.request.use(
  (config) => {
    const retriableConfig = config as typeof config & RetriableAxiosConfig
    const token = readStoredToken()

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    if (!retriableConfig._apiTriedBaseUrls?.length) {
      retriableConfig._apiTriedBaseUrls = [String(config.baseURL ?? apiBaseUrl)]
    }

    return config
  },
  (error) => Promise.reject(error),
)

apiClient.interceptors.response.use(
  (response) => {
    const resolvedBaseUrl = String(response.config.baseURL ?? apiBaseUrl)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(apiBaseUrlStorageKey, resolvedBaseUrl)
    }
    return response
  },
  async (error) => {
    const config = error.config as (typeof error.config & RetriableAxiosConfig) | undefined
    const requestUrl = String(config?.url ?? '')
    const isAuthRequest =
      requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register')

    if (config && !error.response) {
      const currentBaseUrl = String(config.baseURL ?? apiBaseUrl)
      const triedBaseUrls = Array.from(new Set([...(config._apiTriedBaseUrls ?? []), currentBaseUrl]))
      const nextBaseUrl = fallbackApiBaseUrls.find((candidate) => !triedBaseUrls.includes(candidate))

      if (nextBaseUrl) {
        config._apiTriedBaseUrls = [...triedBaseUrls, nextBaseUrl]
        config.baseURL = nextBaseUrl
        return apiClient.request(config)
      }

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(apiBaseUrlStorageKey)
      }
    }

    if (error.response?.status === 401 && !isAuthRequest) {
      clearStoredAuth()
      window.location.assign('/login')
    }

    return Promise.reject(error)
  },
)

export default apiClient
