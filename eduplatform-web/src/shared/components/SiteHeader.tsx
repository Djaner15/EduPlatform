import { LogOut } from 'lucide-react'
import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from '../../app/AppSettingsContext'
import { useAuth } from '../../app/AuthContext'
import { useNotification } from '../../app/NotificationContext'

const routeTitles: Array<{ match: RegExp; titleKey: string }> = [
  { match: /^\/admin\/users/, titleKey: 'userManagement' },
  { match: /^\/admin\/subjects/, titleKey: 'subjectManagement' },
  { match: /^\/admin\/lessons/, titleKey: 'lessonManagement' },
  { match: /^\/admin\/tests/, titleKey: 'testManagement' },
  { match: /^\/admin/, titleKey: 'administratorDashboard' },
  { match: /^\/teacher\/subjects/, titleKey: 'subjectManagement' },
  { match: /^\/teacher\/lessons/, titleKey: 'lessonManagement' },
  { match: /^\/teacher\/tests/, titleKey: 'testManagement' },
  { match: /^\/teacher/, titleKey: 'teacherDashboard' },
  { match: /^\/student\/subjects/, titleKey: 'subjects' },
  { match: /^\/student\/lessons\/[^/]+/, titleKey: 'lessonDetails' },
  { match: /^\/student\/lessons/, titleKey: 'lessons' },
  { match: /^\/student\/tests\/[^/]+/, titleKey: 'testSession' },
  { match: /^\/student\/tests/, titleKey: 'tests' },
  { match: /^\/student\/profile/, titleKey: 'profile' },
  { match: /^\/settings/, titleKey: 'accountSettings' },
  { match: /^\/student/, titleKey: 'dashboard' },
]

export function SiteHeader() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const { showNotification } = useNotification()
  const { t } = useTranslation()

  const pageTitle = useMemo(() => {
    const matchedRoute = routeTitles.find(({ match }) => match.test(location.pathname))
    return matchedRoute ? t(matchedRoute.titleKey) : t('appName')
  }, [location.pathname, t])

  const roleBadgeClassName =
    user?.role === 'Admin'
      ? 'bg-gradient-to-r from-[#123d5b] to-[#2468a0] text-white'
      : user?.role === 'Teacher'
        ? 'bg-cyan-100 text-cyan-800'
        : 'bg-blue-100 text-blue-800'
  const showRoleBadge = user?.username?.trim().toLowerCase() !== user?.role?.trim().toLowerCase()

  const handleLogout = () => {
    logout()
    showNotification('You have been logged out successfully.', 'success')
    navigate('/login', { replace: true })
  }

  return (
    <header className="site-header-card w-full rounded-[28px] border border-blue-100/90 bg-gradient-to-r from-white/96 via-blue-50/94 to-cyan-50/88 shadow-[0_18px_42px_rgba(36,104,160,0.14)] backdrop-blur-md">
      <div className="flex h-[60px] w-full items-center justify-between gap-4 px-4 sm:px-5 lg:px-6">
        <div className="min-w-0">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-blue-400">
            {t('appName')}
          </p>
          <h1 className="truncate font-display text-lg font-bold text-slate-900 sm:text-xl">
            {pageTitle}
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <p className="text-sm font-semibold text-slate-900">{user?.username ?? 'User'}</p>

          {showRoleBadge ? (
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${roleBadgeClassName}`}
            >
              {user?.role ?? 'User'}
            </span>
          ) : null}

          <button
            className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/90 px-3 py-2 text-sm font-semibold text-[#123d5b] transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-[#0f8b8d]"
            onClick={handleLogout}
            type="button"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">{t('logout')}</span>
          </button>
        </div>
      </div>
    </header>
  )
}
