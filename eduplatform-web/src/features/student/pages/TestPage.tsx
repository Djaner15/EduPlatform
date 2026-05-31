import axios from 'axios'
import { CheckCircle2, FileDown, Loader2, Sparkles, Target } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from '../../../app/AppSettingsContext'
import { useNotification } from '../../../app/NotificationContext'
import apiClient from '../../../shared/api/axiosInstance'
import { readApiError } from '../../../shared/apiErrors'
import { Button } from '../../../shared/components/Button'
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

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

const getScoreTone = (score: number) => {
  if (score >= 80) {
    return {
      labelKey: 'studentPages.testSession.scoreExcellent',
      ring: 'from-emerald-300 via-teal-300 to-cyan-300',
      text: 'text-emerald-700',
      chip: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    }
  }

  if (score >= 50) {
    return {
      labelKey: 'studentPages.testSession.scoreGood',
      ring: 'from-amber-300 via-orange-200 to-cyan-200',
      text: 'text-amber-700',
      chip: 'border-amber-200 bg-amber-50 text-amber-700',
    }
  }

  return {
    labelKey: 'studentPages.testSession.scoreNeedsWork',
    ring: 'from-rose-300 via-pink-200 to-amber-200',
    text: 'text-rose-700',
    chip: 'border-rose-200 bg-rose-50 text-rose-700',
  }
}

export function TestPage() {
  const { id } = useParams()
  const { t, i18n } = useTranslation()
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
        language: i18n.language,
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

  const exportResultAsPdf = () => {
    if (!test || !result || typeof window === 'undefined') {
      return
    }

    const scoreTone = getScoreTone(result.scorePercentage)
    const completedAt = result.completedAt
      ? new Intl.DateTimeFormat(undefined, {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(result.completedAt))
      : ''

    const questionRows = test.questions
      .map((question, index) => {
        const submittedAnswer = answers[question.id]
        const selectedAnswer = question.answers.find((answer) => answer.id === submittedAnswer?.answerId)
        const correctAnswer =
          question.type === 'text'
            ? question.correctTextAnswer
            : question.answers.find((answer) => answer.isCorrect)?.text
        const studentAnswer = question.type === 'text' ? submittedAnswer?.textAnswer : selectedAnswer?.text
        const isCorrect =
          question.type === 'text'
            ? Boolean(
                question.correctTextAnswer &&
                  submittedAnswer?.textAnswer &&
                  question.correctTextAnswer.trim().toLowerCase() === submittedAnswer.textAnswer.trim().toLowerCase(),
              )
            : Boolean(selectedAnswer?.isCorrect)

        return `
          <section class="question">
            <p class="eyebrow">${escapeHtml(t('studentPages.testSession.questionPdfLabel', { number: index + 1 }))}</p>
            <h2>${escapeHtml(question.text)}</h2>
            <div class="answer ${isCorrect ? 'correct' : 'wrong'}">
              <strong>${escapeHtml(t('studentPages.testSession.yourAnswer'))}</strong>
              <span>${escapeHtml(studentAnswer?.trim() || t('studentPages.testSession.noAnswerSubmitted'))}</span>
            </div>
            <div class="answer correct">
              <strong>${escapeHtml(t('studentPages.testSession.correctAnswer'))}</strong>
              <span>${escapeHtml(correctAnswer?.trim() || t('studentPages.testSession.notAvailable'))}</span>
            </div>
          </section>
        `
      })
      .join('')

    const printWindow = window.open('', '_blank', 'width=980,height=720')
    if (!printWindow) {
      showNotification(t('studentPages.testSession.exportPopupBlocked'), 'error')
      return
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(test.title)} - ${escapeHtml(t('studentPages.testSession.pdfReportTitle'))}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 32px;
              background: #eefafa;
              color: #0f172a;
              font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            }
            .report {
              max-width: 920px;
              margin: 0 auto;
              border-radius: 28px;
              background: #ffffff;
              padding: 34px;
              box-shadow: 0 24px 70px rgba(36, 104, 160, 0.14);
            }
            .header {
              display: flex;
              justify-content: space-between;
              gap: 24px;
              border-bottom: 1px solid #dbeafe;
              padding-bottom: 24px;
            }
            .eyebrow {
              margin: 0 0 8px;
              color: #2468a0;
              font-size: 12px;
              font-weight: 800;
              letter-spacing: 0.22em;
              text-transform: uppercase;
            }
            h1 {
              margin: 0;
              font-size: 34px;
              line-height: 1.1;
            }
            h2 {
              margin: 8px 0 18px;
              font-size: 20px;
              line-height: 1.35;
            }
            .meta {
              margin-top: 12px;
              color: #475569;
              font-size: 14px;
              line-height: 1.7;
            }
            .score {
              min-width: 170px;
              border-radius: 24px;
              background: linear-gradient(135deg, #f8fdff, #ecfeff);
              border: 1px solid #bae6fd;
              padding: 20px;
              text-align: center;
            }
            .score strong {
              display: block;
              font-size: 46px;
              line-height: 1;
              color: ${result.scorePercentage >= 80 ? '#047857' : result.scorePercentage >= 50 ? '#b45309' : '#be123c'};
            }
            .score span {
              display: inline-block;
              margin-top: 10px;
              border-radius: 999px;
              background: #f1f5f9;
              padding: 7px 12px;
              color: #334155;
              font-size: 12px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.12em;
            }
            .question {
              margin-top: 22px;
              break-inside: avoid;
              border: 1px solid #dbeafe;
              border-radius: 24px;
              background: #f8fdff;
              padding: 22px;
            }
            .answer {
              display: grid;
              gap: 6px;
              margin-top: 12px;
              border-radius: 18px;
              padding: 14px 16px;
              font-size: 14px;
              line-height: 1.55;
            }
            .answer strong {
              font-size: 12px;
              letter-spacing: 0.14em;
              text-transform: uppercase;
            }
            .correct {
              border: 1px solid #86efac;
              background: #ecfdf5;
              color: #047857;
            }
            .wrong {
              border: 1px solid #fda4af;
              background: #fff1f2;
              color: #be123c;
            }
            @media print {
              body { background: #ffffff; padding: 0; }
              .report { box-shadow: none; border-radius: 0; }
            }
          </style>
        </head>
        <body>
          <main class="report">
            <header class="header">
              <div>
                <p class="eyebrow">${escapeHtml(t('appName'))}</p>
                <h1>${escapeHtml(test.title)}</h1>
                <div class="meta">
                  ${escapeHtml(test.subjectName)} · ${escapeHtml(test.lessonTitle)}
                  ${completedAt ? `<br />${escapeHtml(t('studentPages.testSession.completedAt', { date: completedAt }))}` : ''}
                </div>
              </div>
              <aside class="score">
                <strong>${result.scorePercentage}%</strong>
                <span>${escapeHtml(t(scoreTone.labelKey))}</span>
              </aside>
            </header>
            ${questionRows}
          </main>
          <script>
            window.addEventListener('load', () => {
              window.focus();
              window.print();
            });
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
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
        <section className="glass-panel overflow-hidden p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className={`relative grid h-32 w-32 shrink-0 place-items-center rounded-full bg-gradient-to-br ${getScoreTone(result.scorePercentage).ring} p-1 shadow-[0_22px_46px_rgba(36,104,160,0.16)]`}>
                <div className="grid h-full w-full place-items-center rounded-full bg-white/94 text-center">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {t('studentPages.testSession.score')}
                    </p>
                    <p className={`mt-1 font-display text-4xl font-bold ${getScoreTone(result.scorePercentage).text}`}>
                      {result.scorePercentage}%
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#2468a0]">{t('studentPages.testSession.finalResult')}</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">
                  {t(getScoreTone(result.scorePercentage).labelKey)}
                </h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${getScoreTone(result.scorePercentage).chip}`}>
                    <Target className="h-3.5 w-3.5" />
                    {t('studentPages.testSession.scoreBadge', { score: result.scorePercentage })}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-[#2468a0]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {t('studentPages.testSession.answersReviewed')}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 xl:items-end">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/90 px-5 py-4 text-sm text-slate-600">
                {t('studentPages.testSession.resultsReflect')}
              </div>
              {!autoSubmittedForCheating ? (
                <Button className="self-start xl:self-end" size="sm" variant="secondary" onClick={exportResultAsPdf}>
                  <FileDown className="h-4 w-4" />
                  {t('studentPages.testSession.exportPdf')}
                </Button>
              ) : null}
            </div>
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
