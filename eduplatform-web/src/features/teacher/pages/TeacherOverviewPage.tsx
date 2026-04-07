import axios from 'axios'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from '../../../app/AppSettingsContext'
import { useAuth } from '../../../app/AuthContext'
import apiClient from '../../../shared/api/axiosInstance'
import { PageHeader } from '../../../shared/components/PageHeader'

type ItemWithId = {
  id: number
}

export function TeacherOverviewPage() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [counts, setCounts] = useState({ subjects: 0, lessons: 0, tests: 0 })
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadCounts = async () => {
      try {
        const [subjects, lessons, tests] = await Promise.all([
          apiClient.get<ItemWithId[]>('/subjects'),
          apiClient.get<ItemWithId[]>('/lessons'),
          apiClient.get<ItemWithId[]>('/tests'),
        ])

        if (isMounted) {
          setCounts({
            subjects: subjects.data.length,
            lessons: lessons.data.length,
            tests: tests.data.length,
          })
        }
      } catch (error) {
        if (!isMounted) return
        if (axios.isAxiosError(error) && typeof error.response?.data?.error === 'string') {
          setErrorMessage(error.response.data.error)
        } else {
          setErrorMessage(t('failedTeacherStatistics'))
        }
      }
    }

    void loadCounts()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="space-y-8">
      <PageHeader
        action={
          <Link className="button-primary inline-flex px-5 text-sm" to="/teacher/lessons">
            {t('createLessons')}
          </Link>
        }
        description={t('teacherWorkspaceDescription')}
        eyebrow={t('teacherOverview')}
        title={t('welcomeRole', { username: user?.username ?? 'Teacher' })}
      />

      {errorMessage ? <div className="glass-panel p-6 text-rose-700">{errorMessage}</div> : null}

      <section className="grid gap-4 md:grid-cols-3">
        <article className="glass-panel p-6">
          <p className="text-sm text-slate-500">{t('mySubjects')}</p>
          <h2 className="mt-3 font-display text-4xl font-bold text-slate-900">{counts.subjects}</h2>
        </article>
        <article className="glass-panel p-6">
          <p className="text-sm text-slate-500">{t('myLessons')}</p>
          <h2 className="mt-3 font-display text-4xl font-bold text-slate-900">{counts.lessons}</h2>
        </article>
        <article className="glass-panel p-6">
          <p className="text-sm text-slate-500">{t('myTests')}</p>
          <h2 className="mt-3 font-display text-4xl font-bold text-slate-900">{counts.tests}</h2>
        </article>
      </section>

      <section className="glass-panel p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-100/60">
          {t('roleLogic')}
        </p>
        <h2 className="mt-3 font-display text-2xl font-bold text-slate-900">
          {t('roleLogicTitle')}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          {t('roleLogicDescription')}
        </p>
      </section>
    </div>
  )
}
