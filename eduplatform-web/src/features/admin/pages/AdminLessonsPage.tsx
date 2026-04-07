import axios from 'axios'
import { FileText, ImagePlus, PlayCircle, Upload, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../app/AuthContext'
import { useNotification } from '../../../app/NotificationContext'
import { formatClassDisplay, gradeOptions, sectionOptions } from '../../../shared/classOptions'
import { PageHeader } from '../../../shared/components/PageHeader'
import { RichTextEditor } from '../../../shared/components/RichTextEditor'
import apiClient, { resolveApiAssetUrl } from '../../../shared/api/axiosInstance'

const lessonDraftStorageKey = 'eduplatform.lessonDraft'

type LessonDraft = {
  editingId: number | null
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
  imageUrl?: string | null
  youtubeUrl?: string | null
  attachmentUrl?: string | null
  attachmentName?: string | null
  createdByUserId: number
  createdByUsername?: string | null
  subjectId: number
  subjectName: string
  grade: number
  section: string
  classDisplay: string
}

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

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

export function AdminLessonsPage() {
  const storedDraft = readStoredDraft()
  const { user } = useAuth()
  const { showNotification } = useNotification()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [editingId, setEditingId] = useState<number | null>(storedDraft?.editingId ?? null)
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
    () =>
      subjects.filter((subject) => subject.grade === form.grade && subject.section === form.section),
    [form.grade, form.section, subjects],
  )

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const draft: LessonDraft = {
      editingId,
      form,
      existingImageUrl,
      existingAttachment,
    }

    const hasMeaningfulDraft =
      Boolean(editingId) ||
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
  }, [attachmentFile, editingId, existingAttachment, existingImageUrl, form, imageFile])

  const previewImageUrl = useMemo(() => {
    if (imagePreview) {
      return imagePreview
    }

    return existingImageUrl ? resolveApiAssetUrl(existingImageUrl) : ''
  }, [existingImageUrl, imagePreview])

  const reset = () => {
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
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(lessonDraftStorageKey)
    }
  }

  const canCreate = user?.role === 'Teacher'

  const clearImageSelection = () => {
    setImageFile(null)
    setImagePreview('')
    setExistingImageUrl('')
  }

  const clearAttachmentSelection = () => {
    setAttachmentFile(null)
    setExistingAttachment(null)
  }

  const save = async () => {
    try {
      const hadPendingFiles = imageFile !== null || attachmentFile !== null
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
        showNotification(
          hadPendingFiles
            ? 'Lesson updated. If you leave later, new files will need to be selected again.'
            : 'Lesson updated.',
          'success',
        )
      } else {
        await apiClient.post('/lessons', formData)
        showNotification(
          hadPendingFiles
            ? 'Lesson created. If you leave later, new files will need to be selected again.'
            : 'Lesson created.',
          'success',
        )
      }

      reset()
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
      await apiClient.delete(`/lessons/${id}`)
      showNotification('Lesson deleted.', 'success')
      await loadData()
    } catch {
      showNotification('Failed to delete lesson.', 'error')
    }
  }

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

      <section className="grid gap-6">
        {canCreate || editingId ? (
        <article className="glass-panel p-6">
          <h2 className="text-xl font-semibold text-slate-900">
            {editingId ? 'Edit rich lesson' : 'New rich lesson'}
          </h2>
          {didRestoreDraft ? (
            <p className="mt-2 text-sm text-slate-500">
              Your unsaved lesson draft was restored automatically. Uploaded files need to be selected again if you leave the page.
            </p>
          ) : null}

          <div className="mt-5 grid gap-4">
            <input
              className="rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sky-950 placeholder:text-sky-600/70"
              placeholder="Lesson title"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />

            <select
              className="rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sky-950"
              value={form.subjectId}
              onChange={(event) =>
                setForm((current) => ({ ...current, subjectId: Number(event.target.value) }))
              }
            >
              {filteredSubjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Grade</label>
                <div className="relative">
                  <select
                    className="w-full appearance-none rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 pr-12 text-sky-950"
                    value={form.grade}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        grade: Number(event.target.value),
                        subjectId: 0,
                      }))
                    }
                  >
                    {gradeOptions.map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sky-800">
                    <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Section</label>
                <div className="relative">
                  <select
                    className="w-full appearance-none rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 pr-12 text-sky-950"
                    value={form.section}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        section: event.target.value,
                        subjectId: 0,
                      }))
                    }
                  >
                    {sectionOptions.map((section) => (
                      <option key={section} value={section}>
                        {section}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sky-800">
                    <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
              </div>
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
              onChange={(event) =>
                setForm((current) => ({ ...current, youtubeUrl: event.target.value }))
              }
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

            <div className="flex gap-3">
              <button className="button-primary" type="button" onClick={save}>
                {editingId ? 'Save changes' : 'Create lesson'}
              </button>
              {editingId ? (
                <button className="rounded-2xl border border-slate-200 px-4 py-3" type="button" onClick={reset}>
                  Cancel
                </button>
              ) : null}
            </div>
          </div>
        </article>
        ) : null}

        <article className="glass-panel p-6">
          <h2 className="text-xl font-semibold text-slate-900">Lesson preview</h2>

          <div className="mt-5 space-y-5">
            {previewImageUrl ? (
              <img
                alt="Lesson preview"
                className="h-56 w-full rounded-3xl object-cover shadow-[0_16px_34px_rgba(36,104,160,0.12)]"
                src={previewImageUrl}
              />
            ) : null}

            <div>
              <h3 className="font-display text-3xl font-bold text-slate-900">
                {form.title || 'Lesson title preview'}
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Rich formatting, media, and learning resources will appear here for students.
              </p>
            </div>

            <div
              className="lesson-content rounded-3xl border border-blue-100/80 bg-white/80 p-5 shadow-[0_14px_28px_rgba(36,104,160,0.06)]"
              dangerouslySetInnerHTML={{
                __html:
                  form.content ||
                  '<p>Add rich lesson content with headings, lists, and links to preview it here.</p>',
              }}
            />

            {form.youtubeUrl ? (
              <div className="rounded-3xl border border-blue-100/80 bg-blue-50/70 p-4 text-sm text-slate-600">
                <span className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
                  <PlayCircle className="h-4 w-4 text-[#0f8b8d]" />
                  YouTube resource
                </span>
                {form.youtubeUrl}
              </div>
            ) : null}

            {attachmentFile || existingAttachment ? (
              <div className="rounded-3xl border border-blue-100/80 bg-blue-50/70 p-4 text-sm text-slate-600">
                <span className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
                  <FileText className="h-4 w-4 text-[#2468a0]" />
                  PDF attachment
                </span>
                {attachmentFile?.name ?? existingAttachment?.name}
              </div>
            ) : null}

            <div className="space-y-3 pt-2">
              {lessons.map((lesson) => (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4" key={lesson.id}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <p className="font-semibold text-slate-900">{lesson.title}</p>
                      <p className="text-sm text-slate-500">
                        {lesson.subjectName}
                      </p>
                      <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-[#2468a0]">
                        {lesson.classDisplay || formatClassDisplay(lesson.grade, lesson.section)}
                      </span>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                        Created by {lesson.createdByUsername ?? 'Teacher'}
                      </p>
                      <p className="line-clamp-3 text-sm text-slate-600">
                        {stripHtml(lesson.content) || 'No lesson description yet.'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
                        type="button"
                        onClick={() => {
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
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white"
                        type="button"
                        onClick={() => void remove(lesson.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>
    </div>
  )
}
