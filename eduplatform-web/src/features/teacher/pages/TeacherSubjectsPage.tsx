import { BookOpen, FolderPlus, Sparkles } from 'lucide-react'
import Stack from '@mui/material/Stack'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppSettings, useTranslation } from '../../../app/AppSettingsContext'
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

type TeacherOverviewStatsDto = {
  subjectCount: number
}

export function TeacherSubjectsPage() {
  const { language } = useAppSettings()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [items, setItems] = useState<Subject[]>([])
  const [subjectCount, setSubjectCount] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<'all' | number>('all')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(9)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadSubjects = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const [subjectsResponse, teacherOverviewResponse] = await Promise.all([
          apiClient.get<Subject[]>('/subjects'),
          apiClient.get<TeacherOverviewStatsDto>('/teacher/overview'),
        ])

        if (isMounted) {
          setItems(subjectsResponse.data)
          setSubjectCount(Number(teacherOverviewResponse.data.subjectCount ?? subjectsResponse.data.length))
        }
      } catch (error) {
        if (!isMounted) {
          return
        }
        setErrorMessage(readApiError(error, t('teacherSubjectsLoadFailed')))
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
  }, [t])

  const localizedSubjects = useMemo(() => filterSubjectsByLanguage(items, language), [items, language])

  const filteredSubjects = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return localizedSubjects.filter((subject) => {
      const matchesSearch =
        !normalizedSearch ||
        subject.name.toLowerCase().includes(normalizedSearch) ||
        subject.description.toLowerCase().includes(normalizedSearch) ||
        subject.classDisplay.toLowerCase().includes(normalizedSearch)

      const matchesGrade = selectedGradeFilter === 'all' || subject.grade === selectedGradeFilter

      return matchesSearch && matchesGrade
    })
  }, [localizedSubjects, searchTerm, selectedGradeFilter])

  const sortedSubjects = useMemo(
    () =>
      [...filteredSubjects].sort((left, right) => {
        const classCompare = left.grade - right.grade || left.section.localeCompare(right.section)
        return classCompare !== 0 ? classCompare : left.name.localeCompare(right.name)
      }),
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
    setSelectedGradeFilter('all')
  }

  return (
    <div className="space-y-8">
      <PageHeader
        action={
          <button className="button-primary inline-flex px-5 text-sm" onClick={() => navigate('/teacher/lessons')} type="button">
            {t('createLessons')}
          </button>
        }
        description={t('teacherSubjectsPageDescription')}
        eyebrow={t('subjects')}
        title={t('teacherSubjectsPageTitle')}
      />

      <section className="overflow-hidden rounded-[2rem] border border-white/60 bg-[radial-gradient(circle_at_top_left,rgba(64,224,208,0.2),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(125,211,252,0.14),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.84)_0%,rgba(236,254,255,0.9)_54%,rgba(240,249,255,0.88)_100%)] p-6 shadow-[0_24px_60px_rgba(45,212,191,0.12)] backdrop-blur-xl">
        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr] xl:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-600">
              {t('teacherSubjectsHeroEyebrow')}
            </p>
            <h2 className="mt-3 font-display text-4xl font-bold tracking-tight text-slate-900">
              {t('teacherSubjectsHeroTitle')}
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-8 text-slate-600">
              {t('teacherSubjectsHeroDescription')}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="relative overflow-hidden rounded-[1.5rem] border border-white/60 bg-white/60 px-5 py-4 shadow-[0_16px_34px_rgba(36,104,160,0.08)] backdrop-blur-lg">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-400/20 via-sky-300/12 to-transparent" />
              <div className="relative">
                <p className="text-sm font-medium text-slate-500">{t('mySubjects')}</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{subjectCount}</p>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-[1.5rem] border border-white/60 bg-white/60 px-5 py-4 shadow-[0_16px_34px_rgba(36,104,160,0.08)] backdrop-blur-lg">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-teal-400/20 via-emerald-300/12 to-transparent" />
              <div className="relative">
                <p className="text-sm font-medium text-slate-500">{t('teacherSubjectsReadyLabel')}</p>
                <p className="mt-2 flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <Sparkles className="h-5 w-5 text-cyan-600" />
                  {t('teacherSubjectsReadyValue')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {isLoading ? (
        <section className="glass-panel p-6">
          <p className="text-slate-600">{t('teacherSubjectsLoading')}</p>
        </section>
      ) : null}

      {!isLoading && errorMessage ? (
        <section className="glass-panel p-6">
          <ErrorNotice compact message={errorMessage} title={t('friendlyDashboardErrorTitle')} />
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
                placeholder={t('teacherSubjectsSearchPlaceholder')}
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
                  ...gradeOptions.map((entry) => ({ value: String(entry), label: formatGradeLabel(entry) })),
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
                        onClick={() => navigate(`/teacher/lessons?subjectId=${subject.id}`)}
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
            <div className="admin-management-empty mt-6 rounded-[2rem] border border-dashed border-cyan-200/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.86),rgba(236,254,255,0.92))] p-8 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-cyan-100/80 text-cyan-700 shadow-[0_18px_34px_rgba(45,212,191,0.12)]">
                {items.length ? <BookOpen className="h-8 w-8" /> : <FolderPlus className="h-8 w-8" />}
              </div>
              <h3 className="mt-5 text-xl font-semibold text-slate-900">
                {items.length ? t('teacherSubjectsEmptyFilteredTitle') : t('createOrJoinSubject')}
              </h3>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">
                {items.length ? t('teacherSubjectsEmptyFilteredDescription') : t('teacherSubjectsEmptyDescription')}
              </p>
            </div>
          )}
        </section>
      ) : null}
    </div>
  )
}
