import axios from 'axios'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../../../shared/components/PageHeader'
import apiClient from '../../../shared/api/axiosInstance'
import { InfoCard } from '../../../shared/components/InfoCard'

type Subject = {
  id: number
  name: string
  description: string
}

export function SubjectsPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<Subject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadSubjects = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const { data } = await apiClient.get<Subject[]>('/subjects')

        if (isMounted) {
          setItems(data)
        }
      } catch (error) {
        if (!isMounted) {
          return
        }

        if (axios.isAxiosError(error) && typeof error.response?.data === 'string') {
          setErrorMessage(error.response.data)
        } else {
          setErrorMessage('Failed to load subjects. Please try again.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadSubjects()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="space-y-8">
      <PageHeader
        description="Browse your active subjects and jump directly into the relevant lessons."
        eyebrow="Subjects"
        title="Your Learning Subjects"
      />

      {isLoading ? (
        <section className="glass-panel p-6">
          <p className="text-slate-600">Loading subjects...</p>
        </section>
      ) : null}

      {!isLoading && errorMessage ? (
        <section className="glass-panel p-6">
          <p className="text-rose-700">{errorMessage}</p>
        </section>
      ) : null}

      {!isLoading && !errorMessage ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((subject) => (
            <InfoCard
              key={subject.id}
              action={
                <button
                  className="button-primary inline-flex px-4 py-3 text-sm"
                  onClick={() => navigate('/student/lessons')}
                  type="button"
                >
                  View Lessons
                </button>
              }
              description={subject.description}
              footer="Available now"
              title={subject.name}
            />
          ))}
        </section>
      ) : null}
    </div>
  )
}
