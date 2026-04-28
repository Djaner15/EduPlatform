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
  const { t } = useTranslation()
  const { user } = useAuth()
  const [tests, setTests] = useState<TestSummary[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<'all' | number>(user?.grade ?? 'all')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all')
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    setSelectedGradeFilter(user?.grade ?? 'all')
  }, [user?.grade])

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
        setErrorMessage(readApiError(error, t('studentPages.tests.loadFailed')))
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

  const availableGradeOptions = useMemo(() => {
    const currentGrade = user?.grade

    if (!currentGrade) {
      return gradeOptions
    }

    return gradeOptions.filter((entry) => entry <= currentGrade)
  }, [user?.grade])

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
      const matchesStatus =
        selectedStatusFilter === 'all' ||
        (selectedStatusFilter === 'active' ? test.createdByIsApproved : !test.createdByIsApproved)
      const matchesSubject = selectedSubjectFilter === 'all' || test.subjectName === selectedSubjectFilter
      const matchesDate = isWithinDateRange(test.createdAt, startDateFilter, endDateFilter)

      return matchesSearch && matchesGrade && matchesStatus && matchesSubject && matchesDate
    })
  }, [endDateFilter, searchTerm, selectedGradeFilter, selectedStatusFilter, selectedSubjectFilter, startDateFilter, tests])

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredTests.length / rowsPerPage) - 1)
    setPage((current) => Math.min(current, maxPage))
  }, [filteredTests.length, rowsPerPage])

  const paginatedTests = useMemo(
    () => filteredTests.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredTests, page, rowsPerPage],
  )

  const resetFilters = () => {
    setSearchTerm('')
    setSelectedGradeFilter(user?.grade ?? 'all')
    setSelectedStatusFilter('all')
    setSelectedSubjectFilter('all')
    setStartDateFilter('')
    setEndDateFilter('')
  }

  return (
    <div className="space-y-8">
      <PageHeader
        description={t('studentPages.tests.description')}
        eyebrow={t('studentPages.tests.eyebrow')}
        title={t('studentPages.tests.title')}
      />

      <section className="glass-panel p-6">
        <div className="admin-management-control-bar">
          <AdminSearchField
            placeholder={t('studentPages.tests.searchPlaceholder')}
            flex="1 1 200px"
            maxWidth="min(100%, 200px)"
            fullWidth={false}
            value={searchTerm}
            onChange={setSearchTerm}
          />

          <div className="admin-management-filter-group">
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
            <AdminResetFiltersButton onClick={resetFilters} />
          </div>
        </div>

        {isLoading ? <div className="mt-6 text-slate-600">{t('studentPages.tests.loading')}</div> : null}
        {!isLoading && errorMessage ? (
          <ErrorNotice className="mt-6" compact message={errorMessage} />
        ) : null}

        {!isLoading && !errorMessage ? (
          filteredTests.length ? (
            <>
            <div className="mt-6 grid gap-4">
              {paginatedTests.map((test) => (
                <article className="glass-panel flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between" key={test.id}>
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-slate-900">{test.title}</h2>
                    <p className="text-sm text-slate-600">
                      {test.subjectName} · {formatStoredClassDisplay(test.classDisplay, test.grade, test.section)} · {t('studentPages.tests.questionsCount', { count: test.questions.length })}
                    </p>
                  </div>
                  <Link
                    className="button-primary inline-flex px-4 py-3 text-sm"
                    to={`/student/tests/${test.id}`}
                  >
                    {t('common.start')}
                  </Link>
                </article>
              ))}
            </div>
            <div className="mt-4 rounded-3xl border border-slate-200/80 bg-white/75 shadow-[0_14px_32px_rgba(36,104,160,0.08)]">
              <AppTablePagination
                count={filteredTests.length}
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
              <h3 className="text-lg font-semibold text-slate-900">{t('studentPages.tests.emptyTitle')}</h3>
              <p className="mt-2 text-sm text-slate-500">
                {t('studentPages.tests.emptyDescription')}
              </p>
            </div>
          )
        ) : null}
      </section>
    </div>
  )
}
