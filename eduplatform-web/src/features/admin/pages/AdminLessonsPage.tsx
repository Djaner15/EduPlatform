import axios from 'axios'
import DeleteOutline from '@mui/icons-material/DeleteOutline'
import EditOutlined from '@mui/icons-material/EditOutlined'
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined'
import Stack from '@mui/material/Stack'
import {
  CalendarClock,
  FileText,
  ImagePlus,
  PlayCircle,
  Upload,
  UserRound,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../app/AuthContext'
import { useNotification } from '../../../app/NotificationContext'
import { formatClassDisplay, gradeOptions, sectionOptions } from '../../../shared/classOptions'
import { AdminDateField } from '../../../shared/components/AdminDateField'
import { AppTablePagination } from '../../../shared/components/AppTablePagination'
import { AdminResetFiltersButton } from '../../../shared/components/AdminResetFiltersButton'
import { AdminSearchField } from '../../../shared/components/AdminSearchField'
import { AdminSelectField } from '../../../shared/components/AdminSelectField'
import { AdminSortHeader } from '../../../shared/components/AdminSortHeader'
import { DeleteConfirmationModal } from '../../../shared/components/DeleteConfirmationModal'
import { PageHeader } from '../../../shared/components/PageHeader'
import { RichTextEditor } from '../../../shared/components/RichTextEditor'
import apiClient, { resolveApiAssetUrl } from '../../../shared/api/axiosInstance'
import { isWithinDateRange } from '../../../shared/dateFilters'
import { sortItems, type SortDirection } from '../../../shared/tableSorting'

const lessonDraftStorageKey = 'eduplatform.lessonDraft'

type LessonDraft = {
  form: {
    title: string
    content: string
    subjectId: number
    grade: number
    section: string
    youtubeUrl: string
  }
  existingImageUrl: string
  existingAttachment: { name: string; url: string } | null
}

type Subject = {
  id: number
  name: string
  grade: number
  section: string
  classDisplay: string
}

type Lesson = {
  id: number
  title: string
  content: string
  createdAt: string
  imageUrl?: string | null
  youtubeUrl?: string | null
  attachmentUrl?: string | null
  attachmentName?: string | null
  createdByUserId: number
  createdByUsername?: string | null
  createdByFullName?: string | null
  createdByIsApproved: boolean
  subjectId: number
  subjectName: string
  grade: number
  section: string
  classDisplay: string
}

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

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

const readStoredDraft = (): LessonDraft | null => {
  if (typeof window === 'undefined') {
    return null
  }

  const rawDraft = window.localStorage.getItem(lessonDraftStorageKey)
  if (!rawDraft) {
    return null
  }

  try {
    return JSON.parse(rawDraft) as LessonDraft
  } catch {
    window.localStorage.removeItem(lessonDraftStorageKey)
    return null
  }
}

const getYoutubeEmbedUrl = (value?: string | null) => {
  if (!value) {
    return null
  }

  try {
    const url = new URL(value)
    if (url.hostname.includes('youtu.be')) {
      const videoId = url.pathname.replace('/', '')
      return videoId ? `https://www.youtube.com/embed/${videoId}` : value
    }
    if (url.searchParams.get('v')) {
      return `https://www.youtube.com/embed/${url.searchParams.get('v')}`
    }
    if (url.pathname.includes('/embed/')) {
      return value
    }
    return value
  } catch {
    return value
  }
}

export function AdminLessonsPage() {
  const storedDraft = readStoredDraft()
  const { user } = useAuth()
  const { showNotification } = useNotification()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [viewingLesson, setViewingLesson] = useState<Lesson | null>(null)
  const [form, setForm] = useState(
    storedDraft?.form ?? {
      title: '',
      content: '',
      subjectId: 0,
      grade: 8,
      section: 'А',
      youtubeUrl: '',
    },
  )
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [existingImageUrl, setExistingImageUrl] = useState(storedDraft?.existingImageUrl ?? '')
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const [existingAttachment, setExistingAttachment] = useState<{ name: string; url: string } | null>(
    storedDraft?.existingAttachment ?? null,
  )
  const [didRestoreDraft] = useState(Boolean(storedDraft))
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
  const [lessonPendingDelete, setLessonPendingDelete] = useState<Lesson | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const canCreate = user?.role === 'Teacher'
  const isEditing = editingId !== null

  const loadData = async () => {
    const [subjectsResponse, lessonsResponse] = await Promise.all([
      apiClient.get<Subject[]>('/subjects'),
      apiClient.get<Lesson[]>('/lessons'),
    ])

    setSubjects(subjectsResponse.data)
    setLessons(lessonsResponse.data)
  }

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => {
    const matchingSubjects = subjects.filter(
      (subject) => subject.grade === form.grade && subject.section === form.section,
    )

    if (!matchingSubjects.length) {
      return
    }

    if (!form.subjectId || !matchingSubjects.some((subject) => subject.id === form.subjectId)) {
      setForm((current) => ({ ...current, subjectId: matchingSubjects[0].id }))
    }
  }, [form.grade, form.section, form.subjectId, subjects])

  const filteredSubjects = useMemo(
    () => subjects.filter((subject) => subject.grade === form.grade && subject.section === form.section),
    [form.grade, form.section, subjects],
  )

  const subjectOptions = useMemo(
    () => Array.from(new Set(lessons.map((lesson) => lesson.subjectName))).sort((left, right) => left.localeCompare(right)),
    [lessons],
  )

  const filteredLessons = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return lessons.filter((lesson) => {
      const matchesSearch =
        !normalizedSearch ||
        lesson.title.toLowerCase().includes(normalizedSearch) ||
        (lesson.createdByFullName ?? lesson.createdByUsername ?? '').toLowerCase().includes(normalizedSearch) ||
        String(lesson.grade).includes(normalizedSearch)

      const matchesGrade = selectedGradeFilter === 'all' || lesson.grade === selectedGradeFilter
      const matchesSection = selectedSectionFilter === 'all' || lesson.section === selectedSectionFilter
      const matchesStatus =
        selectedStatusFilter === 'all' ||
        (selectedStatusFilter === 'active' ? lesson.createdByIsApproved : !lesson.createdByIsApproved)
      const matchesSubject = selectedSubjectFilter === 'all' || lesson.subjectName === selectedSubjectFilter
      const matchesDate = isWithinDateRange(lesson.createdAt, startDateFilter, endDateFilter)

      return matchesSearch && matchesGrade && matchesSection && matchesStatus && matchesSubject && matchesDate
    })
  }, [endDateFilter, lessons, searchTerm, selectedGradeFilter, selectedSectionFilter, selectedStatusFilter, selectedSubjectFilter, startDateFilter])

  const sortedLessons = useMemo(() => {
    const getCreatedBy = (lesson: Lesson) => lesson.createdByFullName ?? lesson.createdByUsername ?? 'Teacher'
    const sortMap = {
      name: {
        getValue: (lesson: Lesson) => lesson.title,
        type: 'text',
      },
      grade: {
        getValue: (lesson: Lesson) => lesson.classDisplay || formatClassDisplay(lesson.grade, lesson.section),
        type: 'alphanumeric',
      },
      createdBy: {
        getValue: getCreatedBy,
        type: 'text',
      },
      createdAt: {
        getValue: (lesson: Lesson) => lesson.createdAt,
        type: 'date',
      },
    } as const

    const selectedSort = sortMap[sortColumn]
    return sortItems(filteredLessons, selectedSort.getValue, sortDirection, selectedSort.type)
  }, [filteredLessons, sortColumn, sortDirection])

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(sortedLessons.length / rowsPerPage) - 1)
    setPage((current) => Math.min(current, maxPage))
  }, [rowsPerPage, sortedLessons.length])

  const paginatedLessons = useMemo(
    () => sortedLessons.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [page, rowsPerPage, sortedLessons],
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

  const previewImageUrl = useMemo(() => {
    if (imagePreview) {
      return imagePreview
    }

    return existingImageUrl ? resolveApiAssetUrl(existingImageUrl) : ''
  }, [existingImageUrl, imagePreview])

  useEffect(() => {
    if (typeof window === 'undefined' || isEditing) {
      return
    }

    const draft: LessonDraft = {
      form,
      existingImageUrl,
      existingAttachment,
    }

    const hasMeaningfulDraft =
      Boolean(form.title.trim()) ||
      Boolean(stripHtml(form.content)) ||
      Boolean(form.youtubeUrl.trim()) ||
      Boolean(existingImageUrl) ||
      Boolean(existingAttachment) ||
      imageFile !== null ||
      attachmentFile !== null

    if (!hasMeaningfulDraft) {
      window.localStorage.removeItem(lessonDraftStorageKey)
      return
    }

    window.localStorage.setItem(lessonDraftStorageKey, JSON.stringify(draft))
  }, [attachmentFile, existingAttachment, existingImageUrl, form, imageFile, isEditing])

  const resetForm = ({ clearStoredDraft = true }: { clearStoredDraft?: boolean } = {}) => {
    setEditingId(null)
    setForm({
      title: '',
      content: '',
      subjectId: 0,
      grade: 8,
      section: 'А',
      youtubeUrl: '',
    })
    setImageFile(null)
    setImagePreview('')
    setExistingImageUrl('')
    setAttachmentFile(null)
    setExistingAttachment(null)

    if (clearStoredDraft && typeof window !== 'undefined') {
      window.localStorage.removeItem(lessonDraftStorageKey)
    }
  }

  const clearImageSelection = () => {
    setImageFile(null)
    setImagePreview('')
    setExistingImageUrl('')
  }

  const clearAttachmentSelection = () => {
    setAttachmentFile(null)
    setExistingAttachment(null)
  }

  const openEditModal = (lesson: Lesson) => {
    setEditingId(lesson.id)
    setForm({
      title: lesson.title,
      content: lesson.content,
      subjectId: lesson.subjectId,
      grade: lesson.grade,
      section: lesson.section,
      youtubeUrl: lesson.youtubeUrl ?? '',
    })
    setExistingImageUrl(lesson.imageUrl ?? '')
    setExistingAttachment(
      lesson.attachmentUrl
        ? {
            name: lesson.attachmentName ?? 'Attachment',
            url: lesson.attachmentUrl,
          }
        : null,
    )
    setImageFile(null)
    setImagePreview('')
    setAttachmentFile(null)
  }

  const closeEditModal = () => {
    resetForm({ clearStoredDraft: false })
  }

  const save = async () => {
    try {
      const payload = {
        ...form,
        title: form.title.trim(),
        youtubeUrl: form.youtubeUrl.trim(),
      }

      const formData = new FormData()
      formData.append('payload', JSON.stringify(payload))
      if (imageFile) {
        formData.append('image', imageFile)
      }
      if (attachmentFile) {
        formData.append('attachment', attachmentFile)
      }

      if (editingId) {
        await apiClient.put(`/lessons/${editingId}`, formData)
        showNotification('Lesson updated.', 'success')
        closeEditModal()
      } else {
        await apiClient.post('/lessons', formData)
        showNotification('Lesson created.', 'success')
        resetForm()
      }

      await loadData()
    } catch (error) {
      showNotification(
        axios.isAxiosError(error) && typeof error.response?.data?.error === 'string'
          ? error.response.data.error
          : 'Failed to save lesson.',
        'error',
      )
    }
  }

  const remove = async (id: number) => {
    try {
      setIsDeleting(true)
      await apiClient.delete(`/lessons/${id}`)
      if (viewingLesson?.id === id) {
        setViewingLesson(null)
      }
      setLessonPendingDelete(null)
      showNotification('Lesson deleted.', 'success')
      await loadData()
    } catch {
      showNotification('Failed to delete lesson.', 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  const renderLessonForm = (mode: 'create' | 'edit') => (
    <div className="grid gap-4">
      {mode === 'create' && didRestoreDraft ? (
        <p className="text-sm text-slate-500">
          Your unsaved lesson draft was restored automatically. Uploaded files need to be selected again if you leave the page.
        </p>
      ) : null}

      <input
        className="rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sky-950 placeholder:text-sky-600/70"
        placeholder="Lesson title"
        value={form.title}
        onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
      />

      <AdminSelectField
        label="Subject"
        value={filteredSubjects.some((subject) => subject.id === form.subjectId) ? String(form.subjectId) : '0'}
        options={
          filteredSubjects.length
            ? filteredSubjects.map((subject) => ({
                value: String(subject.id),
                label: subject.name,
              }))
            : [{ value: '0', label: 'No subjects available' }]
        }
        onChange={(value) => setForm((current) => ({ ...current, subjectId: Number(value) }))}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <AdminSelectField
          label="Grade"
          value={String(form.grade)}
          options={gradeOptions.map((grade) => ({ value: String(grade), label: String(grade) }))}
          onChange={(value) =>
            setForm((current) => ({
              ...current,
              grade: Number(value),
              subjectId: 0,
            }))
          }
        />

        <AdminSelectField
          label="Section"
          value={form.section}
          options={sectionOptions.map((section) => ({ value: section, label: section }))}
          onChange={(value) =>
            setForm((current) => ({
              ...current,
              section: value,
              subjectId: 0,
            }))
          }
        />
      </div>

      {!filteredSubjects.length ? (
        <p className="text-sm text-amber-700">
          No subjects exist for class {formatClassDisplay(form.grade, form.section)} yet. Create the subject first.
        </p>
      ) : null}

      <RichTextEditor
        placeholder="Write a structured lesson with headings, lists, highlighted ideas, and useful links."
        value={form.content}
        onChange={(value) => setForm((current) => ({ ...current, content: value }))}
      />

      <input
        className="rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sky-950 placeholder:text-sky-600/70"
        placeholder="YouTube embed link (optional)"
        value={form.youtubeUrl}
        onChange={(event) => setForm((current) => ({ ...current, youtubeUrl: event.target.value }))}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/50 p-4 text-sm text-slate-600">
          <div className="mb-3 flex items-start justify-between gap-3">
            <span className="flex items-center gap-2 font-semibold text-slate-900">
              <ImagePlus className="h-4 w-4 text-[#2468a0]" />
              Upload lesson image
            </span>
            {imageFile || existingImageUrl ? (
              <button
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-600 transition hover:bg-rose-50"
                type="button"
                onClick={clearImageSelection}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <input
            accept="image/*"
            className="mt-2 block w-full text-sm"
            type="file"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null
              setImageFile(file)
              setImagePreview(file ? URL.createObjectURL(file) : '')
            }}
          />
          {imageFile || existingImageUrl ? (
            <p className="mt-3 text-xs text-slate-500">
              {imageFile ? imageFile.name : 'Current lesson image selected'}
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/50 p-4 text-sm text-slate-600">
          <div className="mb-3 flex items-start justify-between gap-3">
            <span className="flex items-center gap-2 font-semibold text-slate-900">
              <Upload className="h-4 w-4 text-[#2468a0]" />
              Attach PDF
            </span>
            {attachmentFile || existingAttachment ? (
              <button
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-600 transition hover:bg-rose-50"
                type="button"
                onClick={clearAttachmentSelection}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <input
            accept=".pdf"
            className="mt-2 block w-full text-sm"
            type="file"
            onChange={(event) => setAttachmentFile(event.target.files?.[0] ?? null)}
          />
          {attachmentFile || existingAttachment ? (
            <p className="mt-3 text-xs text-slate-500">
              {attachmentFile?.name ?? existingAttachment?.name}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-8">
      <PageHeader
        description={
          canCreate
            ? 'Create richer lessons with formatted content, media, and downloadable resources.'
            : 'Review all lessons across the platform and moderate or edit any content when needed.'
        }
        eyebrow="Lessons"
        title="Lesson Management"
      />

      {canCreate ? (
        <article className="glass-panel p-6">
          <h2 className="text-xl font-semibold text-slate-900">New rich lesson</h2>
          <div className="mt-5 space-y-5">
            {renderLessonForm('create')}
            <div className="flex gap-3">
              <button className="button-primary" type="button" onClick={save}>
                Create lesson
              </button>
              <button className="rounded-2xl border border-slate-200 px-4 py-3" type="button" onClick={() => resetForm()}>
                Clear form
              </button>
            </div>
            {previewImageUrl ? (
              <img
                alt="Lesson preview"
                className="h-56 w-full rounded-3xl object-cover shadow-[0_16px_34px_rgba(36,104,160,0.12)]"
                src={previewImageUrl}
              />
            ) : null}
          </div>
        </article>
      ) : null}

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
              placeholder="Search by title, teacher, or grade..."
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
          </Stack>
        </Stack>

        {filteredLessons.length ? (
          <div className="admin-management-table-shell mt-6">
            <div className="overflow-x-auto">
              <table className="admin-management-table">
                <thead>
                  <tr>
                    <th>
                      <AdminSortHeader
                        label="Lesson Title"
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
                  {paginatedLessons.map((lesson) => (
                    <tr key={lesson.id}>
                      <td>
                        <div className="space-y-2">
                          <p className="font-semibold text-slate-900">{lesson.title}</p>
                          <p className="text-sm text-slate-500">{lesson.subjectName}</p>
                          <p className="text-sm text-slate-500">{stripHtml(lesson.content) || 'No lesson content yet.'}</p>
                        </div>
                      </td>
                      <td>
                        <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-[#2468a0]">
                          {lesson.classDisplay || formatClassDisplay(lesson.grade, lesson.section)}
                        </span>
                      </td>
                      <td>{`Created by ${lesson.createdByFullName ?? lesson.createdByUsername ?? 'Teacher'}`}</td>
                      <td>{formatDateTime(lesson.createdAt)}</td>
                      <td>
                        <div className="flex justify-end gap-2">
                          <button
                            className="admin-management-icon-button"
                            title="View lesson"
                            type="button"
                            onClick={() => setViewingLesson(lesson)}
                          >
                            <VisibilityOutlined sx={{ fontSize: 20 }} />
                          </button>
                          <button
                            className="admin-management-icon-button"
                            title="Edit lesson"
                            type="button"
                            onClick={() => openEditModal(lesson)}
                          >
                            <EditOutlined sx={{ fontSize: 20 }} />
                          </button>
                          <button
                            className="admin-management-icon-button admin-management-icon-button-danger"
                            title="Delete lesson"
                            type="button"
                            onClick={() => setLessonPendingDelete(lesson)}
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
        ) : (
          <div className="admin-management-empty mt-6">
            <h3 className="text-lg font-semibold text-slate-900">No lessons found</h3>
            <p className="mt-2 text-sm text-slate-500">
              Try adjusting the search or filters, or create a lesson first.
            </p>
          </div>
        )}
      </article>

      {viewingLesson ? (
        <div className="admin-management-modal" role="dialog" aria-modal="true" onClick={() => setViewingLesson(null)}>
          <div className="admin-management-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200/80 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2468a0]">Lesson View</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">{viewingLesson.title}</h2>
              </div>
              <button
                aria-label="Close lesson view"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                type="button"
                onClick={() => setViewingLesson(null)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[calc(92vh-96px)] overflow-y-auto px-6 py-6">
              <div className="flex flex-wrap gap-3">
                <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-[#2468a0]">
                  {viewingLesson.classDisplay || formatClassDisplay(viewingLesson.grade, viewingLesson.section)}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  <UserRound className="h-3.5 w-3.5" />
                  {viewingLesson.createdByFullName ?? viewingLesson.createdByUsername ?? 'Teacher'}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {formatDateTime(viewingLesson.createdAt)}
                </span>
                <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {viewingLesson.subjectName}
                </span>
              </div>

              {viewingLesson.imageUrl ? (
                <img
                  alt={viewingLesson.title}
                  className="mt-6 h-72 w-full rounded-3xl object-cover shadow-[0_18px_40px_rgba(36,104,160,0.16)]"
                  src={resolveApiAssetUrl(viewingLesson.imageUrl)}
                />
              ) : null}

              <div
                className="lesson-content mt-6 rounded-3xl border border-blue-100/80 bg-white/90 p-6 shadow-[0_14px_28px_rgba(36,104,160,0.06)]"
                dangerouslySetInnerHTML={{ __html: viewingLesson.content }}
              />

              {viewingLesson.youtubeUrl ? (
                <div className="mt-6 rounded-3xl border border-blue-100/80 bg-blue-50/70 p-5">
                  <span className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <PlayCircle className="h-4 w-4 text-[#0f8b8d]" />
                    YouTube resource
                  </span>
                  <iframe
                    className="h-80 w-full rounded-2xl"
                    src={getYoutubeEmbedUrl(viewingLesson.youtubeUrl) ?? undefined}
                    title={`${viewingLesson.title} video`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : null}

              {viewingLesson.attachmentUrl ? (
                <div className="mt-6 rounded-3xl border border-blue-100/80 bg-blue-50/70 p-5">
                  <span className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <FileText className="h-4 w-4 text-[#2468a0]" />
                    Downloadable resource
                  </span>
                  <a
                    className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-white px-4 py-3 font-semibold text-[#2468a0] transition hover:bg-sky-50"
                    href={resolveApiAssetUrl(viewingLesson.attachmentUrl)}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {viewingLesson.attachmentName ?? 'Open attachment'}
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <DeleteConfirmationModal
        open={Boolean(lessonPendingDelete)}
        title="Delete lesson?"
        description={`This will permanently remove ${lessonPendingDelete?.title ?? 'this lesson'}. This action cannot be undone.`}
        isDeleting={isDeleting}
        onCancel={() => {
          if (!isDeleting) {
            setLessonPendingDelete(null)
          }
        }}
        onConfirm={() => {
          if (lessonPendingDelete) {
            void remove(lessonPendingDelete.id)
          }
        }}
      />

      {isEditing ? (
        <div className="admin-management-modal" role="dialog" aria-modal="true" onClick={closeEditModal}>
          <div className="admin-management-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200/80 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2468a0]">Lesson Edit</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">Edit lesson</h2>
              </div>
              <button
                aria-label="Close lesson editor"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                type="button"
                onClick={closeEditModal}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[calc(92vh-96px)] overflow-y-auto px-6 py-6">
              {renderLessonForm('edit')}
              <div className="mt-6 flex gap-3">
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
