import axios from 'axios'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../app/AuthContext'
import { gradeOptions, sectionOptions } from '../../../shared/classOptions'
import { AdminDateField } from '../../../shared/components/AdminDateField'
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
  const [selectedSectionFilter, setSelectedSectionFilter] = useState('all')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all')
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    setSelectedGradeFilter(user?.grade ?? 'all')
    setSelectedSectionFilter(user?.section ?? 'all')
  }, [user?.grade, user?.section])

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
      const matchesSection = selectedSectionFilter === 'all' || lesson.section === selectedSectionFilter
      const matchesStatus =
        selectedStatusFilter === 'all' ||
        (selectedStatusFilter === 'active' ? lesson.createdByIsApproved : !lesson.createdByIsApproved)
      const matchesSubject = selectedSubjectFilter === 'all' || lesson.subjectName === selectedSubjectFilter
      const matchesDate = isWithinDateRange(lesson.createdAt, startDateFilter, endDateFilter)

      return matchesSearch && matchesGrade && matchesSection && matchesStatus && matchesSubject && matchesDate
    })
  }, [endDateFilter, filter, lessons, selectedGradeFilter, selectedSectionFilter, selectedStatusFilter, selectedSubjectFilter, startDateFilter])

  const resetFilters = () => {
    setFilter('')
    setSelectedGradeFilter(user?.grade ?? 'all')
    setSelectedSectionFilter(user?.section ?? 'all')
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
        <div className="admin-management-control-bar">
          <AdminSearchField
            placeholder="Search by title, teacher, or grade..."
            flex="1 1 200px"
            maxWidth="min(100%, 200px)"
            fullWidth={false}
            value={filter}
            onChange={setFilter}
          />

          <div className="admin-management-filter-group">
            <AdminSelectField
              label="Grade"
              value={selectedGradeFilter === 'all' ? 'all' : String(selectedGradeFilter)}
              fullWidth={false}
              width={130}
              options={[
                { value: 'all', label: 'All Grades' },
                ...gradeOptions.map((entry) => ({ value: String(entry), label: `Grade ${entry}` })),
              ]}
              onChange={(value) => setSelectedGradeFilter(value === 'all' ? 'all' : Number(value))}
            />
            <AdminSelectField
              label="Section"
              value={selectedSectionFilter}
              fullWidth={false}
              width={130}
              options={[
                { value: 'all', label: 'All Sections' },
                ...sectionOptions.map((entry) => ({ value: entry, label: entry })),
              ]}
              onChange={setSelectedSectionFilter}
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
            <AdminResetFiltersButton onClick={resetFilters} />
          </div>
        </div>

        {isLoading ? <div className="mt-6 text-slate-600">Loading lessons...</div> : null}
        {!isLoading && errorMessage ? <div className="mt-6 text-rose-700">{errorMessage}</div> : null}

        {!isLoading && !errorMessage ? (
          filteredLessons.length ? (
            <div className="mt-6 grid gap-4">
              {filteredLessons.map((lesson) => (
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
