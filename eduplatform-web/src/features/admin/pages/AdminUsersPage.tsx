import axios from 'axios'
import { Search, UserCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNotification } from '../../../app/NotificationContext'
import { gradeOptions, sectionOptions } from '../../../shared/classOptions'
import { PageHeader } from '../../../shared/components/PageHeader'
import apiClient from '../../../shared/api/axiosInstance'
import { BulkUploadModal } from '../components/BulkUploadModal'

type AssignedClass = {
  grade: number
  section: string
  classDisplay: string
}

type StudentItem = {
  id: number
  fullName: string
  username: string
  email: string
  isApproved: boolean
}

type TeacherItem = {
  id: number
  fullName: string
  username: string
  email: string
  isApproved: boolean
  subjectIds: number[]
  subjectNames: string[]
  assignedClasses: AssignedClass[]
}

type AdminItem = {
  id: number
  fullName: string
  username: string
  email: string
  role: string
  isApproved: boolean
}

type SectionGroup = {
  section: string
  classDisplay: string
  classTeacher: TeacherItem | null
  students: StudentItem[]
}

type GradeGroup = {
  grade: number
  sections: SectionGroup[]
}

type SubjectOption = {
  id: number
  name: string
  grade: number
  section: string
  classDisplay: string
  label: string
}

type UserItem = {
  id: number
  fullName: string
  username: string
  email: string
  role: string
  grade?: number | null
  section?: string | null
  classDisplay?: string | null
  subjectIds?: number[]
  assignedClasses?: AssignedClass[]
  isApproved: boolean
}

type ManagementResponse = {
  grades: GradeGroup[]
  teachers: TeacherItem[]
  admins: AdminItem[]
  availableClasses: AssignedClass[]
  availableSubjects: SubjectOption[]
}

type UserForm = {
  fullName: string
  username: string
  email: string
  password: string
  roleId: number
  grade: number
  section: string
  subjectIds: number[]
  assignedClasses: AssignedClass[]
}

const initialForm: UserForm = {
  fullName: '',
  username: '',
  email: '',
  password: '',
  roleId: 1,
  grade: 8,
  section: 'А',
  subjectIds: [],
  assignedClasses: [],
}

const validateStrongPassword = (password: string) => {
  if (password.length < 8) {
    return 'Password must be at least 8 characters long.'
  }

  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter.'
  }

  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter.'
  }

  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number.'
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Password must contain at least one symbol.'
  }

  return null
}

const classKey = (grade: number, section: string) => `${grade}-${section}`

export function AdminUsersPage() {
  const { showNotification } = useNotification()
  const [allUsers, setAllUsers] = useState<UserItem[]>([])
  const [management, setManagement] = useState<ManagementResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<UserForm>(initialForm)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false)
  const [activeView, setActiveView] = useState<'students' | 'teachers'>('students')
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'Student' | 'Teacher' | 'Admin'>('all')
  const [gradeFilter, setGradeFilter] = useState<'all' | number>('all')
  const [sectionFilter, setSectionFilter] = useState<'all' | string>('all')
  const [expandedGrades, setExpandedGrades] = useState<number[]>(gradeOptions.slice(0, 2))
  const [expandedSections, setExpandedSections] = useState<string[]>([])
  const [classTeacherDrafts, setClassTeacherDrafts] = useState<Record<string, string>>({})
  const [classTeacherSearch, setClassTeacherSearch] = useState<Record<string, string>>({})
  const [openTeacherPicker, setOpenTeacherPicker] = useState<string | null>(null)

  const isStudentRole = form.roleId === 1
  const isTeacherRole = form.roleId === 2

  const readApiError = (error: unknown, fallback: string) => {
    if (axios.isAxiosError(error)) {
      const payload = error.response?.data

      if (typeof payload === 'string') {
        return payload
      }

      if (payload && typeof payload === 'object') {
        if ('error' in payload && typeof payload.error === 'string') {
          return payload.error
        }

        if ('message' in payload && typeof payload.message === 'string') {
          return payload.message
        }
      }
    }

    return fallback
  }

  const loadUsers = async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const [usersResponse, managementResponse] = await Promise.all([
        apiClient.get<UserItem[]>('/users'),
        apiClient.get<ManagementResponse>('/users/management'),
      ])

      setAllUsers(usersResponse.data)
      setManagement(managementResponse.data)
      setClassTeacherDrafts(
        Object.fromEntries(
          managementResponse.data.grades.flatMap((gradeGroup) =>
            gradeGroup.sections.map((sectionGroup) => [
              classKey(gradeGroup.grade, sectionGroup.section),
              sectionGroup.classTeacher?.id ? String(sectionGroup.classTeacher.id) : '',
            ]),
          ),
        ),
      )
    } catch (error) {
      setErrorMessage(readApiError(error, 'Failed to load users.'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadUsers()
  }, [])

  const resetForm = () => {
    setForm(initialForm)
    setEditingId(null)
    setShowPassword(false)
  }

  const toggleSubject = (subjectId: number) => {
    setForm((current) => ({
      ...current,
      subjectIds: current.subjectIds.includes(subjectId)
        ? current.subjectIds.filter((id) => id !== subjectId)
        : [...current.subjectIds, subjectId],
    }))
  }

  const toggleAssignedClass = (assignedClass: AssignedClass) => {
    setForm((current) => {
      const exists = current.assignedClasses.some(
        (entry) => entry.grade === assignedClass.grade && entry.section === assignedClass.section,
      )

      return {
        ...current,
        assignedClasses: exists
          ? current.assignedClasses.filter(
              (entry) => !(entry.grade === assignedClass.grade && entry.section === assignedClass.section),
            )
          : [...current.assignedClasses, assignedClass],
      }
    })
  }

  const handleSubmit = async () => {
    if (!form.fullName.trim() || !form.username.trim() || !form.email.trim()) {
      showNotification('Please complete the full name, username, and email fields.', 'error')
      return
    }

    if (!editingId && !form.password.trim()) {
      showNotification('Please enter a password for the new user.', 'error')
      return
    }

    if (form.password.trim()) {
      const passwordError = validateStrongPassword(form.password)
      if (passwordError) {
        showNotification(passwordError, 'error')
        return
      }
    }

    const payload = {
      username: form.username.trim(),
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      password: form.password,
      roleId: form.roleId,
      grade: isStudentRole ? form.grade : null,
      section: isStudentRole ? form.section : null,
      subjectIds: isTeacherRole ? form.subjectIds : [],
      assignedClasses: isTeacherRole
        ? form.assignedClasses.map((assignedClass) => ({
            grade: assignedClass.grade,
            section: assignedClass.section,
          }))
        : [],
    }

    try {
      if (editingId) {
        await apiClient.put(`/users/${editingId}`, payload)
        showNotification('User updated successfully.', 'success')
      } else {
        await apiClient.post('/users', payload)
        showNotification('User created successfully.', 'success')
      }

      resetForm()
      await loadUsers()
    } catch (error) {
      showNotification(readApiError(error, 'Failed to save user.'), 'error')
    }
  }

  const handleApproval = async (id: number, isApproved: boolean) => {
    try {
      await apiClient.put(`/users/${id}/approval`, { isApproved })
      showNotification(
        isApproved ? 'User approved and notified by email.' : 'User access revoked and notified by email.',
        isApproved ? 'success' : 'error',
      )
      await loadUsers()
    } catch (error) {
      showNotification(readApiError(error, 'Failed to update approval.'), 'error')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await apiClient.delete(`/users/${id}`)
      showNotification('User deleted successfully.', 'success')
      await loadUsers()
    } catch (error) {
      showNotification(readApiError(error, 'Failed to delete user.'), 'error')
    }
  }

  const handleEdit = (user: UserItem) => {
    setEditingId(user.id)
    setForm({
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      password: '',
      roleId:
        user.role === 'Teacher'
          ? 2
          : user.role === 'Admin'
            ? 3
            : 1,
      grade: user.grade ?? 8,
      section: user.section ?? 'А',
      subjectIds: user.subjectIds ?? [],
      assignedClasses: user.assignedClasses ?? [],
    })
  }

  const handleClassTeacherSave = async (grade: number, section: string) => {
    const key = classKey(grade, section)
    const teacherId = classTeacherDrafts[key] ? Number(classTeacherDrafts[key]) : null

    try {
      await apiClient.put('/users/class-teacher', { grade, section, teacherId })
      showNotification('Class teacher updated.', 'success')
      await loadUsers()
    } catch (error) {
      showNotification(readApiError(error, 'Failed to update class teacher.'), 'error')
    }
  }

  const filteredGrades = useMemo(() => {
    if (!management) {
      return []
    }

    const normalizedSearch = searchTerm.trim().toLowerCase()

    if (roleFilter !== 'all' && roleFilter !== 'Student') {
      return []
    }

    return management.grades
      .filter((gradeGroup) => (gradeFilter === 'all' ? true : gradeGroup.grade === gradeFilter))
      .map((gradeGroup) => ({
        ...gradeGroup,
        sections: gradeGroup.sections
          .filter((sectionGroup) => (sectionFilter === 'all' ? true : sectionGroup.section === sectionFilter))
          .map((sectionGroup) => ({
            ...sectionGroup,
            students: sectionGroup.students.filter((student) => {
              if (!normalizedSearch) {
                return true
              }

              return (
                student.fullName.toLowerCase().includes(normalizedSearch) ||
                student.username.toLowerCase().includes(normalizedSearch) ||
                student.email.toLowerCase().includes(normalizedSearch)
              )
            }),
          }))
          .filter((sectionGroup) => sectionGroup.students.length > 0 || sectionGroup.classTeacher !== null),
      }))
      .filter((gradeGroup) => gradeGroup.sections.length > 0)
  }, [gradeFilter, management, roleFilter, searchTerm, sectionFilter])

  const filteredTeachers = useMemo(() => {
    if (!management) {
      return []
    }

    const normalizedSearch = searchTerm.trim().toLowerCase()

    if (roleFilter === 'Student') {
      return []
    }

    return management.teachers.filter((teacher) => {
      if (gradeFilter !== 'all' && !teacher.assignedClasses.some((entry) => entry.grade === gradeFilter)) {
        return false
      }

      if (sectionFilter !== 'all' && !teacher.assignedClasses.some((entry) => entry.section === sectionFilter)) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      return (
        teacher.fullName.toLowerCase().includes(normalizedSearch) ||
        teacher.username.toLowerCase().includes(normalizedSearch) ||
        teacher.email.toLowerCase().includes(normalizedSearch) ||
        teacher.subjectNames.some((subject) => subject.toLowerCase().includes(normalizedSearch))
      )
    })
  }, [gradeFilter, management, roleFilter, searchTerm, sectionFilter])

  const filteredAdmins = useMemo(() => {
    if (!management) {
      return []
    }

    const normalizedSearch = searchTerm.trim().toLowerCase()

    if (roleFilter === 'Student' || roleFilter === 'Teacher') {
      return []
    }

    return management.admins.filter((admin) => {
      if (!normalizedSearch) {
        return true
      }

      return (
        admin.fullName.toLowerCase().includes(normalizedSearch) ||
        admin.username.toLowerCase().includes(normalizedSearch) ||
        admin.email.toLowerCase().includes(normalizedSearch)
      )
    })
  }, [management, roleFilter, searchTerm])

  const toggleGrade = (grade: number) => {
    setExpandedGrades((current) =>
      current.includes(grade) ? current.filter((entry) => entry !== grade) : [...current, grade],
    )
  }

  const toggleSection = (grade: number, section: string) => {
    const key = classKey(grade, section)
    setExpandedSections((current) =>
      current.includes(key) ? current.filter((entry) => entry !== key) : [...current, key],
    )
  }

  const getTeacherDisplayName = (teacher: TeacherItem | null | undefined) =>
    teacher?.fullName?.trim() || teacher?.username || ''

  const handleExportCSV = () => {
    const exportedRows = filteredGrades.flatMap((gradeGroup) =>
      gradeGroup.sections.flatMap((sectionGroup) =>
        sectionGroup.students.map((student) => ({
          fullName: student.fullName,
          email: student.email,
          grade: gradeGroup.grade,
          section: sectionGroup.section,
        })),
      ),
    )

    const escapeCsvValue = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`
    const csvLines = [
      ['Full Name', 'Email', 'Grade', 'Section'].join(','),
      ...exportedRows.map((row) =>
        [
          escapeCsvValue(row.fullName),
          escapeCsvValue(row.email),
          escapeCsvValue(row.grade),
          escapeCsvValue(row.section),
        ].join(','),
      ),
    ]

    const blob = new Blob([`\ufeff${csvLines.join('\n')}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'students_export.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-8">
      <BulkUploadModal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        onImported={loadUsers}
      />

      <PageHeader
        description="Manage students by class, assign class teachers, and coordinate teacher workload across the school."
        eyebrow="Users"
        title="User Management"
      />

      <section className="grid items-start gap-6 xl:grid-cols-[0.36fr_0.64fr]">
        <article className="glass-panel self-start p-6 xl:sticky xl:top-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-slate-900">
              {editingId ? 'Edit user' : 'Create user'}
            </h2>
            {!editingId ? (
              <button
                className="rounded-2xl border border-sky-200 bg-white/85 px-4 py-3 text-sm font-semibold text-sky-900 transition hover:border-sky-300 hover:bg-sky-50"
                type="button"
                onClick={() => setIsBulkUploadOpen(true)}
              >
                Bulk upload
              </button>
            ) : null}
          </div>
          <div className="mt-5 grid gap-4">
            <input
              className="rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sky-950 placeholder:text-sky-600/70"
              placeholder="Full Name"
              value={form.fullName}
              onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
            />
            <input
              className="rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sky-950 placeholder:text-sky-600/70"
              placeholder="Username"
              value={form.username}
              onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
            />
            <input
              className="rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sky-950 placeholder:text-sky-600/70"
              placeholder="Email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            />

            <div className="password-field">
              <input
                className="w-full rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sky-950 placeholder:text-sky-600/70"
                placeholder={editingId ? 'New password (leave blank to keep current)' : 'Password'}
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              />
              <button className="ghost-toggle" type="button" onClick={() => setShowPassword((current) => !current)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            <div className="relative">
              <select
                className="w-full appearance-none rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 pr-12 text-sky-950 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                value={form.roleId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    roleId: Number(event.target.value),
                    subjectIds: Number(event.target.value) === 2 ? current.subjectIds : [],
                    assignedClasses: Number(event.target.value) === 2 ? current.assignedClasses : [],
                  }))
                }
              >
                <option value={1}>Student</option>
                <option value={2}>Teacher</option>
                <option value={3}>Admin</option>
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sky-800">
                <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>

            {isStudentRole ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Grade</label>
                  <div className="relative">
                    <select
                      className="w-full appearance-none rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 pr-12 text-sky-950 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                      value={form.grade}
                      onChange={(event) => setForm((current) => ({ ...current, grade: Number(event.target.value) }))}
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
                      className="w-full appearance-none rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 pr-12 text-sky-950 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                      value={form.section}
                      onChange={(event) => setForm((current) => ({ ...current, section: event.target.value }))}
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
            ) : null}

            {isTeacherRole && management ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Subjects</label>
                  <div className="max-h-44 space-y-2 overflow-y-auto rounded-2xl border border-sky-200 bg-sky-50/55 p-3">
                    {management.availableSubjects.map((subject) => {
                      const checked = form.subjectIds.includes(subject.id)
                      return (
                        <label className="flex items-start gap-3 rounded-xl px-2 py-2 text-sm text-slate-700 hover:bg-white/70" key={subject.id}>
                          <input
                            checked={checked}
                            className="mt-1"
                            type="checkbox"
                            onChange={() => toggleSubject(subject.id)}
                          />
                          <span>{subject.label}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Assigned classes</label>
                  <div className="grid max-h-44 gap-2 overflow-y-auto rounded-2xl border border-sky-200 bg-sky-50/55 p-3 sm:grid-cols-2">
                    {management.availableClasses.map((assignedClass) => {
                      const checked = form.assignedClasses.some(
                        (entry) => entry.grade === assignedClass.grade && entry.section === assignedClass.section,
                      )

                      return (
                        <label className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm text-slate-700 hover:bg-white/70" key={classKey(assignedClass.grade, assignedClass.section)}>
                          <input checked={checked} type="checkbox" onChange={() => toggleAssignedClass(assignedClass)} />
                          <span>{assignedClass.classDisplay}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </>
            ) : null}

            <div className="flex gap-3">
              <button className="button-primary" type="button" onClick={handleSubmit}>
                {editingId ? 'Save changes' : 'Create user'}
              </button>
              {editingId ? (
                <button className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold text-slate-700" type="button" onClick={resetForm}>
                  Cancel
                </button>
              ) : null}
            </div>
          </div>
        </article>

        <article className="glass-panel p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-slate-900">School structure</h2>
              <p className="mt-1 text-sm text-slate-500">Browse students by grade and section, or switch to teacher workload.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <div className="inline-flex rounded-2xl border border-sky-200 bg-sky-50/70 p-1">
                <button
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${activeView === 'students' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                  type="button"
                  onClick={() => setActiveView('students')}
                >
                  Classes
                </button>
                <button
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${activeView === 'teachers' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                  type="button"
                  onClick={() => setActiveView('teachers')}
                >
                  Teachers
                </button>
              </div>
              {activeView === 'students' ? (
                <button
                  className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-white/80 px-3 py-1.5 text-sm font-semibold text-sky-900 transition hover:border-sky-300 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!filteredGrades.some((gradeGroup) => gradeGroup.sections.some((sectionGroup) => sectionGroup.students.length > 0))}
                  title="Export current list to CSV"
                  type="button"
                  onClick={handleExportCSV}
                >
                  <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="m7 10 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M5 21h14" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Export CSV
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))]">
            <input
              className="rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sky-950 placeholder:text-sky-600/70"
              placeholder="Search by name, username, or email"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <select
              className="rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sky-950"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as typeof roleFilter)}
            >
              <option value="all">All roles</option>
              <option value="Student">Students</option>
              <option value="Teacher">Teachers</option>
              <option value="Admin">Admins</option>
            </select>
            <select
              className="rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sky-950"
              value={gradeFilter}
              onChange={(event) => setGradeFilter(event.target.value === 'all' ? 'all' : Number(event.target.value))}
            >
              <option value="all">All grades</option>
              {gradeOptions.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
            <select
              className="rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sky-950"
              value={sectionFilter}
              onChange={(event) => setSectionFilter(event.target.value)}
            >
              <option value="all">All sections</option>
              {sectionOptions.map((section) => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </select>
          </div>

          {isLoading ? <div className="mt-6 text-slate-600">Loading management data...</div> : null}
          {!isLoading && errorMessage ? <div className="mt-6 text-rose-700">{errorMessage}</div> : null}

          {!isLoading && !errorMessage && activeView === 'students' ? (
            <div className="mt-6 space-y-4">
              {filteredGrades.length ? (
                filteredGrades.map((gradeGroup) => {
                  const isGradeExpanded = expandedGrades.includes(gradeGroup.grade)
                  return (
                    <div className="rounded-3xl border border-slate-200 bg-white/75 p-4" key={gradeGroup.grade}>
                      <button
                        className="flex w-full items-center justify-between text-left"
                        type="button"
                        onClick={() => toggleGrade(gradeGroup.grade)}
                      >
                        <div>
                          <h3 className="text-xl font-semibold text-slate-900">{gradeGroup.grade} Class</h3>
                          <p className="text-sm text-slate-500">{gradeGroup.sections.reduce((sum, section) => sum + section.students.length, 0)} students</p>
                        </div>
                        <span className="text-slate-500">{isGradeExpanded ? '−' : '+'}</span>
                      </button>

                      {isGradeExpanded ? (
                        <div className="mt-4 space-y-3">
                          {gradeGroup.sections.map((sectionGroup) => {
                            const sectionId = classKey(gradeGroup.grade, sectionGroup.section)
                            const isSectionExpanded = expandedSections.includes(sectionId)
                            return (
                              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80" key={sectionId}>
                                <button
                                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-white/50"
                                  type="button"
                                  onClick={() => toggleSection(gradeGroup.grade, sectionGroup.section)}
                                >
                                  <div>
                                    <h4 className="text-lg font-semibold text-slate-900">{sectionGroup.classDisplay}</h4>
                                    <p className="text-sm text-slate-500">{sectionGroup.students.length} students</p>
                                  </div>
                                  <span className="text-slate-500">{isSectionExpanded ? '−' : '+'}</span>
                                </button>

                                <div className="border-t border-slate-200 bg-white/80 px-4 py-4">
                                  <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-slate-700">Class Teacher</p>
                                      <p className="mt-1 text-sm text-slate-500">
                                        {getTeacherDisplayName(sectionGroup.classTeacher) || 'Not assigned yet'}
                                      </p>
                                    </div>

                                    <div className="flex flex-1 flex-col gap-2 xl:max-w-md">
                                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                        <div className="relative flex-1">
                                          <button
                                            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-left text-sky-950 transition hover:border-sky-300 hover:bg-white"
                                            type="button"
                                            onClick={() =>
                                              setOpenTeacherPicker((current) => (current === sectionId ? null : sectionId))
                                            }
                                          >
                                            <span className={classTeacherDrafts[sectionId] ? 'text-sky-950' : 'text-sky-600/70'}>
                                              {(() => {
                                                const selectedTeacher = management?.teachers.find(
                                                  (teacher) => String(teacher.id) === (classTeacherDrafts[sectionId] ?? ''),
                                                )
                                                return selectedTeacher
                                                  ? getTeacherDisplayName(selectedTeacher)
                                                  : 'Assign a teacher...'
                                              })()}
                                            </span>
                                            <svg aria-hidden="true" className="h-5 w-5 shrink-0 text-sky-800" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                              <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                          </button>

                                          {openTeacherPicker === sectionId ? (
                                            <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-2xl border border-sky-200 bg-white shadow-[0_18px_40px_rgba(36,104,160,0.18)]">
                                              <div className="border-b border-slate-200 p-3">
                                                <div className="flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50/70 px-3 py-2">
                                                  <Search className="h-4 w-4 text-sky-700" />
                                                  <input
                                                    className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-sky-600/70"
                                                    placeholder="Search teacher..."
                                                    value={classTeacherSearch[sectionId] ?? ''}
                                                    onChange={(event) =>
                                                      setClassTeacherSearch((current) => ({
                                                        ...current,
                                                        [sectionId]: event.target.value,
                                                      }))
                                                    }
                                                  />
                                                </div>
                                              </div>

                                              <div className="max-h-64 overflow-y-auto p-2">
                                                <button
                                                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition hover:bg-sky-50 ${!classTeacherDrafts[sectionId] ? 'bg-sky-50 text-slate-900' : 'text-slate-700'}`}
                                                  type="button"
                                                  onClick={() => {
                                                    setClassTeacherDrafts((current) => ({ ...current, [sectionId]: '' }))
                                                    setOpenTeacherPicker(null)
                                                  }}
                                                >
                                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                                                    <UserCheck className="h-4 w-4" />
                                                  </div>
                                                  <div>
                                                    <p className="font-medium">Assign a teacher...</p>
                                                    <p className="text-xs text-slate-500">No class teacher assigned</p>
                                                  </div>
                                                </button>

                                                {management?.teachers
                                                  .filter((teacher) => {
                                                    const query = (classTeacherSearch[sectionId] ?? '').trim().toLowerCase()
                                                    if (!query) {
                                                      return true
                                                    }

                                                    return (
                                                      teacher.fullName.toLowerCase().includes(query) ||
                                                      teacher.username.toLowerCase().includes(query) ||
                                                      teacher.email.toLowerCase().includes(query)
                                                    )
                                                  })
                                                  .map((teacher) => {
                                                    const isSelected = String(teacher.id) === (classTeacherDrafts[sectionId] ?? '')

                                                    return (
                                                      <button
                                                        className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition hover:bg-sky-50 ${isSelected ? 'bg-sky-50 text-slate-900' : 'text-slate-700'}`}
                                                        key={teacher.id}
                                                        type="button"
                                                        onClick={() => {
                                                          setClassTeacherDrafts((current) => ({
                                                            ...current,
                                                            [sectionId]: String(teacher.id),
                                                          }))
                                                          setOpenTeacherPicker(null)
                                                        }}
                                                      >
                                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-100 text-[#2468a0]">
                                                          <UserCheck className="h-4 w-4" />
                                                        </div>
                                                        <div className="min-w-0">
                                                          <p className="truncate font-medium">{getTeacherDisplayName(teacher)}</p>
                                                          <p className="truncate text-xs text-slate-500">{teacher.email}</p>
                                                        </div>
                                                      </button>
                                                    )
                                                  })}
                                              </div>
                                            </div>
                                          ) : null}
                                        </div>

                                        <button
                                          className="button-primary px-3 py-2 text-sm"
                                          type="button"
                                          onClick={() => handleClassTeacherSave(gradeGroup.grade, sectionGroup.section)}
                                        >
                                          Save
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {isSectionExpanded ? (
                                  <div className="border-t border-slate-200 bg-white/70 px-4 py-4">
                                    <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                                      <thead className="bg-slate-50/90">
                                        <tr className="text-left text-slate-500">
                                          <th className="px-4 py-3 font-semibold">Student</th>
                                          <th className="px-4 py-3 font-semibold">Email</th>
                                          <th className="px-4 py-3 font-semibold">Actions</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {sectionGroup.students.map((student) => (
                                          <tr key={student.id}>
                                            <td className="px-4 py-3">
                                              <div>
                                                <p className="font-medium text-slate-900">{student.fullName}</p>
                                                <p className="text-xs text-slate-500">@{student.username}</p>
                                              </div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">{student.email}</td>
                                            <td className="px-4 py-3">
                                              <div className="flex flex-wrap gap-2">
                                                {student.isApproved ? (
                                                  <button className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-white" type="button" onClick={() => handleApproval(student.id, false)}>
                                                    Revoke
                                                  </button>
                                                ) : (
                                                  <button className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white" type="button" onClick={() => handleApproval(student.id, true)}>
                                                    Approve
                                                  </button>
                                                )}
                                                <button
                                                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
                                                  type="button"
                                                  onClick={() => {
                                                    const fullUser = allUsers.find((user) => user.id === student.id)
                                                    if (fullUser) {
                                                      handleEdit(fullUser)
                                                    }
                                                  }}
                                                >
                                                  Edit
                                                </button>
                                                <button className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white" type="button" onClick={() => handleDelete(student.id)}>
                                                  Delete
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            )
                          })}
                        </div>
                      ) : null}
                    </div>
                  )
                })
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 text-slate-600">
                  No student classes match the current search and filters.
                </div>
              )}
            </div>
          ) : null}

          {!isLoading && !errorMessage && activeView === 'teachers' ? (
            <div className="mt-6 space-y-6">
              <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white/80 p-4">
                <div className="flex flex-col gap-1">
                  <h3 className="text-lg font-semibold text-slate-900">Teacher Profiles</h3>
                  <p className="text-sm text-slate-500">Review teaching assignments, subjects, and class coverage in one table.</p>
                </div>
                <table className="mt-4 min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50/90">
                    <tr className="text-left text-slate-500">
                      <th className="px-3 py-3 font-semibold">Name</th>
                      <th className="px-3 py-3 font-semibold">Email</th>
                      <th className="px-3 py-3 font-semibold">Subjects</th>
                      <th className="px-3 py-3 font-semibold">Assigned classes</th>
                      <th className="px-3 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTeachers.map((teacher) => {
                      const fullUser = allUsers.find((user) => user.id === teacher.id)

                      return (
                        <tr key={teacher.id}>
                          <td className="px-3 py-3">
                            <div>
                              <p className="font-medium text-slate-900">{teacher.fullName}</p>
                              <p className="text-xs text-slate-500">@{teacher.username}</p>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-slate-600">{teacher.email}</td>
                          <td className="px-3 py-3 text-slate-600">{teacher.subjectNames.join(', ') || 'No subjects assigned'}</td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-2">
                              {teacher.assignedClasses.length ? (
                                teacher.assignedClasses.map((assignedClass) => (
                                  <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-[#2468a0]" key={assignedClass.classDisplay}>
                                    {assignedClass.classDisplay}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-500">No classes assigned</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-2">
                              {teacher.isApproved ? (
                                <button className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-white" type="button" onClick={() => handleApproval(teacher.id, false)}>
                                  Revoke
                                </button>
                              ) : (
                                <button className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white" type="button" onClick={() => handleApproval(teacher.id, true)}>
                                  Approve
                                </button>
                              )}
                              <button
                                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
                                type="button"
                                onClick={() => {
                                  if (fullUser) {
                                    handleEdit(fullUser)
                                  }
                                }}
                              >
                                Edit
                              </button>
                              <button className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white" type="button" onClick={() => handleDelete(teacher.id)}>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {!filteredTeachers.length ? (
                  <div className="px-3 py-4 text-sm text-slate-500">No teachers match the current search and filters.</div>
                ) : null}
              </div>

              <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white/80 p-4">
                <h3 className="text-lg font-semibold text-slate-900">Administrators</h3>
                <table className="mt-4 min-w-full divide-y divide-slate-200 text-sm">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="px-3 py-3 font-semibold">Name</th>
                      <th className="px-3 py-3 font-semibold">Email</th>
                      <th className="px-3 py-3 font-semibold">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAdmins.map((admin) => (
                      <tr key={admin.id}>
                        <td className="px-3 py-3">
                          <div>
                            <p className="font-medium text-slate-900">{admin.fullName}</p>
                            <p className="text-xs text-slate-500">@{admin.username}</p>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-slate-600">{admin.email}</td>
                        <td className="px-3 py-3 text-slate-600">{admin.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!filteredAdmins.length ? (
                  <div className="px-3 py-4 text-sm text-slate-500">No administrators match the current search.</div>
                ) : null}
              </div>
            </div>
          ) : null}
        </article>
      </section>
    </div>
  )
}
