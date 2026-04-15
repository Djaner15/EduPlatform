import axios from 'axios'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from '../../../app/AppSettingsContext'
import { useAuth } from '../../../app/AuthContext'
import { PageHeader } from '../../../shared/components/PageHeader'
import { StatCard } from '../components/StatCard'
import apiClient from '../../../shared/api/axiosInstance'

type StudentDashboardStats = {
  completedTests: number
  averageScore: number
  lastTest: string
}

export function StudentHomePage() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [stats, setStats] = useState<StudentDashboardStats>({
    completedTests: 0,
    averageScore: 0,
    lastTest: '0',
  })

  useEffect(() => {
    let isMounted = true

    const loadStats = async () => {
      try {
        const { data } = await apiClient.get<StudentDashboardStats>('/tests/me/dashboard')
        if (isMounted) {
          setStats({
            completedTests: data.completedTests ?? 0,
            averageScore: data.averageScore ?? 0,
            lastTest: data.lastTest || '0',
          })
        }
      } catch (error) {
        if (!isMounted) {
          return
        }

        if (axios.isAxiosError(error)) {
          console.log('STUDENT DASHBOARD API error status:', error.response?.status)
          console.log('STUDENT DASHBOARD API error data:', error.response?.data)
        } else {
          console.log('STUDENT DASHBOARD unknown error:', error)
        }

        setStats({
          completedTests: 0,
          averageScore: 0,
          lastTest: '0',
        })
      }
    }

    void loadStats()

    return () => {
      isMounted = false
    }
  }, [])

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
        <StatCard helper={t('completedTestsHelper')} label={t('completedTests')} value={stats.completedTests} />
        <StatCard helper={t('averageScoreHelper')} label={t('averageScore')} value={`${stats.averageScore}%`} />
        <StatCard helper={t('lastTestHelper')} label={t('lastTest')} value={stats.lastTest} />
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
    </div>
  )
}
