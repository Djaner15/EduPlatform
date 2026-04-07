import axios from 'axios'
import { Loader2, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useNotification } from '../../../app/NotificationContext'
import apiClient from '../../../shared/api/axiosInstance'
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

export function TestPage() {
  const { id } = useParams()
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

  useEffect(() => {
    let isMounted = true

    const loadTest = async () => {
      if (!id) {
        setErrorMessage('Test not found.')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setErrorMessage(null)

      try {
        const { data } = await apiClient.get<TestDto>(`/tests/${id}`)
        if (isMounted) {
          setTest(data)
        }
      } catch (error) {
        if (!isMounted) {
          return
        }

        if (axios.isAxiosError(error) && typeof error.response?.data === 'string') {
          setErrorMessage(error.response.data)
        } else if (axios.isAxiosError(error) && typeof error.response?.data?.error === 'string') {
          setErrorMessage(error.response.data.error)
        } else {
          setErrorMessage('Failed to load test. Please try again.')
        }
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
  }, [id])

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

  const handleSubmit = async () => {
    if (!test) {
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const { data } = await apiClient.post<TestResultDto>(`/tests/${test.id}/submit`, {
        answers: Object.entries(answers).map(([questionId, answer]) => ({
          questionId: Number(questionId),
          answerId: answer.answerId ?? null,
          textAnswer: answer.textAnswer ?? null,
        })),
      })

      setResult(data)
      setSubmitted(true)
      showNotification(`Test submitted successfully. Score: ${data.scorePercentage}%`, 'success')
    } catch (error) {
      const message =
        axios.isAxiosError(error) && typeof error.response?.data === 'string'
          ? error.response.data
          : axios.isAxiosError(error) && typeof error.response?.data?.error === 'string'
            ? error.response.data.error
            : 'Failed to submit the test. Please try again.'

      setErrorMessage(message)
      showNotification(message, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

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
            : 'Failed to generate the explanation.'

      setExplanationErrors((current) => ({ ...current, [question.id]: message }))
      showNotification(message, 'error')
    } finally {
      setLoadingExplanationIds((current) => current.filter((entry) => entry !== question.id))
    }
  }

  if (isLoading) {
    return <div className="glass-panel p-6 text-slate-600">Loading test...</div>
  }

  if (errorMessage && !test) {
    return <div className="glass-panel p-6 text-rose-700">{errorMessage}</div>
  }

  if (!test) {
    return (
      <div className="glass-panel p-6">
        <h1 className="text-2xl font-semibold text-slate-900">Test not found</h1>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        description={`Complete the ${test.subjectName} assessment and review your results immediately after submission.`}
        eyebrow="Test session"
        title={test.title}
      />

      {errorMessage ? <div className="glass-panel p-6 text-rose-700">{errorMessage}</div> : null}

      {result ? (
        <section className="glass-panel flex items-center justify-between gap-6 p-6">
          <div>
            <p className="text-sm text-slate-500">Final result</p>
            <h2 className="mt-2 font-display text-4xl font-bold text-slate-900">
              {result.scorePercentage}%
            </h2>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/90 px-5 py-4 text-sm text-slate-600">
            Results reflect multiple choice, true/false, and text-based responses.
          </div>
        </section>
      ) : null}

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
                        AI explanation
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        See why the correct answer works and where your response fits.
                      </p>
                    </div>
                    <button
                      className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-[#2468a0] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isExplanationLoading}
                      type="button"
                      onClick={() => void explainAnswer(question)}
                    >
                      {isExplanationLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {isExplanationLoading ? 'Explaining...' : 'Explain answer'}
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

      <button
        className="button-primary inline-flex text-sm disabled:cursor-not-allowed disabled:opacity-60"
        disabled={submitted || isSubmitting || !allQuestionsAnswered}
        onClick={() => void handleSubmit()}
        type="button"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Test'}
      </button>
    </div>
  )
}
