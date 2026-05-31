import { BookOpenCheck, CheckCircle2, ClipboardList, Flame, GraduationCap, LineChart, Target, Trophy } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from '../../../app/AppSettingsContext'
import { useAuth } from '../../../app/AuthContext'
import apiClient from '../../../shared/api/axiosInstance'
import { readApiError } from '../../../shared/apiErrors'
import { ButtonLink } from '../../../shared/components/Button'
import { ErrorNotice } from '../../../shared/components/ErrorNotice'
import { PageHeader } from '../../../shared/components/PageHeader'

type TestResultDto = {
  resultId: number
  testId: number
  testTitle: string
  subjectName: string
  scorePercentage: number
  completedAt: string
}

type TestSummary = {
  id: number
  title: string
  subjectName: string
  questions: Array<unknown>
}

type LessonSummary = {
  id: number
  title: string
  subjectName: string
}

type SubjectSummary = {
  id: number
  name: string
}

const clampPercent = (value: number) => Math.max(0, Math.min(100, value))

const getScoreTone = (score: number) => {
  if (score >= 80) {
    return {
      text: 'text-emerald-600',
      bg: 'from-emerald-400 via-teal-300 to-cyan-300',
      soft: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      ring: '#10b981',
      glow: 'rgba(16,185,129,0.24)',
    }
  }

  if (score >= 50) {
    return {
      text: 'text-amber-600',
      bg: 'from-amber-400 via-orange-300 to-cyan-300',
      soft: 'bg-amber-50 text-amber-700 border-amber-200',
      ring: '#f59e0b',
      glow: 'rgba(245,158,11,0.24)',
    }
  }

  return {
    text: 'text-rose-600',
    bg: 'from-rose-400 via-pink-300 to-orange-300',
    soft: 'bg-rose-50 text-rose-700 border-rose-200',
    ring: '#e11d48',
    glow: 'rgba(225,29,72,0.22)',
  }
}

const formatDate = (value?: string) => {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString()
}

export function StudentHomePage() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [results, setResults] = useState<TestResultDto[]>([])
  const [tests, setTests] = useState<TestSummary[]>([])
  const [lessons, setLessons] = useState<LessonSummary[]>([])
  const [subjects, setSubjects] = useState<SubjectSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadDashboard = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const [resultsResponse, testsResponse, lessonsResponse, subjectsResponse] = await Promise.all([
          apiClient.get<TestResultDto[]>('/tests/me/results'),
          apiClient.get<TestSummary[]>('/tests'),
          apiClient.get<LessonSummary[]>('/lessons'),
          apiClient.get<SubjectSummary[]>('/subjects'),
        ])

        if (isMounted) {
          setResults(resultsResponse.data)
          setTests(testsResponse.data)
          setLessons(lessonsResponse.data)
          setSubjects(subjectsResponse.data)
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(readApiError(error, t('studentDashboardLoadFailed')))
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadDashboard()

    return () => {
      isMounted = false
    }
  }, [t])

  const sortedResults = useMemo(
    () => [...results].sort((left, right) => new Date(right.completedAt).getTime() - new Date(left.completedAt).getTime()),
    [results],
  )

  const averageScore = useMemo(() => {
    if (!results.length) {
      return 0
    }

    return Math.round(results.reduce((sum, entry) => sum + entry.scorePercentage, 0) / results.length)
  }, [results])

  const completedTestIds = useMemo(() => new Set(results.map((result) => result.testId)), [results])
  const completedUniqueTests = completedTestIds.size
  const pendingTests = Math.max(0, tests.length - completedUniqueTests)
  const completionRate = tests.length ? Math.round((completedUniqueTests / tests.length) * 100) : 0
  const bestScore = results.reduce((best, entry) => Math.max(best, entry.scorePercentage), 0)
  const latestResult = sortedResults[0] ?? null
  const nextTest = tests.find((test) => !completedTestIds.has(test.id))
  const averageTone = getScoreTone(averageScore)
  const bestTone = getScoreTone(bestScore)

  const trend = useMemo(() => [...sortedResults].reverse().slice(-6), [sortedResults])
  const subjectAverages = useMemo(() => {
    const grouped = results.reduce<Record<string, { total: number; count: number }>>((accumulator, result) => {
      const key = result.subjectName || t('common.subject')
      accumulator[key] = accumulator[key] ?? { total: 0, count: 0 }
      accumulator[key].total += result.scorePercentage
      accumulator[key].count += 1
      return accumulator
    }, {})

    return Object.entries(grouped)
      .map(([subject, value]) => ({
        subject,
        average: Math.round(value.total / value.count),
        count: value.count,
      }))
      .sort((left, right) => right.average - left.average || right.count - left.count)
      .slice(0, 4)
  }, [results, t])

  const earnedBadges = [
    {
      key: 'firstTest',
      earned: results.length > 0,
      icon: CheckCircle2,
      label: t('dashboardBadgeFirstTest'),
      description: t('dashboardBadgeFirstTestDescription'),
      color: 'from-emerald-300/30 to-cyan-300/20 text-emerald-700',
    },
    {
      key: 'steadyPractice',
      earned: results.length >= 5,
      icon: Flame,
      label: t('dashboardBadgeSteadyPractice'),
      description: t('dashboardBadgeSteadyPracticeDescription', { count: results.length }),
      color: 'from-orange-300/30 to-amber-300/20 text-orange-700',
    },
    {
      key: 'highScore',
      earned: bestScore >= 80,
      icon: Trophy,
      label: t('dashboardBadgeHighScore'),
      description: t('dashboardBadgeHighScoreDescription', { score: bestScore }),
      color: 'from-amber-300/35 to-yellow-200/25 text-amber-700',
    },
    {
      key: 'subjectExplorer',
      earned: subjects.length >= 3,
      icon: GraduationCap,
      label: t('dashboardBadgeSubjectExplorer'),
      description: t('dashboardBadgeSubjectExplorerDescription', { count: subjects.length }),
      color: 'from-sky-300/30 to-blue-300/20 text-[#2468a0]',
    },
  ].filter((badge) => badge.earned)

  return (
    <div className="space-y-8">
      <PageHeader
        action={
          <ButtonLink as={Link} size="sm" to={nextTest ? `/student/tests/${nextTest.id}` : '/student/lessons'}>
            {nextTest ? t('dashboardStartNextTest') : t('continueLearning')}
          </ButtonLink>
        }
        description={t('studentOverviewDescription')}
        eyebrow={t('overview')}
        title={t('helloUser', { username: user?.username ?? t('common.user') })}
      />

      {errorMessage ? <ErrorNotice compact message={errorMessage} /> : null}

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="glass-panel overflow-hidden p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#2468a0]">{t('dashboardMomentum')}</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-900">
                {results.length ? t('dashboardMomentumTitle') : t('dashboardStartTitle')}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                {results.length
                  ? t('dashboardMomentumDescription', { completed: results.length, average: averageScore })
                  : t('dashboardStartDescription')}
              </p>
            </div>

            <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-gradient-to-br from-white via-cyan-50/90 to-emerald-50 p-5 shadow-[0_18px_38px_rgba(36,104,160,0.10)]">
              <div
                className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl"
                style={{ backgroundColor: averageTone.glow }}
              />
              <div className="relative flex items-center gap-5">
                <div
                  aria-label={`${t('averageScore')}: ${averageScore}%`}
                  className="grid h-32 w-32 shrink-0 place-items-center rounded-full p-2 shadow-[0_18px_34px_rgba(36,104,160,0.14)]"
                  role="img"
                  style={{
                    background: `conic-gradient(${averageTone.ring} ${clampPercent(averageScore) * 3.6}deg, rgba(226,232,240,0.92) 0deg)`,
                  }}
                >
                  <div className="grid h-full w-full place-items-center rounded-full bg-white/95 text-center shadow-inner">
                    <div>
                      <p className={`text-4xl font-black leading-none ${averageTone.text}`}>{averageScore}%</p>
                      <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-slate-400">
                        {t('averageScore')}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-500">{t('averageScore')}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {results.length
                      ? t('dashboardMomentumDescription', { completed: results.length, average: averageScore })
                      : t('dashboardStartDescription')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: t('completedTests'), value: results.length, icon: ClipboardList },
              { label: t('dashboardAvailableTests'), value: tests.length, icon: Trophy },
              { label: t('dashboardLessonsAvailable'), value: lessons.length, icon: BookOpenCheck },
              { label: t('dashboardSubjectsActive'), value: subjects.length, icon: GraduationCap },
            ].map((item) => {
              const Icon = item.icon

              return (
                <div className="rounded-3xl border border-sky-100/80 bg-white/80 p-4 shadow-[0_14px_28px_rgba(36,104,160,0.08)]" key={item.label}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-500">{item.label}</p>
                    <span className="grid h-9 w-9 place-items-center rounded-2xl bg-cyan-50 text-[#0f8b8d]">
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <p className="mt-3 text-4xl font-bold text-slate-900">{item.value}</p>
                </div>
              )
            })}
          </div>
        </article>

        <article className="relative overflow-hidden rounded-[2rem] border border-cyan-200/70 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.28),transparent_34%),linear-gradient(135deg,rgba(236,253,245,0.96),rgba(224,242,254,0.92)_48%,rgba(255,247,237,0.9))] p-6 shadow-[0_22px_55px_rgba(36,104,160,0.13)]">
          <div className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full bg-teal-300/24 blur-2xl" />
          <p className="relative text-xs font-semibold uppercase tracking-[0.28em] text-[#2468a0]">{t('dashboardNextStep')}</p>
          <h2 className="relative mt-3 text-2xl font-bold text-slate-900">
            {nextTest ? t('dashboardNextTestTitle') : t('dashboardLessonsNextTitle')}
          </h2>
          <p className="relative mt-3 text-sm leading-7 text-slate-600">
            {nextTest
              ? t('dashboardNextTestDescription', { title: nextTest.title })
              : t('dashboardLessonsNextDescription', { count: lessons.length })}
          </p>
          <div className="relative mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/70 bg-white/68 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t('dashboardBestScore')}</p>
              <p className={`mt-2 text-3xl font-bold ${results.length ? bestTone.text : 'text-slate-900'}`}>
                {results.length ? `${bestScore}%` : '—'}
              </p>
            </div>
            <div className="rounded-3xl border border-white/70 bg-white/68 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t('dashboardCompletionRate')}</p>
              <p className="mt-2 text-3xl font-bold text-[#0f8b8d]">{completionRate}%</p>
            </div>
            <div className="rounded-3xl border border-white/70 bg-white/68 p-4 sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t('lastTest')}</p>
              <p className="mt-1 truncate font-bold text-slate-900">{latestResult?.testTitle ?? '—'}</p>
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="glass-panel p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#2468a0]">{t('dashboardScoreTrend')}</p>
              <h2 className="mt-3 text-2xl font-bold text-slate-900">{t('dashboardScoreTrendTitle')}</h2>
            </div>
            <LineChart className="h-7 w-7 text-[#2468a0]" />
          </div>

          {trend.length ? (
            <>
              <div className="relative mt-6 h-56 rounded-[2rem] border border-sky-100 bg-white/55 p-5">
                <div className="pointer-events-none absolute inset-x-5 top-8 border-t border-slate-200" />
                <div className="pointer-events-none absolute inset-x-5 top-1/2 border-t border-dashed border-slate-300/70" />
                <div className="pointer-events-none absolute inset-x-5 bottom-8 border-t border-slate-200" />
                <div className="relative flex h-full items-end justify-between gap-3">
                  {trend.map((entry) => (
                    <div className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2" key={entry.resultId}>
                      <span className="text-sm font-bold text-slate-900">{entry.scorePercentage}%</span>
                      <div className="flex h-28 w-full max-w-16 items-end rounded-full bg-slate-200/65 p-1 shadow-inner">
                        <div
                          className={`w-full rounded-full bg-gradient-to-t ${getScoreTone(entry.scorePercentage).bg} shadow-[0_10px_18px_rgba(15,139,141,0.18)]`}
                          style={{ height: `${Math.max(10, clampPercent(entry.scorePercentage))}%` }}
                        />
                      </div>
                      <span className="max-w-full truncate text-[0.68rem] font-semibold text-slate-500">{formatDate(entry.completedAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                {trend.map((entry) => (
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-sky-100 bg-white/78 px-3 py-2 shadow-[0_8px_18px_rgba(36,104,160,0.06)]" key={entry.resultId}>
                    <span className="flex min-w-0 items-center gap-2">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${entry.scorePercentage >= 50 ? 'bg-teal-400' : 'bg-rose-400'}`} />
                      <span className="truncate text-xs font-semibold text-slate-500">{formatDate(entry.completedAt)}</span>
                    </span>
                    <span className="font-bold text-slate-900">{entry.scorePercentage}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-6 rounded-3xl border border-dashed border-sky-200 bg-cyan-50/60 p-6 text-sm text-slate-600">
              {t('dashboardNoTrendYet')}
            </div>
          )}
        </article>

        <article className="glass-panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#2468a0]">{t('dashboardSubjectPerformance')}</p>
          <h2 className="mt-3 text-2xl font-bold text-slate-900">{t('dashboardSubjectPerformanceTitle')}</h2>

          <div className="mt-6 space-y-4">
            {subjectAverages.length ? (
              subjectAverages.map((entry) => (
                <div key={entry.subject}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-slate-700">{entry.subject}</span>
                    <span className="font-bold text-slate-900">{entry.average}%</span>
                  </div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200/80">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${getScoreTone(entry.average).bg}`}
                      style={{ width: `${entry.average}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{t('dashboardAttemptsCount', { count: entry.count })}</p>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-sky-200 bg-cyan-50/60 p-6 text-sm text-slate-600">
                {t('dashboardNoSubjectStatsYet')}
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="glass-panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#2468a0]">{t('dashboardBadges')}</p>
          <h2 className="mt-3 text-2xl font-bold text-slate-900">{t('dashboardBadgesTitle')}</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {earnedBadges.length ? (
              earnedBadges.map((badge) => {
                const Icon = badge.icon

                return (
                  <div className={`rounded-3xl border border-white/70 bg-gradient-to-br ${badge.color} p-4 shadow-[0_14px_32px_rgba(36,104,160,0.08)]`} key={badge.key}>
                    <Icon className="h-6 w-6" />
                    <p className="mt-3 font-bold text-slate-900">{badge.label}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{badge.description}</p>
                  </div>
                )
              })
            ) : (
              <div className="rounded-3xl border border-dashed border-sky-200 bg-cyan-50/60 p-6 text-sm text-slate-600 sm:col-span-2">
                {t('dashboardNoBadgesYet')}
              </div>
            )}
          </div>
        </article>

        <article className="glass-panel p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#2468a0]">{t('progressFocus')}</p>
              <h2 className="mt-3 text-2xl font-bold text-slate-900">{t('stayOnTrackTitle')}</h2>
            </div>
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-sky-100 bg-cyan-50 text-[#0f8b8d]">
              <Target className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            {pendingTests > 0
              ? t('dashboardFocusPendingTests', { count: pendingTests })
              : t('dashboardFocusLessons', { count: lessons.length })}
          </p>
          {isLoading ? <p className="mt-4 text-sm text-slate-500">{t('common.loading')}</p> : null}
          <ButtonLink as={Link} className="mt-5" size="sm" to={nextTest ? `/student/tests/${nextTest.id}` : '/student/lessons'}>
            {nextTest ? t('dashboardStartNextTest') : t('continueLearning')}
          </ButtonLink>
        </article>
      </section>
    </div>
  )
}
