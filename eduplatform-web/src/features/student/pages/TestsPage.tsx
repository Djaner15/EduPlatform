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

type TestSummary = {
  id: number
  title: string
  createdAt: string
  lessonId: number
  lessonTitle: string
  subjectName: string
  grade: number
  section: string
  classDisplay: string
  createdByUsername?: string | null
  createdByFullName?: string | null
  createdByIsApproved: boolean
  questions: Array<unknown>
}

export function TestsPage() {
  const { user } = useAuth()
  const [tests, setTests] = useState<TestSummary[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<'all' | number>(user?.grade ?? 'all')
  const [selectedSectionFilter, setSelectedSectionFilter] = useState('all')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all')
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    setSelectedGradeFilter(user?.grade ?? 'all')
    setSelectedSectionFilter(user?.section ?? 'all')
  }, [user?.grade, user?.section])

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

  const subjectOptions = useMemo(
    () => Array.from(new Set(tests.map((test) => test.subjectName))).sort((left, right) => left.localeCompare(right)),
    [tests],
  )

  const filteredTests = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return tests.filter((test) => {
      const teacherName = (test.createdByFullName ?? test.createdByUsername ?? '').toLowerCase()
      const matchesSearch =
        !normalizedSearch ||
        test.title.toLowerCase().includes(normalizedSearch) ||
        test.subjectName.toLowerCase().includes(normalizedSearch) ||
        teacherName.includes(normalizedSearch) ||
        String(test.grade).includes(normalizedSearch)

      const matchesGrade = selectedGradeFilter === 'all' || test.grade === selectedGradeFilter
      const matchesSection = selectedSectionFilter === 'all' || test.section === selectedSectionFilter
      const matchesStatus =
        selectedStatusFilter === 'all' ||
        (selectedStatusFilter === 'active' ? test.createdByIsApproved : !test.createdByIsApproved)
      const matchesSubject = selectedSubjectFilter === 'all' || test.subjectName === selectedSubjectFilter
      const matchesDate = isWithinDateRange(test.createdAt, startDateFilter, endDateFilter)

      return matchesSearch && matchesGrade && matchesSection && matchesStatus && matchesSubject && matchesDate
    })
  }, [endDateFilter, searchTerm, selectedGradeFilter, selectedSectionFilter, selectedStatusFilter, selectedSubjectFilter, startDateFilter, tests])

  const resetFilters = () => {
    setSearchTerm('')
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
        description="Review your available tests and launch an assessment when you feel ready."
        eyebrow="Tests"
        title="Available Assessments"
      />

      <section className="glass-panel p-6">
        <div className="admin-management-control-bar">
          <AdminSearchField
            placeholder="Search by title, teacher, or grade..."
            flex="1 1 200px"
            maxWidth="min(100%, 200px)"
            fullWidth={false}
            value={searchTerm}
            onChange={setSearchTerm}
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

        {isLoading ? <div className="mt-6 text-slate-600">Loading tests...</div> : null}
        {!isLoading && errorMessage ? (
          <div className="mt-6 text-rose-700">{errorMessage}</div>
        ) : null}

        {!isLoading && !errorMessage ? (
          filteredTests.length ? (
            <div className="mt-6 grid gap-4">
              {filteredTests.map((test) => (
                <article className="glass-panel flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between" key={test.id}>
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-slate-900">{test.title}</h2>
                    <p className="text-sm text-slate-600">
                      {test.subjectName} · {test.classDisplay} · {test.questions.length} questions
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
          ) : (
            <div className="admin-management-empty mt-6">
              <h3 className="text-lg font-semibold text-slate-900">No tests found</h3>
              <p className="mt-2 text-sm text-slate-500">
                Try adjusting the search or filters within your class assessments.
              </p>
            </div>
          )
        ) : null}
      </section>
    </div>
  )
}
