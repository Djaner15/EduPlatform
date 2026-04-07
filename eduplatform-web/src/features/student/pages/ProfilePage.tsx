import axios from 'axios'
import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../../../shared/components/PageHeader'
import { useAuth } from '../../../app/AuthContext'
import apiClient from '../../../shared/api/axiosInstance'
import { formatClassDisplay } from '../../../shared/classOptions'

type TestResultDto = {
  testId: number
  userId: number
  testTitle: string
  subjectName: string
  scorePercentage: number
  completedAt: string
}

export function ProfilePage() {
  const { user } = useAuth()
  const [results, setResults] = useState<TestResultDto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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

        if (axios.isAxiosError(error) && typeof error.response?.data === 'string') {
          setErrorMessage(error.response.data)
        } else {
          setErrorMessage('Failed to load your profile results.')
        }
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
  }, [])

  const averageScore = useMemo(() => {
    if (!results.length) {
      return 0
    }

    const total = results.reduce((sum, entry) => sum + entry.scorePercentage, 0)
    return Math.round(total / results.length)
  }, [results])

  const classDisplay = user?.classDisplay ?? formatClassDisplay(user?.grade ?? null, user?.section ?? null)

  return (
    <div className="space-y-8">
      <PageHeader
        description="Review your account details, recent scores, and overall learning progress."
        eyebrow="Profile"
        title="Student Profile"
      />

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <article className="glass-panel space-y-4 p-6">
          <div>
            <p className="text-sm text-slate-500">Username</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">{user?.username}</h2>
          </div>
          <div>
            <p className="text-sm text-slate-500">Role</p>
            <h3 className="mt-1 text-xl font-medium text-slate-900">{user?.role ?? 'Student'}</h3>
          </div>
          {classDisplay ? (
            <div>
              <p className="text-sm text-slate-500">Class</p>
              <span className="mt-2 inline-flex rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-[#2468a0]">
                {classDisplay}
              </span>
            </div>
          ) : null}
          <div>
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>Progress</span>
              <span>{averageScore}%</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-400"
                style={{ width: `${averageScore}%` }}
              />
            </div>
          </div>
        </article>

        <article className="glass-panel p-6">
          <h2 className="text-xl font-semibold text-slate-900">Test History</h2>
          {isLoading ? <div className="mt-5 text-slate-600">Loading history...</div> : null}
          {!isLoading && errorMessage ? <div className="mt-5 text-rose-700">{errorMessage}</div> : null}
          {!isLoading && !errorMessage && !results.length ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-4 text-slate-600">
              No completed tests yet. Your real history will appear here after you submit a test.
            </div>
          ) : null}
          {!isLoading && !errorMessage && results.length ? (
            <div className="mt-5 space-y-3">
              {results.map((entry) => (
                <div
                  className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-4 md:flex-row md:items-center md:justify-between"
                  key={`${entry.testId}-${entry.completedAt}`}
                >
                  <div>
                    <p className="font-medium text-slate-900">{entry.testTitle}</p>
                    <p className="text-sm text-slate-500">
                      {entry.subjectName} · {new Date(entry.completedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-semibold text-emerald-700">
                    {entry.scorePercentage}%
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </article>
      </section>
    </div>
  )
}
