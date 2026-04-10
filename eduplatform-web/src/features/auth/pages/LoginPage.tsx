import axios from 'axios'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../app/AuthContext'
import { useNotification } from '../../../app/NotificationContext'
import apiClient from '../../../shared/api/axiosInstance'
import { gradeOptions, sectionOptions } from '../../../shared/classOptions'
import { AdminSelectField } from '../../../shared/components/AdminSelectField'
import { BrandLogo } from '../../../shared/components/BrandLogo'

type LoginResponse = {
  token: string
  username: string
  fullName?: string
  role: string
  userId: number
  profileImageUrl?: string | null
  grade?: number | null
  section?: string | null
  classDisplay?: string | null
}

type AuthMode = 'login' | 'register'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { login, logout, isAuthenticated, user } = useAuth()
  const { showNotification } = useNotification()
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login'
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: '',
    rememberMe: true,
  })
  const [registerForm, setRegisterForm] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    grade: 8,
    section: 'А',
  })
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const requestedMode = searchParams.get('mode') === 'register' ? 'register' : 'login'
    setMode(requestedMode)
  }, [searchParams])

  useEffect(() => {
    if (searchParams.get('logout') !== '1') {
      return
    }

    logout()
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.delete('logout')
      return next
    }, { replace: true })
  }, [logout, searchParams, setSearchParams])

  if (isAuthenticated()) {
    return <Navigate replace to={user?.role === 'Admin' ? '/admin' : user?.role === 'Teacher' ? '/teacher' : '/student'} />
  }

  const passwordStrength = useMemo(() => {
    const password = registerForm.password

    let score = 0
    if (password.length >= 8) score += 1
    if (/[A-Z]/.test(password)) score += 1
    if (/[0-9]/.test(password)) score += 1
    if (/[^A-Za-z0-9]/.test(password)) score += 1

    return Math.min(score, 4)
  }, [registerForm.password])

  const readApiError = (error: unknown, fallback: string) => {
    if (axios.isAxiosError(error)) {
      const payload = error.response?.data

      if (typeof payload === 'string') {
        return payload
      }

      if (payload && typeof payload === 'object') {
        if ('error' in payload && typeof payload.error === 'string') {
          return payload.error
        }

        if ('title' in payload && typeof payload.title === 'string') {
          return payload.title
        }
      }
    }

    return fallback
  }

  const readLoginError = (error: unknown) => {
    const message = readApiError(error, 'Login failed. Please try again.')
    const normalizedMessage = message.trim().toLowerCase()

    if (normalizedMessage.includes('pending admin approval') || normalizedMessage.includes('pending approval')) {
      return 'Your account is waiting for admin approval. You will be able to log in after approval.'
    }

    if (normalizedMessage.includes('invalid credentials') || normalizedMessage.includes('unauthorized')) {
      return 'Login failed. Incorrect username or password.'
    }

    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return 'This account was not found. Please check your username or register first.'
    }

    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return 'Login failed. Incorrect username or password.'
    }

    return message
  }

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!loginForm.username.trim() || !loginForm.password.trim()) {
      showNotification('Please enter your username and password.', 'error')
      return
    }

    setIsSubmitting(true)

    try {
      const { data } = await apiClient.post<LoginResponse>('/auth/login', {
        username: loginForm.username.trim(),
        password: loginForm.password,
      })

      login({
        token: data.token,
        user: {
          id: data.userId,
          fullName: data.fullName,
          username: data.username,
          role: data.role,
          profileImageUrl: data.profileImageUrl ?? null,
          grade: data.grade ?? null,
          section: data.section ?? null,
          classDisplay: data.classDisplay ?? null,
        },
        rememberMe: loginForm.rememberMe,
      })

      showNotification(`Welcome back, ${data.username}. Login successful.`, 'success')

      const fallbackPath = data.role === 'Admin' ? '/admin' : data.role === 'Teacher' ? '/teacher' : '/student'
      const redirectTo = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname
      navigate(redirectTo ?? fallbackPath, { replace: true })
    } catch (error) {
      showNotification(readLoginError(error), 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRegisterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (
      !registerForm.username.trim() ||
      !registerForm.fullName.trim() ||
      !registerForm.email.trim() ||
      !registerForm.password.trim() ||
      !registerForm.confirmPassword.trim() ||
      !registerForm.section.trim()
    ) {
      showNotification('Please complete all registration fields.', 'error')
      return
    }

    if (registerForm.password.length < 8) {
      showNotification('Password must be at least 8 characters long.', 'error')
      return
    }

    if (!/[A-Z]/.test(registerForm.password)) {
      showNotification('Password must contain at least one uppercase letter.', 'error')
      return
    }

    if (!/[a-z]/.test(registerForm.password)) {
      showNotification('Password must contain at least one lowercase letter.', 'error')
      return
    }

    if (!/[0-9]/.test(registerForm.password)) {
      showNotification('Password must contain at least one number.', 'error')
      return
    }

    if (!/[^A-Za-z0-9]/.test(registerForm.password)) {
      showNotification('Password must contain at least one symbol.', 'error')
      return
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      showNotification('Passwords do not match.', 'error')
      return
    }

    setIsSubmitting(true)

    try {
      await apiClient.post('/auth/register', {
        fullName: registerForm.fullName.trim(),
        username: registerForm.username.trim(),
        email: registerForm.email.trim(),
        password: registerForm.password,
        grade: registerForm.grade,
        section: registerForm.section,
      })

      setLoginForm({
        username: registerForm.username.trim(),
        password: '',
        rememberMe: true,
      })
      setRegisterForm({
        fullName: '',
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        grade: 8,
        section: 'А',
      })
      setMode('login')
      showNotification('Registration submitted. An administrator must approve your account before login.', 'success')
    } catch (error) {
      showNotification(readApiError(error, 'Registration failed. Please try again.'), 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-backdrop auth-backdrop-left" />
      <div className="auth-backdrop auth-backdrop-right" />

      <section className="auth-layout">
        <section className="auth-panel">
          <div className="auth-panel-top">
            <div className="auth-panel-intro">
              <BrandLogo showCopy={false} size="auth" variant="transparent" />
              <div className="auth-brand-copy">
                <div className="auth-brand-title">EduPlatform</div>
              </div>
              <p className="panel-overline">Student portal</p>
            </div>

            <div className="mode-switch" aria-label="Authentication mode">
              <button
                className={mode === 'login' ? 'active' : ''}
                type="button"
                onClick={() => {
                  setMode('login')
                }}
              >
                Login
              </button>
              <button
                className={mode === 'register' ? 'active' : ''}
                type="button"
                onClick={() => {
                  setMode('register')
                }}
              >
                Register
              </button>
            </div>
          </div>

          <div className="auth-card">
            {mode === 'login' ? (
              <form className="auth-form" onSubmit={handleLoginSubmit}>
                <label className="field">
                  <span>Username</span>
                  <input
                    autoComplete="username"
                    placeholder="Enter your username"
                    type="text"
                    value={loginForm.username}
                    onChange={(event) =>
                      setLoginForm((current) => ({ ...current, username: event.target.value }))
                    }
                  />
                </label>

                <label className="field">
                  <span>Password</span>
                  <div className="password-field">
                    <input
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginForm.password}
                      onChange={(event) =>
                        setLoginForm((current) => ({ ...current, password: event.target.value }))
                      }
                    />
                    <button
                      className="ghost-toggle"
                      type="button"
                      onClick={() => setShowLoginPassword((current) => !current)}
                    >
                      {showLoginPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </label>

                <div className="form-row">
                  <label className="checkbox-row">
                    <input
                      checked={loginForm.rememberMe}
                      type="checkbox"
                      onChange={(event) =>
                        setLoginForm((current) => ({ ...current, rememberMe: event.target.checked }))
                      }
                    />
                    <span>Keep me signed in on this device</span>
                  </label>
                  <span className="text-link">Student access portal</span>
                </div>

                <button className="submit-button" disabled={isSubmitting} type="submit">
                  <span>{isSubmitting ? 'Signing in...' : 'Sign in to EduPlatform'}</span>
                </button>

                <p className="form-note">
                  New here?{' '}
                  <button
                    className="inline-switch"
                    type="button"
                    onClick={() => {
                      setMode('register')
                    }}
                  >
                    Create an account
                  </button>
                </p>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleRegisterSubmit}>
                <label className="field">
                  <span>Full name</span>
                  <input
                    autoComplete="name"
                    placeholder="Enter your full name"
                    type="text"
                    value={registerForm.fullName}
                    onChange={(event) =>
                      setRegisterForm((current) => ({ ...current, fullName: event.target.value }))
                    }
                  />
                </label>

                <label className="field">
                  <span>Username</span>
                  <input
                    autoComplete="username"
                    placeholder="Choose a username"
                    type="text"
                    value={registerForm.username}
                    onChange={(event) =>
                      setRegisterForm((current) => ({ ...current, username: event.target.value }))
                    }
                  />
                </label>

                <label className="field">
                  <span>Email</span>
                  <input
                    autoComplete="email"
                    placeholder="name@school.com"
                    type="email"
                    value={registerForm.email}
                    onChange={(event) =>
                      setRegisterForm((current) => ({ ...current, email: event.target.value }))
                    }
                  />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="field">
                    <AdminSelectField
                      label="Grade"
                      value={String(registerForm.grade)}
                      options={gradeOptions.map((grade) => ({
                        value: String(grade),
                        label: `Grade ${grade}`,
                      }))}
                      onChange={(value) =>
                        setRegisterForm((current) => ({
                          ...current,
                          grade: Number(value),
                        }))
                      }
                    />
                  </div>

                  <div className="field">
                    <AdminSelectField
                      label="Section"
                      value={registerForm.section}
                      options={sectionOptions.map((section) => ({
                        value: section,
                        label: `Section ${section}`,
                      }))}
                      onChange={(value) =>
                        setRegisterForm((current) => ({
                          ...current,
                          section: value,
                        }))
                      }
                    />
                  </div>
                </div>

                <label className="field">
                  <span>Password</span>
                  <div className="password-field">
                    <input
                      autoComplete="new-password"
                      placeholder="Create a password"
                      type={showRegisterPassword ? 'text' : 'password'}
                      value={registerForm.password}
                      onChange={(event) =>
                        setRegisterForm((current) => ({ ...current, password: event.target.value }))
                      }
                    />
                    <button
                      className="ghost-toggle"
                      type="button"
                      onClick={() => setShowRegisterPassword((current) => !current)}
                    >
                      {showRegisterPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <div className="strength-meter" aria-hidden="true">
                    <span style={{ width: `${passwordStrength * 25}%` }} />
                  </div>
                  <p className="strength-label">
                    Use at least 8 characters with uppercase, lowercase, number, and symbol.
                  </p>
                </label>

                <label className="field">
                  <span>Confirm password</span>
                  <div className="password-field">
                    <input
                      autoComplete="new-password"
                      placeholder="Repeat your password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={registerForm.confirmPassword}
                      onChange={(event) =>
                        setRegisterForm((current) => ({
                          ...current,
                          confirmPassword: event.target.value,
                        }))
                      }
                    />
                    <button
                      className="ghost-toggle"
                      type="button"
                      onClick={() => setShowConfirmPassword((current) => !current)}
                    >
                      {showConfirmPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </label>

                <label className="checkbox-row">
                  <input type="checkbox" defaultChecked />
                  <span>I agree to respectful platform use and communication.</span>
                </label>

                <button className="submit-button" disabled={isSubmitting} type="submit">
                  <span>{isSubmitting ? 'Creating account...' : 'Create account'}</span>
                </button>

                <p className="form-note">
                  Already registered?{' '}
                  <button
                    className="inline-switch"
                    type="button"
                    onClick={() => {
                      setMode('login')
                    }}
                  >
                    Return to login
                  </button>
                </p>
              </form>
            )}

            <div className="auth-learn-more">
              <Link className="auth-learn-more-link" to="/about">
                Learn more about the platform
              </Link>
            </div>
          </div>
        </section>
      </section>
    </main>
  )
}
