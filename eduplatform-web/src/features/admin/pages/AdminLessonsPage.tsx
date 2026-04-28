import axios from 'axios'
import DeleteOutline from '@mui/icons-material/DeleteOutline'
import EditOutlined from '@mui/icons-material/EditOutlined'
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined'
import Stack from '@mui/material/Stack'
import {
  CalendarClock,
  Eye,
  FileText,
  ImageIcon,
  ImagePlus,
  LayoutPanelLeft,
  Plus,
  PlayCircle,
  Upload,
  UserRound,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from '../../../app/AppSettingsContext'
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
import { RichTextEditor, type RichTextEditorHandle } from '../../../shared/components/RichTextEditor'
import { UserAvatar } from '../../../shared/components/UserAvatar'
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

const getYoutubeVideoId = (value?: string | null) => {
  if (!value) {
    return null
  }

  try {
    const url = new URL(value)
    if (url.hostname.includes('youtu.be')) {
      return url.pathname.replace('/', '') || null
    }
    if (url.searchParams.get('v')) {
      return url.searchParams.get('v')
    }
    const embedMatch = url.pathname.match(/\/embed\/([^/?]+)/)
    return embedMatch?.[1] ?? null
  } catch {
    return null
  }
}

const getYoutubeThumbnailUrl = (value?: string | null) => {
  const videoId = getYoutubeVideoId(value)
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null
}

export function AdminLessonsPage() {
  const storedDraft = readStoredDraft()
  const { t } = useTranslation()
  const { user } = useAuth()
  const { showNotification } = useNotification()
  const [searchParams] = useSearchParams()
  const editorRef = useRef<RichTextEditorHandle | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
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
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const [existingAttachment, setExistingAttachment] = useState<{ name: string; url: string } | null>(
    storedDraft?.existingAttachment ?? null,
  )
  const [imageUrlInput, setImageUrlInput] = useState('')
  const [didRestoreDraft] = useState(Boolean(storedDraft))
  const [isPreviewVisible, setIsPreviewVisible] = useState(true)
  const [isDraftSaving, setIsDraftSaving] = useState(false)
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState<Date | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<'all' | number>('all')
  const [selectedSectionFilter, setSelectedSectionFilter] = useState('all')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all')
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')
  const [sortColumn, setSortColumn] = useState<'name' | 'grade' | 'createdBy' | 'createdAt'>('grade')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [lessonPendingDelete, setLessonPendingDelete] = useState<Lesson | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const canCreate = user?.role === 'Teacher'
  const activeSubjectId = Number(searchParams.get('subjectId') ?? 0)
  const canManageLesson = (lesson: Lesson) => user?.role === 'Admin' || lesson.createdByUserId === user?.id
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

  const activeSubject = useMemo(
    () => subjects.find((subject) => subject.id === activeSubjectId) ?? null,
    [activeSubjectId, subjects],
  )

  const subjectOptions = useMemo(
    () =>
      subjects
        .map((subject) => ({
          value: String(subject.id),
          label: `${subject.name} · ${formatStoredClassDisplay(subject.classDisplay, subject.grade, subject.section)}`,
        }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    [subjects],
  )

  useEffect(() => {
    if (!subjects.length) {
      return
    }

    if (activeSubjectId > 0) {
      setSelectedSubjectFilter(subjects.some((subject) => subject.id === activeSubjectId) ? String(activeSubjectId) : 'all')
      return
    }

    setSelectedSubjectFilter('all')
  }, [activeSubjectId, subjects])

  useEffect(() => {
    if (!activeSubject) {
      return
    }

    setSelectedGradeFilter(activeSubject.grade)
    setSelectedSectionFilter(activeSubject.section)
  }, [activeSubject])

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
      const matchesSubject = selectedSubjectFilter === 'all' || String(lesson.subjectId) === selectedSubjectFilter
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
        getValue: (lesson: Lesson) => lesson.grade,
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
    setSortDirection(column === 'createdAt' || column === 'grade' ? 'desc' : 'asc')
  }

  const resetFilters = () => {
    setSearchTerm('')
    setSelectedGradeFilter(activeSubject?.grade ?? 'all')
    setSelectedSectionFilter(activeSubject?.section ?? 'all')
    setSelectedStatusFilter('all')
    setSelectedSubjectFilter(activeSubject ? String(activeSubject.id) : 'all')
    setStartDateFilter('')
    setEndDateFilter('')
    setSortColumn('grade')
    setSortDirection('desc')
  }

  const contentPlainText = useMemo(() => stripHtml(form.content), [form.content])
  const wordCount = useMemo(() => (contentPlainText ? contentPlainText.split(/\s+/).filter(Boolean).length : 0), [contentPlainText])
  const characterCount = contentPlainText.length
  const youtubeEmbedUrl = useMemo(() => getYoutubeEmbedUrl(form.youtubeUrl), [form.youtubeUrl])
  const youtubeThumbnailUrl = useMemo(() => getYoutubeThumbnailUrl(form.youtubeUrl), [form.youtubeUrl])
  const draftStatusText = isDraftSaving
    ? 'Saving...'
    : lastDraftSavedAt
      ? `Draft saved at ${lastDraftSavedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
      : 'Draft autosave is ready'
  const teacherLessons = useMemo(
    () => lessons.filter((lesson) => lesson.createdByUserId === user?.id),
    [lessons, user?.id],
  )
  const hasDraftInProgress = useMemo(
    () =>
      Boolean(storedDraft) ||
      Boolean(form.title.trim()) ||
      Boolean(stripHtml(form.content)) ||
      Boolean(form.youtubeUrl.trim()) ||
      Boolean(existingAttachment),
    [existingAttachment, form.content, form.title, form.youtubeUrl, storedDraft],
  )
  const teacherStudioStats = useMemo(
    () => [
      {
        label: 'Total lessons',
        value: teacherLessons.length,
        accent: 'from-cyan-400/20 via-sky-300/14 to-transparent',
      },
      {
        label: 'Drafts',
        value: hasDraftInProgress ? 1 : 0,
        accent: 'from-amber-300/22 via-orange-200/12 to-transparent',
      },
      {
        label: 'Published',
        value: teacherLessons.length,
        accent: 'from-emerald-300/22 via-teal-200/12 to-transparent',
      },
    ],
    [hasDraftInProgress, teacherLessons.length],
  )
  const teacherHeroTitle = activeSubject
    ? t('teacherAddLessonHeroTitle', { subject: activeSubject.name })
    : 'Create your next masterpiece'
  const teacherHeroDescription = activeSubject
    ? t('teacherAddLessonHeroDescription', {
        subject: activeSubject.name,
        classDisplay: formatStoredClassDisplay(activeSubject.classDisplay, activeSubject.grade, activeSubject.section),
      })
    : 'Shape a polished lesson, attach rich resources, and publish a learning experience that feels clear, visual, and confident.'
  const teacherPrimaryActionLabel = activeSubject
    ? t('addLessonToSubject', { subject: activeSubject.name })
    : t('teacherNewLesson')

  useEffect(() => {
    if (typeof window === 'undefined' || isEditing) {
      return
    }

    const draft: LessonDraft = {
      form,
      existingAttachment,
    }

    const hasMeaningfulDraft =
      Boolean(form.title.trim()) ||
      Boolean(stripHtml(form.content)) ||
      Boolean(form.youtubeUrl.trim()) ||
      Boolean(existingAttachment) ||
      attachmentFile !== null

    if (!hasMeaningfulDraft) {
      window.localStorage.removeItem(lessonDraftStorageKey)
      setLastDraftSavedAt(null)
      setIsDraftSaving(false)
      return
    }

    setIsDraftSaving(true)

    const timeoutId = window.setTimeout(() => {
      window.localStorage.setItem(lessonDraftStorageKey, JSON.stringify(draft))
      setLastDraftSavedAt(new Date())
      setIsDraftSaving(false)
    }, 500)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [attachmentFile, existingAttachment, form, isEditing])

  const resetForm = ({ clearStoredDraft = true }: { clearStoredDraft?: boolean } = {}) => {
    setEditingId(null)
    setIsCreateModalOpen(false)
    setForm({
      title: '',
      content: '',
      subjectId: 0,
      grade: 8,
      section: 'А',
      youtubeUrl: '',
    })
    setImageUrlInput('')
    setAttachmentFile(null)
    setExistingAttachment(null)
    setLastDraftSavedAt(null)
    setIsDraftSaving(false)

    if (clearStoredDraft && typeof window !== 'undefined') {
      window.localStorage.removeItem(lessonDraftStorageKey)
    }
  }

  const clearAttachmentSelection = () => {
    setAttachmentFile(null)
    setExistingAttachment(null)
  }

  const openEditModal = (lesson: Lesson) => {
    setIsCreateModalOpen(false)
    setEditingId(lesson.id)
    setForm({
      title: lesson.title,
      content: lesson.content,
      subjectId: lesson.subjectId,
      grade: lesson.grade,
      section: lesson.section,
      youtubeUrl: lesson.youtubeUrl ?? '',
    })
    setExistingAttachment(
      lesson.attachmentUrl
        ? {
            name: lesson.attachmentName ?? 'Attachment',
            url: lesson.attachmentUrl,
          }
        : null,
    )
    setImageUrlInput('')
    setAttachmentFile(null)
  }

  const closeEditModal = () => {
    resetForm({ clearStoredDraft: false })
  }

  const openCreateModal = () => {
    resetForm({ clearStoredDraft: false })
    if (activeSubject) {
      setForm((current) => ({
        ...current,
        subjectId: activeSubject.id,
        grade: activeSubject.grade,
        section: activeSubject.section,
      }))
    }
    setIsCreateModalOpen(true)
  }

  const closeCreateModal = () => {
    setEditingId(null)
    setIsCreateModalOpen(false)
  }

  const insertImageIntoEditor = (src: string, alt?: string) => {
    if (!src.trim()) {
      return
    }

    editorRef.current?.insertImageAtCursor(src.trim(), alt)
    setImageUrlInput('')
    showNotification('Image inserted into the lesson content.', 'success')
  }

  const applyImageFile = async (file: File | null) => {
    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        insertImageIntoEditor(reader.result, file.name)
      }
    }
    reader.readAsDataURL(file)
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
    <div className="flex flex-col gap-5">
      {mode === 'create' && didRestoreDraft ? (
        <p className="text-sm text-slate-500">
          Your unsaved lesson draft was restored automatically. Uploaded files need to be selected again if you leave the page.
        </p>
      ) : null}

      <div className="rounded-[2rem] border border-slate-200/80 bg-white/92 px-6 py-5 shadow-[0_18px_38px_rgba(36,104,160,0.08)]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Lesson Studio</h3>
              <p className="mt-1 text-sm text-slate-500">Write, preview, and polish the lesson exactly as students will see it.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isDraftSaving ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-[#2468a0]'}`}>
                {draftStatusText}
              </span>
              <button
                className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-white px-4 py-2.5 text-sm font-semibold text-sky-900 transition hover:border-sky-300 hover:bg-sky-50"
                type="button"
                onClick={() => setIsPreviewVisible((current) => !current)}
              >
                {isPreviewVisible ? <LayoutPanelLeft className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {isPreviewVisible ? 'Hide Preview' : 'Show Preview'}
              </button>
            </div>
          </div>

          <input
            autoFocus
            type="text"
            className="block w-full rounded-2xl border border-sky-200 bg-sky-50/65 px-5 py-4 text-lg font-semibold text-sky-950 placeholder:text-sky-600/70 shadow-[0_0_0_1px_rgba(186,230,253,0.55)] focus:border-sky-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-100"
            placeholder="Lesson title"
            value={form.title}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onFocus={(event) => event.stopPropagation()}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          />
        </div>
      </div>

      <div className={`relative z-0 grid gap-0 overflow-visible rounded-[2rem] border border-slate-200/80 bg-white/92 ${isPreviewVisible ? 'xl:grid-cols-2' : ''}`}>
        <div className="relative z-0 overflow-visible px-6 py-5 xl:border-r xl:border-slate-200/80">
          <div className="grid gap-5">
            <div className="grid gap-4 lg:grid-cols-3">
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

                <AdminSelectField
                  label="Grade"
                  value={String(form.grade)}
                  options={gradeOptions.map((grade) => ({ value: String(grade), label: formatGradeDisplay(grade) }))}
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
              ref={editorRef}
              placeholder="Write a structured lesson with headings, lists, highlighted ideas, and useful links."
              value={form.content}
              onChange={(value) => setForm((current) => ({ ...current, content: value }))}
            />

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50/85 px-4 py-3 text-sm text-slate-600">
              <span>{wordCount} words</span>
              <span>{characterCount} characters</span>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
            <div
              className="rounded-[1.6rem] bg-slate-50/85 p-4 text-sm text-slate-600"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                void applyImageFile(event.dataTransfer.files?.[0] ?? null)
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="flex items-center gap-2 font-semibold text-slate-900">
                    <ImagePlus className="h-4 w-4 text-[#2468a0]" />
                    Insert image at cursor
                  </span>
                  <p className="mt-1 text-xs text-slate-500">Drop a file or paste a URL and it will be inserted exactly where the cursor is in the editor.</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                <input
                  className="w-full rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm text-sky-950 placeholder:text-sky-600/70"
                  placeholder="Paste image URL and click Insert image"
                  value={imageUrlInput}
                  onChange={(event) => setImageUrlInput(event.target.value)}
                />
                <button
                  className="rounded-2xl border border-sky-200 bg-white px-4 py-3 font-semibold text-[#2468a0] transition hover:bg-sky-50"
                  type="button"
                  onClick={() => insertImageIntoEditor(imageUrlInput, 'Inserted lesson image')}
                >
                  Insert image
                </button>
              </div>

              <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-sky-300 hover:bg-sky-50/60">
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100/80 text-[#2468a0]">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Choose image file</p>
                    <p className="text-xs text-slate-500">PNG, JPG, WEBP and more</p>
                  </div>
                </div>
                <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-[#2468a0]">Browse</span>
                <input
                  accept="image/*"
                  className="sr-only"
                  type="file"
                  onChange={(event) => void applyImageFile(event.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            <div className="rounded-[1.6rem] bg-slate-50/85 p-4 text-sm text-slate-600">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="flex items-center gap-2 font-semibold text-slate-900">
                    <Upload className="h-4 w-4 text-[#2468a0]" />
                    Resources & Attachments
                  </span>
                  <p className="mt-1 text-xs text-slate-500">Keep PDFs and YouTube links in a dedicated bottom section instead of mixing them into the lesson text.</p>
                </div>
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

              <div className="mt-4 grid gap-3">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#2468a0]">YouTube video link</p>
                  <p className="text-xs text-slate-500">Paste the lesson video URL here to show it in the bottom resources section.</p>
                </div>
                <input
                  className="rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm text-sky-950 placeholder:text-sky-600/70"
                  placeholder="Paste YouTube link for the resources section"
                  value={form.youtubeUrl}
                  onChange={(event) => setForm((current) => ({ ...current, youtubeUrl: event.target.value }))}
                />

                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-sky-300 hover:bg-sky-50/60">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100/80 text-[#2468a0]">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Upload PDF handout</p>
                      <p className="text-xs text-slate-500">Students will open it from the resources section</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-[#2468a0]">Select PDF</span>
                  <input
                    accept=".pdf"
                    className="sr-only"
                    type="file"
                    onChange={(event) => setAttachmentFile(event.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              {attachmentFile || existingAttachment ? (
                <p className="mt-3 rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm text-slate-600">
                  {attachmentFile?.name ?? existingAttachment?.name}
                </p>
              ) : null}
            </div>
          </div>
        </div>
        </div>

        {isPreviewVisible ? (
          <aside className="relative z-0 overflow-visible px-6 py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Live Preview</h3>
                <p className="mt-1 text-sm text-slate-500">This is how the lesson will appear to students.</p>
              </div>
              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-[#2468a0]">
                {formatClassDisplay(form.grade, form.section) || 'Class'}
              </span>
            </div>

            <div className="mt-5 space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2468a0]">{filteredSubjects.find((subject) => subject.id === form.subjectId)?.name ?? 'Subject preview'}</p>
                <h2 className="mt-2 break-words text-3xl font-bold text-slate-900">{form.title.trim() || 'Lesson title preview'}</h2>
              </div>

              <div
                className="lesson-content overflow-hidden break-words rounded-[1.6rem] bg-slate-50/85 px-5 py-5"
                dangerouslySetInnerHTML={{ __html: form.content || '<p>Start writing to see your lesson preview here.</p>' }}
              />

              {youtubeEmbedUrl || attachmentFile || existingAttachment ? (
                <div className="rounded-[1.6rem] bg-slate-50/85 p-5">
                  <div className="mb-4">
                    <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2468a0]">Resources & Attachments</span>
                    <h4 className="mt-2 text-lg font-semibold text-slate-900">Bottom lesson resources</h4>
                  </div>

                  <div className="space-y-4">
                    {youtubeEmbedUrl ? (
                      <div className="overflow-hidden rounded-3xl border border-sky-200 bg-white shadow-[0_12px_24px_rgba(36,104,160,0.08)]">
                        {youtubeThumbnailUrl ? (
                          <a className="group relative block" href={form.youtubeUrl} rel="noreferrer" target="_blank">
                            <img alt="YouTube preview thumbnail" className="h-40 w-full object-cover" src={youtubeThumbnailUrl} />
                            <span className="absolute inset-0 flex items-center justify-center bg-slate-950/25 transition group-hover:bg-slate-950/35">
                              <span className="inline-flex items-center gap-2 rounded-full bg-white/92 px-4 py-2 text-sm font-semibold text-slate-900">
                                <PlayCircle className="h-4 w-4 text-[#0f8b8d]" />
                                Open on YouTube
                              </span>
                            </span>
                          </a>
                        ) : null}
                        <div className="p-4">
                          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                            <PlayCircle className="h-4 w-4 text-[#0f8b8d]" />
                            Embedded video
                          </p>
                          <iframe
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="aspect-video w-full rounded-2xl"
                            src={youtubeEmbedUrl ?? undefined}
                            title="Lesson preview video"
                          />
                        </div>
                      </div>
                    ) : null}

                    {attachmentFile || existingAttachment ? (
                      <div className="flex items-center gap-4 rounded-3xl border border-sky-200 bg-white p-4 shadow-[0_12px_24px_rgba(36,104,160,0.08)]">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100/90 text-[#2468a0]">
                          <FileText className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{attachmentFile?.name ?? existingAttachment?.name}</p>
                          <p className="text-xs text-slate-500">PDF handout shown at the bottom of the lesson.</p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  )

  return (
    <div className="space-y-8">
      <PageHeader
        description={
          canCreate
            ? t('adminPages.lessons.descriptionTeacher')
            : t('adminPages.lessons.descriptionAdmin')
        }
        eyebrow={t('adminPages.lessons.eyebrow')}
        title={t('adminPages.lessons.title')}
      />

      {canCreate && activeSubject ? (
        <div className="rounded-[1.7rem] border border-cyan-200/80 bg-white/68 px-5 py-4 shadow-[0_16px_34px_rgba(36,104,160,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-600">
            {t('filteredSubjectLessonsEyebrow')}
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{activeSubject.name}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {formatStoredClassDisplay(activeSubject.classDisplay, activeSubject.grade, activeSubject.section)}
              </p>
            </div>
            <button className="button-primary inline-flex items-center gap-2 text-sm" type="button" onClick={openCreateModal}>
              <Plus className="h-4 w-4" />
              {t('addLessonToSubject', { subject: activeSubject.name })}
            </button>
          </div>
        </div>
      ) : null}

      {canCreate ? (
        <section className="overflow-hidden rounded-[2rem] border border-white/60 bg-[radial-gradient(circle_at_top_left,rgba(64,224,208,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(125,211,252,0.18),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.84)_0%,rgba(236,254,255,0.9)_52%,rgba(240,249,255,0.88)_100%)] p-6 shadow-[0_24px_60px_rgba(45,212,191,0.12)] backdrop-blur-xl">
          <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr] xl:items-center">
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-600">Teacher Studio</p>
                <h2 className="mt-3 font-display text-4xl font-bold tracking-tight text-slate-900">{teacherHeroTitle}</h2>
                <p className="mt-3 max-w-2xl text-base leading-8 text-slate-600">
                  {teacherHeroDescription}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <button className="button-primary inline-flex items-center gap-2 text-base" type="button" onClick={openCreateModal}>
                  <Plus className="h-5 w-5" />
                  {teacherPrimaryActionLabel}
                </button>
                <div className="rounded-full border border-cyan-200/70 bg-white/55 px-4 py-2 text-sm font-medium text-slate-600">
                  {hasDraftInProgress ? draftStatusText : 'Your next lesson starts here'}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              {teacherStudioStats.map((stat) => (
                <div
                  key={stat.label}
                  className="relative overflow-hidden rounded-[1.5rem] border border-white/60 bg-white/60 px-5 py-4 shadow-[0_16px_34px_rgba(36,104,160,0.08)] backdrop-blur-lg"
                >
                  <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${stat.accent}`} />
                  <div className="relative">
                    <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <article className="glass-panel p-7">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{t('adminPages.lessons.libraryTitle')}</h2>
            <p className="mt-1 text-sm text-slate-500">{t('adminPages.lessons.libraryDescription')}</p>
          </div>
          {canCreate && activeSubject ? (
            <button className="button-primary inline-flex items-center gap-2 px-4 py-2.5 text-sm" type="button" onClick={openCreateModal}>
              {t('addLessonToSubject', { subject: activeSubject.name })}
            </button>
          ) : null}
        </div>

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
              placeholder={t('adminPages.lessons.searchPlaceholder')}
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
                ...subjectOptions,
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
              <table className="admin-management-table text-[0.92rem]">
                <thead>
                  <tr>
                    <th>
                      <AdminSortHeader
                        label={t('adminPages.lessons.tableTitle')}
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
                  {paginatedLessons.map((lesson) => (
                    <tr key={lesson.id}>
                      <td>
                        <p className="font-semibold text-slate-900">{lesson.title}</p>
                      </td>
                      <td>
                        <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-[#2468a0]">
                          {formatStoredClassDisplay(lesson.classDisplay, lesson.grade, lesson.section)}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <UserAvatar
                            fullName={lesson.createdByFullName}
                            size={24}
                            username={lesson.createdByUsername}
                          />
                          <span>{`${t('adminPages.common.createdBy')} ${lesson.createdByFullName ?? lesson.createdByUsername ?? t('adminPages.common.unknownTeacher')}`}</span>
                        </div>
                      </td>
                      <td>{formatDateTime(lesson.createdAt)}</td>
                      <td>
                        <div className="flex justify-end gap-2">
                          <button
                            className="admin-management-icon-button"
                            title={t('adminPages.common.view')}
                            type="button"
                            onClick={() => setViewingLesson(lesson)}
                          >
                            <VisibilityOutlined sx={{ fontSize: 20 }} />
                          </button>
                          {canManageLesson(lesson) ? (
                            <>
                              <button
                                className="admin-management-icon-button"
                                title={t('adminPages.common.edit')}
                                type="button"
                                onClick={() => openEditModal(lesson)}
                              >
                                <EditOutlined sx={{ fontSize: 20 }} />
                              </button>
                              <button
                                className="admin-management-icon-button admin-management-icon-button-danger"
                                title={t('adminPages.common.delete')}
                                type="button"
                                onClick={() => setLessonPendingDelete(lesson)}
                              >
                                <DeleteOutline sx={{ fontSize: 20 }} />
                              </button>
                            </>
                          ) : null}
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
            <h3 className="text-lg font-semibold text-slate-900">{t('adminPages.lessons.emptyTitle')}</h3>
            <p className="mt-2 text-sm text-slate-500">
              {t('adminPages.lessons.emptyDescription')}
            </p>
          </div>
        )}
      </article>

      {viewingLesson ? (
        <div className="admin-management-modal" role="dialog" aria-modal="true" onClick={() => setViewingLesson(null)}>
          <div className="admin-management-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="admin-management-modal-header flex items-center justify-between px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2468a0]">Lesson View</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">{viewingLesson.title}</h2>
              </div>
              <button
                aria-label="Close lesson view"
                className="modal-close-button inline-flex h-11 w-11 rounded-full"
                type="button"
                onClick={() => setViewingLesson(null)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[calc(92vh-96px)] overflow-y-auto px-6 py-6">
              <div className="flex flex-wrap gap-3">
                <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-[#2468a0]">
                  {formatStoredClassDisplay(viewingLesson.classDisplay, viewingLesson.grade, viewingLesson.section)}
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

              <div
                className="lesson-content mt-6 rounded-3xl border border-blue-100/80 bg-white/90 p-6 shadow-[0_14px_28px_rgba(36,104,160,0.06)]"
                dangerouslySetInnerHTML={{ __html: viewingLesson.content }}
              />

              {viewingLesson.youtubeUrl || viewingLesson.attachmentUrl ? (
                <div className="mt-6 rounded-3xl border border-blue-100/80 bg-blue-50/70 p-5">
                  <div className="mb-4">
                    <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2468a0]">Resources & Attachments</span>
                    <h4 className="mt-2 text-lg font-semibold text-slate-900">Lesson resources</h4>
                  </div>

                  <div className="space-y-4">
                    {viewingLesson.youtubeUrl ? (
                      <div className="overflow-hidden rounded-3xl border border-sky-200 bg-white shadow-[0_12px_24px_rgba(36,104,160,0.08)]">
                        {getYoutubeThumbnailUrl(viewingLesson.youtubeUrl) ? (
                          <a className="group relative block" href={viewingLesson.youtubeUrl} rel="noreferrer" target="_blank">
                            <img
                              alt={`${viewingLesson.title} video thumbnail`}
                              className="h-44 w-full object-cover"
                              src={getYoutubeThumbnailUrl(viewingLesson.youtubeUrl) ?? undefined}
                            />
                            <span className="absolute inset-0 flex items-center justify-center bg-slate-950/25 transition group-hover:bg-slate-950/35">
                              <span className="inline-flex items-center gap-2 rounded-full bg-white/92 px-4 py-2 text-sm font-semibold text-slate-900">
                                <PlayCircle className="h-4 w-4 text-[#0f8b8d]" />
                                Open on YouTube
                              </span>
                            </span>
                          </a>
                        ) : null}
                        <div className="p-4">
                          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                            <PlayCircle className="h-4 w-4 text-[#0f8b8d]" />
                            Embedded video
                          </p>
                          <iframe
                            className="aspect-video w-full rounded-2xl"
                            src={getYoutubeEmbedUrl(viewingLesson.youtubeUrl) ?? undefined}
                            title={`${viewingLesson.title} video`}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      </div>
                    ) : null}

                    {viewingLesson.attachmentUrl ? (
                      <a
                        className="flex items-center gap-4 rounded-3xl border border-sky-200 bg-white p-4 text-slate-800 shadow-[0_12px_24px_rgba(36,104,160,0.08)] transition hover:bg-sky-50"
                        href={resolveApiAssetUrl(viewingLesson.attachmentUrl)}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100/90 text-[#2468a0]">
                          <FileText className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{viewingLesson.attachmentName ?? 'Open attachment'}</p>
                          <p className="text-xs text-slate-500">Open the PDF handout in a new tab.</p>
                        </div>
                      </a>
                    ) : null}
                  </div>
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
          <div className="admin-management-modal-card lesson-studio-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="admin-management-modal-header flex items-center justify-between px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2468a0]">Lesson Edit</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">Edit lesson</h2>
              </div>
              <button
                aria-label="Close lesson editor"
                className="modal-close-button inline-flex h-11 w-11 rounded-full"
                type="button"
                onClick={closeEditModal}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex flex-1 flex-col overflow-hidden px-6 py-6">
              {renderLessonForm('edit')}
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
        <div className="admin-management-modal" role="dialog" aria-modal="true" onClick={closeCreateModal}>
          <div className="admin-management-modal-card lesson-studio-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="admin-management-modal-header flex items-center justify-between px-8 py-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2468a0]">Lesson Studio</p>
                <h2 className="mt-2 text-3xl font-bold text-slate-900">Create lesson</h2>
                <p className="mt-2 text-sm text-slate-500">Draft a polished lesson with rich content, live preview, and media support.</p>
              </div>
              <button
                aria-label="Close lesson studio"
                className="modal-close-button inline-flex h-11 w-11 rounded-full"
                type="button"
                onClick={closeCreateModal}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex flex-1 flex-col overflow-hidden px-8 py-8">
              {renderLessonForm('create')}
            </div>
            <div className="admin-management-modal-footer px-8">
              <button className="button-primary px-5 py-3.5 text-base" type="button" onClick={save}>
                Create lesson
              </button>
              <button className="modal-outline-button px-5 py-3.5" type="button" onClick={() => resetForm()}>
                Clear draft
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
