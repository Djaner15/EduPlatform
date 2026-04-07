import axios from 'axios'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../../shared/components/PageHeader'
import apiClient from '../../../shared/api/axiosInstance'

type Lesson = {
  id: number
  title: string
  content: string
  subjectName: string
}

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

export function LessonsPage() {
  const [filter, setFilter] = useState('')
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadLessons = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const { data } = await apiClient.get<Lesson[]>('/lessons')
        if (isMounted) {
          setLessons(data)
        }
      } catch (error) {
        if (!isMounted) {
          return
        }

        if (axios.isAxiosError(error) && typeof error.response?.data?.error === 'string') {
          setErrorMessage(error.response.data.error)
        } else {
          setErrorMessage('Failed to load lessons. Please try again.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadLessons()
    return () => {
      isMounted = false
    }
  }, [])

  const filteredLessons = useMemo(() => {
    const normalized = filter.trim().toLowerCase()
    if (!normalized) {
      return lessons
    }

    return lessons.filter(
      (lesson) =>
        lesson.title.toLowerCase().includes(normalized) ||
        stripHtml(lesson.content).toLowerCase().includes(normalized) ||
        lesson.subjectName.toLowerCase().includes(normalized),
    )
  }, [filter, lessons])

  return (
    <div className="space-y-8">
      <PageHeader
        action={
          <input
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none lg:w-72"
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter lessons"
            type="search"
            value={filter}
          />
        }
        description="Explore rich lessons with media, embedded resources, and downloadable materials."
        eyebrow="Lessons"
        title="Lesson Library"
      />

      {isLoading ? <div className="glass-panel p-6 text-slate-600">Loading lessons...</div> : null}
      {!isLoading && errorMessage ? <div className="glass-panel p-6 text-rose-700">{errorMessage}</div> : null}

      {!isLoading && !errorMessage ? (
        <div className="grid gap-4">
          {filteredLessons.map((lesson) => (
            <article className="glass-panel flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between" key={lesson.id}>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-slate-900">{lesson.title}</h2>
                <p className="text-sm text-slate-500">{lesson.subjectName}</p>
                <p className="max-w-2xl text-sm text-slate-600">
                  {stripHtml(lesson.content).slice(0, 180)}
                  {stripHtml(lesson.content).length > 180 ? '...' : ''}
                </p>
              </div>
              <Link className="button-primary inline-flex text-sm" to={`/student/lessons/${lesson.id}`}>
                Open
              </Link>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  )
}
