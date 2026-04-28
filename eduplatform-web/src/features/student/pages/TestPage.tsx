import axios from 'axios'
import { Loader2, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from '../../../app/AppSettingsContext'
import { useNotification } from '../../../app/NotificationContext'
import apiClient from '../../../shared/api/axiosInstance'
import { readApiError } from '../../../shared/apiErrors'
import { ErrorNotice } from '../../../shared/components/ErrorNotice'
import { PageHeader } from '../../../shared/components/PageHeader'
import { QuestionCard } from '../components/QuestionCard'

type AnswerDto = {
  id: number
  text: string
  isCorrect: boolean
}

type QuestionDto = {
  id: number
  text: string
  type: 'multiple-choice' | 'text' | 'true-false'
  imageUrl?: string | null
  correctTextAnswer?: string | null
  answers: AnswerDto[]
}

type TestDto = {
  id: number
  title: string
  lessonId: number
  lessonTitle: string
  subjectName: string
  questions: QuestionDto[]
}

type TestResultDto = {
  testId: number
  userId: number
  testTitle: string
  subjectName: string
  scorePercentage: number
  completedAt: string
}

type SubmittedAnswer = {
  answerId?: number
  textAnswer?: string
}

type QuestionExplanation = {
  explanation: string
}

type SubmissionMode = 'manual' | 'auto-cheat'

export function TestPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const { showNotification } = useNotification()
  const [test, setTest] = useState<TestDto | null>(null)
  const [answers, setAnswers] = useState<Record<number, SubmittedAnswer>>({})
  const [submitted, setSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [result, setResult] = useState<TestResultDto | null>(null)
  const [explanations, setExplanations] = useState<Record<number, string>>({})
  const [loadingExplanationIds, setLoadingExplanationIds] = useState<number[]>([])
  const [explanationErrors, setExplanationErrors] = useState<Record<number, string>>({})
  const [autoSubmittedForCheating, setAutoSubmittedForCheating] = useState(false)
  const isSubmittingRef = useRef(false)
  const submittedRef = useRef(false)
  const autoSubmitTriggeredRef = useRef(false)
  const answersRef = useRef<Record<number, SubmittedAnswer>>({})
  const antiCheatStorageKey = id ? `anti-cheat-test-lock:${id}` : null

  useEffect(() => {
    submittedRef.current = submitted
  }, [submitted])

  useEffect(() => {
    isSubmittingRef.current = isSubmitting
  }, [isSubmitting])

  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  useEffect(() => {
    let isMounted = true

    const loadTest = async () => {
      if (!id) {
        setErrorMessage(t('studentPages.testSession.notFound'))
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setErrorMessage(null)

      try {
        const { data } = await apiClient.get<TestDto>(`/tests/${id}`)
        if (isMounted) {
          setTest(data)

          if (antiCheatStorageKey) {
            const storedLock = sessionStorage.getItem(antiCheatStorageKey)

            if (storedLock) {
              try {
                const parsed = JSON.parse(storedLock) as { result?: TestResultDto }
                if (parsed.result) {
                  setResult(parsed.result)
                }
              } catch {
                // Ignore malformed storage and still enforce the lock screen.
              }

              setSubmitted(true)
              setAutoSubmittedForCheating(true)
            }
          }
        }
      } catch (error) {
        if (!isMounted) {
          return
        }
        setErrorMessage(readApiError(error, t('studentPages.testSession.loadFailed')))
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadTest()

    return () => {
      isMounted = false
    }
  }, [antiCheatStorageKey, id, t])

  const allQuestionsAnswered = useMemo(() => {
    if (!test) {
      return false
    }

    return test.questions.every((question) => {
      const answer = answers[question.id]
      if (!answer) {
        return false
      }

      return question.type === 'text'
        ? Boolean(answer.textAnswer?.trim())
        : typeof answer.answerId === 'number'
    })
  }, [answers, test])

  const submitTest = async (mode: SubmissionMode) => {
    if (!test || submittedRef.current || isSubmittingRef.current) {
      return
    }

    if (mode === 'auto-cheat' && autoSubmitTriggeredRef.current) {
      return
    }

    if (mode === 'auto-cheat') {
      autoSubmitTriggeredRef.current = true
    }

    isSubmittingRef.current = true
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const { data } = await apiClient.post<TestResultDto>(`/tests/${test.id}/submit`, {
        answers: Object.entries(answersRef.current).map(([questionId, answer]) => ({
          questionId: Number(questionId),
          answerId: answer.answerId ?? null,
          textAnswer: answer.textAnswer ?? null,
        })),
      })

      setResult(data)
      setSubmitted(true)
      submittedRef.current = true

      if (mode === 'auto-cheat') {
        setAutoSubmittedForCheating(true)
        if (antiCheatStorageKey) {
          sessionStorage.setItem(antiCheatStorageKey, JSON.stringify({ result: data, submittedAt: data.completedAt }))
        }
        showNotification(t('studentPages.testSession.autoSubmittedNotification'), 'error')
      } else {
        if (antiCheatStorageKey) {
          sessionStorage.removeItem(antiCheatStorageKey)
        }
        showNotification(t('studentPages.testSession.submittedNotification', { score: data.scorePercentage }), 'success')
      }
    } catch (error) {
      const message = readApiError(error, t('studentPages.testSession.submitFailed'))

      setErrorMessage(message)
      showNotification(message, 'error')

      if (mode === 'auto-cheat') {
        autoSubmitTriggeredRef.current = false
      }
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (!test || submitted || autoSubmittedForCheating) {
      return
    }

    const handleFocusLoss = () => {
      void submitTest('auto-cheat')
    }

    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        void submitTest('auto-cheat')
      }
    }

    window.addEventListener('blur', handleFocusLoss)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('blur', handleFocusLoss)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [autoSubmittedForCheating, submitted, test])

  const explainAnswer = async (question: QuestionDto) => {
    if (!test) {
      return
    }

    setLoadingExplanationIds((current) => [...current, question.id])
    setExplanationErrors((current) => {
      const next = { ...current }
      delete next[question.id]
      return next
    })

    try {
      const { data } = await apiClient.post<QuestionExplanation>('/ai/explain', {
        testId: test.id,
        questionId: question.id,
        selectedAnswerId: answers[question.id]?.answerId ?? null,
        textAnswer: answers[question.id]?.textAnswer ?? null,
      })

      setExplanations((current) => ({ ...current, [question.id]: data.explanation }))
    } catch (error) {
      const message =
        axios.isAxiosError(error) && typeof error.response?.data?.message === 'string'
          ? error.response.data.message
          : axios.isAxiosError(error) && typeof error.response?.data?.error === 'string'
            ? error.response.data.error
            : t('studentPages.testSession.explainFailed')

      setExplanationErrors((current) => ({ ...current, [question.id]: message }))
      showNotification(message, 'error')
    } finally {
      setLoadingExplanationIds((current) => current.filter((entry) => entry !== question.id))
    }
  }

  if (isLoading) {
    return <div className="glass-panel p-6 text-slate-600">{t('studentPages.testSession.loading')}</div>
  }

  if (errorMessage && !test) {
    return <ErrorNotice message={errorMessage} />
  }

  if (!test) {
    return (
      <div className="glass-panel p-6">
        <h1 className="text-2xl font-semibold text-slate-900">{t('studentPages.testSession.notFound')}</h1>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        description={t('studentPages.testSession.description', { subject: test.subjectName })}
        eyebrow={t('studentPages.testSession.eyebrow')}
        title={test.title}
      />

      {errorMessage ? <ErrorNotice message={errorMessage} /> : null}

      {!submitted ? (
        <div className="glass-panel border border-amber-300 bg-amber-50/90 px-5 py-4 text-sm font-semibold text-amber-900">
          {t('studentPages.testSession.antiCheatWarning')}
        </div>
      ) : null}

      {result ? (
        <section className="glass-panel flex items-center justify-between gap-6 p-6">
          <div>
            <p className="text-sm text-slate-500">{t('studentPages.testSession.finalResult')}</p>
            <h2 className="mt-2 font-display text-4xl font-bold text-slate-900">
              {result.scorePercentage}%
            </h2>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/90 px-5 py-4 text-sm text-slate-600">
            {t('studentPages.testSession.resultsReflect')}
          </div>
        </section>
      ) : null}

      {autoSubmittedForCheating ? (
        <section className="glass-panel space-y-3 border border-rose-200 bg-rose-50/90 p-6 text-rose-900">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-600">
            {t('studentPages.testSession.autoSubmittedLabel')}
          </p>
          <h2 className="text-2xl font-semibold text-rose-950">
            {t('studentPages.testSession.autoSubmittedTitle')}
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-rose-800">
            {t('studentPages.testSession.autoSubmittedMessage')}
          </p>
        </section>
      ) : null}

      {!autoSubmittedForCheating ? (
        <div className="grid gap-4">
          {test.questions.map((question, index) => {
            const isExplanationLoading = loadingExplanationIds.includes(question.id)

            return (
              <div className="space-y-3" key={question.id}>
                <QuestionCard
                  index={index}
                  question={question}
                  selectedAnswerId={answers[question.id]?.answerId}
                  submitted={submitted}
                  textAnswer={answers[question.id]?.textAnswer}
                  onSelectAnswer={(answerId) =>
                    setAnswers((current) => ({ ...current, [question.id]: { answerId } }))
                  }
                  onTextAnswer={(value) =>
                    setAnswers((current) => ({ ...current, [question.id]: { textAnswer: value } }))
                  }
                />

                {submitted ? (
                  <div className="glass-panel px-5 py-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2468a0]">
                          {t('studentPages.testSession.aiExplanation')}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {t('studentPages.testSession.aiExplanationDescription')}
                        </p>
                      </div>
                      <button
                        className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-[#2468a0] disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isExplanationLoading}
                        type="button"
                        onClick={() => void explainAnswer(question)}
                      >
                        {isExplanationLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        {isExplanationLoading ? t('studentPages.testSession.explaining') : t('studentPages.testSession.explainAnswer')}
                      </button>
                    </div>

                    {explanationErrors[question.id] ? (
                      <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {explanationErrors[question.id]}
                      </div>
                    ) : null}

                    {explanations[question.id] ? (
                      <div className="mt-3 whitespace-pre-line rounded-3xl border border-cyan-100 bg-cyan-50/70 px-5 py-4 text-sm leading-7 text-slate-700">
                        {explanations[question.id]}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : null}

      {!autoSubmittedForCheating ? (
        <button
          className="button-primary inline-flex text-sm disabled:cursor-not-allowed disabled:opacity-60"
          disabled={submitted || isSubmitting || !allQuestionsAnswered}
          onClick={() => void submitTest('manual')}
          type="button"
        >
          {isSubmitting ? t('studentPages.testSession.submitting') : t('studentPages.testSession.submitTest')}
        </button>
      ) : null}
    </div>
  )
}
