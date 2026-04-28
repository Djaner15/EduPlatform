import axios from 'axios'
import { Globe } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAppSettings, useTranslation } from '../../../app/AppSettingsContext'
import { useAuth } from '../../../app/AuthContext'
import { useNotification } from '../../../app/NotificationContext'
import apiClient from '../../../shared/api/axiosInstance'
import { readApiError } from '../../../shared/apiErrors'
import { formatGradeLabel, gradeOptions, sectionOptions } from '../../../shared/classOptions'
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
  const { t } = useTranslation()
  const { language, setLanguage } = useAppSettings()
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

  const readLoginError = (error: unknown) => {
    const message = readApiError(error, t('auth.validation.loginFailed'))
    const normalizedMessage = message.trim().toLowerCase()

    if (normalizedMessage.includes('pending admin approval') || normalizedMessage.includes('pending approval')) {
      return t('auth.validation.pendingApproval')
    }

    if (normalizedMessage.includes('invalid credentials') || normalizedMessage.includes('unauthorized')) {
      return t('auth.validation.invalidCredentials')
    }

    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return t('auth.validation.accountNotFound')
    }

    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return t('auth.validation.invalidCredentials')
    }

    return message
  }

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!loginForm.username.trim() || !loginForm.password.trim()) {
      showNotification(t('auth.validation.missingLoginCredentials'), 'error')
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

      showNotification(t('auth.notifications.welcomeBack', { username: data.username }), 'success')

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
      showNotification(t('auth.validation.completeRegistrationFields'), 'error')
      return
    }

    if (registerForm.password.length < 8) {
      showNotification(t('auth.validation.passwordMinLength'), 'error')
      return
    }

    if (!/[A-Z]/.test(registerForm.password)) {
      showNotification(t('auth.validation.passwordUppercase'), 'error')
      return
    }

    if (!/[a-z]/.test(registerForm.password)) {
      showNotification(t('auth.validation.passwordLowercase'), 'error')
      return
    }

    if (!/[0-9]/.test(registerForm.password)) {
      showNotification(t('auth.validation.passwordNumber'), 'error')
      return
    }

    if (!/[^A-Za-z0-9]/.test(registerForm.password)) {
      showNotification(t('auth.validation.passwordSymbol'), 'error')
      return
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      showNotification(t('auth.validation.passwordsDoNotMatch'), 'error')
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
      showNotification(t('auth.notifications.registrationSubmitted'), 'success')
    } catch (error) {
      showNotification(readApiError(error, t('auth.validation.registrationFailed')), 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-backdrop auth-backdrop-left" />
      <div className="auth-backdrop auth-backdrop-right" />
      <div className="auth-language-floating">
        <div className="auth-language-switch" aria-label={t('auth.language')}>
          <span className="auth-language-icon" aria-hidden="true">
            <Globe className="h-4 w-4" />
          </span>
          <button
            className={language === 'bg' ? 'active' : ''}
            type="button"
            onClick={() => setLanguage('bg')}
          >
            BG
          </button>
          <button
            className={language === 'en' ? 'active' : ''}
            type="button"
            onClick={() => setLanguage('en')}
          >
            EN
          </button>
        </div>
      </div>

      <section className="auth-layout">
        <section className="auth-panel">
          <div className="auth-panel-top">
            <div className="auth-panel-intro">
              <BrandLogo showCopy={false} size="auth" variant="transparent" />
              <div className="auth-brand-copy">
                <div className="auth-brand-title">{t('appName')}</div>
              </div>
              <p className="panel-overline">{t('auth.portal')}</p>
            </div>

            <div className="mode-switch" aria-label={t('auth.modeLabel')}>
              <button
                className={mode === 'login' ? 'active' : ''}
                type="button"
                onClick={() => {
                  setMode('login')
                }}
              >
                {t('auth.login')}
              </button>
              <button
                className={mode === 'register' ? 'active' : ''}
                type="button"
                onClick={() => {
                  setMode('register')
                }}
              >
                {t('auth.register')}
              </button>
            </div>
          </div>

          <div className="auth-card">
            {mode === 'login' ? (
              <form className="auth-form" onSubmit={handleLoginSubmit}>
                <label className="field">
                  <span>{t('auth.username')}</span>
                  <input
                    autoComplete="username"
                    placeholder={t('auth.usernamePlaceholder')}
                    type="text"
                    value={loginForm.username}
                    onChange={(event) =>
                      setLoginForm((current) => ({ ...current, username: event.target.value }))
                    }
                  />
                </label>

                <label className="field">
                  <span>{t('auth.password')}</span>
                  <div className="password-field">
                    <input
                      autoComplete="current-password"
                      placeholder={t('auth.passwordPlaceholder')}
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
                      {showLoginPassword ? t('common.hide') : t('common.show')}
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
                    <span>{t('auth.rememberMe')}</span>
                  </label>
                  <span className="text-link">{t('auth.accessPortal')}</span>
                </div>

                <button className="submit-button" disabled={isSubmitting} type="submit">
                  <span>{isSubmitting ? t('auth.signingIn') : t('auth.signInButton')}</span>
                </button>

                <p className="form-note">
                  {t('auth.newHere')}{' '}
                  <button
                    className="inline-switch"
                    type="button"
                    onClick={() => {
                      setMode('register')
                    }}
                  >
                    {t('auth.createAccount')}
                  </button>
                </p>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleRegisterSubmit}>
                <label className="field">
                  <span>{t('auth.fullName')}</span>
                  <input
                    autoComplete="name"
                    placeholder={t('auth.fullNamePlaceholder')}
                    type="text"
                    value={registerForm.fullName}
                    onChange={(event) =>
                      setRegisterForm((current) => ({ ...current, fullName: event.target.value }))
                    }
                  />
                </label>

                <label className="field">
                  <span>{t('auth.username')}</span>
                  <input
                    autoComplete="username"
                    placeholder={t('auth.usernameRegistrationPlaceholder')}
                    type="text"
                    value={registerForm.username}
                    onChange={(event) =>
                      setRegisterForm((current) => ({ ...current, username: event.target.value }))
                    }
                  />
                </label>

                <label className="field">
                  <span>{t('auth.email')}</span>
                  <input
                    autoComplete="email"
                    placeholder={t('auth.emailPlaceholder')}
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
                      label={t('auth.grade', { defaultValue: 'Grade' })}
                      value={String(registerForm.grade)}
                      options={gradeOptions.map((grade) => ({
                        value: String(grade),
                        label: formatGradeLabel(grade),
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
                      label={t('auth.section', { defaultValue: 'Section' })}
                      value={registerForm.section}
                      options={sectionOptions.map((section) => ({
                        value: section,
                        label: t('auth.sectionOption', { section }),
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
                  <span>{t('auth.password')}</span>
                  <div className="password-field">
                    <input
                      autoComplete="new-password"
                      placeholder={t('auth.passwordRegistrationPlaceholder')}
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
                      {showRegisterPassword ? t('common.hide') : t('common.show')}
                    </button>
                  </div>
                  <div className="strength-meter" aria-hidden="true">
                    <span style={{ width: `${passwordStrength * 25}%` }} />
                  </div>
                  <p className="strength-label">
                    {t('passwordRuleShort')}
                  </p>
                </label>

                <label className="field">
                  <span>{t('auth.confirmPassword')}</span>
                  <div className="password-field">
                    <input
                      autoComplete="new-password"
                      placeholder={t('auth.confirmPasswordPlaceholder')}
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
                      {showConfirmPassword ? t('common.hide') : t('common.show')}
                    </button>
                  </div>
                </label>

                <label className="checkbox-row">
                  <input type="checkbox" defaultChecked />
                  <span>{t('auth.respectfulUseAgreement')}</span>
                </label>

                <button className="submit-button" disabled={isSubmitting} type="submit">
                  <span>{isSubmitting ? t('auth.creatingAccount') : t('auth.createAccountButton')}</span>
                </button>

                <p className="form-note">
                  {t('auth.alreadyRegistered')}{' '}
                  <button
                    className="inline-switch"
                    type="button"
                    onClick={() => {
                      setMode('login')
                    }}
                  >
                    {t('auth.returnToLogin')}
                  </button>
                </p>
              </form>
            )}

            <div className="auth-learn-more">
              <Link className="auth-learn-more-link" to="/about">
                {t('auth.learnMore')}
              </Link>
            </div>
          </div>
        </section>
      </section>
    </main>
  )
}
