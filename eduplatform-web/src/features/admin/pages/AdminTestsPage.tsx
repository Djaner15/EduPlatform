import axios from 'axios'
import DeleteOutline from '@mui/icons-material/DeleteOutline'
import EditOutlined from '@mui/icons-material/EditOutlined'
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined'
import Stack from '@mui/material/Stack'
import { BarChart3, CheckCircle2, FileQuestion, ImagePlus, ListPlus, Loader2, PlusCircle, Sparkles, Trash2, Type, XCircle } from 'lucide-react'
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
import { useBodyScrollLock } from '../../../shared/hooks/useBodyScrollLock'
import { readApiError } from '../../../shared/apiErrors'

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

type TestResult = {
  resultId: number
  testId: number
  userId: number
  studentUsername?: string | null
  studentFullName?: string | null
  studentEmail?: string | null
  testTitle: string
  subjectName: string
  scorePercentage: number
  completedAt: string
}

type TestResultQuestionReview = {
  questionId: number
  orderIndex: number
  questionText: string
  questionType: string
  studentAnswerText?: string | null
  correctAnswerText: string
  isCorrect: boolean
  explanation?: string | null
}

type TestResultDetails = TestResult & {
  hasStoredReview: boolean
  questions: TestResultQuestionReview[]
}

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

const getScoreTone = (score: number) => {
  if (score >= 70) {
    return {
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      text: 'text-emerald-700',
      card: 'border-emerald-200 bg-emerald-50/80',
    }
  }

  if (score >= 40) {
    return {
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      text: 'text-amber-700',
      card: 'border-amber-200 bg-amber-50/80',
    }
  }

  return {
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    text: 'text-rose-700',
    card: 'border-rose-200 bg-rose-50/80',
  }
}

const getStudentDisplayName = (result: Pick<TestResult, 'studentFullName' | 'studentUsername'>) =>
  result.studentFullName?.trim() || result.studentUsername?.trim() || ''

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

const createBlankMultipleChoiceAnswers = (): AnswerDraft[] => [
  { text: '', isCorrect: true },
  { text: '', isCorrect: false },
  { text: '', isCorrect: false },
  { text: '', isCorrect: false },
]

const createBlankQuestion = (): QuestionDraft => ({
  clientKey: crypto.randomUUID(),
  text: '',
  type: 'multiple-choice',
  answers: createBlankMultipleChoiceAnswers(),
  correctTextAnswer: '',
  imageFile: null,
  imagePreview: '',
  existingImageUrl: '',
})

export function AdminTestsPage() {
  const { t, i18n } = useTranslation()
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
  const [resultsModalTest, setResultsModalTest] = useState<TestItem | null>(null)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [resultsError, setResultsError] = useState('')
  const [isResultsLoading, setIsResultsLoading] = useState(false)
  const [selectedResultId, setSelectedResultId] = useState<number | null>(null)
  const [selectedResult, setSelectedResult] = useState<TestResultDetails | null>(null)
  const [detailsError, setDetailsError] = useState('')
  const [isDetailsLoading, setIsDetailsLoading] = useState(false)
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

  useBodyScrollLock(Boolean(viewingTest) || Boolean(resultsModalTest))

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
                  { text: t('adminPages.tests.trueAnswer'), isCorrect: question.answers[0]?.isCorrect ?? true },
                  { text: t('adminPages.tests.falseAnswer'), isCorrect: question.answers[1]?.isCorrect ?? false },
                ]
              : question.answers.map((answer) => ({
                  text: answer.text.trim(),
                  isCorrect: answer.isCorrect,
                })),
      })),
    [questions, t],
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
    setPage(0)
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
        showNotification(t('adminPages.tests.notifications.updated'), 'success')
      } else {
        await apiClient.post('/tests', formData)
        showNotification(t('adminPages.tests.notifications.created'), 'success')
      }

      resetTestForm()
      await loadData()
    } catch (error) {
      showNotification(
        axios.isAxiosError(error) && typeof error.response?.data?.error === 'string'
          ? error.response.data.error
          : t('adminPages.tests.notifications.saveFailed'),
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
      if (resultsModalTest?.id === id) {
        closeResultsModal()
      }
      setTestPendingDelete(null)
      showNotification(t('adminPages.tests.notifications.deleted'), 'success')
      await loadData()
    } catch {
      showNotification(t('adminPages.tests.notifications.deleteFailed'), 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  const openResultsModal = async (test: TestItem) => {
    setResultsModalTest(test)
    setTestResults([])
    setResultsError('')
    setSelectedResultId(null)
    setSelectedResult(null)
    setDetailsError('')
    setIsResultsLoading(true)

    try {
      const { data } = await apiClient.get<TestResult[]>(`/tests/${test.id}/results`)
      setTestResults(data)
    } catch (error) {
      setResultsError(readApiError(error, t('adminPages.tests.resultsLoadFailed')))
    } finally {
      setIsResultsLoading(false)
    }
  }

  const openResultDetails = async (result: TestResult) => {
    setSelectedResultId(result.resultId)
    setSelectedResult(null)
    setDetailsError('')
    setIsDetailsLoading(true)

    try {
      const { data } = await apiClient.get<TestResultDetails>(`/tests/results/${result.resultId}`)
      setSelectedResult(data)
    } catch (error) {
      setDetailsError(readApiError(error, t('adminPages.tests.detailsLoadFailed')))
    } finally {
      setIsDetailsLoading(false)
    }
  }

  const closeResultsModal = () => {
    setResultsModalTest(null)
    setTestResults([])
    setResultsError('')
    setIsResultsLoading(false)
    setSelectedResultId(null)
    setSelectedResult(null)
    setDetailsError('')
    setIsDetailsLoading(false)
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
      showNotification(t('adminPages.tests.notifications.topicRequired'), 'error')
      return
    }

    setIsGeneratingAiTest(true)

    try {
      const { data } = await apiClient.post<AiGeneratedTest>('/ai/generate-test', {
        topic: aiTopic.trim(),
        difficulty: aiDifficulty,
        questionCount: aiQuestionCount,
        language: i18n.language,
      })

      applyAiDraft(data)
      showNotification(t('adminPages.tests.notifications.aiGenerated'), 'success')
    } catch (error) {
      showNotification(
        axios.isAxiosError(error) && typeof error.response?.data?.message === 'string'
          ? error.response.data.message
          : axios.isAxiosError(error) && typeof error.response?.data?.error === 'string'
            ? error.response.data.error
            : t('adminPages.tests.notifications.aiFailed'),
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
          isTeacher
            ? 'grid gap-6 min-[1900px]:grid-cols-[minmax(28rem,0.78fr)_minmax(65rem,1.22fr)]'
            : 'space-y-6'
        }
      >
        <div className="space-y-6">
          {isTeacher ? (
            <article className="glass-panel p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.26em] text-[#2468a0]">
                    <Sparkles className="h-4 w-4" />
                    {t('adminPages.tests.aiEyebrow')}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900">{t('adminPages.tests.aiTitle')}</h2>
                  <p className="mt-2 max-w-2xl text-sm text-slate-600">
                    {t('adminPages.tests.aiDescription')}
                  </p>
                </div>
                {aiDraftLoaded ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                    {t('adminPages.tests.aiDraftLoaded')}
                  </div>
                ) : null}
              </div>

              <div className="mt-5 grid min-w-0 gap-4">
                <input
                  className="min-h-14 min-w-0 rounded-2xl border border-sky-200 bg-sky-50/70 px-5 py-4 text-sky-950 placeholder:text-sky-600/70"
                  placeholder={t('adminPages.tests.aiTopicPlaceholder')}
                  value={aiTopic}
                  onChange={(event) => setAiTopic(event.target.value)}
                />
                <div className="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(7rem,0.45fr)] xl:grid-cols-[minmax(11rem,0.75fr)_minmax(7rem,0.35fr)_minmax(13rem,auto)]">
                  <AdminSelectField
                    label={t('adminPages.tests.difficulty')}
                    minWidth={0}
                    value={aiDifficulty}
                    options={[
                      { value: 'easy', label: t('adminPages.tests.difficultyEasy') },
                      { value: 'medium', label: t('adminPages.tests.difficultyMedium') },
                      { value: 'hard', label: t('adminPages.tests.difficultyHard') },
                    ]}
                    onChange={(value) => setAiDifficulty(value as 'easy' | 'medium' | 'hard')}
                  />
                  <input
                    className="min-w-0 rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sky-950"
                    max={12}
                    min={1}
                    type="number"
                    value={aiQuestionCount}
                    onChange={(event) => setAiQuestionCount(Math.max(1, Math.min(12, Number(event.target.value) || 1)))}
                  />
                  <button
                    className="button-primary inline-flex w-full items-center justify-center gap-2 whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2 xl:col-span-1"
                    disabled={isGeneratingAiTest}
                    type="button"
                    onClick={() => void generateTestWithAi()}
                  >
                    {isGeneratingAiTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {isGeneratingAiTest ? t('adminPages.tests.generating') : t('adminPages.tests.generateTest')}
                  </button>
                </div>
              </div>
            </article>
          ) : null}

          {isTeacher || editingId ? (
            <article className="glass-panel p-6">
              <h2 className="text-xl font-semibold text-slate-900">{editingId ? t('adminPages.tests.editTitle') : t('adminPages.tests.newTitle')}</h2>
              <div className="mt-5 grid gap-4">
                <input
                  className="rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sky-950 placeholder:text-sky-600/70"
                  placeholder={t('adminPages.tests.titlePlaceholder')}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <AdminSelectField
                    label={t('common.grade')}
                    value={String(grade)}
                    options={gradeOptions.map((entry) => ({ value: String(entry), label: formatGradeDisplay(entry) }))}
                    onChange={(value) => {
                      setGrade(Number(value))
                      setLessonId(0)
                    }}
                  />
                  <AdminSelectField
                    label={t('common.section')}
                    value={section}
                    options={sectionOptions.map((entry) => ({ value: entry, label: entry }))}
                    onChange={(value) => {
                      setSection(value)
                      setLessonId(0)
                    }}
                  />
                </div>
                <AdminSelectField
                  label={t('lessons')}
                  value={filteredLessons.some((lesson) => lesson.id === lessonId) ? String(lessonId) : '0'}
                  options={
                    filteredLessons.length
                      ? filteredLessons.map((lesson) => ({
                          value: String(lesson.id),
                          label: `${lesson.subjectName} · ${lesson.title}`,
                        }))
                      : [{ value: '0', label: t('adminPages.tests.noLessonsAvailable') }]
                  }
                  onChange={(value) => setLessonId(Number(value))}
                />
                {!filteredLessons.length ? (
                  <p className="text-sm text-amber-700">
                    {t('adminPages.tests.noLessonsForClass', { classDisplay: formatClassDisplay(grade, section) })}
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
                          {t('adminPages.tests.questionLabel', { number: index + 1 })}
                        </p>
                        <h3 className="mt-2 font-display text-2xl font-bold text-slate-900">
                          {t('adminPages.tests.questionCardTitle')}
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
                          {t('adminPages.tests.questionText')}
                        </span>
                        <textarea
                          className="min-h-28 w-full rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sky-950 placeholder:text-sky-600/70"
                          placeholder={t('adminPages.tests.questionPlaceholder')}
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
                            {t('adminPages.tests.questionType')}
                          </span>
                          <AdminSelectField
                            label={t('adminPages.tests.questionType')}
                            value={question.type}
                            options={[
                              { value: 'multiple-choice', label: t('adminPages.tests.multipleChoice') },
                              { value: 'text', label: t('adminPages.tests.textAnswer') },
                              { value: 'true-false', label: t('adminPages.tests.trueFalse') },
                            ]}
                            onChange={(value) =>
                              updateQuestion(question.clientKey, (current) => ({
                                ...current,
                                type: value as QuestionDraft['type'],
                                answers:
                                  value === 'true-false'
                                    ? [
                                        { text: t('adminPages.tests.trueAnswer'), isCorrect: true },
                                        { text: t('adminPages.tests.falseAnswer'), isCorrect: false },
                                      ]
                                    : value === 'text'
                                      ? []
                                      : current.type === 'multiple-choice'
                                        ? current.answers.length >= 4
                                          ? current.answers
                                          : [
                                              ...current.answers,
                                              ...createBlankMultipleChoiceAnswers().slice(current.answers.length),
                                            ]
                                        : createBlankMultipleChoiceAnswers(),
                              }))
                            }
                          />
                        </div>

                        <label className="space-y-2">
                          <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <ImagePlus className="h-4 w-4 text-[#2468a0]" />
                            {t('adminPages.tests.questionImage')}
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
                          alt={t('adminPages.tests.questionImageAlt', { number: index + 1 })}
                          className="max-h-72 w-full rounded-3xl object-cover"
                          src={previewImage.startsWith('blob:') ? previewImage : resolveApiAssetUrl(previewImage)}
                        />
                      ) : null}

                      {question.type === 'text' ? (
                        <label className="space-y-2">
                          <span className="text-sm font-semibold text-slate-700">{t('adminPages.tests.correctTextAnswer')}</span>
                          <input
                            className="rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sky-950 placeholder:text-sky-600/70"
                            placeholder={t('adminPages.tests.correctTextPlaceholder')}
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
                              {t('adminPages.tests.answers')}
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
                                {t('adminPages.tests.addAnswer')}
                              </button>
                            ) : null}
                          </div>

                          <div className="grid gap-3">
                            {question.answers.map((answer, answerIndex) => (
                              <div className="flex items-center gap-3" key={`${question.clientKey}-${answerIndex}`}>
                                <input
                                  className="flex-1 rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sky-950 placeholder:text-sky-600/70"
                                  disabled={question.type === 'true-false'}
                                  placeholder={t('adminPages.tests.answerPlaceholder', { number: answerIndex + 1 })}
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
                                  {t('adminPages.tests.correct')}
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
                                    {t('remove')}
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
                {t('adminPages.tests.addQuestion')}
              </button>
              <button className="button-primary" type="button" onClick={() => void saveTest()}>
                {editingId ? t('adminPages.tests.saveChanges') : t('adminPages.tests.createTest')}
              </button>
              {editingId ? (
                <button className="rounded-2xl border border-slate-200 px-4 py-3" type="button" onClick={resetTestForm}>
                  {t('common.cancel')}
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

          {filteredTests.length ? (
            <div className="admin-management-table-shell admin-tests-table-shell mt-6">
              <div className="overflow-x-auto">
                <table className="admin-management-table admin-tests-table">
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
                        <td>{formatDateTime(test.createdAt, i18n.language, t('adminPages.common.unknownDate'))}</td>
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
                              title={t('adminPages.tests.viewResults')}
                              type="button"
                              onClick={() => void openResultsModal(test)}
                            >
                              <BarChart3 className="h-5 w-5" />
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
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2468a0]">{t('adminPages.tests.viewEyebrow')}</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">{viewingTest.title}</h2>
              </div>
              <button
                aria-label={t('adminPages.tests.closeView')}
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
                  {t('adminPages.common.createdByName', { name: viewingTest.createdByFullName ?? viewingTest.createdByUsername ?? t('adminPages.common.unknownTeacher') })}
                </span>
                <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {formatDateTime(viewingTest.createdAt, i18n.language, t('adminPages.common.unknownDate'))}
                </span>
                <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {viewingTest.subjectName} · {viewingTest.lessonTitle}
                </span>
              </div>

              <div className="space-y-4">
                {viewingTest.questions.map((question, index) => (
                  <div className="rounded-3xl border border-blue-100/80 bg-white/90 p-5 shadow-[0_14px_28px_rgba(36,104,160,0.06)]" key={question.id}>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2468a0]">
                      {t('adminPages.tests.questionLabel', { number: index + 1 })}
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
                        {t('adminPages.tests.correctAnswerLabel')} <span className="font-semibold">{question.correctTextAnswer}</span>
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {resultsModalTest ? (
        <div className="admin-management-modal" role="dialog" aria-modal="true" onClick={closeResultsModal}>
          <div className="admin-management-modal-card max-w-6xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex flex-col gap-4 border-b border-slate-200/80 px-6 py-5 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2468a0]">
                  {t('adminPages.tests.resultsEyebrow')}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">{resultsModalTest.title}</h2>
                <p className="mt-2 text-sm text-slate-500">
                  {resultsModalTest.subjectName} · {resultsModalTest.lessonTitle} · {formatStoredClassDisplay(resultsModalTest.classDisplay, resultsModalTest.grade, resultsModalTest.section)}
                </p>
              </div>
              <button
                aria-label={t('adminPages.tests.closeResults')}
                className="inline-flex h-11 w-11 items-center justify-center self-start rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                type="button"
                onClick={closeResultsModal}
              >
                ×
              </button>
            </div>

            <div className="max-h-[calc(92vh-96px)] overflow-y-auto px-6 py-6">
              <div className="grid gap-5 lg:grid-cols-[0.82fr_1.18fr]">
                <section className="rounded-[28px] border border-sky-100 bg-white/86 p-4 shadow-[0_18px_38px_rgba(36,104,160,0.08)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{t('adminPages.tests.resultsTitle')}</h3>
                      <p className="mt-1 text-sm text-slate-500">{t('adminPages.tests.resultsDescription')}</p>
                    </div>
                    <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-sm font-semibold text-[#2468a0]">
                      {t('adminPages.tests.submissionsCount', { count: testResults.length })}
                    </span>
                  </div>

                  {isResultsLoading ? (
                    <div className="mt-5 flex items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-sm font-semibold text-[#2468a0]">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('adminPages.tests.loadingResults')}
                    </div>
                  ) : null}

                  {!isResultsLoading && resultsError ? (
                    <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                      {resultsError}
                    </div>
                  ) : null}

                  {!isResultsLoading && !resultsError && !testResults.length ? (
                    <div className="mt-5 rounded-[24px] border border-dashed border-sky-200 bg-cyan-50/50 p-6 text-center">
                      <h4 className="text-lg font-semibold text-slate-900">{t('adminPages.tests.noResultsTitle')}</h4>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{t('adminPages.tests.noResultsDescription')}</p>
                    </div>
                  ) : null}

                  {!isResultsLoading && !resultsError && testResults.length ? (
                    <div className="mt-5 space-y-3">
                      {testResults.map((result) => {
                        const tone = getScoreTone(result.scorePercentage)
                        const isSelected = selectedResultId === result.resultId

                        return (
                          <button
                            className={`w-full rounded-[24px] border bg-white px-4 py-4 text-left shadow-[0_12px_28px_rgba(36,104,160,0.08)] transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-[0_18px_34px_rgba(36,104,160,0.12)] ${
                              isSelected ? 'border-cyan-300 ring-2 ring-cyan-200/80' : 'border-sky-100'
                            }`}
                            key={result.resultId}
                            type="button"
                            onClick={() => void openResultDetails(result)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-slate-900">
                                  {getStudentDisplayName(result) || t('adminPages.tests.student')}
                                </p>
                                <p className="mt-1 truncate text-sm text-slate-500">
                                  {result.studentUsername ? `@${result.studentUsername}` : t('adminPages.tests.student')}
                                  {result.studentEmail ? ` · ${result.studentEmail}` : ''}
                                </p>
                                <p className="mt-2 text-xs font-medium text-slate-400">
                                  {formatDateTime(result.completedAt, i18n.language, t('adminPages.common.unknownDate'))}
                                </p>
                              </div>
                              <span className={`shrink-0 rounded-full border px-3 py-1 text-sm font-semibold ${tone.badge}`}>
                                {result.scorePercentage}%
                              </span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  ) : null}
                </section>

                <section className="rounded-[28px] border border-sky-100 bg-white/86 p-4 shadow-[0_18px_38px_rgba(36,104,160,0.08)]">
                  {!selectedResultId ? (
                    <div className="flex min-h-72 flex-col items-center justify-center rounded-[24px] border border-dashed border-sky-200 bg-sky-50/45 p-8 text-center">
                      <BarChart3 className="h-10 w-10 text-[#2468a0]" />
                      <h3 className="mt-4 text-xl font-semibold text-slate-900">{t('adminPages.tests.pickSubmissionTitle')}</h3>
                      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{t('adminPages.tests.pickSubmissionDescription')}</p>
                    </div>
                  ) : null}

                  {selectedResultId && isDetailsLoading ? (
                    <div className="flex items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-sm font-semibold text-[#2468a0]">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('adminPages.tests.loadingDetails')}
                    </div>
                  ) : null}

                  {selectedResultId && !isDetailsLoading && detailsError ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                      {detailsError}
                    </div>
                  ) : null}

                  {selectedResultId && !isDetailsLoading && !detailsError && selectedResult ? (
                    <div className="space-y-4">
                      <div className="rounded-[24px] border border-sky-100 bg-gradient-to-br from-cyan-50 via-white to-sky-50 p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2468a0]">
                          {t('adminPages.tests.submissionReview')}
                        </p>
                        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                          <div>
                            <h3 className="text-2xl font-semibold text-slate-900">
                              {getStudentDisplayName(selectedResult) || t('adminPages.tests.student')}
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">
                              {selectedResult.studentEmail || selectedResult.studentUsername || t('adminPages.tests.student')}
                            </p>
                          </div>
                          <div className="text-left md:text-right">
                            <p className="text-sm text-slate-500">{t('adminPages.tests.finalScore')}</p>
                            <p className={`mt-1 text-4xl font-bold ${getScoreTone(selectedResult.scorePercentage).text}`}>
                              {selectedResult.scorePercentage}%
                            </p>
                          </div>
                        </div>
                      </div>

                      {!selectedResult.hasStoredReview ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                          {t('adminPages.tests.legacyResultMessage')}
                        </div>
                      ) : null}

                      {selectedResult.questions.map((question, index) => {
                        const tone = question.isCorrect
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border-rose-200 bg-rose-50 text-rose-800'

                        return (
                          <article className="rounded-[24px] border border-sky-100 bg-white p-5 shadow-[0_12px_26px_rgba(36,104,160,0.06)]" key={`${question.questionId}-${question.orderIndex}`}>
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2468a0]">
                                  {t('adminPages.tests.questionLabel', { number: index + 1 })}
                                </p>
                                <h4 className="mt-2 text-lg font-semibold text-slate-900">{question.questionText}</h4>
                              </div>
                              <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>
                                {question.isCorrect ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                {question.isCorrect ? t('adminPages.tests.correct') : t('adminPages.tests.incorrect')}
                              </span>
                            </div>

                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                              <div className={`rounded-2xl border px-4 py-3 text-sm ${tone}`}>
                                <p className="font-semibold">{t('adminPages.tests.studentAnswer')}</p>
                                <p className="mt-2 whitespace-pre-line leading-6">
                                  {question.studentAnswerText?.trim() || t('adminPages.tests.noAnswerSubmitted')}
                                </p>
                              </div>
                              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                                <p className="font-semibold">{t('adminPages.tests.correctAnswer')}</p>
                                <p className="mt-2 whitespace-pre-line leading-6">
                                  {question.correctAnswerText || t('adminPages.tests.notAvailable')}
                                </p>
                              </div>
                            </div>

                            {question.explanation ? (
                              <div className="mt-3 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm leading-6 text-slate-700">
                                <p className="font-semibold text-[#2468a0]">{t('adminPages.tests.explanation')}</p>
                                <p className="mt-2">{question.explanation}</p>
                              </div>
                            ) : null}
                          </article>
                        )
                      })}
                    </div>
                  ) : null}
                </section>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <DeleteConfirmationModal
        open={Boolean(testPendingDelete)}
        title={t('adminPages.tests.deleteTitle')}
        description={t('adminPages.tests.deleteDescription', { title: testPendingDelete?.title ?? t('adminPages.tests.thisTest') })}
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
