import axios from 'axios'
import DeleteOutline from '@mui/icons-material/DeleteOutline'
import EditOutlined from '@mui/icons-material/EditOutlined'
import CloseOutlined from '@mui/icons-material/CloseOutlined'
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined'
import Stack from '@mui/material/Stack'
import { useEffect, useMemo, useState } from 'react'
import { useAppSettings, useTranslation } from '../../../app/AppSettingsContext'
import { useAuth } from '../../../app/AuthContext'
import { useNotification } from '../../../app/NotificationContext'
import { formatClassDisplay, formatGradeDisplay, formatGradeLabel, formatStoredClassDisplay, gradeOptions, sectionOptions } from '../../../shared/classOptions'
import { AdminDateField } from '../../../shared/components/AdminDateField'
import { AppTablePagination } from '../../../shared/components/AppTablePagination'
import { AdminResetFiltersButton } from '../../../shared/components/AdminResetFiltersButton'
import { AdminSearchField } from '../../../shared/components/AdminSearchField'
import { AdminSelectField } from '../../../shared/components/AdminSelectField'
import { AdminSortHeader } from '../../../shared/components/AdminSortHeader'
import { DeleteConfirmationModal } from '../../../shared/components/DeleteConfirmationModal'
import { PageHeader } from '../../../shared/components/PageHeader'
import { SubjectIcon } from '../../../shared/components/SubjectIcon'
import { UserAvatar } from '../../../shared/components/UserAvatar'
import apiClient from '../../../shared/api/axiosInstance'
import { isWithinDateRange } from '../../../shared/dateFilters'
import { filterSubjectsByLanguage } from '../../../shared/subjectCatalog'
import { sortItems, type SortDirection } from '../../../shared/tableSorting'

type Subject = {
  id: number
  name: string
  description: string
  createdAt: string
  grade: number
  section: string
  classDisplay: string
  createdByUserId: number
  createdByUsername?: string | null
  createdByFullName?: string | null
  createdByIsApproved: boolean
}

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return 'Unknown date'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Unknown date'
  }

  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function AdminSubjectsPage() {
  const { language } = useAppSettings()
  const { t } = useTranslation()
  const { user } = useAuth()
  const { showNotification } = useNotification()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [grade, setGrade] = useState(8)
  const [section, setSection] = useState('А')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [viewingSubject, setViewingSubject] = useState<Subject | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<'all' | number>('all')
  const [selectedSectionFilter, setSelectedSectionFilter] = useState('all')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all')
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')
  const [sortColumn, setSortColumn] = useState<'name' | 'grade' | 'createdBy' | 'createdAt'>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [subjectPendingDelete, setSubjectPendingDelete] = useState<Subject | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const isAdmin = user?.role === 'Admin'
  const isTeacher = user?.role === 'Teacher'
  const canCreate = isAdmin
  const canDelete = isAdmin
  const isEditing = editingId !== null

  const loadSubjects = async () => {
    const { data } = await apiClient.get<Subject[]>('/subjects')
    setSubjects(data)
  }

  useEffect(() => {
    void loadSubjects()
  }, [])

  const reset = () => {
    setName('')
    setDescription('')
    setGrade(8)
    setSection('А')
    setEditingId(null)
    setIsCreateModalOpen(false)
  }

  const save = async () => {
    try {
      if (editingId) {
        await apiClient.put(`/subjects/${editingId}`, { name, description, grade, section })
        showNotification(t('adminPages.common.saveChanges'), 'success')
      } else {
        await apiClient.post('/subjects', { name, description, grade, section })
        showNotification(t('adminPages.common.create'), 'success')
      }

      reset()
      await loadSubjects()
    } catch (error) {
      showNotification(
        axios.isAxiosError(error) && typeof error.response?.data === 'string'
          ? error.response.data
          : 'Failed to save subject.',
        'error',
      )
    }
  }

  const remove = async (id: number) => {
    try {
      setIsDeleting(true)
      await apiClient.delete(`/subjects/${id}`)
      if (viewingSubject?.id === id) {
        setViewingSubject(null)
      }
      setSubjectPendingDelete(null)
      showNotification('Subject deleted.', 'success')
      await loadSubjects()
    } catch {
      showNotification('Failed to delete subject.', 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  const localizedSubjects = useMemo(() => filterSubjectsByLanguage(subjects, language), [subjects, language])

  const subjectOptions = useMemo(
    () => Array.from(new Set(localizedSubjects.map((subject) => subject.name))).sort((left, right) => left.localeCompare(right)),
    [localizedSubjects],
  )

  const filteredSubjects = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return localizedSubjects.filter((subject) => {
      const matchesSearch =
        !normalizedSearch ||
        subject.name.toLowerCase().includes(normalizedSearch) ||
        (subject.createdByFullName ?? subject.createdByUsername ?? '').toLowerCase().includes(normalizedSearch) ||
        String(subject.grade).includes(normalizedSearch)

      const matchesGrade =
        selectedGradeFilter === 'all' || subject.grade === selectedGradeFilter
      const matchesSection =
        selectedSectionFilter === 'all' || subject.section === selectedSectionFilter

      const matchesStatus =
        selectedStatusFilter === 'all' ||
        (selectedStatusFilter === 'active' ? subject.createdByIsApproved : !subject.createdByIsApproved)

      const matchesSubject =
        selectedSubjectFilter === 'all' || subject.name === selectedSubjectFilter

      const matchesDate = isWithinDateRange(subject.createdAt, startDateFilter, endDateFilter)

      return matchesSearch && matchesGrade && matchesSection && matchesStatus && matchesSubject && matchesDate
    })
  }, [endDateFilter, localizedSubjects, searchTerm, selectedGradeFilter, selectedSectionFilter, selectedStatusFilter, selectedSubjectFilter, startDateFilter])

  const sortedSubjects = useMemo(() => {
    const getCreatedBy = (subject: Subject) => subject.createdByFullName ?? subject.createdByUsername ?? 'Teacher'
    const sortMap = {
      name: {
        getValue: (subject: Subject) => subject.name,
        type: 'text',
      },
      grade: {
        getValue: (subject: Subject) => subject.classDisplay || formatClassDisplay(subject.grade, subject.section),
        type: 'alphanumeric',
      },
      createdBy: {
        getValue: getCreatedBy,
        type: 'text',
      },
      createdAt: {
        getValue: (subject: Subject) => subject.createdAt,
        type: 'date',
      },
    } as const

    const selectedSort = sortMap[sortColumn]
    return sortItems(filteredSubjects, selectedSort.getValue, sortDirection, selectedSort.type)
  }, [filteredSubjects, sortColumn, sortDirection])

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(sortedSubjects.length / rowsPerPage) - 1)
    setPage((current) => Math.min(current, maxPage))
  }, [rowsPerPage, sortedSubjects.length])

  const paginatedSubjects = useMemo(
    () => sortedSubjects.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [page, rowsPerPage, sortedSubjects],
  )

  const handleSortChange = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortColumn(column)
    setSortDirection(column === 'createdAt' ? 'desc' : 'asc')
  }

  const resetFilters = () => {
    setSearchTerm('')
    setSelectedGradeFilter('all')
    setSelectedSectionFilter('all')
    setSelectedStatusFilter('all')
    setSelectedSubjectFilter('all')
    setStartDateFilter('')
    setEndDateFilter('')
    setSortColumn('name')
    setSortDirection('asc')
  }

  const openEditModal = (subject: Subject) => {
    setIsCreateModalOpen(false)
    setEditingId(subject.id)
    setName(subject.name)
    setDescription(subject.description)
    setGrade(subject.grade)
    setSection(subject.section)
  }

  const closeEditModal = () => {
    reset()
  }

  const openCreateModal = () => {
    setEditingId(null)
    setName('')
    setDescription('')
    setGrade(8)
    setSection('А')
    setIsCreateModalOpen(true)
  }

  return (
    <div className="space-y-8">
      <PageHeader
        description={
          isAdmin
            ? t('adminPages.subjects.descriptionAdmin')
            : t('adminPages.subjects.descriptionTeacher')
        }
        eyebrow={t('adminPages.subjects.eyebrow')}
        title={t('adminPages.subjects.title')}
      />

      <section>
        <article className="glass-panel p-6">
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
                placeholder={t('adminPages.subjects.searchPlaceholder')}
                flex="1 1 0%"
                maxWidth="none"
                fullWidth={false}
                value={searchTerm}
                onChange={setSearchTerm}
              />
              <Stack direction="row" justifyContent="flex-end" spacing={1.5} useFlexGap sx={{ flexShrink: 0, alignItems: 'center' }}>
                {canCreate ? (
                  <button className="admin-add-button" type="button" onClick={openCreateModal}>
                    {t('adminPages.subjects.addButton')}
                  </button>
                ) : null}
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
              <AdminSelectField
                label={t('common.section')}
                value={selectedSectionFilter}
                fullWidth={false}
                width={130}
                options={[
                  { value: 'all', label: t('adminPages.common.allSections') },
                  ...sectionOptions.map((entry) => ({ value: entry, label: entry })),
                ]}
                onChange={(value) => setSelectedSectionFilter(value)}
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
                onChange={(value) => setSelectedSubjectFilter(value)}
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

          {filteredSubjects.length ? (
            <div className="admin-management-table-shell mt-6">
              <div className="overflow-x-auto">
                <table className="admin-management-table">
                  <colgroup>
                    <col className="w-[44%]" />
                    <col className="w-[14%]" />
                    <col className="w-[20%]" />
                    <col className="w-[14%]" />
                    <col className="w-[8%]" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>
                        <AdminSortHeader
                          label={t('adminPages.subjects.tableName')}
                          column="name"
                          activeColumn={sortColumn}
                          direction={sortDirection}
                          onToggle={handleSortChange}
                        />
                      </th>
                      <th>
                        <AdminSortHeader
                          label={t('common.grade')}
                          column="grade"
                          activeColumn={sortColumn}
                          direction={sortDirection}
                          onToggle={handleSortChange}
                        />
                      </th>
                      <th>
                        <AdminSortHeader
                          label={t('adminPages.common.createdBy')}
                          column="createdBy"
                          activeColumn={sortColumn}
                          direction={sortDirection}
                          onToggle={handleSortChange}
                        />
                      </th>
                      <th>
                        <AdminSortHeader
                          label={t('adminPages.common.dateCreated')}
                          column="createdAt"
                          activeColumn={sortColumn}
                          direction={sortDirection}
                          onToggle={handleSortChange}
                        />
                      </th>
                      <th className="text-right">{t('adminPages.common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSubjects.map((subject) => (
                    <tr key={subject.id}>
                      <td className="w-[44%]">
                        <div className="flex items-center gap-6">
                          <SubjectIcon subjectName={subject.name} />
                          <div className="min-w-0 space-y-2">
                            <p className="text-lg font-semibold text-slate-900">{subject.name}</p>
                            <p className="max-w-3xl leading-6 text-slate-500">{subject.description}</p>
                          </div>
                        </div>
                      </td>
                        <td className="whitespace-nowrap">
                          <span className="inline-flex whitespace-nowrap rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-[#2468a0]">
                            {formatStoredClassDisplay(subject.classDisplay, subject.grade, subject.section)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <UserAvatar
                              fullName={subject.createdByFullName}
                              size={24}
                              username={subject.createdByUsername}
                            />
                            <span>{`${t('adminPages.common.createdBy')} ${subject.createdByFullName ?? subject.createdByUsername ?? t('adminPages.common.unknownTeacher')}`}</span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap">{formatDateTime(subject.createdAt)}</td>
                        <td className="whitespace-nowrap">
                          <div className="flex justify-end gap-2">
                            <button
                              className="admin-management-icon-button"
                              title={t('adminPages.common.view')}
                              type="button"
                              onClick={() => setViewingSubject(subject)}
                            >
                              <VisibilityOutlined sx={{ fontSize: 20 }} />
                            </button>
                            <button
                              className="admin-management-icon-button"
                              title={t('adminPages.common.edit')}
                              type="button"
                              onClick={() => openEditModal(subject)}
                            >
                              <EditOutlined sx={{ fontSize: 20 }} />
                            </button>
                            {canDelete ? (
                              <button
                                className="admin-management-icon-button admin-management-icon-button-danger"
                                title={t('adminPages.common.delete')}
                                type="button"
                                onClick={() => setSubjectPendingDelete(subject)}
                              >
                                <DeleteOutline sx={{ fontSize: 20 }} />
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
          ) : (
            <div className="admin-management-empty mt-6">
              <h3 className="text-lg font-semibold text-slate-900">{t('adminPages.subjects.emptyTitle')}</h3>
              <p className="mt-2 text-sm text-slate-500">
                {t('adminPages.subjects.emptyDescription')}
              </p>
            </div>
          )}
        </article>
      </section>

      {viewingSubject ? (
        <div className="admin-management-modal" role="dialog" aria-modal="true" onClick={() => setViewingSubject(null)}>
          <div className="admin-management-modal-card max-w-[500px]" onClick={(event) => event.stopPropagation()}>
            <div className="admin-management-modal-header relative px-6 pb-5 pt-6">
              <button
                aria-label="Close subject view"
                className="modal-close-button absolute right-4 top-4 inline-flex items-center justify-center rounded-full p-1 text-slate-500 transition hover:text-slate-700"
                type="button"
                onClick={() => setViewingSubject(null)}
              >
                <CloseOutlined sx={{ fontSize: 22 }} />
              </button>
              <div className="pr-10">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2468a0]">Subject View</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">{viewingSubject.name}</h2>
                <div className="mt-4 flex flex-wrap items-center gap-2.5">
                  <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-[#2468a0]">
                    {formatStoredClassDisplay(viewingSubject.classDisplay, viewingSubject.grade, viewingSubject.section)}
                  </span>
                  <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {`Created by ${viewingSubject.createdByFullName ?? viewingSubject.createdByUsername ?? 'Teacher'}`}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-500">{formatDateTime(viewingSubject.createdAt)}</p>
              </div>
            </div>
            <div className="space-y-5 px-6 py-6">
              <div className="rounded-3xl border border-blue-100/80 bg-white/90 p-6 shadow-[0_14px_28px_rgba(36,104,160,0.06)]">
                <p className="text-base leading-7 text-slate-700">{viewingSubject.description}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <DeleteConfirmationModal
        open={Boolean(subjectPendingDelete)}
        title="Delete subject?"
        description={`This will permanently remove ${subjectPendingDelete?.name ?? 'this subject'}. This action cannot be undone.`}
        isDeleting={isDeleting}
        onCancel={() => {
          if (!isDeleting) {
            setSubjectPendingDelete(null)
          }
        }}
        onConfirm={() => {
          if (subjectPendingDelete) {
            void remove(subjectPendingDelete.id)
          }
        }}
      />

      {isEditing ? (
        <div className="admin-management-modal" role="dialog" aria-modal="true" onClick={closeEditModal}>
          <div className="admin-management-modal-card max-w-3xl" onClick={(event) => event.stopPropagation()}>
            <div className="admin-management-modal-header flex items-center justify-between px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2468a0]">Subject Edit</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">Edit subject</h2>
              </div>
              <button
                aria-label="Close subject editor"
                className="modal-close-button inline-flex h-11 w-11 rounded-full"
                type="button"
                onClick={closeEditModal}
              >
                ×
              </button>
            </div>
            <div className="admin-management-modal-body">
              <div className="admin-management-modal-form-endpad grid gap-4 px-6 py-6">
                <input
                  className={`rounded-2xl border px-4 py-3 text-sky-950 placeholder:text-sky-600/70 ${
                    isTeacher ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500' : 'border-sky-200 bg-sky-50/70'
                  }`}
                  placeholder="Subject name"
                  disabled={isTeacher}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                <textarea
                  className="min-h-32 rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sky-950 placeholder:text-sky-600/70"
                  placeholder="Description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
                {isTeacher ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-600">
                      <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Grade</span>
                      <span className="mt-1 block text-base font-medium text-slate-800">{formatGradeDisplay(grade)}</span>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-600">
                      <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Section</span>
                      <span className="mt-1 block text-base font-medium text-slate-800">{section}</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <AdminSelectField
                      label="Grade"
                      value={String(grade)}
                      options={gradeOptions.map((entry) => ({ value: String(entry), label: formatGradeDisplay(entry) }))}
                      onChange={(value) => setGrade(Number(value))}
                    />
                    <AdminSelectField
                      label="Section"
                      value={section}
                      options={sectionOptions.map((entry) => ({ value: entry, label: entry }))}
                      onChange={setSection}
                    />
                  </div>
                )}
                {isTeacher ? (
                  <p className="text-sm text-slate-500">Teachers can update the subject description only. Name and class assignment are managed by admins.</p>
                ) : null}
              </div>
            </div>
            <div className="admin-management-modal-footer">
              <button className="button-primary" type="button" onClick={save}>
                Save changes
              </button>
              <button className="modal-outline-button px-4 py-3" type="button" onClick={closeEditModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isCreateModalOpen ? (
        <div className="admin-management-modal" role="dialog" aria-modal="true" onClick={reset}>
          <div className="admin-management-modal-card max-w-5xl" onClick={(event) => event.stopPropagation()}>
            <div className="admin-management-modal-header flex items-center justify-between px-8 py-6 lg:px-10">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2468a0]">Subject Management</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">Create subject</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Set up a new subject with a cleaner, full-size form that leaves room for clearer titles and descriptions.
                </p>
              </div>
              <button
                aria-label="Close subject creator"
                className="modal-close-button inline-flex h-11 w-11 rounded-full"
                type="button"
                onClick={reset}
              >
                ×
              </button>
            </div>
            <div className="admin-management-modal-body">
              <div className="admin-management-modal-form-endpad grid gap-6 px-8 py-8 lg:px-10 lg:py-9">
                <input
                  className="rounded-2xl border border-sky-200 bg-sky-50/70 px-5 py-4 text-base text-sky-950 placeholder:text-sky-600/70"
                  placeholder="Subject name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                <textarea
                  className="min-h-40 rounded-2xl border border-sky-200 bg-sky-50/70 px-5 py-4 text-base text-sky-950 placeholder:text-sky-600/70"
                  placeholder="Description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
                <div className="grid gap-5 md:grid-cols-2">
                  <AdminSelectField
                    label="Grade"
                    value={String(grade)}
                    options={gradeOptions.map((entry) => ({ value: String(entry), label: formatGradeDisplay(entry) }))}
                    onChange={(value) => setGrade(Number(value))}
                  />
                  <AdminSelectField
                    label="Section"
                    value={section}
                    options={sectionOptions.map((entry) => ({ value: entry, label: entry }))}
                    onChange={setSection}
                  />
                </div>
              </div>
            </div>
            <div className="admin-management-modal-footer px-8 lg:px-10">
              <button className="button-primary px-5 py-3.5 text-base" type="button" onClick={save}>
                Create subject
              </button>
              <button className="rounded-2xl border border-slate-200 px-5 py-3.5 text-base font-semibold text-slate-700" type="button" onClick={reset}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
