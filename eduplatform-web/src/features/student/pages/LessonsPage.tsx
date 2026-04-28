import Stack from '@mui/material/Stack'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from '../../../app/AppSettingsContext'
import { useAuth } from '../../../app/AuthContext'
import { formatGradeLabel, formatStoredClassDisplay, gradeOptions } from '../../../shared/classOptions'
import { AdminDateField } from '../../../shared/components/AdminDateField'
import { AppTablePagination } from '../../../shared/components/AppTablePagination'
import { AdminResetFiltersButton } from '../../../shared/components/AdminResetFiltersButton'
import { AdminSearchField } from '../../../shared/components/AdminSearchField'
import { AdminSelectField } from '../../../shared/components/AdminSelectField'
import { ErrorNotice } from '../../../shared/components/ErrorNotice'
import { PageHeader } from '../../../shared/components/PageHeader'
import apiClient from '../../../shared/api/axiosInstance'
import { readApiError } from '../../../shared/apiErrors'
import { isWithinDateRange } from '../../../shared/dateFilters'

type Lesson = {
  id: number
  title: string
  content: string
  createdAt: string
  subjectName: string
  grade: number
  section: string
  classDisplay: string
  createdByUsername?: string | null
  createdByFullName?: string | null
  createdByIsApproved: boolean
}

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

export function LessonsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [filter, setFilter] = useState('')
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<'all' | number>(user?.grade ?? 'all')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all')
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    setSelectedGradeFilter(user?.grade ?? 'all')
  }, [user?.grade])

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
        setErrorMessage(readApiError(error, t('studentPages.lessons.loadFailed')))
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

  const subjectOptions = useMemo(
    () => Array.from(new Set(lessons.map((lesson) => lesson.subjectName))).sort((left, right) => left.localeCompare(right)),
    [lessons],
  )

  const availableGradeOptions = useMemo(() => {
    const currentGrade = user?.grade

    if (!currentGrade) {
      return gradeOptions
    }

    return gradeOptions.filter((entry) => entry <= currentGrade)
  }, [user?.grade])

  const filteredLessons = useMemo(() => {
    const normalized = filter.trim().toLowerCase()
    return lessons.filter((lesson) => {
      const teacherName = (lesson.createdByFullName ?? lesson.createdByUsername ?? '').toLowerCase()
      const matchesSearch =
        !normalized ||
        lesson.title.toLowerCase().includes(normalized) ||
        stripHtml(lesson.content).toLowerCase().includes(normalized) ||
        lesson.subjectName.toLowerCase().includes(normalized) ||
        teacherName.includes(normalized) ||
        String(lesson.grade).includes(normalized)

      const matchesGrade = selectedGradeFilter === 'all' || lesson.grade === selectedGradeFilter
      const matchesStatus =
        selectedStatusFilter === 'all' ||
        (selectedStatusFilter === 'active' ? lesson.createdByIsApproved : !lesson.createdByIsApproved)
      const matchesSubject = selectedSubjectFilter === 'all' || lesson.subjectName === selectedSubjectFilter
      const matchesDate = isWithinDateRange(lesson.createdAt, startDateFilter, endDateFilter)

      return matchesSearch && matchesGrade && matchesStatus && matchesSubject && matchesDate
    })
  }, [endDateFilter, filter, lessons, selectedGradeFilter, selectedStatusFilter, selectedSubjectFilter, startDateFilter])

  const sortedLessons = useMemo(
    () => [...filteredLessons].sort((left, right) => left.title.localeCompare(right.title)),
    [filteredLessons],
  )

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(sortedLessons.length / rowsPerPage) - 1)
    setPage((current) => Math.min(current, maxPage))
  }, [rowsPerPage, sortedLessons.length])

  const paginatedLessons = useMemo(
    () => sortedLessons.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [page, rowsPerPage, sortedLessons],
  )

  const resetFilters = () => {
    setFilter('')
    setSelectedGradeFilter(user?.grade ?? 'all')
    setSelectedStatusFilter('all')
    setSelectedSubjectFilter('all')
    setStartDateFilter('')
    setEndDateFilter('')
  }

  return (
    <div className="space-y-8">
      <PageHeader
        description={t('studentPages.lessons.description')}
        eyebrow={t('studentPages.lessons.eyebrow')}
        title={t('studentPages.lessons.title')}
      />

      <section className="glass-panel p-6">
        <Stack
          className="rounded-3xl border border-slate-200/80 bg-white/75 p-4 shadow-[0_14px_32px_rgba(36,104,160,0.08)]"
          spacing={2}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            useFlexGap
            alignItems={{ xs: 'stretch', sm: 'center' }}
          >
            <AdminSearchField
              placeholder={t('studentPages.lessons.searchPlaceholder')}
              flex="1 1 0%"
              maxWidth="none"
              fullWidth={false}
              value={filter}
              onChange={setFilter}
            />
            <Stack direction="row" justifyContent="flex-end" sx={{ flexShrink: 0 }}>
              <AdminResetFiltersButton onClick={resetFilters} />
            </Stack>
          </Stack>

          <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" alignItems="center">
            <AdminSelectField
              label={t('common.grade')}
              value={selectedGradeFilter === 'all' ? 'all' : String(selectedGradeFilter)}
              fullWidth={false}
              width={130}
              options={[
                { value: 'all', label: t('common.allGrades') },
                ...availableGradeOptions.map((entry) => ({ value: String(entry), label: formatGradeLabel(entry) })),
              ]}
              onChange={(value) => setSelectedGradeFilter(value === 'all' ? 'all' : Number(value))}
            />
            <AdminSelectField
              label={t('common.status')}
              value={selectedStatusFilter}
              fullWidth={false}
              width={130}
              options={[
                { value: 'all', label: t('common.allStatuses') },
                { value: 'active', label: t('common.active') },
                { value: 'inactive', label: t('common.inactive') },
              ]}
              onChange={(value) => setSelectedStatusFilter(value as typeof selectedStatusFilter)}
            />
            <AdminSelectField
              label={t('common.subject')}
              value={selectedSubjectFilter}
              fullWidth={false}
              width={130}
              options={[
                { value: 'all', label: t('common.allSubjects') },
                ...subjectOptions.map((entry) => ({ value: entry, label: entry })),
              ]}
              onChange={setSelectedSubjectFilter}
            />
            <AdminDateField
              ariaLabel="Start date"
              value={startDateFilter}
              fullWidth={false}
              width={150}
              onChange={setStartDateFilter}
            />
            <AdminDateField
              ariaLabel="End date"
              value={endDateFilter}
              fullWidth={false}
              width={150}
              onChange={setEndDateFilter}
            />
          </Stack>
        </Stack>

        {isLoading ? <div className="mt-6 text-slate-600">{t('studentPages.lessons.loading')}</div> : null}
        {!isLoading && errorMessage ? <ErrorNotice className="mt-6" compact message={errorMessage} /> : null}

        {!isLoading && !errorMessage ? (
          sortedLessons.length ? (
            <>
            <div className="mt-6 grid gap-4">
              {paginatedLessons.map((lesson) => (
                <article className="glass-panel flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between" key={lesson.id}>
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-slate-900">{lesson.title}</h2>
                    <p className="text-sm text-slate-500">
                      {lesson.subjectName} · {formatStoredClassDisplay(lesson.classDisplay, lesson.grade, lesson.section)}
                    </p>
                    <p className="max-w-2xl text-sm text-slate-600">
                      {stripHtml(lesson.content).slice(0, 180)}
                      {stripHtml(lesson.content).length > 180 ? '...' : ''}
                    </p>
                  </div>
                  <Link className="button-primary inline-flex text-sm" to={`/student/lessons/${lesson.id}`}>
                    {t('common.open')}
                  </Link>
                </article>
              ))}
            </div>
            <div className="mt-4 rounded-3xl border border-slate-200/80 bg-white/75 shadow-[0_14px_32px_rgba(36,104,160,0.08)]">
              <AppTablePagination
                count={sortedLessons.length}
                page={page}
                rowsPerPage={rowsPerPage}
                onPageChange={setPage}
                onRowsPerPageChange={(nextRowsPerPage) => {
                  setRowsPerPage(nextRowsPerPage)
                  setPage(0)
                }}
              />
            </div>
            </>
          ) : (
            <div className="admin-management-empty mt-6">
              <h3 className="text-lg font-semibold text-slate-900">No lessons found</h3>
              <h3 className="text-lg font-semibold text-slate-900">{t('studentPages.lessons.emptyTitle')}</h3>
              <p className="mt-2 text-sm text-slate-500">
                {t('studentPages.lessons.emptyDescription')}
              </p>
            </div>
          )
        ) : null}
      </section>
    </div>
  )
}
