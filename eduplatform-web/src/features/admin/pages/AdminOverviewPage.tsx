import {
  Activity,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCheck,
  Database,
  GraduationCap,
  HardDrive,
  PieChart as PieChartIcon,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTranslation } from '../../../app/AppSettingsContext'
import { PageHeader } from '../../../shared/components/PageHeader'
import apiClient from '../../../shared/api/axiosInstance'
import { readApiError } from '../../../shared/apiErrors'
import { ErrorNotice } from '../../../shared/components/ErrorNotice'

type ActivityPointDto = {
  label: string
  date: string
  actions: number
}

type SubjectDistributionDto = {
  subjectName: string
  lessonCount: number
}

type RecentActivityDto = {
  type: string
  title: string
  description: string
  occurredAt: string
}

type StatisticsDto = {
  totalUsers: number
  totalTests: number
  totalResults: number
  averageScore: number
  averageScoreTrend: number
  registeredStudents: number
  pendingTeacherApprovals: number
  storageUsedBytes: number
  activity: ActivityPointDto[]
  subjectDistribution: SubjectDistributionDto[]
  recentActivity: RecentActivityDto[]
}

type RecentActivityPageDto = {
  items: RecentActivityDto[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

const adminStatsCacheKey = 'eduplatform_admin_overview_stats'

const normalizeStatistics = (data: Partial<StatisticsDto> | null | undefined): StatisticsDto => ({
  totalUsers: Number(data?.totalUsers ?? 0),
  totalTests: Number(data?.totalTests ?? 0),
  totalResults: Number(data?.totalResults ?? 0),
  averageScore: Number(data?.averageScore ?? 0),
  averageScoreTrend: Number(data?.averageScoreTrend ?? 0),
  registeredStudents: Number(data?.registeredStudents ?? 0),
  pendingTeacherApprovals: Number(data?.pendingTeacherApprovals ?? 0),
  storageUsedBytes: Number(data?.storageUsedBytes ?? 0),
  activity: Array.isArray(data?.activity) ? data.activity : [],
  subjectDistribution: Array.isArray(data?.subjectDistribution) ? data.subjectDistribution : [],
  recentActivity: Array.isArray(data?.recentActivity) ? data.recentActivity : [],
})

const createFallbackActivity = () => {
  const today = new Date()

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today)
    day.setDate(today.getDate() - (6 - index))

    return {
      label: day.toLocaleDateString('en-US', { weekday: 'short' }),
      date: day.toISOString().slice(0, 10),
      actions: 0,
    }
  })
}

const chartPalette = ['#2dd4bf', '#38bdf8', '#14b8a6', '#22c55e', '#8b5cf6', '#f59e0b', '#06b6d4', '#6366f1']
const glassTooltipStyle = {
  borderRadius: '18px',
  border: '1px solid rgba(255,255,255,0.42)',
  background: 'rgba(255,255,255,0.72)',
  color: '#0f172a',
  boxShadow: '0 18px 40px rgba(45,212,191,0.16)',
  backdropFilter: 'blur(12px)',
}

const formatStorage = (bytes: number) => {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  const units = ['KB', 'MB', 'GB', 'TB']
  let size = bytes / 1024
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  return `${size.toFixed(size >= 100 ? 0 : 1)} ${units[unitIndex]}`
}

const metricCards = (stats: StatisticsDto) => [
  {
    key: 'students',
    label: 'Registered students',
    value: stats.registeredStudents.toLocaleString(),
    icon: Users,
    accent: 'from-cyan-400/30 via-sky-400/18 to-cyan-500/8',
    border: 'border-cyan-300/40',
    glow: 'shadow-[0_24px_50px_rgba(34,211,238,0.18)]',
  },
  {
    key: 'score',
    label: 'Average student score',
    value: `${stats.averageScore}%`,
    icon: GraduationCap,
    accent: 'from-emerald-400/30 via-teal-400/18 to-emerald-500/8',
    border: 'border-emerald-300/40',
    glow: 'shadow-[0_24px_50px_rgba(16,185,129,0.18)]',
    trend: stats.averageScoreTrend,
  },
  {
    key: 'storage',
    label: 'Storage used',
    value: formatStorage(stats.storageUsedBytes),
    icon: HardDrive,
    accent: 'from-violet-400/28 via-indigo-400/16 to-violet-500/8',
    border: 'border-violet-300/40',
    glow: 'shadow-[0_24px_50px_rgba(139,92,246,0.18)]',
  },
  {
    key: 'pending',
    label: 'Pending teacher approvals',
    value: stats.pendingTeacherApprovals.toLocaleString(),
    icon: CheckCheck,
    accent: 'from-amber-400/28 via-orange-400/16 to-amber-500/8',
    border: 'border-amber-300/40',
    glow: 'shadow-[0_24px_50px_rgba(245,158,11,0.18)]',
  },
  {
    key: 'results',
    label: 'Completed tests',
    value: stats.totalResults.toLocaleString(),
    icon: Activity,
    accent: 'from-sky-400/26 via-blue-400/16 to-cyan-500/8',
    border: 'border-sky-300/40',
    glow: 'shadow-[0_24px_50px_rgba(59,130,246,0.18)]',
  },
]

export function AdminOverviewPage() {
  const { t } = useTranslation()
  const [stats, setStats] = useState<StatisticsDto | null>(() => {
    if (typeof window === 'undefined') {
      return null
    }

    try {
      const raw = window.localStorage.getItem(adminStatsCacheKey)
      if (!raw) {
        return null
      }

      return normalizeStatistics(JSON.parse(raw) as Partial<StatisticsDto>)
    } catch {
      return null
    }
  })
  const [recentActivityPage, setRecentActivityPage] = useState<RecentActivityPageDto | null>(null)
  const [isLoading, setIsLoading] = useState(stats === null)
  const [isActivityLoading, setIsActivityLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isAnimatedIn, setIsAnimatedIn] = useState(false)
  const [activityPage, setActivityPage] = useState(1)
  const ACTIVITY_PAGE_SIZE = 5

  useEffect(() => {
    let isMounted = true

    const loadStats = async () => {
      setIsLoading(true)
      setErrorMessage(null)
      const hasCachedSnapshot =
        typeof window !== 'undefined' && Boolean(window.localStorage.getItem(adminStatsCacheKey))

      try {
        const { data } = await apiClient.get<StatisticsDto>('/admin/statistics')
        if (isMounted) {
          const normalized = normalizeStatistics(data)
          setStats(normalized)
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(adminStatsCacheKey, JSON.stringify(normalized))
          }
        }
      } catch (error) {
        if (!isMounted) return
        if (hasCachedSnapshot) {
          setErrorMessage('Showing the most recent saved dashboard statistics while the live data is temporarily unavailable.')
        } else {
          setErrorMessage(readApiError(error, t('failedAdminStatistics')))
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
  }, [t])

  useEffect(() => {
    let isMounted = true

    const loadRecentActivity = async () => {
      setIsActivityLoading(true)

      try {
        const { data } = await apiClient.get<RecentActivityPageDto>('/admin/recent-activity', {
          params: {
            page: activityPage,
            pageSize: ACTIVITY_PAGE_SIZE,
          },
        })

        if (isMounted) {
          setRecentActivityPage(data)
        }
      } catch {
        if (isMounted) {
          setRecentActivityPage(null)
        }
      } finally {
        if (isMounted) {
          setIsActivityLoading(false)
        }
      }
    }

    void loadRecentActivity()

    return () => {
      isMounted = false
    }
  }, [activityPage])

  useEffect(() => {
    setIsAnimatedIn(false)
    const timer = window.setTimeout(() => setIsAnimatedIn(true), 90)
    return () => window.clearTimeout(timer)
  }, [stats?.activity?.length, stats?.recentActivity?.length, stats?.subjectDistribution?.length])

  const cards = useMemo(() => (stats ? metricCards(stats) : []), [stats])
  const activityChartData = useMemo(
    () => (stats && stats.activity.length > 0 ? stats.activity : createFallbackActivity()),
    [stats],
  )
  const hasActivityData = useMemo(
    () => activityChartData.some((entry) => entry.actions > 0),
    [activityChartData],
  )
  const hasSubjectDistribution = Boolean(stats?.subjectDistribution.length)
  const recentActivityItems = recentActivityPage?.items ?? []
  const hasRecentActivity = recentActivityItems.length > 0
  const activityPeak = useMemo(
    () => activityChartData.reduce((best, entry) => (entry.actions > best.actions ? entry : best), activityChartData[0]),
    [activityChartData],
  )
  const snapshotChartData = useMemo(
    () => [
      { label: 'Users', value: stats?.totalUsers ?? 0, fill: '#38bdf8' },
      { label: 'Tests', value: stats?.totalTests ?? 0, fill: '#2dd4bf' },
      { label: 'Results', value: stats?.totalResults ?? 0, fill: '#0ea5e9' },
    ],
    [stats?.totalResults, stats?.totalTests, stats?.totalUsers],
  )
  const completionRate = useMemo(
    () => ((stats?.totalResults ?? 0) / Math.max(stats?.totalTests ?? 1, 1)) * 100,
    [stats?.totalResults, stats?.totalTests],
  )

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
        description={t('administratorDashboardDescription')}
        eyebrow={t('overview')}
        title={t('administratorDashboard')}
      />

      <section className="overflow-hidden rounded-[2rem] border border-white/60 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.18),transparent_24%),radial-gradient(circle_at_top_right,rgba(103,232,249,0.14),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.82)_0%,rgba(240,253,250,0.86)_42%,rgba(239,246,255,0.82)_100%)] p-6 shadow-[0_30px_90px_rgba(56,189,248,0.12)] backdrop-blur-xl">
        {isLoading ? <div className="glass-panel p-6 text-slate-700">{t('loadingStatistics')}</div> : null}
        {!isLoading && errorMessage && !stats ? (
          <ErrorNotice className="m-1" message={errorMessage} title={t('friendlyDashboardErrorTitle')} />
        ) : null}

        {!isLoading && stats ? (
          <div className="space-y-6">
            {errorMessage ? (
              <div className="rounded-[1.35rem] border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm font-medium text-amber-800">
                {errorMessage}
              </div>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {cards.map((card, index) => {
                const Icon = card.icon
                const trendUp = typeof card.trend === 'number' && card.trend >= 0

                return (
                  <article
                    key={card.key}
                    className={`relative rounded-[1.75rem] border bg-white/60 p-5 text-slate-900 backdrop-blur-xl transition duration-500 ${card.border} ${card.glow} ${
                      isAnimatedIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                    }`}
                    style={{ transitionDelay: `${index * 70}ms` }}
                  >
                    <div className={`pointer-events-none absolute inset-0 rounded-[1.75rem] bg-gradient-to-br ${card.accent}`} />
                    <div className="relative">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-slate-600">{card.label}</p>
                          <h2 className="mt-3 font-display text-4xl font-bold tracking-tight text-slate-900">{card.value}</h2>
                        </div>
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/55 bg-white/45 text-teal-700">
                          <Icon className="h-5 w-5" />
                        </div>
                      </div>

                      {typeof card.trend === 'number' ? (
                        <div className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${trendUp ? 'bg-emerald-400/14 text-emerald-200' : 'bg-rose-400/14 text-rose-200'}`}>
                          {trendUp ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                          {`${trendUp ? '+' : ''}${card.trend.toFixed(1)} pts vs last week`}
                        </div>
                      ) : null}
                    </div>
                  </article>
                )
              })}
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.55fr_0.95fr]">
              <article className={`rounded-[1.9rem] border border-white/60 bg-white/60 p-6 text-slate-900 shadow-[0_22px_54px_rgba(34,211,238,0.12)] backdrop-blur-xl transition duration-500 ${isAnimatedIn ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'}`}>
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-600">Platform Activity</p>
                    <h3 className="mt-2 text-2xl font-semibold text-slate-900">Actions over the last 14 days</h3>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/55 bg-white/45 px-3 py-1.5 text-xs font-semibold text-slate-600">
                    <Database className="h-3.5 w-3.5" />
                    Live database data
                  </div>
                </div>

                <div className="h-[310px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={activityChartData}>
                      <defs>
                        <linearGradient id="activityStroke" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#40E0D0" />
                          <stop offset="100%" stopColor="#14b8a6" />
                        </linearGradient>
                        <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#40E0D0" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#40E0D0" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(15,23,42,0.08)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: 'rgba(51,65,85,0.78)', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis
                        tick={{ fill: 'rgba(51,65,85,0.72)', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        width={34}
                        domain={[0, hasActivityData ? 'auto' : 1]}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={glassTooltipStyle}
                        formatter={(value) => [`${Number(value ?? 0)} actions`, 'Activity']}
                        labelFormatter={(label) => `Day: ${label}`}
                      />
                      <Area
                        type="monotone"
                        dataKey="actions"
                        stroke="url(#activityStroke)"
                        fill="url(#activityFill)"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#14b8a6', stroke: '#ffffff', strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: '#40E0D0', stroke: '#ffffff', strokeWidth: 2 }}
                        animationDuration={1100}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {!hasActivityData ? (
                  <div className="mt-4 rounded-[1.35rem] border border-dashed border-cyan-200/80 bg-white/40 px-4 py-3 text-sm text-slate-600">
                    Activity charts will populate as tests are completed, lessons are published, and teachers are approved.
                  </div>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <div className="rounded-full border border-cyan-200/80 bg-white/45 px-4 py-2 text-sm font-semibold text-slate-700">
                      Total tracked actions: {activityChartData.reduce((sum, entry) => sum + entry.actions, 0)}
                    </div>
                    <div className="rounded-full border border-cyan-200/80 bg-white/45 px-4 py-2 text-sm font-semibold text-slate-700">
                      Peak day: {activityPeak.label}
                    </div>
                  </div>
                )}
              </article>

              <article className={`rounded-[1.9rem] border border-white/60 bg-white/60 p-6 text-slate-900 shadow-[0_22px_54px_rgba(45,212,191,0.1)] backdrop-blur-xl transition duration-500 ${isAnimatedIn ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'}`} style={{ transitionDelay: '80ms' }}>
                <div className="mb-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-600">Subject Distribution</p>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900">Lessons by subject</h3>
                </div>

                <div className="h-[310px]">
                  {hasSubjectDistribution ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip contentStyle={glassTooltipStyle} formatter={(value) => [`${Number(value ?? 0)} lessons`, 'Volume']} />
                        <Legend wrapperStyle={{ color: 'rgba(51,65,85,0.82)', fontSize: 12 }} />
                        <Pie
                          data={stats.subjectDistribution}
                          dataKey="lessonCount"
                          nameKey="subjectName"
                          innerRadius={62}
                          outerRadius={100}
                          paddingAngle={3}
                          animationDuration={1100}
                        >
                          {stats.subjectDistribution.map((entry, index) => (
                            <Cell key={`${entry.subjectName}-${index}`} fill={chartPalette[index % chartPalette.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <div className="flex max-w-[16rem] flex-col items-center rounded-[1.5rem] border border-dashed border-teal-200/80 bg-white/40 px-6 py-8 text-center">
                        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100/80 text-teal-700">
                          <PieChartIcon className="h-6 w-6" />
                        </div>
                        <p className="mt-4 text-base font-semibold text-slate-900">No subject chart yet</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          The distribution chart will appear once lessons are published under subjects.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {hasSubjectDistribution ? (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {stats.subjectDistribution.slice(0, 4).map((entry, index) => (
                      <div
                        key={`${entry.subjectName}-summary`}
                        className="flex items-center justify-between rounded-[1.1rem] border border-white/55 bg-white/45 px-4 py-3 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex h-3 w-3 rounded-full"
                            style={{ backgroundColor: chartPalette[index % chartPalette.length] }}
                          />
                          <span className="font-medium text-slate-700">{entry.subjectName}</span>
                        </div>
                        <span className="font-semibold text-slate-900">{entry.lessonCount}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            </div>

            <div className="grid items-start gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <article className={`rounded-[1.9rem] border border-white/60 bg-white/60 p-6 text-slate-900 shadow-[0_22px_54px_rgba(14,165,233,0.1)] backdrop-blur-xl transition duration-500 ${isAnimatedIn ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'}`} style={{ transitionDelay: '120ms' }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-600">Recent Activity</p>
                    <h3 className="mt-2 text-2xl font-semibold text-slate-900">Live feed</h3>
                  </div>
                  <div className="rounded-full border border-white/55 bg-white/45 px-3 py-1 text-xs font-semibold text-slate-600">
                    {recentActivityPage ? `Page ${recentActivityPage.page} of ${recentActivityPage.totalPages}` : 'Live activity'}
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {isActivityLoading ? (
                    <div className="rounded-[1.35rem] border border-dashed border-sky-200/80 bg-white/40 px-4 py-8 text-center text-sm text-slate-600">
                      Loading live activity...
                    </div>
                  ) : hasRecentActivity ? (
                    recentActivityItems.map((entry) => (
                      <div key={`${entry.type}-${entry.occurredAt}-${entry.title}`} className="flex items-start gap-3 rounded-[1.35rem] border border-white/55 bg-white/45 px-4 py-4">
                        <div className={`mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                          entry.type === 'test_completed'
                            ? 'bg-emerald-400/14 text-emerald-600'
                            : entry.type === 'lesson_added'
                              ? 'bg-sky-400/14 text-sky-600'
                              : 'bg-amber-400/14 text-amber-600'
                        }`}>
                          {entry.type === 'test_completed' ? <Activity className="h-4 w-4" /> : entry.type === 'lesson_added' ? <Database className="h-4 w-4" /> : <CheckCheck className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900">{entry.title}</p>
                          <p className="mt-1 text-sm text-slate-600">{entry.description}</p>
                        </div>
                        <span className="whitespace-nowrap text-xs font-medium text-slate-500">
                          {new Date(entry.occurredAt).toLocaleString()}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="mt-5 space-y-4">
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-[1.35rem] border border-white/55 bg-white/45 px-4 py-4">
                          <p className="text-sm text-slate-500">Lessons in system</p>
                          <p className="mt-2 text-3xl font-bold text-slate-900">
                            {stats.subjectDistribution.reduce((sum, entry) => sum + entry.lessonCount, 0)}
                          </p>
                        </div>
                        <div className="rounded-[1.35rem] border border-white/55 bg-white/45 px-4 py-4">
                          <p className="text-sm text-slate-500">Peak activity day</p>
                          <p className="mt-2 text-3xl font-bold text-slate-900">{activityPeak.label}</p>
                        </div>
                        <div className="rounded-[1.35rem] border border-white/55 bg-white/45 px-4 py-4">
                          <p className="text-sm text-slate-500">Top subject</p>
                          <p className="mt-2 text-xl font-bold text-slate-900">
                            {stats.subjectDistribution[0]?.subjectName ?? 'No data yet'}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-[1.35rem] border border-dashed border-sky-200/80 bg-white/40 px-4 py-5">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-700">Momentum preview</p>
                          <p className="text-xs text-slate-500">Still waiting for recent event feed</p>
                        </div>
                        <div className="h-[180px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={activityChartData}>
                              <CartesianGrid stroke="rgba(15,23,42,0.06)" vertical={false} />
                              <XAxis dataKey="label" tick={{ fill: 'rgba(51,65,85,0.72)', fontSize: 12 }} axisLine={false} tickLine={false} />
                              <YAxis hide domain={[0, hasActivityData ? 'auto' : 1]} />
                              <Tooltip
                                contentStyle={glassTooltipStyle}
                                formatter={(value) => [`${Number(value ?? 0)} actions`, 'Momentum']}
                                labelFormatter={(label) => `Day: ${label}`}
                              />
                              <Bar dataKey="actions" radius={[10, 10, 6, 6]} fill="url(#activityStroke)" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {recentActivityPage && recentActivityPage.totalPages > 1 ? (
                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/50 pt-4">
                    <p className="text-sm text-slate-500">
                      Showing {(recentActivityPage.page - 1) * recentActivityPage.pageSize + 1}
                      -
                      {Math.min(recentActivityPage.page * recentActivityPage.pageSize, recentActivityPage.totalCount)} of {recentActivityPage.totalCount}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/60 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-200 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={recentActivityPage.page <= 1}
                        type="button"
                        onClick={() => setActivityPage((current) => Math.max(1, current - 1))}
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Previous
                      </button>
                      <button
                        className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/60 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-200 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={recentActivityPage.page >= recentActivityPage.totalPages}
                        type="button"
                        onClick={() => setActivityPage((current) => current + 1)}
                      >
                        Next
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>

              <article className={`self-start rounded-[1.9rem] border border-white/60 bg-white/60 p-6 text-slate-900 shadow-[0_22px_54px_rgba(45,212,191,0.08)] backdrop-blur-xl transition duration-500 xl:sticky xl:top-6 ${isAnimatedIn ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'}`} style={{ transitionDelay: '180ms' }}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-600">Platform Snapshot</p>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900">Operational summary</h3>
                </div>

                <div className="mt-5 rounded-[1.5rem] border border-white/55 bg-white/45 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-700">System volume</p>
                    <p className="text-xs text-slate-500">Users, tests, and submissions</p>
                  </div>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={snapshotChartData} barCategoryGap="22%">
                        <CartesianGrid stroke="rgba(15,23,42,0.06)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fill: 'rgba(51,65,85,0.72)', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: 'rgba(51,65,85,0.68)', fontSize: 12 }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                        <Tooltip
                          contentStyle={glassTooltipStyle}
                          formatter={(value) => [Number(value ?? 0), 'Count']}
                        />
                        <Bar dataKey="value" radius={[12, 12, 4, 4]}>
                          {snapshotChartData.map((entry) => (
                            <Cell key={entry.label} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  <div className="rounded-[1.35rem] border border-white/55 bg-white/45 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-700">Submission completion rate</p>
                      <p className="text-sm font-bold text-slate-900">{completionRate.toFixed(1)}%</p>
                    </div>
                    <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200/80">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-teal-400 transition-[width] duration-700"
                        style={{ width: `${Math.min(completionRate, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[1.35rem] border border-white/55 bg-white/45 px-4 py-4">
                      <p className="text-sm text-slate-600">Total users</p>
                      <p className="mt-2 text-3xl font-bold text-slate-900">{stats.totalUsers.toLocaleString()}</p>
                    </div>
                    <div className="rounded-[1.35rem] border border-white/55 bg-white/45 px-4 py-4">
                      <p className="text-sm text-slate-600">Published tests</p>
                      <p className="mt-2 text-3xl font-bold text-slate-900">{stats.totalTests.toLocaleString()}</p>
                    </div>
                    <div className="rounded-[1.35rem] border border-white/55 bg-white/45 px-4 py-4">
                      <p className="text-sm text-slate-600">Completed submissions</p>
                      <p className="mt-2 text-3xl font-bold text-slate-900">{stats.totalResults.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}
