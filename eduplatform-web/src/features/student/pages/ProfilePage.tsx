import { ArrowRight, ClipboardCheck, Loader2, Sparkles, TrendingUp, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../app/AuthContext'
import { useTranslation } from '../../../app/AppSettingsContext'
import apiClient from '../../../shared/api/axiosInstance'
import { readApiError } from '../../../shared/apiErrors'
import { PageHeader } from '../../../shared/components/PageHeader'
import { ErrorNotice } from '../../../shared/components/ErrorNotice'
import { formatClassDisplay, formatStoredClassDisplay } from '../../../shared/classOptions'

type TestResultDto = {
  resultId: number
  testId: number
  userId: number
  testTitle: string
  subjectName: string
  scorePercentage: number
  completedAt: string
}

type TestResultQuestionReviewDto = {
  questionId: number
  orderIndex: number
  questionText: string
  questionType: string
  studentAnswerText?: string | null
  correctAnswerText: string
  isCorrect: boolean
  explanation?: string | null
}

type TestResultDetailsDto = {
  resultId: number
  testId: number
  testTitle: string
  subjectName: string
  scorePercentage: number
  completedAt: string
  hasStoredReview: boolean
  questions: TestResultQuestionReviewDto[]
}

const getScoreTone = (score: number) => {
  if (score < 40) {
    return {
      text: 'text-rose-600',
      badge:
        'bg-rose-50/95 text-rose-700 ring-1 ring-inset ring-rose-100/90 shadow-[0_10px_24px_rgba(244,63,94,0.12)] backdrop-blur-xl',
      progress: 'from-rose-500 via-rose-400 to-orange-400',
    }
  }

  if (score < 70) {
    return {
      text: 'text-amber-600',
      badge:
        'bg-amber-50/95 text-amber-700 ring-1 ring-inset ring-amber-100/90 shadow-[0_10px_24px_rgba(245,158,11,0.12)] backdrop-blur-xl',
      progress: 'from-amber-500 via-yellow-400 to-lime-400',
    }
  }

  return {
    text: 'text-emerald-600',
    badge:
      'bg-emerald-50/95 text-emerald-700 ring-1 ring-inset ring-emerald-100/90 shadow-[0_10px_24px_rgba(16,185,129,0.12)] backdrop-blur-xl',
    progress: 'from-emerald-500 via-teal-400 to-cyan-400',
  }
}

export function ProfilePage() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [results, setResults] = useState<TestResultDto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [animateProgress, setAnimateProgress] = useState(false)
  const [selectedResultId, setSelectedResultId] = useState<number | null>(null)
  const [selectedResult, setSelectedResult] = useState<TestResultDetailsDto | null>(null)
  const [isDetailsLoading, setIsDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadResults = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const { data } = await apiClient.get<TestResultDto[]>('/tests/me/results')
        if (isMounted) {
          setResults(data)
        }
      } catch (error) {
        if (!isMounted) {
          return
        }
        setErrorMessage(readApiError(error, t('studentPages.profile.loadFailed')))
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadResults()

    return () => {
      isMounted = false
    }
  }, [t])

  useEffect(() => {
    if (isLoading) {
      return
    }

    setAnimateProgress(false)
    const timer = window.setTimeout(() => setAnimateProgress(true), 120)

    return () => window.clearTimeout(timer)
  }, [isLoading, results.length])

  const averageScore = useMemo(() => {
    if (!results.length) {
      return 0
    }

    const total = results.reduce((sum, entry) => sum + entry.scorePercentage, 0)
    return Math.round(total / results.length)
  }, [results])

  const averageTone = getScoreTone(averageScore)

  const classDisplay =
    formatStoredClassDisplay(user?.classDisplay, user?.grade ?? null, user?.section ?? null) ||
    formatClassDisplay(user?.grade ?? null, user?.section ?? null)

  const infoCardClass =
    'rounded-3xl border border-sky-100/90 bg-white/82 p-4 shadow-[0_16px_36px_rgba(36,104,160,0.10)] backdrop-blur-xl'

  const resultCardClass =
    'group flex w-full flex-col gap-3 rounded-[28px] border border-sky-100/90 bg-white/84 px-5 py-5 text-left shadow-[0_16px_34px_rgba(36,104,160,0.10)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-cyan-200/90 hover:bg-cyan-50/52 hover:shadow-[0_22px_44px_rgba(36,104,160,0.14)]'

  const openResultDetails = async (entry: TestResultDto) => {
    setSelectedResultId(entry.resultId)
    setSelectedResult(null)
    setDetailsError(null)
    setIsDetailsLoading(true)

    try {
      const { data } = await apiClient.get<TestResultDetailsDto>(`/tests/me/results/${entry.resultId}`)
      setSelectedResult(data)
    } catch (error) {
      setDetailsError(readApiError(error, t('studentPages.profile.detailsLoadFailed')))
    } finally {
      setIsDetailsLoading(false)
    }
  }

  const closeResultDetails = () => {
    setSelectedResultId(null)
    setSelectedResult(null)
    setDetailsError(null)
    setIsDetailsLoading(false)
  }

  return (
    <div className="space-y-8">
      <PageHeader
        description={t('studentPages.profile.description')}
        eyebrow={t('studentPages.profile.eyebrow')}
        title={t('studentPages.profile.title')}
      />

      <section className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
        <article className="rounded-2xl border border-white/70 bg-white/74 p-6 shadow-[0_24px_56px_rgba(36,104,160,0.12)] backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">{t('studentPages.profile.username')}</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900">{user?.username}</h2>
            </div>
            <div className="rounded-2xl border border-cyan-200/80 bg-cyan-50/82 p-3 text-cyan-700 shadow-[0_12px_24px_rgba(14,165,233,0.12)]">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className={infoCardClass}>
              <p className="text-sm text-slate-500">{t('studentPages.profile.role')}</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">
                {user?.role ?? t('studentPages.profile.defaultRole')}
              </h3>
            </div>

            <div className={infoCardClass}>
              <p className="text-sm text-slate-500">{t('studentPages.profile.class')}</p>
              <div className="mt-2">
                <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-[#2468a0]">
                  {classDisplay || t('studentPages.profile.noClass')}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[28px] border border-sky-100/90 bg-white/84 p-5 shadow-[0_18px_38px_rgba(36,104,160,0.10)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">{t('studentPages.profile.progress')}</p>
                <h3 className={`mt-1 text-3xl font-semibold ${averageTone.text}`}>{averageScore}%</h3>
              </div>
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${averageTone.badge}`}>
                {results.length
                  ? t('studentPages.profile.completedTestsCount', { count: results.length })
                  : t('studentPages.profile.noResultsShort')}
              </span>
            </div>

            <div className="mt-4 h-4 overflow-hidden rounded-full bg-slate-200/80">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${averageTone.progress} shadow-[0_0_28px_rgba(45,212,191,0.25)] transition-[width] duration-700 ease-out`}
                style={{ width: `${animateProgress ? averageScore : 0}%` }}
              />
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              {t('studentPages.profile.progressDescription')}
            </p>
          </div>
        </article>

        <article className="rounded-2xl border border-white/70 bg-white/74 p-6 shadow-[0_24px_56px_rgba(36,104,160,0.12)] backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {t('studentPages.profile.testHistory')}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {t('studentPages.profile.historyDescription')}
              </p>
            </div>
            <div className="rounded-2xl border border-sky-100/90 bg-cyan-50/82 p-3 text-slate-600 shadow-[0_10px_24px_rgba(36,104,160,0.08)] backdrop-blur-xl">
              <ClipboardCheck className="h-5 w-5" />
            </div>
          </div>

          {isLoading ? <div className="mt-5 text-slate-600">{t('studentPages.profile.loading')}</div> : null}
          {!isLoading && errorMessage ? <ErrorNotice className="mt-5" compact message={errorMessage} /> : null}

          {!isLoading && !errorMessage && !results.length ? (
            <div className="mt-6 rounded-[30px] border border-dashed border-sky-200/80 bg-cyan-50/58 p-8 text-center shadow-[0_24px_50px_rgba(36,104,160,0.08)] backdrop-blur-xl">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-white/90 shadow-[0_18px_40px_rgba(36,104,160,0.12)]">
                <Sparkles className="h-9 w-9 text-cyan-500" />
              </div>
              <h3 className="mt-5 text-2xl font-semibold text-slate-900">
                {t('studentPages.profile.emptyTitle')}
              </h3>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">
                {t('studentPages.profile.emptyDescription')}
              </p>
              <button
                className="button-primary mt-6 inline-flex items-center gap-2 text-sm"
                type="button"
                onClick={() => navigate('/student/tests')}
              >
                {t('studentPages.profile.goToTests')}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          {!isLoading && !errorMessage && results.length ? (
            <div className="mt-5 space-y-3">
              {results.map((entry) => {
                const tone = getScoreTone(entry.scorePercentage)
                const isOpen = selectedResultId === entry.resultId

                return (
                  <button
                    className={`${resultCardClass} ${isOpen ? 'ring-2 ring-cyan-300/70 dark:ring-cyan-500/40' : ''}`}
                    key={entry.resultId}
                    type="button"
                    onClick={() => void openResultDetails(entry)}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold text-slate-900 transition group-hover:text-[#2468a0]">
                          {entry.testTitle}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {entry.subjectName} · {new Date(entry.completedAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 self-start md:self-center">
                        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${tone.badge}`}>
                          {entry.scorePercentage}%
                        </span>
                        <span className="text-sm font-medium text-[#2468a0]">
                          {t('studentPages.profile.viewDetails')}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : null}
        </article>
      </section>

      {selectedResultId !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[32px] border border-white/60 bg-white/75 shadow-[0_32px_120px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/88">
            <div className="flex items-start justify-between gap-4 border-b border-white/50 px-6 py-5 dark:border-white/10">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2468a0] dark:text-cyan-300">
                  {t('studentPages.profile.resultDetailsEyebrow')}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                  {selectedResult?.testTitle ?? t('studentPages.profile.loadingDetails')}
                </h2>
                {selectedResult ? (
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {selectedResult.subjectName} · {new Date(selectedResult.completedAt).toLocaleDateString()}
                  </p>
                ) : null}
              </div>

              <button
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-white/70 text-slate-500 backdrop-blur-xl transition hover:border-cyan-200/80 hover:text-slate-700 dark:border-white/10 dark:bg-slate-900/55 dark:text-slate-300 dark:hover:border-cyan-500/30 dark:hover:text-white"
                type="button"
                onClick={closeResultDetails}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {isDetailsLoading ? (
                <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {t('studentPages.profile.loadingDetails')}
                </div>
              ) : null}

              {!isDetailsLoading && detailsError ? (
                <ErrorNotice compact message={detailsError} />
              ) : null}

              {!isDetailsLoading && !detailsError && selectedResult ? (
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 rounded-[28px] border border-white/60 bg-white/70 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/50 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{t('studentPages.profile.finalScore')}</p>
                      <h3 className={`mt-2 text-4xl font-semibold ${getScoreTone(selectedResult.scorePercentage).text}`}>
                        {selectedResult.scorePercentage}%
                      </h3>
                    </div>
                    <span className={`rounded-full px-4 py-2 text-sm font-semibold ${getScoreTone(selectedResult.scorePercentage).badge}`}>
                      {t('studentPages.profile.reviewQuestions', { count: selectedResult.questions.length })}
                    </span>
                  </div>

                  {!selectedResult.hasStoredReview ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                      {t('studentPages.profile.legacyResultMessage')}
                    </div>
                  ) : null}

                  {selectedResult.questions.map((question, index) => (
                    <article
                      className="rounded-[28px] border border-white/60 bg-white/70 p-5 shadow-[0_14px_32px_rgba(36,104,160,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/50"
                      key={`${question.questionId}-${question.orderIndex}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                            {t('studentPages.profile.questionLabel', { number: index + 1 })}
                          </p>
                          <h4 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                            {question.questionText}
                          </h4>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            question.isCorrect
                              ? 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100'
                              : 'bg-rose-500/15 text-rose-700 dark:bg-rose-500/20 dark:text-rose-100'
                          }`}
                        >
                          {question.isCorrect
                            ? t('studentPages.profile.correctBadge')
                            : t('studentPages.profile.incorrectBadge')}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        <div className={`rounded-2xl border px-4 py-4 text-sm ${
                          question.isCorrect
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100'
                            : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100'
                        }`}>
                          <p className="font-semibold">{t('studentPages.profile.yourAnswer')}</p>
                          <p className="mt-2 whitespace-pre-line leading-6">
                            {question.studentAnswerText?.trim() || t('studentPages.profile.noAnswerSubmitted')}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
                          <p className="font-semibold">{t('studentPages.profile.correctAnswer')}</p>
                          <p className="mt-2 whitespace-pre-line leading-6">
                            {question.correctAnswerText || t('studentPages.profile.notAvailable')}
                          </p>
                        </div>
                      </div>

                      {question.explanation ? (
                        <div className="mt-3 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-4 text-sm leading-7 text-slate-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-slate-100">
                          <p className="font-semibold text-[#2468a0] dark:text-cyan-200">
                            {t('studentPages.profile.explanation')}
                          </p>
                          <p className="mt-2">{question.explanation}</p>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
