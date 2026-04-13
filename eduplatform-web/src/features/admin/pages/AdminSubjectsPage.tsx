import axios from 'axios'
import DeleteOutline from '@mui/icons-material/DeleteOutline'
import DnsOutlined from '@mui/icons-material/DnsOutlined'
import EditOutlined from '@mui/icons-material/EditOutlined'
import FunctionsOutlined from '@mui/icons-material/FunctionsOutlined'
import CloseOutlined from '@mui/icons-material/CloseOutlined'
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined'
import PsychologyAltOutlined from '@mui/icons-material/PsychologyAltOutlined'
import PublicOutlined from '@mui/icons-material/PublicOutlined'
import ScienceOutlined from '@mui/icons-material/ScienceOutlined'
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../app/AuthContext'
import { useNotification } from '../../../app/NotificationContext'
import { formatClassDisplay, gradeOptions, sectionOptions } from '../../../shared/classOptions'
import { AdminDateField } from '../../../shared/components/AdminDateField'
import { AdminResetFiltersButton } from '../../../shared/components/AdminResetFiltersButton'
import { AdminSearchField } from '../../../shared/components/AdminSearchField'
import { AdminSelectField } from '../../../shared/components/AdminSelectField'
import { AdminSortHeader } from '../../../shared/components/AdminSortHeader'
import { DeleteConfirmationModal } from '../../../shared/components/DeleteConfirmationModal'
import { PageHeader } from '../../../shared/components/PageHeader'
import apiClient from '../../../shared/api/axiosInstance'
import { isWithinDateRange } from '../../../shared/dateFilters'
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

const getSubjectIcon = (subjectName: string) => {
  const normalized = subjectName.trim().toLowerCase()

  if (normalized.includes('bio')) {
    return ScienceOutlined
  }

  if (normalized.includes('math') || normalized.includes('algebra') || normalized.includes('geometry')) {
    return FunctionsOutlined
  }

  if (
    normalized.includes('informatic') ||
    normalized.includes('computer') ||
    normalized.includes('program') ||
    normalized.includes('it')
  ) {
    return DnsOutlined
  }

  if (normalized.includes('geo')) {
    return PublicOutlined
  }

  if (normalized.includes('psych') || normalized.includes('logic')) {
    return PsychologyAltOutlined
  }

  return MenuBookOutlined
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
  const { user } = useAuth()
  const { showNotification } = useNotification()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [grade, setGrade] = useState(8)
  const [section, setSection] = useState('А')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [viewingSubject, setViewingSubject] = useState<Subject | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<'all' | number>('all')
  const [selectedSectionFilter, setSelectedSectionFilter] = useState('all')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all')
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')
  const [sortColumn, setSortColumn] = useState<'name' | 'grade' | 'createdBy' | 'createdAt'>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [subjectPendingDelete, setSubjectPendingDelete] = useState<Subject | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const canCreate = user?.role === 'Teacher'
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
  }

  const save = async () => {
    try {
      if (editingId) {
        await apiClient.put(`/subjects/${editingId}`, { name, description, grade, section })
        showNotification('Subject updated.', 'success')
      } else {
        await apiClient.post('/subjects', { name, description, grade, section })
        showNotification('Subject created.', 'success')
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

  const subjectOptions = useMemo(
    () => Array.from(new Set(subjects.map((subject) => subject.name))).sort((left, right) => left.localeCompare(right)),
    [subjects],
  )

  const filteredSubjects = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return subjects.filter((subject) => {
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
  }, [endDateFilter, searchTerm, selectedGradeFilter, selectedSectionFilter, selectedStatusFilter, selectedSubjectFilter, startDateFilter, subjects])

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
    setSortColumn('createdAt')
    setSortDirection('desc')
  }

  const openEditModal = (subject: Subject) => {
    setEditingId(subject.id)
    setName(subject.name)
    setDescription(subject.description)
    setGrade(subject.grade)
    setSection(subject.section)
  }

  const closeEditModal = () => {
    reset()
  }

  return (
    <div className="space-y-8">
      <PageHeader
        description={
          canCreate
            ? 'Create, edit, and remove the subjects you teach.'
            : 'Review all subjects across the platform and moderate content when needed.'
        }
        eyebrow="Subjects"
        title="Subject Management"
      />

      <section className={`grid gap-6 ${canCreate ? 'xl:grid-cols-[0.38fr_0.62fr]' : ''}`}>
        {canCreate ? (
          <article className="glass-panel p-6">
            <h2 className="text-xl font-semibold text-slate-900">New subject</h2>
            <div className="mt-5 grid gap-4">
              <input
                className="rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sky-950 placeholder:text-sky-600/70"
                placeholder="Subject name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <textarea
                className="min-h-32 rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sky-950 placeholder:text-sky-600/70"
                placeholder="Description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <AdminSelectField
                  label="Grade"
                  value={String(grade)}
                  options={gradeOptions.map((entry) => ({ value: String(entry), label: String(entry) }))}
                  onChange={(value) => setGrade(Number(value))}
                />
                <AdminSelectField
                  label="Section"
                  value={section}
                  options={sectionOptions.map((entry) => ({ value: entry, label: entry }))}
                  onChange={setSection}
                />
              </div>
              <button className="button-primary w-fit" type="button" onClick={save}>
                Create subject
              </button>
            </div>
          </article>
        ) : null}

        <article className="glass-panel p-6">
          <div className="admin-management-control-bar">
            <AdminSearchField
              placeholder="Search by title, teacher, or grade..."
              fullWidth={false}
              width={200}
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
                onChange={(value) => setSelectedSectionFilter(value)}
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
              <AdminResetFiltersButton onClick={resetFilters} />
            </div>
          </div>

          {filteredSubjects.length ? (
            <div className="admin-management-table-shell mt-6">
              <div className="overflow-x-auto">
                <table className="admin-management-table">
                  <thead>
                    <tr>
                      <th>
                        <AdminSortHeader
                          label="Name"
                          column="name"
                          activeColumn={sortColumn}
                          direction={sortDirection}
                          onToggle={handleSortChange}
                        />
                      </th>
                      <th>
                        <AdminSortHeader
                          label="Grade"
                          column="grade"
                          activeColumn={sortColumn}
                          direction={sortDirection}
                          onToggle={handleSortChange}
                        />
                      </th>
                      <th>
                        <AdminSortHeader
                          label="Created by"
                          column="createdBy"
                          activeColumn={sortColumn}
                          direction={sortDirection}
                          onToggle={handleSortChange}
                        />
                      </th>
                      <th>
                        <AdminSortHeader
                          label="Date Created"
                          column="createdAt"
                          activeColumn={sortColumn}
                          direction={sortDirection}
                          onToggle={handleSortChange}
                        />
                      </th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSubjects.map((subject) => (
                      <tr key={subject.id}>
                        <td>
                          {(() => {
                            const SubjectIcon = getSubjectIcon(subject.name)

                            return (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <SubjectIcon sx={{ fontSize: 'small', color: '#2468a0' }} />
                              <p className="font-semibold text-slate-900">{subject.name}</p>
                            </div>
                            <p className="text-sm text-slate-500">{subject.description}</p>
                          </div>
                            )
                          })()}
                        </td>
                        <td>
                          <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-[#2468a0]">
                            {subject.classDisplay || formatClassDisplay(subject.grade, subject.section)}
                          </span>
                        </td>
                        <td>{`Created by ${subject.createdByFullName ?? subject.createdByUsername ?? 'Teacher'}`}</td>
                        <td>{formatDateTime(subject.createdAt)}</td>
                        <td>
                          <div className="flex justify-end gap-2">
                            <button
                              className="admin-management-icon-button"
                              title="View subject"
                              type="button"
                              onClick={() => setViewingSubject(subject)}
                            >
                              <VisibilityOutlined sx={{ fontSize: 20 }} />
                            </button>
                            <button
                              className="admin-management-icon-button"
                              title="Edit subject"
                              type="button"
                              onClick={() => openEditModal(subject)}
                            >
                              <EditOutlined sx={{ fontSize: 20 }} />
                            </button>
                            <button
                              className="admin-management-icon-button admin-management-icon-button-danger"
                              title="Delete subject"
                              type="button"
                              onClick={() => setSubjectPendingDelete(subject)}
                            >
                              <DeleteOutline sx={{ fontSize: 20 }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="admin-management-empty mt-6">
              <h3 className="text-lg font-semibold text-slate-900">No subjects found</h3>
              <p className="mt-2 text-sm text-slate-500">
                Try adjusting the search or filters, or create a new subject first.
              </p>
            </div>
          )}
        </article>
      </section>

      {viewingSubject ? (
        <div className="admin-management-modal" role="dialog" aria-modal="true" onClick={() => setViewingSubject(null)}>
          <div className="admin-management-modal-card max-w-[500px]" onClick={(event) => event.stopPropagation()}>
            <div className="relative border-b border-slate-200/80 px-6 pb-5 pt-6">
              <button
                aria-label="Close subject view"
                className="absolute right-4 top-4 inline-flex items-center justify-center p-1 text-slate-500 transition hover:text-slate-700"
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
                    {viewingSubject.classDisplay || formatClassDisplay(viewingSubject.grade, viewingSubject.section)}
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
            <div className="flex items-center justify-between border-b border-slate-200/80 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2468a0]">Subject Edit</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">Edit subject</h2>
              </div>
              <button
                aria-label="Close subject editor"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                type="button"
                onClick={closeEditModal}
              >
                ×
              </button>
            </div>
            <div className="grid gap-4 px-6 py-6">
              <input
                className="rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sky-950 placeholder:text-sky-600/70"
                placeholder="Subject name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <textarea
                className="min-h-32 rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sky-950 placeholder:text-sky-600/70"
                placeholder="Description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <AdminSelectField
                  label="Grade"
                  value={String(grade)}
                  options={gradeOptions.map((entry) => ({ value: String(entry), label: String(entry) }))}
                  onChange={(value) => setGrade(Number(value))}
                />
                <AdminSelectField
                  label="Section"
                  value={section}
                  options={sectionOptions.map((entry) => ({ value: entry, label: entry }))}
                  onChange={setSection}
                />
              </div>
              <div className="flex gap-3">
                <button className="button-primary" type="button" onClick={save}>
                  Save changes
                </button>
                <button className="rounded-2xl border border-slate-200 px-4 py-3" type="button" onClick={closeEditModal}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
