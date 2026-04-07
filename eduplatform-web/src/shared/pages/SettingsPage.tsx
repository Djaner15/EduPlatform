import axios from 'axios'
import {
  Globe2,
  LockKeyhole,
  MoonStar,
  SunMedium,
  Upload,
  UserCircle2,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { PageHeader } from '../components/PageHeader'
import apiClient from '../api/axiosInstance'
import { useAppSettings, useTranslation } from '../../app/AppSettingsContext'
import { useAuth } from '../../app/AuthContext'
import { useNotification } from '../../app/NotificationContext'

type PasswordForm = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

const initialPasswordForm: PasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

const validateStrongPassword = (password: string) => {
  if (password.length < 8) {
    return 'Password must be at least 8 characters long.'
  }

  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter.'
  }

  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter.'
  }

  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number.'
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Password must contain at least one symbol.'
  }

  return null
}

export function SettingsPage() {
  const { user } = useAuth()
  const { showNotification } = useNotification()
  const { language, setLanguage, theme, setTheme } = useAppSettings()
  const { t } = useTranslation()
  const profileImageStorageKey = useMemo(
    () => `eduplatformProfileImage:${user?.id ?? 'guest'}`,
    [user?.id],
  )
  const [passwordForm, setPasswordForm] = useState(initialPasswordForm)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const savedImage = localStorage.getItem(profileImageStorageKey)
    setProfileImage(savedImage)
  }, [])

  const roleDescription = useMemo(() => {
    if (user?.role === 'Admin') {
      return t('accountSettingsDescriptionAdmin')
    }

    if (user?.role === 'Teacher') {
      return t('accountSettingsDescriptionTeacher')
    }

    return t('accountSettingsDescriptionStudent')
  }, [t, user?.role])

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (
      !passwordForm.currentPassword.trim() ||
      !passwordForm.newPassword.trim() ||
      !passwordForm.confirmPassword.trim()
    ) {
      showNotification('Please complete all password fields.', 'error')
      return
    }

    const passwordError = validateStrongPassword(passwordForm.newPassword)

    if (passwordError) {
      showNotification(passwordError, 'error')
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showNotification('New passwords do not match.', 'error')
      return
    }

    setIsSavingPassword(true)

    try {
      await apiClient.post('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      })

      setPasswordForm(initialPasswordForm)
      setShowCurrentPassword(false)
      setShowNewPassword(false)
      setShowConfirmPassword(false)
      showNotification('Your password has been updated.', 'success')
    } catch (error) {
      let message = 'Failed to update password.'

      if (axios.isAxiosError(error)) {
        const payload = error.response?.data

        if (typeof payload === 'string') {
          message = payload
        } else if (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string') {
          message = payload.error
        }
      }

      showNotification(message, 'error')
    } finally {
      setIsSavingPassword(false)
    }
  }

  const handleProfileImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProfileImage(reader.result)
        localStorage.setItem(profileImageStorageKey, reader.result)
        showNotification('Profile image updated on this device.', 'success')
      }
    }
    reader.readAsDataURL(file)
  }

  const clearProfileImage = () => {
    setProfileImage(null)
    localStorage.removeItem(profileImageStorageKey)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    showNotification('Profile image removed from this device.', 'success')
  }

  return (
    <div className="space-y-8">
      <PageHeader
        description={roleDescription}
        eyebrow={t('settings')}
        title={t('accountSettings')}
      />

      <section className={`grid items-start gap-6 ${user?.role === 'Admin' ? '' : 'xl:grid-cols-[0.72fr_0.28fr]'}`}>
        <div className="space-y-6">
          <article className="glass-panel p-6">
            <div className="flex items-start gap-4">
              <div className="settings-card-icon">
                <Globe2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-semibold text-slate-900">{t('interfacePreferences')}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {t('interfacePreferencesDescription')}
                </p>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="settings-option-card">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{t('platformLanguage')}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {t('platformLanguageDescription')}
                      </p>
                    </div>
                    <div className="settings-pill-group mt-4">
                      <button
                        className={`settings-pill ${language === 'en' ? 'settings-pill-active' : ''}`}
                        type="button"
                        onClick={() => setLanguage('en')}
                      >
                        EN
                      </button>
                      <button
                        className={`settings-pill ${language === 'bg' ? 'settings-pill-active' : ''}`}
                        type="button"
                        onClick={() => setLanguage('bg')}
                      >
                        BG
                      </button>
                    </div>
                  </div>

                  <div className="settings-option-card">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{t('themeMode')}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {t('themeModeDescription')}
                      </p>
                    </div>
                    <div className="settings-pill-group mt-4">
                      <button
                        className={`settings-pill ${theme === 'light' ? 'settings-pill-active' : ''}`}
                        type="button"
                        onClick={() => setTheme('light')}
                      >
                        <SunMedium className="h-4 w-4" />
                        {t('light')}
                      </button>
                      <button
                        className={`settings-pill ${theme === 'dark' ? 'settings-pill-active' : ''}`}
                        type="button"
                        onClick={() => setTheme('dark')}
                      >
                        <MoonStar className="h-4 w-4" />
                        {t('dark')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <article className="glass-panel p-6">
            <div className="flex items-start gap-4">
              <div className="settings-card-icon">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-semibold text-slate-900">{t('changePassword')}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {t('changePasswordDescription')}
                </p>

                <form className="mt-5 grid gap-4" onSubmit={handlePasswordSubmit}>
                  <div className="password-field">
                    <input
                      className="w-full rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sky-950 placeholder:text-sky-600/70"
                      placeholder={t('currentPassword')}
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={(event) =>
                        setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))
                      }
                    />
                    <button className="ghost-toggle" type="button" onClick={() => setShowCurrentPassword((current) => !current)}>
                      {showCurrentPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>

                  <div className="password-field">
                    <input
                      className="w-full rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sky-950 placeholder:text-sky-600/70"
                      placeholder={t('newPassword')}
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={(event) =>
                        setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))
                      }
                    />
                    <button className="ghost-toggle" type="button" onClick={() => setShowNewPassword((current) => !current)}>
                      {showNewPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>

                  <div className="password-field">
                    <input
                      className="w-full rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sky-950 placeholder:text-sky-600/70"
                      placeholder={t('confirmNewPassword')}
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={passwordForm.confirmPassword}
                      onChange={(event) =>
                        setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))
                      }
                    />
                    <button className="ghost-toggle" type="button" onClick={() => setShowConfirmPassword((current) => !current)}>
                      {showConfirmPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>

                  <p className="text-sm text-slate-500">
                    {t('passwordRuleShort')}
                  </p>

                  <div>
                    <button className="button-primary" disabled={isSavingPassword} type="submit">
                      {isSavingPassword ? t('savingPassword') : t('updatePassword')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </article>
        </div>

        {user?.role !== 'Admin' ? (
          <div className="space-y-6">
            <article className="glass-panel self-start p-6">
              <div className="flex items-start gap-4">
                <div className="settings-card-icon">
                  <UserCircle2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-semibold text-slate-900">{t('profileImage')}</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {t('profileImageDescription')}
                  </p>

                  <div className="mt-5 flex flex-col items-center gap-4 rounded-3xl border border-blue-100/80 bg-white/70 p-5 text-center">
                    {profileImage ? (
                      <img
                        alt={`${user?.username ?? 'User'} profile`}
                        className="h-24 w-24 rounded-full border border-blue-100 object-cover shadow-sm"
                        src={profileImage}
                      />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 text-[#2468a0]">
                        <UserCircle2 className="h-12 w-12" />
                      </div>
                    )}

                    <div>
                      <p className="text-sm font-semibold text-slate-900">{user?.username ?? 'User'}</p>
                      <p className="text-sm text-slate-500">{user?.role ?? 'Member'}</p>
                    </div>

                    <input
                      className="hidden"
                      ref={fileInputRef}
                      accept="image/*"
                      type="file"
                      onChange={handleProfileImageChange}
                    />

                    <div className="flex flex-wrap justify-center gap-3">
                      <button
                        className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-white/90 px-4 py-2 text-sm font-semibold text-[#123d5b] transition hover:border-cyan-200 hover:bg-cyan-50"
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-4 w-4" />
                        {profileImage ? t('changeImage') : t('uploadImage')}
                      </button>
                      {profileImage ? (
                        <button
                          className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                          type="button"
                          onClick={clearProfileImage}
                        >
                          {t('remove')}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </article>

          </div>
        ) : null}
      </section>
    </div>
  )
}
