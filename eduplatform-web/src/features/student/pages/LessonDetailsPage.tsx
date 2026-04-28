import { FileText, PlayCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from '../../../app/AppSettingsContext'
import apiClient, { resolveApiAssetUrl } from '../../../shared/api/axiosInstance'
import { readApiError } from '../../../shared/apiErrors'
import { ErrorNotice } from '../../../shared/components/ErrorNotice'
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

const getYouTubeVideoId = (url?: string | null) => {
  if (!url) {
    return null
  }

  try {
    const parsed = new URL(url)
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.replace('/', '') || null
    }

    if (parsed.searchParams.get('v')) {
      return parsed.searchParams.get('v')
    }

    const embedMatch = parsed.pathname.match(/\/embed\/([^/?]+)/)
    return embedMatch?.[1] ?? null
  } catch {
    return null
  }
}

const getYouTubeThumbnailUrl = (url?: string | null) => {
  const videoId = getYouTubeVideoId(url)
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null
}

export function LessonDetailsPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const [lesson, setLesson] = useState<LessonDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadLesson = async () => {
      if (!id) {
        setErrorMessage(t('studentPages.lessonDetails.notFound'))
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
        setErrorMessage(readApiError(error, t('studentPages.lessonDetails.loadFailed')))
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
    return <div className="glass-panel p-6 text-slate-600">{t('studentPages.lessonDetails.loading')}</div>
  }

  if (errorMessage && !lesson) {
    return <ErrorNotice message={errorMessage} />
  }

  if (!lesson) {
    return (
      <div className="glass-panel p-6">
        <h1 className="text-2xl font-semibold text-slate-900">{t('studentPages.lessonDetails.notFound')}</h1>
      </div>
    )
  }

  const embedUrl = getYouTubeEmbedUrl(lesson.youtubeUrl)

  return (
    <div className="space-y-8">
      <PageHeader
        action={
          <Link className="button-primary inline-flex text-sm" to="/student/tests">
            {t('studentPages.lessonDetails.startTest')}
          </Link>
        }
        description={t('studentPages.lessonDetails.description', { subject: lesson.subjectName })}
        eyebrow={t('studentPages.lessonDetails.eyebrow')}
        title={lesson.title}
      />

      <section className="glass-panel max-w-5xl space-y-6 p-6">
        <div className="lesson-content" dangerouslySetInnerHTML={{ __html: lesson.content }} />

        {embedUrl || lesson.attachmentUrl ? (
          <section className="rounded-3xl border border-blue-100/80 bg-blue-50/55 p-5">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2468a0]">{t('studentPages.lessonDetails.resourcesEyebrow')}</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">{t('studentPages.lessonDetails.resourcesTitle')}</h2>
            </div>

            <div className="space-y-4">
              {embedUrl ? (
                <div className="overflow-hidden rounded-3xl border border-sky-200 bg-white shadow-[0_12px_24px_rgba(36,104,160,0.08)]">
                  {getYouTubeThumbnailUrl(lesson.youtubeUrl) ? (
                    <a className="group relative block" href={lesson.youtubeUrl ?? '#'} rel="noreferrer" target="_blank">
                      <img
                        alt={`${lesson.title} video thumbnail`}
                        className="h-44 w-full object-cover"
                        src={getYouTubeThumbnailUrl(lesson.youtubeUrl) ?? undefined}
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-slate-950/25 transition group-hover:bg-slate-950/35">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/92 px-4 py-2 text-sm font-semibold text-slate-900">
                          <PlayCircle className="h-4 w-4 text-[#0f8b8d]" />
                          {t('studentPages.lessonDetails.openOnYoutube')}
                        </span>
                      </span>
                    </a>
                  ) : null}
                  <div className="p-4">
                    <div className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
                      <PlayCircle className="h-4 w-4 text-[#0f8b8d]" />
                      {t('studentPages.lessonDetails.videoResource')}
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
                </div>
              ) : null}

              {lesson.attachmentUrl ? (
                <a
                  className="flex items-center gap-4 rounded-3xl border border-sky-200 bg-white p-4 text-slate-800 shadow-[0_12px_24px_rgba(36,104,160,0.08)] transition hover:bg-sky-50"
                  href={resolveApiAssetUrl(lesson.attachmentUrl)}
                  rel="noreferrer"
                  target="_blank"
                >
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100/90 text-[#2468a0]">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{lesson.attachmentName ?? t('studentPages.lessonDetails.openLessonAttachment')}</p>
                    <p className="text-xs text-slate-500">{t('studentPages.lessonDetails.pdfHandout')}</p>
                  </div>
                </a>
              ) : null}
            </div>
          </section>
        ) : null}
      </section>
    </div>
  )
}
