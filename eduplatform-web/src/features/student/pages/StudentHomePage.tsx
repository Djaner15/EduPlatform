import { Link } from 'react-router-dom'
import { useTranslation } from '../../../app/AppSettingsContext'
import { useAuth } from '../../../app/AuthContext'
import { PageHeader } from '../../../shared/components/PageHeader'
import { dashboardStats } from '../data/mockStudentData'
import { StatCard } from '../components/StatCard'

export function StudentHomePage() {
  const { user } = useAuth()
  const { t } = useTranslation()

  return (
    <div className="space-y-8">
      <PageHeader
        action={
          <Link
            className="button-primary inline-flex px-5 text-sm"
            to="/student/lessons"
          >
            {t('continueLearning')}
          </Link>
        }
        description={t('studentOverviewDescription')}
        eyebrow={t('overview')}
        title={t('helloUser', { username: user?.username ?? 'Student' })}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard helper={t('completedTestsHelper')} label={t('completedTests')} value={dashboardStats.completedTests} />
        <StatCard helper={t('averageScoreHelper')} label={t('averageScore')} value={`${dashboardStats.averageScore}%`} />
        <StatCard helper={t('lastTestHelper')} label={t('lastTest')} value={dashboardStats.lastTest} />
      </section>

      <section className="glass-panel grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-100/60">
            {t('progressFocus')}
          </p>
          <h2 className="font-display text-2xl font-bold text-slate-900">{t('stayOnTrackTitle')}</h2>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            {t('stayOnTrackDescription')}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50/90 p-5">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>{t('weeklyGoal')}</span>
            <span>72%</span>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-brand-500 to-cyan-400" />
          </div>
          <p className="mt-4 text-sm text-slate-600">{t('weeklyGoalDescription')}</p>
        </div>
      </section>

      <section className="glass-panel p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-100/60">
          {t('schoolInformation')}
        </p>
        <h2 className="mt-3 font-display text-2xl font-bold text-slate-900">
          {t('schoolName')}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          {t('schoolPortalDescription')}
        </p>
      </section>
    </div>
  )
}
