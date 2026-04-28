import { BookOpen, ClipboardList, GraduationCap, Sparkles, TrendingUp, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useTranslation } from '../../../app/AppSettingsContext'
import { useAuth } from '../../../app/AuthContext'
import { PageHeader } from '../../../shared/components/PageHeader'
import apiClient from '../../../shared/api/axiosInstance'
import { readApiError } from '../../../shared/apiErrors'
import { ErrorNotice } from '../../../shared/components/ErrorNotice'

type TeacherSubjectSnapshotDto = {
  subjectId: number
  subjectName: string
  classDisplay: string
  lessonCount: number
  testCount: number
}

type TeacherOverviewStatsDto = {
  subjectCount: number
  lessonCount: number
  testCount: number
  studentEngagementCount: number
  averageTestPerformance: number
  subjects: TeacherSubjectSnapshotDto[]
}

const getTeacherOverviewCacheKey = (username?: string | null) =>
  `eduplatform_teacher_overview_stats_${username?.trim().toLowerCase() || 'anonymous'}`

const glassTooltipStyle = {
  borderRadius: '18px',
  border: '1px solid rgba(255,255,255,0.42)',
  background: 'rgba(255,255,255,0.78)',
  color: '#0f172a',
  boxShadow: '0 18px 40px rgba(45,212,191,0.16)',
  backdropFilter: 'blur(12px)',
}

const normalizeTeacherStats = (data: Partial<TeacherOverviewStatsDto> | null | undefined): TeacherOverviewStatsDto => ({
  subjectCount: Number(data?.subjectCount ?? 0),
  lessonCount: Number(data?.lessonCount ?? 0),
  testCount: Number(data?.testCount ?? 0),
  studentEngagementCount: Number(data?.studentEngagementCount ?? 0),
  averageTestPerformance: Number(data?.averageTestPerformance ?? 0),
  subjects: Array.isArray(data?.subjects) ? data.subjects : [],
})

export function TeacherOverviewPage() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const teacherOverviewCacheKey = getTeacherOverviewCacheKey(user?.username)
  const [stats, setStats] = useState<TeacherOverviewStatsDto | null>(() => {
    if (typeof window === 'undefined') {
      return null
    }

    try {
      const raw = window.localStorage.getItem(getTeacherOverviewCacheKey(user?.username))
      if (!raw) {
        return null
      }

      return normalizeTeacherStats(JSON.parse(raw) as Partial<TeacherOverviewStatsDto>)
    } catch {
      return null
    }
  })
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(stats === null)

  useEffect(() => {
    let isMounted = true

    const loadStats = async () => {
      setIsLoading(true)
      setErrorMessage(null)
      const hasCachedSnapshot =
        typeof window !== 'undefined' && Boolean(window.localStorage.getItem(teacherOverviewCacheKey))

      try {
        const { data } = await apiClient.get<TeacherOverviewStatsDto>('/teacher/overview')

        if (isMounted) {
          const normalized = normalizeTeacherStats(data)
          setStats(normalized)
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(teacherOverviewCacheKey, JSON.stringify(normalized))
          }
        }
      } catch (error) {
        if (!isMounted) {
          return
        }
        if (hasCachedSnapshot) {
          setErrorMessage('Showing the most recent saved teacher workspace statistics while the live data is temporarily unavailable.')
        } else {
          setErrorMessage(readApiError(error, t('failedTeacherStatistics')))
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadStats()

    return () => {
      isMounted = false
    }
  }, [t, teacherOverviewCacheKey])

  const overviewStats = stats ?? normalizeTeacherStats(null)

  const primaryCards = useMemo(
    () => [
      {
        key: 'subjects',
        label: t('mySubjects'),
        value: overviewStats.subjectCount,
        icon: GraduationCap,
        accent: 'from-cyan-400/24 via-sky-300/16 to-transparent',
      },
      {
        key: 'lessons',
        label: t('myLessons'),
        value: overviewStats.lessonCount,
        icon: BookOpen,
        accent: 'from-sky-400/22 via-blue-300/14 to-transparent',
      },
      {
        key: 'tests',
        label: t('myTests'),
        value: overviewStats.testCount,
        icon: ClipboardList,
        accent: 'from-teal-400/24 via-emerald-300/14 to-transparent',
      },
    ],
    [overviewStats.lessonCount, overviewStats.subjectCount, overviewStats.testCount, t],
  )

  const engagementChartData = useMemo(
    () => [
      { label: t('studentEngagementShort'), value: overviewStats.studentEngagementCount },
      { label: t('myTestsShort'), value: overviewStats.testCount },
      { label: t('myLessonsShort'), value: overviewStats.lessonCount },
    ],
    [overviewStats.lessonCount, overviewStats.studentEngagementCount, overviewStats.testCount, t],
  )

  const performanceChartData = useMemo(
    () => [
      { label: t('teacherAverageShort'), value: overviewStats.averageTestPerformance },
      { label: t('performanceTargetShort'), value: 100 },
    ],
    [overviewStats.averageTestPerformance, t],
  )

  const spotlightSubjects = useMemo(() => overviewStats.subjects.slice(0, 3), [overviewStats.subjects])

  return (
    <div className="space-y-8">
      <PageHeader
        action={
          <div className="flex flex-wrap gap-3">
            <Link className="button-primary-soft inline-flex px-5 text-sm" to="/teacher/subjects">
              {t('viewMySubjects')}
            </Link>
            <Link className="button-primary inline-flex px-5 text-sm" to="/teacher/lessons">
              {t('createLessons')}
            </Link>
          </div>
        }
        description={t('teacherWorkspaceDescription')}
        eyebrow={t('teacherOverview')}
        title={t('welcomeRole', { username: user?.username ?? t('common.user') })}
      />

      {isLoading ? (
        <section className="glass-panel p-6">
          <p className="text-slate-600">{t('teacherDashboardLoading')}</p>
        </section>
      ) : null}

      {!isLoading && errorMessage && !stats ? (
        <ErrorNotice message={errorMessage} title={t('friendlyDashboardErrorTitle')} />
      ) : null}

      {!isLoading && stats ? (
        <>
          {errorMessage ? (
            <div className="rounded-[1.35rem] border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm font-medium text-amber-800">
              {errorMessage}
            </div>
          ) : null}
          <section className="grid gap-4 md:grid-cols-3">
            {primaryCards.map((card) => {
              const Icon = card.icon

              return (
                <article
                  key={card.key}
                  className="glass-panel group relative overflow-hidden p-6 transition-transform duration-300 hover:-translate-y-1"
                >
                  <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${card.accent}`} />
                  <div className="relative flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-slate-500">{card.label}</p>
                      <h2 className="mt-3 font-display text-4xl font-bold text-slate-900">{card.value}</h2>
                    </div>
                    <div className="flex h-14 w-14 items-center justify-center rounded-[1.4rem] bg-white/70 text-[#2468a0] shadow-[0_16px_32px_rgba(36,104,160,0.12)]">
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                </article>
              )
            })}
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <article className="glass-panel overflow-hidden p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-600">
                    {t('studentEngagement')}
                  </p>
                  <h2 className="mt-2 text-3xl font-bold text-slate-900">
                    {overviewStats.studentEngagementCount}
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">
                    {t('studentEngagementDescription')}
                  </p>
                </div>
                <div className="rounded-full border border-cyan-200/70 bg-white/65 px-4 py-2 text-sm font-medium text-slate-600">
                  {t('teacherEngagementBadge', { count: overviewStats.studentEngagementCount })}
                </div>
              </div>

              <div className="mt-6 h-64 rounded-[1.8rem] border border-white/70 bg-white/60 p-4 shadow-[0_18px_40px_rgba(36,104,160,0.08)]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={engagementChartData} barCategoryGap="26%">
                    <CartesianGrid stroke="rgba(148,163,184,0.16)" strokeDasharray="3 3" vertical={false} />
                    <XAxis axisLine={false} dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} />
                    <YAxis allowDecimals={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickLine={false} />
                    <Tooltip contentStyle={glassTooltipStyle} cursor={{ fill: 'rgba(45,212,191,0.08)' }} />
                    <Bar dataKey="value" fill="#14b8a6" radius={[14, 14, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="glass-panel overflow-hidden p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-600">
                    {t('avgTestPerformance')}
                  </p>
                  <h2 className="mt-2 text-3xl font-bold text-slate-900">
                    {overviewStats.averageTestPerformance.toFixed(1)}%
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {t('avgTestPerformanceDescription')}
                  </p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-[1.4rem] bg-white/72 text-[#0f8b8d] shadow-[0_16px_32px_rgba(20,184,166,0.16)]">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </div>

              <div className="mt-6 h-56 rounded-[1.8rem] border border-white/70 bg-white/60 p-4 shadow-[0_18px_40px_rgba(36,104,160,0.08)]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceChartData} layout="vertical" margin={{ left: 4, right: 12, top: 8, bottom: 8 }}>
                    <CartesianGrid stroke="rgba(148,163,184,0.14)" strokeDasharray="3 3" horizontal={false} />
                    <XAxis axisLine={false} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} tickLine={false} type="number" />
                    <YAxis axisLine={false} dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} type="category" width={84} />
                    <Tooltip contentStyle={glassTooltipStyle} cursor={{ fill: 'rgba(56,189,248,0.08)' }} />
                    <Bar dataKey="value" fill="#38bdf8" radius={[0, 14, 14, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-5 rounded-[1.6rem] border border-cyan-100/80 bg-white/58 p-4">
                <div className="flex items-center gap-3 text-slate-800">
                  <Sparkles className="h-5 w-5 text-cyan-600" />
                  <p className="text-sm font-semibold">{t('teacherPerformanceInsightTitle')}</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{t('teacherPerformanceInsightDescription')}</p>
              </div>
            </article>
          </section>

          <section className="glass-panel p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-600">
                  {t('teacherSubjectsSpotlight')}
                </p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">{t('teacherSubjectsSpotlightTitle')}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                  {t('teacherSubjectsSpotlightDescription')}
                </p>
              </div>
              <Link className="button-primary-soft inline-flex px-5 text-sm" to="/teacher/subjects">
                {t('openSubjectStudio')}
              </Link>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {spotlightSubjects.length ? (
                spotlightSubjects.map((subject) => (
                  <Link
                    key={subject.subjectId}
                    className="group rounded-[1.7rem] border border-white/70 bg-white/60 p-5 shadow-[0_18px_36px_rgba(36,104,160,0.08)] transition hover:-translate-y-1 hover:shadow-[0_22px_42px_rgba(45,212,191,0.14)]"
                    to={`/teacher/lessons?subjectId=${subject.subjectId}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{subject.classDisplay}</p>
                        <h3 className="mt-2 text-xl font-semibold text-slate-900">{subject.subjectName}</h3>
                      </div>
                      <Users className="h-5 w-5 text-cyan-600" />
                    </div>
                    <div className="mt-5 flex items-center justify-between text-sm text-slate-600">
                      <span>{t('teacherLessonsCountBadge', { count: subject.lessonCount })}</span>
                      <span>{t('teacherTestsCountBadge', { count: subject.testCount })}</span>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="admin-management-empty md:col-span-3">
                  <h3 className="text-lg font-semibold text-slate-900">{t('teacherSubjectsEmptyTitle')}</h3>
                  <p className="mt-2 text-sm text-slate-500">{t('teacherSubjectsEmptyDescription')}</p>
                </div>
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}
