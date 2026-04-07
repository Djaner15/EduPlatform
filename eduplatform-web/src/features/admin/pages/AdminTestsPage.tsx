import axios from 'axios'
import { FileQuestion, ImagePlus, ListPlus, Loader2, PlusCircle, Sparkles, Trash2, Type } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../app/AuthContext'
import { useNotification } from '../../../app/NotificationContext'
import { formatClassDisplay, gradeOptions, sectionOptions } from '../../../shared/classOptions'
import { PageHeader } from '../../../shared/components/PageHeader'
import apiClient, { resolveApiAssetUrl } from '../../../shared/api/axiosInstance'

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
  lessonId: number
  lessonTitle: string
  subjectName: string
  grade: number
  section: string
  classDisplay: string
  createdByUserId: number
  createdByUsername?: string | null
  questions: TestQuestion[]
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
      await apiClient.delete(`/tests/${id}`)
      showNotification('Test deleted.', 'success')
      await loadData()
    } catch {
      showNotification('Failed to delete test.', 'error')
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

  const canCreate = user?.role === 'Teacher' || user?.role === 'Admin'

  return (
    <div className="space-y-8">
      <PageHeader
        description={
          canCreate
            ? 'Build richer assessments with multiple question types, unlimited answers, and AI-assisted draft generation.'
            : 'Review all tests across the platform and moderate or edit any assessment when needed.'
        }
        eyebrow="Tests"
        title="Test Management"
      />

      <section className={`grid gap-6 ${canCreate || editingId ? 'xl:grid-cols-[0.55fr_0.45fr]' : ''}`}>
        <div className="space-y-6">
          {canCreate ? (
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
                <select
                  className="rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sky-950"
                  value={aiDifficulty}
                  onChange={(event) => setAiDifficulty(event.target.value as 'easy' | 'medium' | 'hard')}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
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

          {canCreate || editingId ? (
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
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Grade</label>
                    <div className="relative">
                      <select
                        className="w-full appearance-none rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 pr-12 text-sky-950"
                        value={grade}
                        onChange={(event) => {
                          setGrade(Number(event.target.value))
                          setLessonId(0)
                        }}
                      >
                        {gradeOptions.map((entry) => (
                          <option key={entry} value={entry}>
                            {entry}
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
                        value={section}
                        onChange={(event) => {
                          setSection(event.target.value)
                          setLessonId(0)
                        }}
                      >
                        {sectionOptions.map((entry) => (
                          <option key={entry} value={entry}>
                            {entry}
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
                <select
                  className="rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sky-950"
                  value={lessonId}
                  onChange={(event) => setLessonId(Number(event.target.value))}
                >
                  {filteredLessons.map((lesson) => (
                    <option key={lesson.id} value={lesson.id}>
                      {lesson.subjectName} · {lesson.title}
                    </option>
                  ))}
                </select>
                {!filteredLessons.length ? (
                  <p className="text-sm text-amber-700">
                    No lessons exist for class {formatClassDisplay(grade, section)} yet. Create the lesson first.
                  </p>
                ) : null}
              </div>
            </article>
          ) : null}

          {canCreate || editingId ? (
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
                        <label className="space-y-2">
                          <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <Type className="h-4 w-4 text-[#2468a0]" />
                            Question type
                          </span>
                          <select
                            className="rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sky-950"
                            value={question.type}
                            onChange={(event) =>
                              updateQuestion(question.clientKey, (current) => ({
                                ...current,
                                type: event.target.value as QuestionDraft['type'],
                                answers:
                                  event.target.value === 'true-false'
                                    ? [
                                        { text: 'True', isCorrect: true },
                                        { text: 'False', isCorrect: false },
                                      ]
                                    : event.target.value === 'text'
                                      ? []
                                      : current.answers.length
                                        ? current.answers
                                        : [
                                            { text: '', isCorrect: true },
                                            { text: '', isCorrect: false },
                                          ],
                              }))
                            }
                          >
                            <option value="multiple-choice">Multiple choice</option>
                            <option value="text">Text answer</option>
                            <option value="true-false">True / False</option>
                          </select>
                        </label>

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

          {canCreate || editingId ? (
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
          <h2 className="text-xl font-semibold text-slate-900">Saved tests</h2>
          <div className="mt-5 space-y-3">
            {tests.map((test) => (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4" key={test.id}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{test.title}</p>
                    <p className="text-sm text-slate-500">
                      {test.subjectName} · {test.lessonTitle}
                    </p>
                    <span className="mt-2 inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-[#2468a0]">
                      {test.classDisplay || formatClassDisplay(test.grade, test.section)}
                    </span>
                    <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">
                      Created by {test.createdByUsername ?? 'Teacher'}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {test.questions.length} questions · {test.questions.map((question) => question.type).join(', ')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
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
                      Edit
                    </button>
                    <button
                      className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white"
                      type="button"
                      onClick={() => void deleteTest(test.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}
