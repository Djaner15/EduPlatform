import axios from 'axios'
import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  Mail,
  MapPin,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Wand2,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../app/AuthContext'
import { useTranslation } from '../../app/AppSettingsContext'
import apiClient from '../api/axiosInstance'
import { UserAvatar } from '../components/UserAvatar'

type PlatformOverviewDto = {
  registeredStudents: number
  lessonsCreated: number
  testsCompleted: number
}

type ReviewCard = {
  id: string
  fullName: string
  username?: string
  roleLabel: string
  comment: string
  rating: number
  profileImageUrl?: string | null
}

const reviewStorageKey = 'eduplatform-about-reviews'

const highlightMeta = [
  { icon: Sparkles, key: 'smartLearning' },
  { icon: ShieldCheck, key: 'protectedExams' },
  { icon: Wand2, key: 'teacherStudio' },
] as const

const galleryMeta = [
  { image: '/about-hero.jpeg', key: 'learningUx' },
  { image: '/about-gallery-classroom.jpeg', key: 'assessmentIntegrity' },
  { image: '/about-hero.jpeg', key: 'connectedWorkspace' },
] as const

const defaultReviewSeeds = [
  { id: 'seed-1', fullName: 'Mila Petrova', username: 'mpetrova', roleKey: 'common.student', commentKey: 'review1', rating: 5 },
  { id: 'seed-2', fullName: 'Ivan Georgiev', username: 'igeorgiev', roleKey: 'common.teacher', commentKey: 'review2', rating: 5 },
  { id: 'seed-3', fullName: 'Raya Koleva', username: 'rkoleva', roleKey: 'common.student', commentKey: 'review3', rating: 4 },
  { id: 'seed-4', fullName: 'Nikolay Stoyanov', username: 'nstoyanov', roleKey: 'common.admin', commentKey: 'review4', rating: 5 },
] as const

const statisticsMeta = [
  { key: 'registeredStudents' as const, labelKey: 'aboutPage.statistics.registeredStudents', icon: Users },
  { key: 'lessonsCreated' as const, labelKey: 'aboutPage.statistics.lessonsCreated', icon: BookOpen },
  { key: 'testsCompleted' as const, labelKey: 'aboutPage.statistics.testsCompleted', icon: ClipboardCheck },
] as const

const readStoredReviews = (fallbackReviews: ReviewCard[]) => {
  if (typeof window === 'undefined') {
    return fallbackReviews
  }

  try {
    const raw = window.localStorage.getItem(reviewStorageKey)
    if (!raw) {
      return fallbackReviews
    }

    const parsed = JSON.parse(raw) as ReviewCard[]
    return parsed.length ? normalizeStoredReviews(parsed, fallbackReviews) : fallbackReviews
  } catch {
    return fallbackReviews
  }
}

const persistReviews = (reviews: ReviewCard[]) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(reviewStorageKey, JSON.stringify(reviews))
}

const normalizeStoredReviews = (storedReviews: ReviewCard[], fallbackReviews: ReviewCard[]) => {
  const fallbackById = new Map(fallbackReviews.map((review) => [review.id, review]))

  return storedReviews.map((review) => {
    const fallback = fallbackById.get(review.id)
    if (!fallback) {
      return review
    }

    return {
      ...fallback,
      profileImageUrl: review.profileImageUrl,
    }
  })
}

function useElementInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node || inView) {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 },
    )

    observer.observe(node)

    return () => observer.disconnect()
  }, [inView])

  return { ref, inView }
}

function AnimatedCounter({ value, start }: { value: number; start: boolean }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    if (!start) {
      return
    }

    let frame = 0
    const frames = 32
    setDisplayValue(0)

    const interval = window.setInterval(() => {
      frame += 1
      setDisplayValue(Math.round((value * frame) / frames))

      if (frame >= frames) {
        window.clearInterval(interval)
      }
    }, 30)

    return () => window.clearInterval(interval)
  }, [start, value])

  return <>{displayValue.toLocaleString()}</>
}

export function AboutPage() {
  const { isAuthenticated, user } = useAuth()
  const { t } = useTranslation()
  const isLoggedIn = isAuthenticated()
  const defaultReviews = useMemo<ReviewCard[]>(
    () =>
      defaultReviewSeeds.map((review) => ({
        id: review.id,
        fullName: review.fullName,
        username: review.username,
        roleLabel: t(review.roleKey),
        comment: t(`aboutPage.reviews.defaults.${review.commentKey}`),
        rating: review.rating,
      })),
    [t],
  )
  const highlights = useMemo(
    () =>
      highlightMeta.map(({ icon, key }) => ({
        icon,
        title: t(`aboutPage.highlights.${key}.title`),
        description: t(`aboutPage.highlights.${key}.description`),
      })),
    [t],
  )
  const galleryItems = useMemo(
    () =>
      galleryMeta.map(({ image, key }) => ({
        image,
        title: t(`aboutPage.gallery.${key}.title`),
        subtitle: t(`aboutPage.gallery.${key}.subtitle`),
      })),
    [t],
  )
  const [overview, setOverview] = useState<PlatformOverviewDto | null>(null)
  const [isStatsLoading, setIsStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [reviews, setReviews] = useState<ReviewCard[]>(() => readStoredReviews(defaultReviews))
  const [reviewNotice, setReviewNotice] = useState<string | null>(null)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const { ref: statsRef, inView: statsInView } = useElementInView<HTMLDivElement>()

  const dashboardRoute =
    user?.role === 'Admin' ? '/admin' : user?.role === 'Teacher' ? '/teacher' : '/student'

  useEffect(() => {
    let isMounted = true

    const loadOverview = async () => {
      setIsStatsLoading(true)
      setStatsError(null)

      try {
        const { data } = await apiClient.get<PlatformOverviewDto>('/public/platform-overview')
        if (isMounted) {
          setOverview(data)
        }
      } catch (error) {
        if (!isMounted) {
          return
        }

        if (axios.isAxiosError(error) && typeof error.response?.data === 'string') {
          setStatsError(error.response.data)
        } else if (axios.isAxiosError(error) && typeof error.response?.data?.error === 'string') {
          setStatsError(error.response.data.error)
        } else {
          setStatsError(t('aboutPage.statistics.loadFailed'))
        }
      } finally {
        if (isMounted) {
          setIsStatsLoading(false)
        }
      }
    }

    void loadOverview()

    return () => {
      isMounted = false
    }
  }, [t])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      const raw = window.localStorage.getItem(reviewStorageKey)
      if (!raw) {
        setReviews(defaultReviews)
        return
      }

      const parsed = JSON.parse(raw) as ReviewCard[]
      setReviews(parsed.length ? normalizeStoredReviews(parsed, defaultReviews) : defaultReviews)
    } catch {
      setReviews(defaultReviews)
    }
  }, [defaultReviews])

  useEffect(() => {
    persistReviews(reviews)
  }, [reviews])

  const marqueeReviews = useMemo(() => [...reviews, ...reviews], [reviews])

  const handleOpenReview = () => {
    if (!isLoggedIn) {
      setReviewNotice(t('aboutPage.reviews.loginRequired'))
      return
    }

    setReviewNotice(null)
    setIsReviewModalOpen(true)
  }

  const handleSubmitReview = () => {
    const normalizedComment = comment.trim()
    if (!normalizedComment || !user) {
      return
    }

    const nextReview: ReviewCard = {
      id: `review-${Date.now()}`,
      fullName: user.fullName?.trim() || user.username,
      username: user.username,
      roleLabel: user.role === 'Admin' ? t('common.admin') : user.role === 'Teacher' ? t('common.teacher') : t('common.student'),
      comment: normalizedComment,
      rating,
      profileImageUrl: user.profileImageUrl,
    }

    setReviews((current) => [nextReview, ...current])
    setComment('')
    setRating(5)
    setIsReviewModalOpen(false)
    setReviewNotice(t('aboutPage.reviews.submitSuccess'))
  }

  return (
    <main className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="relative overflow-hidden rounded-[36px] border border-blue-100/80 shadow-[0_30px_80px_rgba(36,104,160,0.18)]">
          <img
            alt={t('aboutPage.hero.imageAlt')}
            className="h-[420px] w-full object-cover sm:h-[460px]"
            src="/about-hero.jpeg"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#102133]/85 via-[#123d5b]/65 to-[#0f8b8d]/45" />
          <div className="absolute inset-x-0 bottom-0 p-8 sm:p-10 lg:p-12">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.24em] text-white/80 backdrop-blur-sm">
                <img
                  alt=""
                  aria-hidden="true"
                  className="h-12 w-12 object-contain drop-shadow-[0_10px_22px_rgba(8,17,31,0.26)]"
                  src="/dolphin-logo.png"
                />
                {t('aboutPage.hero.eyebrow')}
              </p>
              <h1 className="mt-5 font-display text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
                EduPlatform
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-white/82 sm:text-lg">
                {t('aboutPage.hero.description')}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[32px] border border-blue-100/90 bg-white/88 p-7 shadow-[0_24px_56px_rgba(37,99,235,0.12)]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-400">
              {t('aboutPage.intro.eyebrow')}
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold text-slate-900">
              {t('aboutPage.intro.title')}
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              {t('aboutPage.intro.description')}
            </p>
          </div>

          <div className="grid gap-4">
            {highlights.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="rounded-[28px] border border-blue-100/90 bg-gradient-to-r from-white to-blue-50/70 p-6 shadow-[0_16px_34px_rgba(36,104,160,0.08)]"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#123d5b] to-[#0f8b8d] text-white shadow-[0_12px_26px_rgba(15,139,141,0.22)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold text-slate-900">{title}</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[32px] border border-blue-100/90 bg-white/88 p-7 shadow-[0_24px_56px_rgba(37,99,235,0.12)]">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-400">
              {t('aboutPage.gallery.eyebrow')}
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold text-slate-900">
              {t('aboutPage.gallery.title')}
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {galleryItems.map((item) => (
              <article
                key={`${item.title}-${item.subtitle}`}
                className="group overflow-hidden rounded-[28px] border border-blue-100/80 bg-white shadow-[0_18px_42px_rgba(36,104,160,0.1)]"
              >
                <div className="overflow-hidden">
                  <img
                    alt={item.title}
                    className="h-64 w-full object-cover transition duration-500 group-hover:scale-105"
                    src={item.image}
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-display text-xl font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{item.subtitle}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          ref={statsRef}
          className="rounded-[32px] border border-blue-100/90 bg-gradient-to-r from-white/94 via-blue-50/86 to-cyan-50/82 p-7 shadow-[0_24px_56px_rgba(37,99,235,0.12)]"
        >
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-400">
              {t('aboutPage.statistics.eyebrow')}
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold text-slate-900">
              {t('aboutPage.statistics.title')}
            </h2>
          </div>

          {statsError ? (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {statsError}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {statisticsMeta.map(({ key, labelKey, icon: Icon }) => (
              <article
                key={labelKey}
                className="rounded-[28px] border border-white/80 bg-white/88 p-6 shadow-[0_16px_34px_rgba(36,104,160,0.08)]"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {t(labelKey)}
                  </p>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-[#2468a0]">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-5 font-display text-5xl font-bold text-slate-900">
                  {isStatsLoading || !overview ? '...' : <AnimatedCounter start={statsInView} value={overview[key]} />}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">{t(labelKey)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <article className="rounded-[32px] border border-blue-100/90 bg-white/88 p-7 shadow-[0_24px_56px_rgba(37,99,235,0.12)]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-400">
              {t('aboutPage.office.eyebrow')}
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold text-slate-900">
              {t('aboutPage.office.title')}
            </h2>
            <div className="mt-6 flex items-start gap-4 rounded-[28px] border border-blue-100/80 bg-gradient-to-r from-white to-blue-50/65 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#123d5b] to-[#0f8b8d] text-white">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold text-slate-900">{t('aboutPage.office.operationsTitle')}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {t('footerAddressLine1')}
                  <br />
                  {t('footerAddressLine2')}
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-start gap-4 rounded-[28px] border border-blue-100/80 bg-gradient-to-r from-white to-blue-50/65 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#123d5b] to-[#0f8b8d] text-white">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold text-slate-900">{t('aboutPage.office.supportTitle')}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {t('aboutPage.office.supportDescription')}
                </p>
                <Link className="mt-3 inline-flex text-sm font-semibold text-blue-700 transition hover:text-blue-900" to="/contact">
                  {t('aboutPage.office.openContact')}
                </Link>
              </div>
            </div>
          </article>

          <article className="overflow-hidden rounded-[32px] border border-blue-100/90 bg-white/88 shadow-[0_24px_56px_rgba(37,99,235,0.12)]">
            <div className="aspect-[16/10] w-full">
              <iframe
                className="h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src="https://www.google.com/maps?q=11%20Chemshir%20St.,%20Plovdiv%204001,%20Bulgaria&output=embed"
                title={t('aboutPage.office.mapTitle')}
              />
            </div>
          </article>
        </section>

        <section className="rounded-[32px] border border-blue-100/90 bg-white/88 p-7 shadow-[0_24px_56px_rgba(37,99,235,0.12)]">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-400">
                {t('aboutPage.reviews.eyebrow')}
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold text-slate-900">
                {t('aboutPage.reviews.title')}
              </h2>
            </div>

            <button className="button-primary inline-flex items-center gap-2 text-sm" type="button" onClick={handleOpenReview}>
              {t('aboutPage.reviews.leaveReview')}
              <Star className="h-4 w-4" />
            </button>
          </div>

          {reviewNotice ? (
            <div className="mb-5 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-[#2468a0]">
              {reviewNotice}
            </div>
          ) : null}

          <div className="about-marquee">
            <div className="about-marquee-track gap-4 pr-4">
              {marqueeReviews.map((review, index) => (
                <article
                  className="w-[320px] shrink-0 rounded-[28px] border border-blue-100/80 bg-white shadow-[0_18px_42px_rgba(36,104,160,0.1)]"
                  key={`${review.id}-${index}`}
                >
                  <div className="p-5">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        fullName={review.fullName}
                        imageUrl={review.profileImageUrl}
                        size={44}
                        username={review.username}
                      />
                      <div>
                        <p className="font-semibold text-slate-900">{review.fullName}</p>
                        <p className="text-sm text-slate-500">{review.roleLabel}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-1 text-amber-400">
                      {Array.from({ length: 5 }, (_, starIndex) => (
                        <Star
                          key={`${review.id}-star-${starIndex}`}
                          className={`h-4 w-4 ${starIndex < review.rating ? 'fill-current' : 'text-slate-300'}`}
                        />
                      ))}
                    </div>

                    <p className="mt-4 text-sm leading-7 text-slate-600">
                      &ldquo;{review.comment}&rdquo;
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <div className="pb-2">
          <Link
            className="inline-flex items-center text-sm font-semibold text-blue-700 transition hover:text-blue-900"
            to={isLoggedIn ? dashboardRoute : '/login'}
          >
            {isLoggedIn ? t('aboutPage.backToDashboard') : t('aboutPage.backToLogin')}
          </Link>
        </div>
      </div>

      {isReviewModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[32px] border border-blue-100/90 bg-white/96 shadow-[0_32px_100px_rgba(36,104,160,0.20)]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-400">
                  {t('aboutPage.reviewModal.eyebrow')}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">{t('aboutPage.reviewModal.title')}</h2>
              </div>
              <button
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                type="button"
                onClick={() => setIsReviewModalOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div>
                <p className="text-sm font-semibold text-slate-700">{t('aboutPage.reviewModal.ratingLabel')}</p>
                <div className="mt-3 flex items-center gap-2">
                  {Array.from({ length: 5 }, (_, starIndex) => {
                    const nextValue = starIndex + 1
                    return (
                      <button className="rounded-full p-1 text-amber-400 transition hover:scale-105" key={nextValue} type="button" onClick={() => setRating(nextValue)}>
                        <Star className={`h-7 w-7 ${nextValue <= rating ? 'fill-current' : 'text-slate-300'}`} />
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700" htmlFor="about-review-comment">
                  {t('aboutPage.reviewModal.commentLabel')}
                </label>
                <textarea
                  className="mt-3 min-h-[150px] w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
                  id="about-review-comment"
                  placeholder={t('aboutPage.reviewModal.commentPlaceholder')}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200/80 px-6 py-4">
              <button
                className="inline-flex rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                type="button"
                onClick={() => setIsReviewModalOpen(false)}
              >
                {t('common.cancel')}
              </button>
              <button className="button-primary inline-flex items-center gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-60" disabled={!comment.trim()} type="button" onClick={handleSubmitReview}>
                {t('aboutPage.reviewModal.publish')}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
