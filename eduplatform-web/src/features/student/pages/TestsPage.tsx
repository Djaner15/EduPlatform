import axios from 'axios'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../../shared/components/PageHeader'
import apiClient from '../../../shared/api/axiosInstance'

type TestSummary = {
  id: number
  title: string
  lessonId: number
  lessonTitle: string
  subjectName: string
  questions: Array<unknown>
}

export function TestsPage() {
  const [tests, setTests] = useState<TestSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadTests = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const { data } = await apiClient.get<TestSummary[]>('/tests')
        if (isMounted) {
          setTests(data)
        }
      } catch (error) {
        if (!isMounted) {
          return
        }

        if (axios.isAxiosError(error) && typeof error.response?.data === 'string') {
          setErrorMessage(error.response.data)
        } else {
          setErrorMessage('Failed to load tests. Please try again.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadTests()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="space-y-8">
      <PageHeader
        description="Review your available tests and launch an assessment when you feel ready."
        eyebrow="Tests"
        title="Available Assessments"
      />

      {isLoading ? <div className="glass-panel p-6 text-slate-600">Loading tests...</div> : null}
      {!isLoading && errorMessage ? (
        <div className="glass-panel p-6 text-rose-700">{errorMessage}</div>
      ) : null}

      {!isLoading && !errorMessage ? (
        <div className="grid gap-4">
          {tests.map((test) => (
            <article className="glass-panel flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between" key={test.id}>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-slate-900">{test.title}</h2>
                <p className="text-sm text-slate-600">
                  {test.subjectName} · {test.questions.length} questions
                </p>
              </div>
              <Link
                className="button-primary inline-flex px-4 py-3 text-sm"
                to={`/student/tests/${test.id}`}
              >
                Start
              </Link>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  )
}
