import axios from 'axios'

const looksTechnical = (message: string) => {
  const trimmed = message.trim()
  const lower = trimmed.toLowerCase()

  return (
    !trimmed ||
    trimmed.length > 220 ||
    lower.includes('exception') ||
    lower.includes('stack trace') ||
    lower.includes('developerexceptionpage') ||
    lower.includes('globalexceptionhandlingmiddleware') ||
    lower.includes('headers ======') ||
    lower.includes('<html') ||
    lower.includes('<!doctype') ||
    lower.includes('system.') ||
    lower.includes('microsoft.') ||
    lower.includes(' at ') ||
    trimmed.includes('�')
  )
}

const sanitizeCandidate = (candidate: unknown, fallback: string) => {
  if (typeof candidate !== 'string') {
    return fallback
  }

  const normalized = candidate.replace(/\s+/g, ' ').trim()
  return looksTechnical(normalized) ? fallback : normalized
}

export const readApiError = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        return 'The server is taking too long to respond right now. Please try again in a moment.'
      }

      return 'We could not connect to the server right now. Please make sure the backend is running and try again.'
    }

    const data = error.response?.data

    if (typeof data === 'string') {
      return sanitizeCandidate(data, fallback)
    }

    if (data && typeof data === 'object') {
      const candidate =
        ('message' in data && typeof data.message === 'string' && data.message) ||
        ('error' in data && typeof data.error === 'string' && data.error) ||
        ('title' in data && typeof data.title === 'string' && data.title) ||
        null

      if (candidate) {
        return sanitizeCandidate(candidate, fallback)
      }
    }
  }

  if (error instanceof Error) {
    return sanitizeCandidate(error.message, fallback)
  }

  return fallback
}
