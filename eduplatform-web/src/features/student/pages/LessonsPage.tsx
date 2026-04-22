import axios from 'axios'
import Stack from '@mui/material/Stack'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../app/AuthContext'
import { gradeOptions } from '../../../shared/classOptions'
import { AdminDateField } from '../../../shared/components/AdminDateField'
import { AppTablePagination } from '../../../shared/components/AppTablePagination'
import { AdminResetFiltersButton } from '../../../shared/components/AdminResetFiltersButton'
import { AdminSearchField } from '../../../shared/components/AdminSearchField'
import { AdminSelectField } from '../../../shared/components/AdminSelectField'
import { PageHeader } from '../../../shared/components/PageHeader'
import apiClient from '../../../shared/api/axiosInstance'
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
        description="Explore rich lessons with media, embedded resources, and downloadable materials."
        eyebrow="Lessons"
        title="Lesson Library"
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
              placeholder="Search by title, teacher, or grade..."
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
              label="Grade"
              value={selectedGradeFilter === 'all' ? 'all' : String(selectedGradeFilter)}
              fullWidth={false}
              width={130}
              options={[
                { value: 'all', label: 'All Grades' },
                ...availableGradeOptions.map((entry) => ({ value: String(entry), label: `Grade ${entry}` })),
              ]}
              onChange={(value) => setSelectedGradeFilter(value === 'all' ? 'all' : Number(value))}
            />
            <AdminSelectField
              label="Status"
              value={selectedStatusFilter}
              fullWidth={false}
              width={130}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
              onChange={(value) => setSelectedStatusFilter(value as typeof selectedStatusFilter)}
            />
            <AdminSelectField
              label="Subject"
              value={selectedSubjectFilter}
              fullWidth={false}
              width={130}
              options={[
                { value: 'all', label: 'All Subjects' },
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

        {isLoading ? <div className="mt-6 text-slate-600">Loading lessons...</div> : null}
        {!isLoading && errorMessage ? <div className="mt-6 text-rose-700">{errorMessage}</div> : null}

        {!isLoading && !errorMessage ? (
          sortedLessons.length ? (
            <>
            <div className="mt-6 grid gap-4">
              {paginatedLessons.map((lesson) => (
                <article className="glass-panel flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between" key={lesson.id}>
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-slate-900">{lesson.title}</h2>
                    <p className="text-sm text-slate-500">
                      {lesson.subjectName} · {lesson.classDisplay}
                    </p>
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
              <p className="mt-2 text-sm text-slate-500">
                Try adjusting the search or filters within your class lessons.
              </p>
            </div>
          )
        ) : null}
      </section>
    </div>
  )
}
