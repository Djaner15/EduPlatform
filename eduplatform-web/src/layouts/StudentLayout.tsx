import { BookOpen, ClipboardCheck, GraduationCap, LayoutDashboard, Settings, UserCircle2 } from 'lucide-react'
import Tooltip from '@mui/material/Tooltip'
import { NavLink, Outlet } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { useAuth } from '../app/AuthContext'
import { useTranslation } from '../app/AppSettingsContext'
import { BrandLogo } from '../shared/components/BrandLogo'
import { SiteFooter } from '../shared/components/SiteFooter'
import { SiteHeader } from '../shared/components/SiteHeader'

const navigationItems = [
  { to: '/student', labelKey: 'dashboard', icon: LayoutDashboard },
  { to: '/student/subjects', labelKey: 'subjects', icon: GraduationCap },
  { to: '/student/lessons', labelKey: 'lessons', icon: BookOpen },
  { to: '/student/tests', labelKey: 'tests', icon: ClipboardCheck },
  { to: '/student/profile', labelKey: 'profile', icon: UserCircle2 },
  { to: '/settings', labelKey: 'settings', icon: Settings },
]

export function StudentLayout() {
  const { user } = useAuth()
  const { t } = useTranslation()

  return (
    <div className="min-h-screen">
      <aside className="glass-panel m-3 p-5 lg:fixed lg:inset-y-0 lg:left-0 lg:m-4 lg:flex lg:h-[calc(100vh-2rem)] lg:w-72 lg:flex-col">
        <div className="flex h-full flex-col gap-6">
          <div className="space-y-2">
            <Tooltip title="View School Presentation">
              <Link className="sidebar-brand-link inline-block" to="/about">
                <BrandLogo subtitle={t('studentSubtitle')} title={t('appName')} />
              </Link>
            </Tooltip>
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-900">{t('studentHub')}</h1>
              <p className="text-sm text-slate-500">
                <span className="font-medium text-slate-700">
                  {t('signedInAs', { username: user?.username ?? '' })}
                </span>
              </p>
            </div>
          </div>

          <nav className="grid gap-2">
            {navigationItems.map(({ to, labelKey, icon: Icon }) => (
              <NavLink
                key={to}
                className={({ isActive }) => `nav-link flex items-center gap-3 ${isActive ? 'nav-link-active' : ''}`}
                end={to === '/student'}
                to={to}
              >
                <Icon className="h-4 w-4" />
                {t(labelKey)}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto" />
        </div>
      </aside>

      <div className="px-3 pb-3 lg:ml-[19rem] lg:px-6 lg:pt-4">
        <div className="mx-auto flex min-h-screen max-w-[1200px] flex-col">
          <SiteHeader />

          <main className="min-w-0 flex-1 pt-6">
            <Outlet />
          </main>

          <SiteFooter />
        </div>
      </div>
    </div>
  )
}
