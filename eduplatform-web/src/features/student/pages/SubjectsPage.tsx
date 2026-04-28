import Stack from '@mui/material/Stack'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppSettings, useTranslation } from '../../../app/AppSettingsContext'
import { useAuth } from '../../../app/AuthContext'
import { formatGradeLabel, formatStoredClassDisplay, gradeOptions } from '../../../shared/classOptions'
import { AppTablePagination } from '../../../shared/components/AppTablePagination'
import { AdminResetFiltersButton } from '../../../shared/components/AdminResetFiltersButton'
import { AdminSearchField } from '../../../shared/components/AdminSearchField'
import { AdminSelectField } from '../../../shared/components/AdminSelectField'
import { ErrorNotice } from '../../../shared/components/ErrorNotice'
import { InfoCard } from '../../../shared/components/InfoCard'
import { PageHeader } from '../../../shared/components/PageHeader'
import { SubjectIcon } from '../../../shared/components/SubjectIcon'
import apiClient from '../../../shared/api/axiosInstance'
import { readApiError } from '../../../shared/apiErrors'
import { filterSubjectsByLanguage } from '../../../shared/subjectCatalog'

type Subject = {
  id: number
  name: string
  description: string
  grade: number
  section: string
  classDisplay: string
}

export function SubjectsPage() {
  const { language } = useAppSettings()
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<Subject[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<'all' | number>(user?.grade ?? 'all')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    setSelectedGradeFilter(user?.grade ?? 'all')
  }, [user?.grade])

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
        setErrorMessage(readApiError(error, t('studentPages.subjects.loadFailed')))
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

  const localizedSubjects = useMemo(() => filterSubjectsByLanguage(items, language), [items, language])

  const filteredSubjects = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return localizedSubjects.filter((subject) => {
      const matchesSearch =
        !normalizedSearch ||
        subject.name.toLowerCase().includes(normalizedSearch) ||
        subject.description.toLowerCase().includes(normalizedSearch) ||
        String(subject.grade).includes(normalizedSearch)

      const matchesGrade = selectedGradeFilter === 'all' || subject.grade === selectedGradeFilter

      return matchesSearch && matchesGrade
    })
  }, [localizedSubjects, searchTerm, selectedGradeFilter, user?.grade])

  const availableGradeOptions = useMemo(() => {
    const currentGrade = user?.grade

    if (!currentGrade) {
      return gradeOptions
    }

    return gradeOptions.filter((entry) => entry <= currentGrade)
  }, [user?.grade])

  const sortedSubjects = useMemo(
    () => [...filteredSubjects].sort((left, right) => left.name.localeCompare(right.name)),
    [filteredSubjects],
  )

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(sortedSubjects.length / rowsPerPage) - 1)
    setPage((current) => Math.min(current, maxPage))
  }, [rowsPerPage, sortedSubjects.length])

  const paginatedSubjects = useMemo(
    () => sortedSubjects.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [page, rowsPerPage, sortedSubjects],
  )

  const resetFilters = () => {
    setSearchTerm('')
    setSelectedGradeFilter(user?.grade ?? 'all')
  }

  return (
    <div className="space-y-8">
      <PageHeader
        description={t('studentPages.subjects.description')}
        eyebrow={t('studentPages.subjects.eyebrow')}
        title={t('studentPages.subjects.title')}
      />

      {isLoading ? (
        <section className="glass-panel p-6">
          <p className="text-slate-600">{t('studentPages.subjects.loading')}</p>
        </section>
      ) : null}

      {!isLoading && errorMessage ? (
        <section className="glass-panel p-6">
          <ErrorNotice compact message={errorMessage} />
        </section>
      ) : null}

      {!isLoading && !errorMessage ? (
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
                placeholder={t('studentPages.subjects.searchPlaceholder')}
                flex="1 1 0%"
                maxWidth="none"
                fullWidth={false}
                value={searchTerm}
                onChange={setSearchTerm}
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
            </Stack>
          </Stack>

          {sortedSubjects.length ? (
            <>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {paginatedSubjects.map((subject) => (
                <InfoCard
                  key={subject.id}
                  action={
                    <button
                      className="button-primary inline-flex px-4 py-3 text-sm"
                      onClick={() => navigate('/student/lessons')}
                      type="button"
                    >
                      {t('common.viewLessons')}
                    </button>
                  }
                  description={subject.description}
                  footer={formatStoredClassDisplay(subject.classDisplay, subject.grade, subject.section)}
                  title={subject.name}
                  visual={<SubjectIcon subjectName={subject.name} />}
                />
              ))}
            </div>
            <div className="mt-4 rounded-3xl border border-slate-200/80 bg-white/75 shadow-[0_14px_32px_rgba(36,104,160,0.08)]">
              <AppTablePagination
                count={sortedSubjects.length}
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
              <h3 className="text-lg font-semibold text-slate-900">{t('studentPages.subjects.emptyTitle')}</h3>
              <p className="mt-2 text-sm text-slate-500">
                {t('studentPages.subjects.emptyDescription')}
              </p>
            </div>
          )}
        </section>
      ) : null}
    </div>
  )
}
