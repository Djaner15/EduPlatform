import axios from 'axios'
import { FileText, PlayCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import apiClient, { resolveApiAssetUrl } from '../../../shared/api/axiosInstance'
import { PageHeader } from '../../../shared/components/PageHeader'

type LessonDto = {
  id: number
  title: string
  content: string
  imageUrl?: string | null
  youtubeUrl?: string | null
  attachmentUrl?: string | null
  attachmentName?: string | null
  subjectName: string
}

const getYouTubeEmbedUrl = (url?: string | null) => {
  if (!url) {
    return ''
  }

  try {
    const parsed = new URL(url)
    if (parsed.hostname.includes('youtu.be')) {
      const id = parsed.pathname.replace('/', '')
      return `https://www.youtube.com/embed/${id}`
    }

    const videoId = parsed.searchParams.get('v')
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url
  } catch {
    return url
  }
}

export function LessonDetailsPage() {
  const { id } = useParams()
  const [lesson, setLesson] = useState<LessonDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadLesson = async () => {
      if (!id) {
        setErrorMessage('Lesson not found.')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setErrorMessage(null)

      try {
        const { data } = await apiClient.get<LessonDto>(`/lessons/${id}`)
        if (isMounted) {
          setLesson(data)
        }
      } catch (error) {
        if (!isMounted) {
          return
        }

        if (axios.isAxiosError(error) && typeof error.response?.data?.error === 'string') {
          setErrorMessage(error.response.data.error)
        } else {
          setErrorMessage('Failed to load lesson. Please try again.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadLesson()
    return () => {
      isMounted = false
    }
  }, [id])

  if (isLoading) {
    return <div className="glass-panel p-6 text-slate-600">Loading lesson...</div>
  }

  if (errorMessage && !lesson) {
    return <div className="glass-panel p-6 text-rose-700">{errorMessage}</div>
  }

  if (!lesson) {
    return (
      <div className="glass-panel p-6">
        <h1 className="text-2xl font-semibold text-slate-900">Lesson not found</h1>
      </div>
    )
  }

  const embedUrl = getYouTubeEmbedUrl(lesson.youtubeUrl)

  return (
    <div className="space-y-8">
      <PageHeader
        action={
          <Link className="button-primary inline-flex text-sm" to="/student/tests">
            Start Test
          </Link>
        }
        description={`Continue learning in ${lesson.subjectName} with rich lesson content and guided resources.`}
        eyebrow="Lesson details"
        title={lesson.title}
      />

      <section className="glass-panel max-w-5xl space-y-6 p-6">
        {lesson.imageUrl ? (
          <img
            alt={lesson.title}
            className="h-72 w-full rounded-3xl object-cover shadow-[0_16px_34px_rgba(36,104,160,0.12)]"
            src={resolveApiAssetUrl(lesson.imageUrl)}
          />
        ) : null}

        <div className="lesson-content" dangerouslySetInnerHTML={{ __html: lesson.content }} />

        {embedUrl ? (
          <div className="space-y-3 rounded-3xl border border-blue-100/80 bg-blue-50/55 p-4">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <PlayCircle className="h-4 w-4 text-[#0f8b8d]" />
              Video resource
            </div>
            <div className="aspect-video overflow-hidden rounded-3xl">
              <iframe
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full border-0"
                src={embedUrl}
                title={`${lesson.title} video`}
              />
            </div>
          </div>
        ) : null}

        {lesson.attachmentUrl ? (
          <a
            className="inline-flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-blue-100"
            href={resolveApiAssetUrl(lesson.attachmentUrl)}
            rel="noreferrer"
            target="_blank"
          >
            <FileText className="h-4 w-4 text-[#2468a0]" />
            {lesson.attachmentName ?? 'Open lesson attachment'}
          </a>
        ) : null}
      </section>
    </div>
  )
}
