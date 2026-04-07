import axios from 'axios'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from '../../../app/AppSettingsContext'
import { PageHeader } from '../../../shared/components/PageHeader'
import apiClient from '../../../shared/api/axiosInstance'

type StatisticsDto = {
  totalUsers: number
  totalTests: number
  totalResults: number
  averageScore: number
}

export function AdminOverviewPage() {
  const { t } = useTranslation()
  const [stats, setStats] = useState<StatisticsDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadStats = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const { data } = await apiClient.get<StatisticsDto>('/admin/statistics')
        if (isMounted) {
          setStats(data)
        }
      } catch (error) {
        if (!isMounted) return
        if (axios.isAxiosError(error) && typeof error.response?.data === 'string') {
          setErrorMessage(error.response.data)
        } else {
          setErrorMessage(t('failedAdminStatistics'))
        }
      } finally {
        if (isMounted) setIsLoading(false)
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
            to="/admin/users"
          >
            {t('reviewRegistrations')}
          </Link>
        }
        description={t('manageStudentsDescription')}
        eyebrow={t('overview')}
        title={t('administratorDashboard')}
      />

      {isLoading ? <div className="glass-panel p-6 text-slate-600">{t('loadingStatistics')}</div> : null}
      {!isLoading && errorMessage ? (
        <div className="glass-panel p-6 text-rose-700">{errorMessage}</div>
      ) : null}
      {!isLoading && !errorMessage && stats ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="glass-panel p-6">
            <p className="text-sm text-slate-500">{t('totalUsers')}</p>
            <h2 className="mt-3 font-display text-4xl font-bold text-slate-900">{stats.totalUsers}</h2>
          </div>
          <div className="glass-panel p-6">
            <p className="text-sm text-slate-500">{t('totalTests')}</p>
            <h2 className="mt-3 font-display text-4xl font-bold text-slate-900">{stats.totalTests}</h2>
          </div>
          <div className="glass-panel p-6">
            <p className="text-sm text-slate-500">{t('submittedResults')}</p>
            <h2 className="mt-3 font-display text-4xl font-bold text-slate-900">{stats.totalResults}</h2>
          </div>
          <div className="glass-panel p-6">
            <p className="text-sm text-slate-500">{t('averageScore')}</p>
            <h2 className="mt-3 font-display text-4xl font-bold text-slate-900">{stats.averageScore}%</h2>
          </div>
        </div>
      ) : null}
    </div>
  )
}
