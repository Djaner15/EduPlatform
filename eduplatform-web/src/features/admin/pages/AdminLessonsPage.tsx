import axios from 'axios'
import DeleteOutline from '@mui/icons-material/DeleteOutline'
import EditOutlined from '@mui/icons-material/EditOutlined'
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined'
import Stack from '@mui/material/Stack'
import {
  CalendarClock,
  CheckCircle,
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
import { useBodyScrollLock } from '../../../shared/hooks/useBodyScrollLock'

const lessonDraftStorageKey = 'eduplatform.lessonDraft'

type InsertedLessonImage = {
  name: string
  src: string
}

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
  lastInsertedImage?: InsertedLessonImage | null
  pendingAttachmentName?: string | null
}

const createEmptyLessonForm = (): LessonDraft['form'] => ({
  title: '',
  content: '',
  subjectId: 0,
  grade: 8,
  section: 'А',
  youtubeUrl: '',
})

const hasMeaningfulLessonDraft = (draft: LessonDraft | null) =>
  Boolean(
    draft &&
      (draft.form.title.trim() ||
        stripHtml(draft.form.content) ||
        draft.form.youtubeUrl.trim() ||
        draft.existingAttachment ||
        draft.pendingAttachmentName),
  )

const extractLastInsertedImage = (content: string): InsertedLessonImage | null => {
  const imageTags = [...content.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0])
  const lastImageTag = imageTags.at(-1)

  if (!lastImageTag) {
    return null
  }

  const src = lastImageTag.match(/\bsrc=(["'])(.*?)\1/i)?.[2]
  if (!src) {
    return null
  }

  return {
    src,
    name: lastImageTag.match(/\balt=(["'])(.*?)\1/i)?.[2] || 'Inserted image',
  }
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

const formatDateTime = (value: string | null | undefined, language: string, fallback: string) => {
  if (!value) {
    return fallback
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return fallback
  }

  return new Intl.DateTimeFormat(language === 'bg' ? 'bg-BG' : 'en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const formatSubjectOptionLabel = (subject: Subject) =>
  `${subject.name} · ${formatStoredClassDisplay(subject.classDisplay, subject.grade, subject.section)}`

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
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { showNotification } = useNotification()
  const [searchParams, setSearchParams] = useSearchParams()
  const editorRef = useRef<RichTextEditorHandle | null>(null)
  const titleInputRef = useRef<HTMLInputElement | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [viewingLesson, setViewingLesson] = useState<Lesson | null>(null)
  const [savedDraft, setSavedDraft] = useState<LessonDraft | null>(() => readStoredDraft())
  const [form, setForm] = useState(() => savedDraft?.form ?? createEmptyLessonForm())
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const [existingAttachment, setExistingAttachment] = useState<{ name: string; url: string } | null>(
    savedDraft?.existingAttachment ?? null,
  )
  const [imageUrlInput, setImageUrlInput] = useState('')
  const [lastInsertedImage, setLastInsertedImage] = useState<InsertedLessonImage | null>(
    () => savedDraft?.lastInsertedImage ?? extractLastInsertedImage(savedDraft?.form.content ?? ''),
  )
  const [didRestoreDraft, setDidRestoreDraft] = useState(Boolean(savedDraft))
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
  const isLessonStudioOpen = isCreateModalOpen || isEditing

  useBodyScrollLock(Boolean(viewingLesson) || isLessonStudioOpen)

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
    if (!isLessonStudioOpen) {
      return
    }

    window.setTimeout(() => {
      titleInputRef.current?.focus()
    }, 0)
  }, [isLessonStudioOpen])

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
          label: formatSubjectOptionLabel(subject),
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
    setSearchParams({})
    setSearchTerm('')
    setSelectedGradeFilter('all')
    setSelectedSectionFilter('all')
    setSelectedStatusFilter('all')
    setSelectedSubjectFilter('all')
    setStartDateFilter('')
    setEndDateFilter('')
    setSortColumn('grade')
    setSortDirection('desc')
    setPage(0)
  }

  const contentPlainText = useMemo(() => stripHtml(form.content), [form.content])
  const wordCount = useMemo(() => (contentPlainText ? contentPlainText.split(/\s+/).filter(Boolean).length : 0), [contentPlainText])
  const characterCount = contentPlainText.length
  const youtubeEmbedUrl = useMemo(() => getYoutubeEmbedUrl(form.youtubeUrl), [form.youtubeUrl])
  const youtubeThumbnailUrl = useMemo(() => getYoutubeThumbnailUrl(form.youtubeUrl), [form.youtubeUrl])
  const selectedFormSubject = useMemo(
    () => filteredSubjects.find((subject) => subject.id === form.subjectId) ?? null,
    [filteredSubjects, form.subjectId],
  )
  const draftStatusText = isDraftSaving
    ? t('adminPages.lessons.draftSaving')
    : lastDraftSavedAt
      ? t('adminPages.lessons.draftSavedAt', {
          time: lastDraftSavedAt.toLocaleTimeString(i18n.language === 'bg' ? 'bg-BG' : 'en-GB', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        })
      : t('adminPages.lessons.draftReady')
  const teacherLessons = useMemo(
    () => lessons.filter((lesson) => lesson.createdByUserId === user?.id),
    [lessons, user?.id],
  )
  const currentFormHasDraftContent = useMemo(
    () =>
      Boolean(form.title.trim()) ||
      Boolean(stripHtml(form.content)) ||
      Boolean(form.youtubeUrl.trim()) ||
      Boolean(existingAttachment) ||
      attachmentFile !== null ||
      Boolean(savedDraft?.pendingAttachmentName),
    [attachmentFile, existingAttachment, form.content, form.title, form.youtubeUrl, savedDraft?.pendingAttachmentName],
  )
  const hasSavedDraft = hasMeaningfulLessonDraft(savedDraft)
  const hasDraftInProgress = useMemo(
    () => hasSavedDraft || currentFormHasDraftContent,
    [currentFormHasDraftContent, hasSavedDraft],
  )
  const draftPreviewTitle = savedDraft?.form.title.trim() || t('adminPages.lessons.untitledDraft')
  const draftPreviewSubject = subjects.find((subject) => subject.id === savedDraft?.form.subjectId)
  const draftPreviewSubjectLabel = draftPreviewSubject
    ? formatSubjectOptionLabel(draftPreviewSubject)
    : t('adminPages.lessons.draftSubjectFallback')
  const draftPreviewClass = savedDraft ? formatClassDisplay(savedDraft.form.grade, savedDraft.form.section) : ''
  const draftPreviewWords = savedDraft ? stripHtml(savedDraft.form.content).split(/\s+/).filter(Boolean).length : 0
  const pendingAttachmentName = savedDraft?.pendingAttachmentName ?? null
  const teacherStudioStats = useMemo(
    () => [
      {
        label: 'Total lessons',
        labelKey: 'adminPages.lessons.totalLessons',
        value: teacherLessons.length,
        accent: 'from-cyan-400/20 via-sky-300/14 to-transparent',
      },
      {
        label: 'Drafts',
        labelKey: 'adminPages.lessons.drafts',
        value: hasDraftInProgress ? 1 : 0,
        accent: 'from-amber-300/22 via-orange-200/12 to-transparent',
      },
      {
        label: 'Published',
        labelKey: 'adminPages.lessons.published',
        value: teacherLessons.length,
        accent: 'from-emerald-300/22 via-teal-200/12 to-transparent',
      },
    ],
    [hasDraftInProgress, teacherLessons.length],
  )
  const teacherHeroTitle = activeSubject
    ? t('teacherAddLessonHeroTitle', { subject: activeSubject.name })
    : t('adminPages.lessons.teacherHeroTitle')
  const teacherHeroDescription = activeSubject
    ? t('teacherAddLessonHeroDescription', {
        subject: activeSubject.name,
        classDisplay: formatStoredClassDisplay(activeSubject.classDisplay, activeSubject.grade, activeSubject.section),
      })
    : t('adminPages.lessons.teacherHeroDescription')
  const teacherPrimaryActionLabel = activeSubject
    ? t('addLessonToSubject', { subject: activeSubject.name })
    : t('teacherNewLesson')

  useEffect(() => {
    if (typeof window === 'undefined' || isEditing || !isCreateModalOpen) {
      return
    }

    const draft: LessonDraft = {
      form,
      existingAttachment,
      lastInsertedImage: lastInsertedImage ?? extractLastInsertedImage(form.content),
      pendingAttachmentName: attachmentFile?.name ?? savedDraft?.pendingAttachmentName ?? null,
    }

    if (!currentFormHasDraftContent) {
      window.localStorage.removeItem(lessonDraftStorageKey)
      setSavedDraft(null)
      setLastDraftSavedAt(null)
      setIsDraftSaving(false)
      return
    }

    setIsDraftSaving(true)

    const timeoutId = window.setTimeout(() => {
      window.localStorage.setItem(lessonDraftStorageKey, JSON.stringify(draft))
      setSavedDraft(draft)
      setLastDraftSavedAt(new Date())
      setIsDraftSaving(false)
    }, 500)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [attachmentFile?.name, currentFormHasDraftContent, existingAttachment, form, isCreateModalOpen, isEditing, lastInsertedImage, savedDraft?.pendingAttachmentName])

  const resetForm = ({ clearStoredDraft = true }: { clearStoredDraft?: boolean } = {}) => {
    setEditingId(null)
    setIsCreateModalOpen(false)
    setForm(createEmptyLessonForm())
    setImageUrlInput('')
    setLastInsertedImage(null)
    setAttachmentFile(null)
    setExistingAttachment(null)
    setDidRestoreDraft(false)
    setLastDraftSavedAt(null)
    setIsDraftSaving(false)

    if (clearStoredDraft && typeof window !== 'undefined') {
      window.localStorage.removeItem(lessonDraftStorageKey)
      setSavedDraft(null)
    }
  }

  const clearAttachmentSelection = () => {
    setAttachmentFile(null)
    setExistingAttachment(null)
    setSavedDraft((current) => (current ? { ...current, pendingAttachmentName: null } : current))
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
            name: lesson.attachmentName ?? t('adminPages.lessons.attachmentFallback'),
            url: lesson.attachmentUrl,
          }
        : null,
    )
    setImageUrlInput('')
    setLastInsertedImage(null)
    setAttachmentFile(null)
    setDidRestoreDraft(false)
  }

  const closeEditModal = () => {
    resetForm({ clearStoredDraft: false })
  }

  const openCreateModal = ({ useDraft = true }: { useDraft?: boolean } = {}) => {
    setEditingId(null)
    setImageUrlInput('')
    setLastInsertedImage(null)
    setLastDraftSavedAt(null)
    setIsDraftSaving(false)

    if (useDraft && savedDraft) {
      setForm(savedDraft.form)
      setExistingAttachment(savedDraft.existingAttachment)
      setLastInsertedImage(savedDraft.lastInsertedImage ?? extractLastInsertedImage(savedDraft.form.content))
      setDidRestoreDraft(true)
    } else {
      const nextForm = createEmptyLessonForm()
      if (activeSubject) {
        nextForm.subjectId = activeSubject.id
        nextForm.grade = activeSubject.grade
        nextForm.section = activeSubject.section
      }
      setForm(nextForm)
      setExistingAttachment(null)
      setAttachmentFile(null)
      setDidRestoreDraft(false)

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(lessonDraftStorageKey)
      }
      setSavedDraft(null)
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

    const normalizedSrc = src.trim()
    editorRef.current?.insertImageAtCursor(normalizedSrc, alt)
    setLastInsertedImage({
      name: alt ?? t('adminPages.lessons.insertedImageFallback'),
      src: normalizedSrc,
    })
    setImageUrlInput('')
    showNotification(t('adminPages.lessons.notifications.imageInserted'), 'success')
  }

  const removeLastInsertedImage = () => {
    if (!lastInsertedImage) {
      return
    }

    editorRef.current?.removeImageBySrc(lastInsertedImage.src)
    setLastInsertedImage(null)
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
      if (pendingAttachmentName && !attachmentFile && !existingAttachment) {
        showNotification(t('adminPages.lessons.notifications.reselectPdf'), 'error')
        return
      }

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
        showNotification(t('adminPages.lessons.notifications.updated'), 'success')
        closeEditModal()
      } else {
        await apiClient.post('/lessons', formData)
        showNotification(t('adminPages.lessons.notifications.created'), 'success')
        resetForm()
      }

      await loadData()
    } catch (error) {
      showNotification(
        axios.isAxiosError(error) && typeof error.response?.data?.error === 'string'
          ? error.response.data.error
          : t('adminPages.lessons.notifications.saveFailed'),
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
      showNotification(t('adminPages.lessons.notifications.deleted'), 'success')
      await loadData()
    } catch {
      showNotification(t('adminPages.lessons.notifications.deleteFailed'), 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  const renderLessonForm = (mode: 'create' | 'edit') => (
    <div className="flex flex-col gap-5">
      {mode === 'create' && didRestoreDraft ? (
        <p className="text-sm text-slate-500">
          {t('adminPages.lessons.draftRestored')}
        </p>
      ) : null}

      <div className="rounded-[2rem] border border-slate-200/80 bg-white/92 px-6 py-5 shadow-[0_18px_38px_rgba(36,104,160,0.08)]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">{t('adminPages.lessons.studioTitle')}</h3>
              <p className="mt-1 text-sm text-slate-500">{t('adminPages.lessons.studioDescription')}</p>
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
                {isPreviewVisible ? t('adminPages.lessons.hidePreview') : t('adminPages.lessons.showPreview')}
              </button>
            </div>
          </div>

                  <input
                    ref={titleInputRef}
                    autoFocus
                    type="text"
            className="block w-full rounded-2xl border border-sky-200 bg-sky-50/65 px-5 py-4 text-lg font-semibold text-sky-950 placeholder:text-sky-600/70 shadow-[0_0_0_1px_rgba(186,230,253,0.55)] focus:border-sky-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-100"
            placeholder={t('adminPages.lessons.lessonTitlePlaceholder')}
            value={form.title}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onFocus={(event) => event.stopPropagation()}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          />
        </div>
      </div>

      <div className={`relative z-0 grid min-w-0 gap-0 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/92 ${isPreviewVisible ? 'xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]' : ''}`}>
        <div className="relative z-0 min-w-0 overflow-visible px-6 py-5 xl:border-r xl:border-slate-200/80">
          <div className="grid gap-5">
            <div className="grid min-w-0 gap-4 lg:grid-cols-3">
                <AdminSelectField
                  label={t('common.subject')}
                  value={filteredSubjects.some((subject) => subject.id === form.subjectId) ? String(form.subjectId) : '0'}
                  options={
                    filteredSubjects.length
                      ? filteredSubjects.map((subject) => ({
                          value: String(subject.id),
                          label: formatSubjectOptionLabel(subject),
                        }))
                      : [{ value: '0', label: t('adminPages.lessons.noSubjectsAvailable') }]
                  }
                  onChange={(value) => setForm((current) => ({ ...current, subjectId: Number(value) }))}
                />

                <AdminSelectField
                  label={t('common.grade')}
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
                  label={t('common.section')}
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
                {t('adminPages.lessons.noSubjectsForClass', { classDisplay: formatClassDisplay(form.grade, form.section) })}
              </p>
            ) : null}

            <RichTextEditor
              ref={editorRef}
              placeholder={t('adminPages.lessons.contentPlaceholder')}
              value={form.content}
              onChange={(value) => setForm((current) => ({ ...current, content: value }))}
            />

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50/85 px-4 py-3 text-sm text-slate-600">
              <span>{t('adminPages.lessons.wordCount', { count: wordCount })}</span>
              <span>{t('adminPages.lessons.characterCount', { count: characterCount })}</span>
            </div>

            <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
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
                    {t('adminPages.lessons.insertImageAtCursor')}
                  </span>
                  <p className="mt-1 text-xs text-slate-500">{t('adminPages.lessons.insertImageHelp')}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                <input
                  className="w-full rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm text-sky-950 placeholder:text-sky-600/70"
                  placeholder={t('adminPages.lessons.imageUrlPlaceholder')}
                  value={imageUrlInput}
                  onChange={(event) => setImageUrlInput(event.target.value)}
                />
                <button
                  className="rounded-2xl border border-sky-200 bg-white px-4 py-3 font-semibold text-[#2468a0] transition hover:bg-sky-50"
                  type="button"
                  onClick={() => insertImageIntoEditor(imageUrlInput, 'Inserted lesson image')}
                >
                  {t('adminPages.lessons.insertImage')}
                </button>
              </div>

              <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-sky-300 hover:bg-sky-50/60">
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100/80 text-[#2468a0]">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{t('adminPages.lessons.chooseImageFile')}</p>
                    <p className="text-xs text-slate-500">{t('adminPages.lessons.imageFileTypes')}</p>
                  </div>
                </div>
                <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-[#2468a0]">{t('adminPages.lessons.browse')}</span>
                <input
                  accept="image/*"
                  className="sr-only"
                  type="file"
                  onChange={(event) => void applyImageFile(event.target.files?.[0] ?? null)}
                />
              </label>

              {lastInsertedImage ? (
                <div className="mt-3 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 truncate">
                    {t('adminPages.lessons.imageReadyInEditor', { name: lastInsertedImage.name })}
                  </span>
                  <button
                    aria-label={t('adminPages.lessons.removeInsertedImage')}
                    className="ml-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-white/85 text-emerald-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                    type="button"
                    onClick={removeLastInsertedImage}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </div>

            <div className="rounded-[1.6rem] bg-slate-50/85 p-4 text-sm text-slate-600">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="flex items-center gap-2 font-semibold text-slate-900">
                    <Upload className="h-4 w-4 text-[#2468a0]" />
                    {t('adminPages.lessons.resourcesEyebrow')}
                  </span>
                  <p className="mt-1 text-xs text-slate-500">{t('adminPages.lessons.resourcesHelp')}</p>
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
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#2468a0]">{t('adminPages.lessons.youtubeLink')}</p>
                  <p className="text-xs text-slate-500">{t('adminPages.lessons.youtubeHelp')}</p>
                </div>
                <input
                  className="rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm text-sky-950 placeholder:text-sky-600/70"
                  placeholder={t('adminPages.lessons.youtubePlaceholder')}
                  value={form.youtubeUrl}
                  onChange={(event) => setForm((current) => ({ ...current, youtubeUrl: event.target.value }))}
                />

                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-sky-300 hover:bg-sky-50/60">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100/80 text-[#2468a0]">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{t('adminPages.lessons.uploadPdf')}</p>
                      <p className="text-xs text-slate-500">{t('adminPages.lessons.uploadPdfHelp')}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-[#2468a0]">{t('adminPages.lessons.selectPdf')}</span>
                  <input
                    accept=".pdf"
                    className="sr-only"
                    type="file"
                    onChange={(event) => {
                      const nextFile = event.target.files?.[0] ?? null
                      setAttachmentFile(nextFile)
                      setSavedDraft((current) => (current ? { ...current, pendingAttachmentName: nextFile?.name ?? null } : current))
                    }}
                  />
                </label>
              </div>

              {attachmentFile || existingAttachment || pendingAttachmentName ? (
                <p className={`mt-3 rounded-2xl border px-4 py-3 text-sm ${attachmentFile || existingAttachment ? 'border-sky-200 bg-white text-slate-600' : 'border-amber-200 bg-amber-50/85 text-amber-800'}`}>
                  {attachmentFile?.name ?? existingAttachment?.name ?? pendingAttachmentName}
                  {!attachmentFile && !existingAttachment && pendingAttachmentName ? (
                    <span className="mt-1 block text-xs font-semibold">{t('adminPages.lessons.reselectPdfDraft')}</span>
                  ) : null}
                </p>
              ) : null}
            </div>
          </div>
        </div>
        </div>

        {isPreviewVisible ? (
          <aside className="relative z-0 min-w-0 overflow-hidden px-6 py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{t('adminPages.lessons.livePreview')}</h3>
                <p className="mt-1 text-sm text-slate-500">{t('adminPages.lessons.livePreviewDescription')}</p>
              </div>
              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-[#2468a0]">
                {formatClassDisplay(form.grade, form.section) || t('adminPages.lessons.classFallback')}
              </span>
            </div>

            <div className="mt-5 space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2468a0]">
                  {selectedFormSubject ? formatSubjectOptionLabel(selectedFormSubject) : t('adminPages.lessons.subjectPreview')}
                </p>
                <h2 className="mt-2 break-words text-3xl font-bold text-slate-900">{form.title.trim() || t('adminPages.lessons.titlePreview')}</h2>
              </div>

              <div
                className="lesson-content max-h-[36rem] overflow-y-auto overflow-x-hidden break-words rounded-[1.6rem] bg-slate-50/85 px-5 py-5"
                dangerouslySetInnerHTML={{ __html: form.content || `<p>${t('adminPages.lessons.emptyPreview')}</p>` }}
              />

              {youtubeEmbedUrl || attachmentFile || existingAttachment ? (
                <div className="rounded-[1.6rem] bg-slate-50/85 p-5">
                  <div className="mb-4">
                    <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2468a0]">{t('adminPages.lessons.resourcesEyebrow')}</span>
                    <h4 className="mt-2 text-lg font-semibold text-slate-900">{t('adminPages.lessons.bottomResources')}</h4>
                  </div>

                  <div className="space-y-4">
                    {youtubeEmbedUrl ? (
                      <div className="overflow-hidden rounded-3xl border border-sky-200 bg-white shadow-[0_12px_24px_rgba(36,104,160,0.08)]">
                        {youtubeThumbnailUrl ? (
                          <a className="group relative block" href={form.youtubeUrl} rel="noreferrer" target="_blank">
                            <img alt={t('adminPages.lessons.youtubePreviewAlt')} className="h-40 w-full object-cover" src={youtubeThumbnailUrl} />
                            <span className="absolute inset-0 flex items-center justify-center bg-slate-950/25 transition group-hover:bg-slate-950/35">
                              <span className="inline-flex items-center gap-2 rounded-full bg-white/92 px-4 py-2 text-sm font-semibold text-slate-900">
                                <PlayCircle className="h-4 w-4 text-[#0f8b8d]" />
                                {t('studentPages.lessonDetails.openOnYoutube')}
                              </span>
                            </span>
                          </a>
                        ) : null}
                        <div className="p-4">
                          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                            <PlayCircle className="h-4 w-4 text-[#0f8b8d]" />
                            {t('adminPages.lessons.embeddedVideo')}
                          </p>
                          <iframe
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="aspect-video w-full rounded-2xl"
                            src={youtubeEmbedUrl ?? undefined}
                            title={t('adminPages.lessons.previewVideoTitle')}
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
                          <p className="text-xs text-slate-500">{t('adminPages.lessons.pdfBottomHelp')}</p>
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
            <button className="button-primary inline-flex items-center gap-2 text-sm" type="button" onClick={() => openCreateModal({ useDraft: false })}>
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
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-600">{t('teacherStudio')}</p>
                <h2 className="mt-3 font-display text-4xl font-bold tracking-tight text-slate-900">{teacherHeroTitle}</h2>
                <p className="mt-3 max-w-2xl text-base leading-8 text-slate-600">
                  {teacherHeroDescription}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <button className="button-primary inline-flex items-center gap-2 text-base" type="button" onClick={() => openCreateModal({ useDraft: hasSavedDraft })}>
                  <Plus className="h-5 w-5" />
                  {hasSavedDraft ? t('adminPages.lessons.continueDraft') : teacherPrimaryActionLabel}
                </button>
                <div className="rounded-full border border-cyan-200/70 bg-white/55 px-4 py-2 text-sm font-medium text-slate-600">
                  {hasDraftInProgress ? draftStatusText : t('adminPages.lessons.nextLessonStarts')}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              {teacherStudioStats.map((stat) => (
                <div
                  key={stat.labelKey}
                  className="relative overflow-hidden rounded-[1.5rem] border border-white/60 bg-white/60 px-5 py-4 shadow-[0_16px_34px_rgba(36,104,160,0.08)] backdrop-blur-lg"
                >
                  <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${stat.accent}`} />
                  <div className="relative">
                    <p className="text-sm font-medium text-slate-500">{t(stat.labelKey)}</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {canCreate && hasSavedDraft ? (
        <section className="relative overflow-hidden rounded-[2rem] border border-amber-200/80 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.22),transparent_28%),linear-gradient(135deg,rgba(255,251,235,0.92),rgba(236,254,255,0.86))] p-5 shadow-[0_20px_48px_rgba(217,119,6,0.12)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">{t('adminPages.lessons.draftCardEyebrow')}</p>
              <h2 className="mt-2 truncate text-2xl font-bold text-slate-900">{draftPreviewTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {t('adminPages.lessons.draftCardDescription', {
                  subject: draftPreviewSubjectLabel,
                  classDisplay: draftPreviewClass,
                  words: draftPreviewWords,
                })}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <button className="button-primary inline-flex items-center gap-2 px-5 py-3 text-sm" type="button" onClick={() => openCreateModal({ useDraft: true })}>
                <FileText className="h-4 w-4" />
                {t('adminPages.lessons.continueDraft')}
              </button>
              <button className="modal-outline-button px-5 py-3 text-sm" type="button" onClick={() => openCreateModal({ useDraft: false })}>
                {t('adminPages.lessons.startNewLesson')}
              </button>
              <button className="rounded-2xl border border-rose-200 bg-white/75 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50" type="button" onClick={() => resetForm()}>
                {t('adminPages.lessons.discardDraft')}
              </button>
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
            <button className="button-primary inline-flex items-center gap-2 px-4 py-2.5 text-sm" type="button" onClick={() => openCreateModal({ useDraft: false })}>
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
              ariaLabel={t('adminPages.common.startDate')}
              value={startDateFilter}
              fullWidth={false}
              width={150}
              onChange={setStartDateFilter}
            />
            <AdminDateField
              ariaLabel={t('adminPages.common.endDate')}
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
                      <td>{formatDateTime(lesson.createdAt, i18n.language, t('adminPages.common.unknownDate'))}</td>
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
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2468a0]">{t('adminPages.lessons.viewEyebrow')}</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">{viewingLesson.title}</h2>
              </div>
              <button
                aria-label={t('adminPages.lessons.closeView')}
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
                  {viewingLesson.createdByFullName ?? viewingLesson.createdByUsername ?? t('adminPages.common.unknownTeacher')}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {formatDateTime(viewingLesson.createdAt, i18n.language, t('adminPages.common.unknownDate'))}
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
                    <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2468a0]">{t('adminPages.lessons.resourcesEyebrow')}</span>
                    <h4 className="mt-2 text-lg font-semibold text-slate-900">{t('adminPages.lessons.lessonResources')}</h4>
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
                                {t('studentPages.lessonDetails.openOnYoutube')}
                              </span>
                            </span>
                          </a>
                        ) : null}
                        <div className="p-4">
                          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                            <PlayCircle className="h-4 w-4 text-[#0f8b8d]" />
                            {t('adminPages.lessons.embeddedVideo')}
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
                          <p className="text-sm font-semibold text-slate-900">{viewingLesson.attachmentName ?? t('studentPages.lessonDetails.openLessonAttachment')}</p>
                          <p className="text-xs text-slate-500">{t('adminPages.lessons.openPdfHelp')}</p>
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
        title={t('adminPages.lessons.deleteTitle')}
        description={t('adminPages.lessons.deleteDescription', { title: lessonPendingDelete?.title ?? t('adminPages.lessons.thisLesson') })}
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
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2468a0]">{t('adminPages.lessons.editEyebrow')}</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">{t('adminPages.lessons.editTitle')}</h2>
              </div>
              <button
                aria-label={t('adminPages.lessons.closeEditor')}
                className="modal-close-button inline-flex h-11 w-11 rounded-full"
                type="button"
                onClick={closeEditModal}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 py-6">
              {renderLessonForm('edit')}
            </div>
            <div className="admin-management-modal-footer">
              <button className="button-primary" type="button" onClick={save}>
                {t('adminPages.common.saveChanges')}
              </button>
              <button className="modal-outline-button px-4 py-3" type="button" onClick={closeEditModal}>
                {t('common.cancel')}
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
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2468a0]">{t('adminPages.lessons.studioTitle')}</p>
                <h2 className="mt-2 text-3xl font-bold text-slate-900">{t('adminPages.lessons.createTitle')}</h2>
                <p className="mt-2 text-sm text-slate-500">{t('adminPages.lessons.createDescription')}</p>
              </div>
              <button
                aria-label={t('adminPages.lessons.closeStudio')}
                className="modal-close-button inline-flex h-11 w-11 rounded-full"
                type="button"
                onClick={closeCreateModal}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-8 py-8">
              {renderLessonForm('create')}
            </div>
            <div className="admin-management-modal-footer px-8">
              <button className="button-primary px-5 py-3.5 text-base" type="button" onClick={save}>
                {t('adminPages.lessons.createTitle')}
              </button>
              <button className="modal-outline-button px-5 py-3.5" type="button" onClick={() => resetForm()}>
                {t('adminPages.lessons.clearDraft')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
