import axios from 'axios'
import { useEffect, useState } from 'react'
import { useAuth } from '../../../app/AuthContext'
import { useNotification } from '../../../app/NotificationContext'
import { formatClassDisplay, gradeOptions, sectionOptions } from '../../../shared/classOptions'
import { PageHeader } from '../../../shared/components/PageHeader'
import apiClient from '../../../shared/api/axiosInstance'

type Subject = {
  id: number
  name: string
  description: string
  grade: number
  section: string
  classDisplay: string
  createdByUserId: number
  createdByUsername?: string | null
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
      await apiClient.delete(`/subjects/${id}`)
      showNotification('Subject deleted.', 'success')
      await loadSubjects()
    } catch {
      showNotification('Failed to delete subject.', 'error')
    }
  }

  const canCreate = user?.role === 'Teacher'

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
      <section className={`grid gap-6 ${canCreate || editingId ? 'xl:grid-cols-[0.4fr_0.6fr]' : ''}`}>
        {canCreate || editingId ? (
        <article className="glass-panel p-6">
          <h2 className="text-xl font-semibold text-slate-900">{editingId ? 'Edit subject' : 'New subject'}</h2>
          <div className="mt-5 grid gap-4">
            <input className="rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sky-950 placeholder:text-sky-600/70" placeholder="Subject name" value={name} onChange={(event) => setName(event.target.value)} />
            <textarea className="min-h-32 rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sky-950 placeholder:text-sky-600/70" placeholder="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Grade</label>
                <div className="relative">
                  <select className="w-full appearance-none rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 pr-12 text-sky-950" value={grade} onChange={(event) => setGrade(Number(event.target.value))}>
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
                  <select className="w-full appearance-none rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 pr-12 text-sky-950" value={section} onChange={(event) => setSection(event.target.value)}>
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
            <div className="flex gap-3">
              <button className="button-primary" type="button" onClick={save}>
                {editingId ? 'Save changes' : 'Create subject'}
              </button>
              {editingId ? <button className="rounded-2xl border border-slate-200 px-4 py-3" type="button" onClick={reset}>Cancel</button> : null}
            </div>
          </div>
        </article>
        ) : null}
        <article className="glass-panel p-6">
          <div className="space-y-3">
            {subjects.map((subject) => (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4" key={subject.id}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{subject.name}</p>
                    <p className="text-sm text-slate-600">{subject.description}</p>
                    <span className="mt-2 inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-[#2468a0]">
                      {subject.classDisplay || formatClassDisplay(subject.grade, subject.section)}
                    </span>
                    <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">
                      Created by {subject.createdByUsername ?? 'Teacher'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700" type="button" onClick={() => { setEditingId(subject.id); setName(subject.name); setDescription(subject.description); setGrade(subject.grade); setSection(subject.section) }}>
                      Edit
                    </button>
                    <button className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white" type="button" onClick={() => void remove(subject.id)}>
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
