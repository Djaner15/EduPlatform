import { BookOpen, ClipboardList, GraduationCap, LayoutDashboard, Settings, Users } from 'lucide-react'
import Tooltip from '@mui/material/Tooltip'
import { NavLink, Outlet } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { useAuth } from '../app/AuthContext'
import { useTranslation } from '../app/AppSettingsContext'
import { BrandLogo } from '../shared/components/BrandLogo'
import { SiteHeader } from '../shared/components/SiteHeader'

const navigationItems = [
  { to: '/admin', labelKey: 'overview', icon: LayoutDashboard },
  { to: '/admin/users', labelKey: 'users', icon: Users },
  { to: '/admin/subjects', labelKey: 'subjects', icon: GraduationCap },
  { to: '/admin/lessons', labelKey: 'lessons', icon: BookOpen },
  { to: '/admin/tests', labelKey: 'tests', icon: ClipboardList },
  { to: '/settings', labelKey: 'settings', icon: Settings },
]

export function AdminLayout() {
  const { user } = useAuth()
  const { t } = useTranslation()

  return (
    <div className="min-h-screen">
      <aside className="glass-panel z-40 m-3 p-5 lg:fixed lg:inset-y-0 lg:left-0 lg:m-4 lg:flex lg:h-[calc(100vh-2rem)] lg:w-80 lg:flex-col">
        <div className="flex h-full flex-col gap-6">
          <div className="space-y-2">
            <Tooltip title="View School Presentation">
              <Link className="sidebar-brand-link inline-block" to="/about">
                <BrandLogo subtitle={t('adminSubtitle')} title={t('appName')} />
              </Link>
            </Tooltip>
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-900">{t('adminBoard')}</h1>
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
                end={to === '/admin'}
                to={to}
              >
                <Icon className="h-5 w-5" />
                {t(labelKey)}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto" />
        </div>
      </aside>

      <div className="px-3 pb-3 lg:ml-[22rem] lg:px-6 lg:pt-4">
        <div className="mx-auto flex min-h-screen max-w-[1200px] flex-col">
          <SiteHeader />

          <main className="min-w-0 flex-grow pt-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
