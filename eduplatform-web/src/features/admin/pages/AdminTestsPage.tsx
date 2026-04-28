import axios from 'axios'
import DeleteOutline from '@mui/icons-material/DeleteOutline'
import EditOutlined from '@mui/icons-material/EditOutlined'
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined'
import Stack from '@mui/material/Stack'
import { FileQuestion, ImagePlus, ListPlus, Loader2, PlusCircle, Sparkles, Trash2, Type } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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
import { UserAvatar } from '../../../shared/components/UserAvatar'
import apiClient, { resolveApiAssetUrl } from '../../../shared/api/axiosInstance'
import { isWithinDateRange } from '../../../shared/dateFilters'
import { sortItems, type SortDirection } from '../../../shared/tableSorting'

type Lesson = {
  id: number
  title: string
  subjectName: string
  grade: number
  section: string
  classDisplay: string
}

type TestQuestion = {
  id: number
  text: string
  type: 'multiple-choice' | 'text' | 'true-false'
  imageUrl?: string | null
  correctTextAnswer?: string | null
  answers: Array<{ id: number; text: string; isCorrect: boolean }>
}

type TestItem = {
  id: number
  title: string
  createdAt: string
  lessonId: number
  lessonTitle: string
  subjectName: string
  grade: number
  section: string
  classDisplay: string
  createdByUserId: number
  createdByUsername?: string | null
  createdByFullName?: string | null
  createdByIsApproved: boolean
  questions: TestQuestion[]
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

type AnswerDraft = {
  text: string
  isCorrect: boolean
}

type QuestionDraft = {
  clientKey: string
  text: string
  type: 'multiple-choice' | 'text' | 'true-false'
  answers: AnswerDraft[]
  correctTextAnswer: string
  imageFile: File | null
  imagePreview: string
  existingImageUrl: string
}

type AiGeneratedTest = {
  title: string
  questions: Array<{
    text: string
    answers: Array<{ text: string; isCorrect: boolean }>
  }>
}

const createBlankQuestion = (): QuestionDraft => ({
  clientKey: crypto.randomUUID(),
  text: '',
  type: 'multiple-choice',
  answers: [
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
  ],
  correctTextAnswer: '',
  imageFile: null,
  imagePreview: '',
  existingImageUrl: '',
})

export function AdminTestsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { showNotification } = useNotification()
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [tests, setTests] = useState<TestItem[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [lessonId, setLessonId] = useState(0)
  const [grade, setGrade] = useState(8)
  const [section, setSection] = useState('А')
  const [questions, setQuestions] = useState<QuestionDraft[]>([createBlankQuestion()])
  const [aiTopic, setAiTopic] = useState('')
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [aiQuestionCount, setAiQuestionCount] = useState(5)
  const [isGeneratingAiTest, setIsGeneratingAiTest] = useState(false)
  const [aiDraftLoaded, setAiDraftLoaded] = useState(false)
  const [viewingTest, setViewingTest] = useState<TestItem | null>(null)
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
  const [testPendingDelete, setTestPendingDelete] = useState<TestItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadData = async () => {
    const [lessonsResponse, testsResponse] = await Promise.all([
      apiClient.get<Lesson[]>('/lessons'),
      apiClient.get<TestItem[]>('/tests'),
    ])

    setLessons(lessonsResponse.data)
    setTests(testsResponse.data)
    if (!lessonId && lessonsResponse.data.length) {
      setLessonId(lessonsResponse.data[0].id)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const resetTestForm = () => {
    setEditingId(null)
    setTitle('')
    setQuestions([createBlankQuestion()])
    setAiDraftLoaded(false)
    setGrade(8)
    setSection('А')
    setLessonId(0)
  }

  const normalizedQuestions = useMemo(
    () =>
      questions.map((question) => ({
        clientKey: question.clientKey,
        text: question.text.trim(),
        type: question.type,
        imageKey: question.imageFile ? `question-image-${question.clientKey}` : '',
        correctTextAnswer: question.correctTextAnswer.trim(),
        answers:
          question.type === 'text'
            ? []
            : question.type === 'true-false'
              ? [
                  { text: 'True', isCorrect: question.answers[0]?.isCorrect ?? true },
                  { text: 'False', isCorrect: question.answers[1]?.isCorrect ?? false },
                ]
              : question.answers.map((answer) => ({
                  text: answer.text.trim(),
                  isCorrect: answer.isCorrect,
                })),
      })),
    [questions],
  )

  const filteredLessons = useMemo(
    () =>
      lessons.filter((lesson) => lesson.grade === grade && lesson.section === section),
    [grade, lessons, section],
  )

  const visibleTests = useMemo(() => {
    if (user?.role === 'Admin') {
      return tests
    }

    if (user?.role === 'Teacher') {
      return tests.filter((test) => test.createdByUserId === user.id)
    }

    return []
  }, [tests, user])

  const subjectOptions = useMemo(
    () => Array.from(new Set(visibleTests.map((test) => test.subjectName))).sort((left, right) => left.localeCompare(right)),
    [visibleTests],
  )

  const filteredTests = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return visibleTests.filter((test) => {
      const matchesSearch =
        !normalizedSearch ||
        test.title.toLowerCase().includes(normalizedSearch) ||
        (test.createdByFullName ?? test.createdByUsername ?? '').toLowerCase().includes(normalizedSearch) ||
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
  }, [endDateFilter, searchTerm, selectedGradeFilter, selectedSectionFilter, selectedStatusFilter, selectedSubjectFilter, startDateFilter, visibleTests])

  const sortedTests = useMemo(() => {
    const getCreatedBy = (test: TestItem) => test.createdByFullName ?? test.createdByUsername ?? 'Teacher'
    const sortMap = {
      name: {
        getValue: (test: TestItem) => test.title,
        type: 'text',
      },
      grade: {
        getValue: (test: TestItem) => test.classDisplay || formatClassDisplay(test.grade, test.section),
        type: 'alphanumeric',
      },
      createdBy: {
        getValue: getCreatedBy,
        type: 'text',
      },
      createdAt: {
        getValue: (test: TestItem) => test.createdAt,
        type: 'date',
      },
    } as const

    const selectedSort = sortMap[sortColumn]
    return sortItems(filteredTests, selectedSort.getValue, sortDirection, selectedSort.type)
  }, [filteredTests, sortColumn, sortDirection])

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(sortedTests.length / rowsPerPage) - 1)
    setPage((current) => Math.min(current, maxPage))
  }, [rowsPerPage, sortedTests.length])

  const paginatedTests = useMemo(
    () => sortedTests.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [page, rowsPerPage, sortedTests],
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

  useEffect(() => {
    if (!filteredLessons.length) {
      return
    }

    if (!lessonId || !filteredLessons.some((lesson) => lesson.id === lessonId)) {
      setLessonId(filteredLessons[0].id)
    }
  }, [filteredLessons, lessonId])

  const saveTest = async () => {
    try {
      const formData = new FormData()
      formData.append(
        'payload',
        JSON.stringify({
          title: title.trim(),
          lessonId,
          grade,
          section,
          questions: normalizedQuestions,
        }),
      )

      questions.forEach((question) => {
        if (question.imageFile) {
          formData.append(`question-image-${question.clientKey}`, question.imageFile)
        }
      })

      if (editingId) {
        await apiClient.put(`/tests/${editingId}`, formData)
        showNotification('Test updated.', 'success')
      } else {
        await apiClient.post('/tests', formData)
        showNotification('Test created.', 'success')
      }

      resetTestForm()
      await loadData()
    } catch (error) {
      showNotification(
        axios.isAxiosError(error) && typeof error.response?.data?.error === 'string'
          ? error.response.data.error
          : 'Failed to save test.',
        'error',
      )
    }
  }

  const deleteTest = async (id: number) => {
    try {
      setIsDeleting(true)
      await apiClient.delete(`/tests/${id}`)
      if (viewingTest?.id === id) {
        setViewingTest(null)
      }
      setTestPendingDelete(null)
      showNotification('Test deleted.', 'success')
      await loadData()
    } catch {
      showNotification('Failed to delete test.', 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  const updateQuestion = (clientKey: string, updater: (question: QuestionDraft) => QuestionDraft) => {
    setQuestions((current) => current.map((item) => (item.clientKey === clientKey ? updater(item) : item)))
  }

  const applyAiDraft = (draft: AiGeneratedTest) => {
    setEditingId(null)
    setTitle(draft.title.trim())
    setQuestions(
      draft.questions.map((question) => ({
        clientKey: crypto.randomUUID(),
        text: question.text,
        type: 'multiple-choice',
        answers: question.answers.map((answer) => ({
          text: answer.text,
          isCorrect: answer.isCorrect,
        })),
        correctTextAnswer: '',
        imageFile: null,
        imagePreview: '',
        existingImageUrl: '',
      })),
    )
    setAiDraftLoaded(true)
  }

  const generateTestWithAi = async () => {
    if (!aiTopic.trim()) {
      showNotification('Enter a topic before generating a test.', 'error')
      return
    }

    setIsGeneratingAiTest(true)

    try {
      const { data } = await apiClient.post<AiGeneratedTest>('/ai/generate-test', {
        topic: aiTopic.trim(),
        difficulty: aiDifficulty,
        questionCount: aiQuestionCount,
      })

      applyAiDraft(data)
      showNotification('AI test draft generated. Review and edit it before saving.', 'success')
    } catch (error) {
      showNotification(
        axios.isAxiosError(error) && typeof error.response?.data?.message === 'string'
          ? error.response.data.message
          : axios.isAxiosError(error) && typeof error.response?.data?.error === 'string'
            ? error.response.data.error
            : 'Failed to generate the AI test draft.',
        'error',
      )
    } finally {
      setIsGeneratingAiTest(false)
    }
  }

  const isAdmin = user?.role === 'Admin'
  const isTeacher = user?.role === 'Teacher'

  return (
    <div className="space-y-8">
      <PageHeader
        description={
          isTeacher
            ? t('adminPages.tests.descriptionTeacher')
            : t('adminPages.tests.descriptionAdmin')
        }
        eyebrow={t('adminPages.tests.eyebrow')}
        title={t('adminPages.tests.title')}
      />

      <section
        className={
          isTeacher || editingId
            ? 'grid gap-6 xl:grid-cols-[0.55fr_0.45fr]'
            : 'w-full'
        }
      >
        <div className="space-y-6">
          {isTeacher ? (
            <article className="glass-panel p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.26em] text-[#2468a0]">
                    <Sparkles className="h-4 w-4" />
                    Generate Test With AI
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900">Create a draft in seconds</h2>
                  <p className="mt-2 max-w-2xl text-sm text-slate-600">
                    Give the AI a topic, level, and question count. It will prepare a multiple-choice draft that you can edit before saving.
                  </p>
                </div>
                {aiDraftLoaded ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                    AI draft loaded into the editor below.
                  </div>
                ) : null}
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.45fr_0.35fr_auto]">
                <input
                  className="rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sky-950 placeholder:text-sky-600/70"
                  placeholder="Topic, for example Quadratic Equations or World War II"
                  value={aiTopic}
                  onChange={(event) => setAiTopic(event.target.value)}
                />
                <AdminSelectField
                  label="Difficulty"
                  value={aiDifficulty}
                  options={[
                    { value: 'easy', label: 'Easy' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'hard', label: 'Hard' },
                  ]}
                  onChange={(value) => setAiDifficulty(value as 'easy' | 'medium' | 'hard')}
                />
                <input
                  className="rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sky-950"
                  max={12}
                  min={1}
                  type="number"
                  value={aiQuestionCount}
                  onChange={(event) => setAiQuestionCount(Math.max(1, Math.min(12, Number(event.target.value) || 1)))}
                />
                <button
                  className="button-primary inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isGeneratingAiTest}
                  type="button"
                  onClick={() => void generateTestWithAi()}
                >
                  {isGeneratingAiTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {isGeneratingAiTest ? 'Generating...' : 'Generate Test'}
                </button>
              </div>
            </article>
          ) : null}

          {isTeacher || editingId ? (
            <article className="glass-panel p-6">
              <h2 className="text-xl font-semibold text-slate-900">{editingId ? 'Edit test' : 'New test'}</h2>
              <div className="mt-5 grid gap-4">
                <input
                  className="rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sky-950 placeholder:text-sky-600/70"
                  placeholder="Test title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <AdminSelectField
                    label="Grade"
                    value={String(grade)}
                    options={gradeOptions.map((entry) => ({ value: String(entry), label: formatGradeDisplay(entry) }))}
                    onChange={(value) => {
                      setGrade(Number(value))
                      setLessonId(0)
                    }}
                  />
                  <AdminSelectField
                    label="Section"
                    value={section}
                    options={sectionOptions.map((entry) => ({ value: entry, label: entry }))}
                    onChange={(value) => {
                      setSection(value)
                      setLessonId(0)
                    }}
                  />
                </div>
                <AdminSelectField
                  label="Lesson"
                  value={filteredLessons.some((lesson) => lesson.id === lessonId) ? String(lessonId) : '0'}
                  options={
                    filteredLessons.length
                      ? filteredLessons.map((lesson) => ({
                          value: String(lesson.id),
                          label: `${lesson.subjectName} · ${lesson.title}`,
                        }))
                      : [{ value: '0', label: 'No lessons available' }]
                  }
                  onChange={(value) => setLessonId(Number(value))}
                />
                {!filteredLessons.length ? (
                  <p className="text-sm text-amber-700">
                    No lessons exist for class {formatClassDisplay(grade, section)} yet. Create the lesson first.
                  </p>
                ) : null}
              </div>
            </article>
          ) : null}

          {isTeacher || editingId ? (
            <div className="space-y-4">
              {questions.map((question, index) => {
                const previewImage = question.imagePreview || question.existingImageUrl

                return (
                  <article className="glass-panel p-6" key={question.clientKey}>
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-400">
                          Question {index + 1}
                        </p>
                        <h3 className="mt-2 font-display text-2xl font-bold text-slate-900">
                          Interactive question card
                        </h3>
                      </div>
                      <button
                        className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700"
                        disabled={questions.length === 1}
                        type="button"
                        onClick={() =>
                          setQuestions((current) => current.filter((item) => item.clientKey !== question.clientKey))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid gap-4">
                      <label className="space-y-2">
                        <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                          <FileQuestion className="h-4 w-4 text-[#2468a0]" />
                          Question text
                        </span>
                        <textarea
                          className="min-h-28 w-full rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sky-950 placeholder:text-sky-600/70"
                          placeholder="Write the question"
                          value={question.text}
                          onChange={(event) =>
                            updateQuestion(question.clientKey, (current) => ({
                              ...current,
                              text: event.target.value,
                            }))
                          }
                        />
                      </label>

                      <div className="grid gap-4 md:grid-cols-[0.55fr_0.45fr]">
                        <div className="space-y-2">
                          <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <Type className="h-4 w-4 text-[#2468a0]" />
                            Question type
                          </span>
                          <AdminSelectField
                            label="Question type"
                            value={question.type}
                            options={[
                              { value: 'multiple-choice', label: 'Multiple choice' },
                              { value: 'text', label: 'Text answer' },
                              { value: 'true-false', label: 'True / False' },
                            ]}
                            onChange={(value) =>
                              updateQuestion(question.clientKey, (current) => ({
                                ...current,
                                type: value as QuestionDraft['type'],
                                answers:
                                  value === 'true-false'
                                    ? [
                                        { text: 'True', isCorrect: true },
                                        { text: 'False', isCorrect: false },
                                      ]
                                    : value === 'text'
                                      ? []
                                      : current.answers.length
                                        ? current.answers
                                        : [
                                            { text: '', isCorrect: true },
                                            { text: '', isCorrect: false },
                                          ],
                              }))
                            }
                          />
                        </div>

                        <label className="space-y-2">
                          <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <ImagePlus className="h-4 w-4 text-[#2468a0]" />
                            Question image
                          </span>
                          <input
                            accept="image/*"
                            className="block w-full rounded-2xl border border-dashed border-sky-200 bg-sky-50/70 px-4 py-3 text-sm text-slate-600"
                            type="file"
                            onChange={(event) => {
                              const file = event.target.files?.[0] ?? null
                              updateQuestion(question.clientKey, (current) => ({
                                ...current,
                                imageFile: file,
                                imagePreview: file ? URL.createObjectURL(file) : '',
                              }))
                            }}
                          />
                        </label>
                      </div>

                      {previewImage ? (
                        <img
                          alt={`Question ${index + 1}`}
                          className="max-h-72 w-full rounded-3xl object-cover"
                          src={previewImage.startsWith('blob:') ? previewImage : resolveApiAssetUrl(previewImage)}
                        />
                      ) : null}

                      {question.type === 'text' ? (
                        <label className="space-y-2">
                          <span className="text-sm font-semibold text-slate-700">Correct text answer</span>
                          <input
                            className="rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sky-950 placeholder:text-sky-600/70"
                            placeholder="Enter the expected answer"
                            value={question.correctTextAnswer}
                            onChange={(event) =>
                              updateQuestion(question.clientKey, (current) => ({
                                ...current,
                                correctTextAnswer: event.target.value,
                              }))
                            }
                          />
                        </label>
                      ) : (
                        <div className="space-y-3 rounded-3xl border border-blue-100/80 bg-blue-50/50 p-4">
                          <div className="flex items-center justify-between">
                            <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                              <ListPlus className="h-4 w-4 text-[#0f8b8d]" />
                              Answers
                            </p>
                            {question.type === 'multiple-choice' ? (
                              <button
                                className="rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-semibold text-[#2468a0]"
                                type="button"
                                onClick={() =>
                                  updateQuestion(question.clientKey, (current) => ({
                                    ...current,
                                    answers: [...current.answers, { text: '', isCorrect: false }],
                                  }))
                                }
                              >
                                Add answer
                              </button>
                            ) : null}
                          </div>

                          <div className="grid gap-3">
                            {question.answers.map((answer, answerIndex) => (
                              <div className="flex items-center gap-3" key={`${question.clientKey}-${answerIndex}`}>
                                <input
                                  className="flex-1 rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sky-950 placeholder:text-sky-600/70"
                                  disabled={question.type === 'true-false'}
                                  placeholder={`Answer ${answerIndex + 1}`}
                                  value={answer.text}
                                  onChange={(event) =>
                                    updateQuestion(question.clientKey, (current) => ({
                                      ...current,
                                      answers: current.answers.map((item, currentIndex) =>
                                        currentIndex === answerIndex
                                          ? { ...item, text: event.target.value }
                                          : item,
                                      ),
                                    }))
                                  }
                                />
                                <label className="flex items-center gap-2 text-sm text-slate-700">
                                  <input
                                    checked={answer.isCorrect}
                                    name={`correct-${question.clientKey}`}
                                    type="radio"
                                    onChange={() =>
                                      updateQuestion(question.clientKey, (current) => ({
                                        ...current,
                                        answers: current.answers.map((item, currentIndex) => ({
                                          ...item,
                                          isCorrect: currentIndex === answerIndex,
                                        })),
                                      }))
                                    }
                                  />
                                  Correct
                                </label>
                                {question.type === 'multiple-choice' && question.answers.length > 2 ? (
                                  <button
                                    className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700"
                                    type="button"
                                    onClick={() =>
                                      updateQuestion(question.clientKey, (current) => ({
                                        ...current,
                                        answers: current.answers.filter((_, currentIndex) => currentIndex !== answerIndex),
                                      }))
                                    }
                                  >
                                    Remove
                                  </button>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          ) : null}

          {isTeacher || editingId ? (
            <div className="flex flex-wrap gap-3">
              <button
                className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-white/90 px-4 py-3 text-sm font-semibold text-[#2468a0]"
                type="button"
                onClick={() => setQuestions((current) => [...current, createBlankQuestion()])}
              >
                <PlusCircle className="h-4 w-4" />
                Add question
              </button>
              <button className="button-primary" type="button" onClick={() => void saveTest()}>
                {editingId ? 'Save test changes' : 'Create test'}
              </button>
              {editingId ? (
                <button className="rounded-2xl border border-slate-200 px-4 py-3" type="button" onClick={resetTestForm}>
                  Cancel
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

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
                placeholder={t('adminPages.tests.searchPlaceholder')}
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

          {filteredTests.length ? (
            <div className="admin-management-table-shell mt-6">
              <div className="overflow-x-auto">
                <table className="admin-management-table">
                  <thead>
                    <tr>
                      <th>
                        <AdminSortHeader
                          label={t('adminPages.tests.tableTitle')}
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
                    {paginatedTests.map((test) => (
                      <tr key={test.id}>
                        <td>
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-slate-900">{test.title}</p>
                              {isAdmin ? (
                                <span className="inline-flex rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-semibold text-[#2468a0]">
                                  {t('adminPages.tests.teacherPill', { name: test.createdByFullName ?? test.createdByUsername ?? t('adminPages.common.unknownTeacher') })}
                                </span>
                              ) : null}
                            </div>
                            <p className="text-sm text-slate-500">
                              {test.subjectName} · {test.lessonTitle}
                            </p>
                            <p className="text-sm text-slate-500">
                              {t('adminPages.tests.questionsCount', { count: test.questions.length })}
                            </p>
                          </div>
                        </td>
                        <td>
                          <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-[#2468a0]">
                            {formatStoredClassDisplay(test.classDisplay, test.grade, test.section)}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <UserAvatar
                              fullName={test.createdByFullName}
                              size={24}
                              username={test.createdByUsername}
                            />
                            <span>{`${t('adminPages.common.createdBy')} ${test.createdByFullName ?? test.createdByUsername ?? t('adminPages.common.unknownTeacher')}`}</span>
                          </div>
                        </td>
                        <td>{formatDateTime(test.createdAt)}</td>
                        <td>
                          <div className="flex justify-end gap-2">
                            <button
                              className="admin-management-icon-button"
                              title={t('adminPages.common.view')}
                              type="button"
                              onClick={() => setViewingTest(test)}
                            >
                              <VisibilityOutlined sx={{ fontSize: 20 }} />
                            </button>
                            <button
                              className="admin-management-icon-button"
                              title={t('adminPages.common.edit')}
                              type="button"
                              onClick={() => {
                                setAiDraftLoaded(false)
                                setEditingId(test.id)
                                setTitle(test.title)
                                setLessonId(test.lessonId)
                                setGrade(test.grade)
                                setSection(test.section)
                                setQuestions(
                                  test.questions.map((question) => ({
                                    clientKey: crypto.randomUUID(),
                                    text: question.text,
                                    type: question.type,
                                    answers:
                                      question.type === 'text'
                                        ? []
                                        : question.answers.map((answer) => ({
                                            text: answer.text,
                                            isCorrect: answer.isCorrect,
                                          })),
                                    correctTextAnswer: question.correctTextAnswer ?? '',
                                    imageFile: null,
                                    imagePreview: '',
                                    existingImageUrl: question.imageUrl ?? '',
                                  })),
                                )
                              }}
                            >
                              <EditOutlined sx={{ fontSize: 20 }} />
                            </button>
                            <button
                            className="admin-management-icon-button admin-management-icon-button-danger"
                            title={t('adminPages.common.delete')}
                            type="button"
                            onClick={() => setTestPendingDelete(test)}
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
                count={sortedTests.length}
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
              <h3 className="text-lg font-semibold text-slate-900">{t('adminPages.tests.emptyTitle')}</h3>
              <p className="mt-2 text-sm text-slate-500">
                {t('adminPages.tests.emptyDescription')}
              </p>
            </div>
          )}
        </article>
      </section>

      {viewingTest ? (
        <div className="admin-management-modal" role="dialog" aria-modal="true" onClick={() => setViewingTest(null)}>
          <div className="admin-management-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200/80 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2468a0]">Test View</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">{viewingTest.title}</h2>
              </div>
              <button
                aria-label="Close test view"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                type="button"
                onClick={() => setViewingTest(null)}
              >
                ×
              </button>
            </div>
            <div className="max-h-[calc(92vh-96px)] space-y-6 overflow-y-auto px-6 py-6">
              <div className="flex flex-wrap gap-3">
                <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-[#2468a0]">
                  {formatStoredClassDisplay(viewingTest.classDisplay, viewingTest.grade, viewingTest.section)}
                </span>
                <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {`Created by ${viewingTest.createdByFullName ?? viewingTest.createdByUsername ?? 'Teacher'}`}
                </span>
                <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {formatDateTime(viewingTest.createdAt)}
                </span>
                <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {viewingTest.subjectName} · {viewingTest.lessonTitle}
                </span>
              </div>

              <div className="space-y-4">
                {viewingTest.questions.map((question, index) => (
                  <div className="rounded-3xl border border-blue-100/80 bg-white/90 p-5 shadow-[0_14px_28px_rgba(36,104,160,0.06)]" key={question.id}>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2468a0]">
                      Question {index + 1}
                    </p>
                    <p className="mt-2 font-semibold text-slate-900">{question.text}</p>
                    <p className="mt-2 text-sm text-slate-500">{question.type}</p>
                    {question.answers.length ? (
                      <ul className="mt-4 space-y-2">
                        {question.answers.map((answer) => (
                          <li
                            className={`rounded-2xl border px-4 py-3 text-sm ${
                              answer.isCorrect
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-slate-200 bg-slate-50 text-slate-700'
                            }`}
                            key={answer.id}
                          >
                            {answer.text}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {question.correctTextAnswer ? (
                      <p className="mt-4 text-sm text-slate-700">
                        Correct answer: <span className="font-semibold">{question.correctTextAnswer}</span>
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <DeleteConfirmationModal
        open={Boolean(testPendingDelete)}
        title="Delete test?"
        description={`This will permanently remove ${testPendingDelete?.title ?? 'this test'}. This action cannot be undone.`}
        isDeleting={isDeleting}
        onCancel={() => {
          if (!isDeleting) {
            setTestPendingDelete(null)
          }
        }}
        onConfirm={() => {
          if (testPendingDelete) {
            void deleteTest(testPendingDelete.id)
          }
        }}
      />
    </div>
  )
}
