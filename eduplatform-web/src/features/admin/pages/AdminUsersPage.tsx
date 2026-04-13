import axios from 'axios'
import { useEffect, useMemo, useRef, useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Fade from '@mui/material/Fade'
import Avatar from '@mui/material/Avatar'
import IconButton from '@mui/material/IconButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import PasswordOutlinedIcon from '@mui/icons-material/PasswordOutlined'
import ToggleOnOutlinedIcon from '@mui/icons-material/ToggleOnOutlined'
import ToggleOffOutlinedIcon from '@mui/icons-material/ToggleOffOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import CloseIcon from '@mui/icons-material/Close'
import { useNotification } from '../../../app/NotificationContext'
import { gradeOptions, sectionOptions } from '../../../shared/classOptions'
import { AdminDateField } from '../../../shared/components/AdminDateField'
import { AdminResetFiltersButton } from '../../../shared/components/AdminResetFiltersButton'
import { AdminSearchField } from '../../../shared/components/AdminSearchField'
import { AdminSelectField } from '../../../shared/components/AdminSelectField'
import { AdminSortHeader } from '../../../shared/components/AdminSortHeader'
import { DeleteConfirmationModal } from '../../../shared/components/DeleteConfirmationModal'
import { PageHeader } from '../../../shared/components/PageHeader'
import apiClient, { resolveApiAssetUrl } from '../../../shared/api/axiosInstance'
import { isWithinDateRange } from '../../../shared/dateFilters'
import { sortItems, type SortDirection } from '../../../shared/tableSorting'
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
  profileImageUrl?: string | null
  isApproved: boolean
}

type ManagedUserAction = {
  id: number
  fullName: string
  username: string
  email: string
  isApproved: boolean
  role: 'Student' | 'Teacher'
  profileImageUrl?: string | null
  classDisplay?: string | null
  subjectNames?: string[]
  assignedClasses?: AssignedClass[]
}

type TeacherItem = {
  id: number
  fullName: string
  username: string
  email: string
  profileImageUrl?: string | null
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
  profileImageUrl?: string | null
  role: string
  isApproved: boolean
  approvedAt?: string | null
}

type UserSortColumn = 'name' | 'role' | 'dateCreated'

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
  profileImageUrl?: string | null
  role: string
  grade?: number | null
  section?: string | null
  classDisplay?: string | null
  subjectIds?: number[]
  assignedClasses?: AssignedClass[]
  isApproved: boolean
  approvedAt?: string | null
}

type DeleteCandidate = {
  id: number
  label: string
}

type TeacherPasswordResetState = {
  newPassword: string
  confirmPassword: string
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

const getInitials = (fullName?: string | null, username?: string | null) => {
  const source = (fullName?.trim() || username?.trim() || 'U').split(/\s+/).filter(Boolean)
  return source
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

const getResolvedUserImageSrc = (path?: string | null) => (path ? resolveApiAssetUrl(path) : undefined)

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

export function AdminUsersPage() {
  const { showNotification } = useNotification()
  const formCardRef = useRef<HTMLElement | null>(null)
  const [allUsers, setAllUsers] = useState<UserItem[]>([])
  const [management, setManagement] = useState<ManagementResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<UserForm>(initialForm)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false)
  const [activeView, setActiveView] = useState<'students' | 'teachers' | 'admins'>('students')
  const [searchTerm, setSearchTerm] = useState('')
  const [gradeFilter, setGradeFilter] = useState<'all' | number>('all')
  const [sectionFilter, setSectionFilter] = useState<'all' | string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')
  const [sortColumn, setSortColumn] = useState<UserSortColumn>('dateCreated')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [expandedGrade, setExpandedGrade] = useState<number | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [classTeacherDrafts, setClassTeacherDrafts] = useState<Record<string, string>>({})
  const [pendingDelete, setPendingDelete] = useState<DeleteCandidate | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditFormHighlighted, setIsEditFormHighlighted] = useState(false)
  const [userActionAnchorEl, setUserActionAnchorEl] = useState<HTMLElement | null>(null)
  const [activeUserAction, setActiveUserAction] = useState<ManagedUserAction | null>(null)
  const [profileUser, setProfileUser] = useState<ManagedUserAction | null>(null)
  const [passwordResetUser, setPasswordResetUser] = useState<ManagedUserAction | null>(null)
  const [passwordResetForm, setPasswordResetForm] = useState<TeacherPasswordResetState>({
    newPassword: '',
    confirmPassword: '',
  })
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)

  const isStudentRole = form.roleId === 1
  const isTeacherRole = form.roleId === 2
  const isUserActionMenuOpen = Boolean(userActionAnchorEl)

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

  useEffect(() => {
    setSearchTerm('')
    setGradeFilter('all')
    setSectionFilter('all')
    setStatusFilter('all')
    setStartDateFilter('')
    setEndDateFilter('')
    setSortColumn('dateCreated')
    setSortDirection('desc')
  }, [activeView])

  const allUsersById = useMemo(() => new Map(allUsers.map((user) => [user.id, user])), [allUsers])

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
      setIsDeleting(true)
      await apiClient.delete(`/users/${id}`)
      setPendingDelete(null)
      showNotification('User deleted successfully.', 'success')
      await loadUsers()
    } catch (error) {
      showNotification(readApiError(error, 'Failed to delete user.'), 'error')
    } finally {
      setIsDeleting(false)
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
    setIsEditFormHighlighted(true)

    window.setTimeout(() => {
      formCardRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 80)
  }

  useEffect(() => {
    if (!isEditFormHighlighted) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setIsEditFormHighlighted(false)
    }, 1800)

    return () => window.clearTimeout(timeoutId)
  }, [isEditFormHighlighted])

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

    const gradeMap = new Map(management.grades.map((gradeGroup) => [gradeGroup.grade, gradeGroup]))

    return gradeOptions
      .filter((grade) => (gradeFilter === 'all' ? true : grade === gradeFilter))
      .map((grade) => {
        const gradeGroup = gradeMap.get(grade)
        const sectionMap = new Map((gradeGroup?.sections ?? []).map((sectionGroup) => [sectionGroup.section, sectionGroup]))

        return {
          grade,
          sections: sectionOptions
            .filter((section) => (sectionFilter === 'all' ? true : section === sectionFilter))
            .map((section) => {
              const sectionGroup = sectionMap.get(section)

              return {
                section,
                classDisplay: `${grade}${section}`,
                classTeacher: sectionGroup?.classTeacher ?? null,
                students: (sectionGroup?.students ?? []).filter((student) => {
                  const studentRecord = allUsersById.get(student.id)
                  const matchesStatus =
                    statusFilter === 'all' || (statusFilter === 'active' ? student.isApproved : !student.isApproved)
                  const matchesDate = isWithinDateRange(studentRecord?.approvedAt, startDateFilter, endDateFilter)

                  if (!matchesStatus || !matchesDate) {
                    return false
                  }

                  if (!normalizedSearch) {
                    return true
                  }

                  return (
                    student.fullName.toLowerCase().includes(normalizedSearch) ||
                    student.username.toLowerCase().includes(normalizedSearch) ||
                    student.email.toLowerCase().includes(normalizedSearch)
                  )
                }),
              }
            }),
        }
      })
  }, [allUsersById, endDateFilter, gradeFilter, management, searchTerm, sectionFilter, startDateFilter, statusFilter])

  const filteredTeachers = useMemo(() => {
    if (!management) {
      return []
    }

    const normalizedSearch = searchTerm.trim().toLowerCase()

    return management.teachers.filter((teacher) => {
      if (gradeFilter !== 'all' && !teacher.assignedClasses.some((entry) => entry.grade === gradeFilter)) {
        return false
      }

      if (sectionFilter !== 'all' && !teacher.assignedClasses.some((entry) => entry.section === sectionFilter)) {
        return false
      }

      const matchesStatus =
        statusFilter === 'all' || (statusFilter === 'active' ? teacher.isApproved : !teacher.isApproved)
      const matchesDate = isWithinDateRange(allUsersById.get(teacher.id)?.approvedAt, startDateFilter, endDateFilter)

      if (!matchesStatus || !matchesDate) {
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
  }, [allUsersById, endDateFilter, gradeFilter, management, searchTerm, sectionFilter, startDateFilter, statusFilter])

  const filteredAdmins = useMemo(() => {
    if (!management) {
      return []
    }

    const normalizedSearch = searchTerm.trim().toLowerCase()

    return management.admins.filter((admin) => {
      const adminRecord = allUsersById.get(admin.id)
      const matchesStatus =
        statusFilter === 'all' || (statusFilter === 'active' ? admin.isApproved : !admin.isApproved)
      const matchesDate = isWithinDateRange(adminRecord?.approvedAt, startDateFilter, endDateFilter)

      if (!matchesStatus || !matchesDate) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      return (
        admin.fullName.toLowerCase().includes(normalizedSearch) ||
        admin.username.toLowerCase().includes(normalizedSearch) ||
        admin.email.toLowerCase().includes(normalizedSearch)
      )
    })
  }, [allUsersById, endDateFilter, management, searchTerm, startDateFilter, statusFilter])

  const sortUsers = <T extends { id: number; fullName: string; role?: string }>(
    items: T[],
    fallbackRole: string,
  ) => {
    const sortMap = {
      name: {
        getValue: (item: T) => item.fullName,
        type: 'text',
      },
      role: {
        getValue: (item: T) => item.role ?? fallbackRole,
        type: 'text',
      },
      dateCreated: {
        getValue: (item: T) => allUsersById.get(item.id)?.approvedAt ?? null,
        type: 'date',
      },
    } as const

    const selectedSort = sortMap[sortColumn]
    return sortItems(items, selectedSort.getValue, sortDirection, selectedSort.type)
  }

  const sortedGrades = useMemo(
    () =>
      filteredGrades.map((gradeGroup) => ({
        ...gradeGroup,
        sections: gradeGroup.sections.map((sectionGroup) => ({
          ...sectionGroup,
          students: sortUsers(sectionGroup.students, 'Student'),
        })),
      })),
    [filteredGrades, sortColumn, sortDirection, allUsersById],
  )

  const sortedTeachers = useMemo(
    () => sortUsers(filteredTeachers.map((teacher) => ({ ...teacher, role: 'Teacher' })), 'Teacher'),
    [filteredTeachers, sortColumn, sortDirection, allUsersById],
  )

  const sortedAdmins = useMemo(
    () => sortUsers(filteredAdmins, 'Admin'),
    [filteredAdmins, sortColumn, sortDirection, allUsersById],
  )

  const handleSortChange = (column: UserSortColumn) => {
    if (sortColumn === column) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortColumn(column)
    setSortDirection(column === 'dateCreated' ? 'desc' : 'asc')
  }

  const resetFilters = () => {
    setSearchTerm('')
    setGradeFilter('all')
    setSectionFilter('all')
    setStatusFilter('all')
    setStartDateFilter('')
    setEndDateFilter('')
    setSortColumn('dateCreated')
    setSortDirection('desc')
  }

  const toggleGrade = (grade: number) => {
    setExpandedGrade((current) => {
      const nextGrade = current === grade ? null : grade
      setExpandedSection(null)
      return nextGrade
    })
  }

  const toggleSection = (grade: number, section: string) => {
    const key = classKey(grade, section)
    setExpandedSection((current) => (current === key ? null : key))
  }

  const getTeacherDisplayName = (teacher: TeacherItem | null | undefined) =>
    teacher?.fullName?.trim() || teacher?.username || ''

  const closeUserActionMenu = () => {
    setUserActionAnchorEl(null)
    setActiveUserAction(null)
  }

  const openUserActionMenu = (event: React.MouseEvent<HTMLElement>, user: ManagedUserAction) => {
    setUserActionAnchorEl(event.currentTarget)
    setActiveUserAction(user)
  }

  const handleManagedUserEdit = (managedUser: ManagedUserAction) => {
    closeUserActionMenu()
    const fullUser = allUsersById.get(managedUser.id)
    if (fullUser) {
      handleEdit(fullUser)
    }
  }

  const handleManagedUserPasswordOpen = (managedUser: ManagedUserAction) => {
    closeUserActionMenu()
    setPasswordResetUser(managedUser)
    setPasswordResetForm({
      newPassword: '',
      confirmPassword: '',
    })
    setShowResetPassword(false)
  }

  const handleTeacherPasswordReset = async () => {
    if (!passwordResetUser) {
      return
    }

    if (!passwordResetForm.newPassword.trim()) {
      showNotification('Please enter a new password.', 'error')
      return
    }

    if (passwordResetForm.newPassword !== passwordResetForm.confirmPassword) {
      showNotification('The new passwords do not match.', 'error')
      return
    }

    const passwordError = validateStrongPassword(passwordResetForm.newPassword)
    if (passwordError) {
      showNotification(passwordError, 'error')
      return
    }

    try {
      setIsResettingPassword(true)
      await apiClient.put(`/users/${passwordResetUser.id}/password`, {
        newPassword: passwordResetForm.newPassword,
      })
      setPasswordResetUser(null)
      setPasswordResetForm({
        newPassword: '',
        confirmPassword: '',
      })
      setShowResetPassword(false)
      showNotification('Password reset successfully.', 'success')
    } catch (error) {
      showNotification(readApiError(error, 'Failed to reset password.'), 'error')
    } finally {
      setIsResettingPassword(false)
    }
  }

  const hasExportableRows =
    activeView === 'students'
      ? sortedGrades.some((gradeGroup) => gradeGroup.sections.some((sectionGroup) => sectionGroup.students.length > 0))
      : sortedTeachers.length > 0

  const handleExportCSV = () => {
    const escapeCsvValue = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`
    const csvLines =
      activeView === 'students'
        ? [
            ['Full Name', 'Email', 'Grade', 'Section', 'Status'].join(','),
            ...sortedGrades.flatMap((gradeGroup) =>
              gradeGroup.sections.flatMap((sectionGroup) =>
                sectionGroup.students.map((student) =>
                  [
                    escapeCsvValue(student.fullName),
                    escapeCsvValue(student.email),
                    escapeCsvValue(gradeGroup.grade),
                    escapeCsvValue(sectionGroup.section),
                    escapeCsvValue(student.isApproved ? 'Active' : 'Inactive'),
                  ].join(','),
                ),
              ),
            ),
          ]
        : [
            ['Full Name', 'Email', 'Status', 'Subjects', 'Assigned Classes'].join(','),
            ...sortedTeachers.map((teacher) =>
              [
                escapeCsvValue(teacher.fullName),
                escapeCsvValue(teacher.email),
                escapeCsvValue(teacher.isApproved ? 'Active' : 'Inactive'),
                escapeCsvValue(teacher.subjectNames.join(', ')),
                escapeCsvValue(teacher.assignedClasses.map((assignedClass) => assignedClass.classDisplay).join(', ')),
              ].join(','),
            ),
          ]

    const blob = new Blob([`\ufeff${csvLines.join('\n')}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = activeView === 'students' ? 'students_export.csv' : 'teachers_export.csv'
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

      <section className="flex flex-col items-start gap-6 xl:flex-row">
        <article
          ref={formCardRef}
          className={`glass-panel h-fit w-full p-7 xl:w-[320px] xl:flex-none transition-all duration-500 ${
            isEditFormHighlighted
              ? 'ring-4 ring-cyan-200/80 shadow-[0_0_0_1px_rgba(34,211,238,0.2),0_24px_56px_rgba(36,104,160,0.2)]'
              : ''
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-slate-900">
              {editingId ? `Edit User (Editing: ${form.fullName || form.username})` : 'Create user'}
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
          <div className="mt-5 grid gap-4.5">
            <input
              className="rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3.5 text-sky-950 placeholder:text-sky-600/70"
              placeholder="Full Name"
              value={form.fullName}
              onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
            />
            <input
              className="rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3.5 text-sky-950 placeholder:text-sky-600/70"
              placeholder="Username"
              value={form.username}
              onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
            />
            <input
              className="rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3.5 text-sky-950 placeholder:text-sky-600/70"
              placeholder="Email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            />

            <div className="password-field">
              <input
                className="w-full rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3.5 text-sky-950 placeholder:text-sky-600/70"
                placeholder={editingId ? 'New password (leave blank to keep current)' : 'Password'}
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              />
              <button className="ghost-toggle" type="button" onClick={() => setShowPassword((current) => !current)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            <AdminSelectField
              label="Role"
              value={String(form.roleId)}
              options={[
                { value: '1', label: 'Student' },
                { value: '2', label: 'Teacher' },
                { value: '3', label: 'Admin' },
              ]}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  roleId: Number(value),
                  subjectIds: Number(value) === 2 ? current.subjectIds : [],
                  assignedClasses: Number(value) === 2 ? current.assignedClasses : [],
                }))
              }
            />

            {isStudentRole ? (
              <div className="grid gap-4 md:grid-cols-2">
                <AdminSelectField
                  label="Grade"
                  value={String(form.grade)}
                  options={gradeOptions.map((grade) => ({ value: String(grade), label: String(grade) }))}
                  onChange={(value) => setForm((current) => ({ ...current, grade: Number(value) }))}
                />

                <AdminSelectField
                  label="Section"
                  value={form.section}
                  options={sectionOptions.map((section) => ({ value: section, label: section }))}
                  onChange={(value) => setForm((current) => ({ ...current, section: value }))}
                />
              </div>
            ) : null}

            {isTeacherRole && management ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Subjects</label>
                  <div className="max-h-48 space-y-2 overflow-y-auto rounded-2xl border border-sky-200 bg-sky-50/55 p-3.5">
                    {management.availableSubjects.map((subject) => {
                      const checked = form.subjectIds.includes(subject.id)
                      return (
                        <label className="flex min-h-[46px] items-start gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-white/70" key={subject.id}>
                          <input
                            checked={checked}
                            className="mt-1 h-4 w-4 shrink-0 rounded border-sky-300 text-sky-600 focus:ring-sky-500"
                            type="checkbox"
                            onChange={() => toggleSubject(subject.id)}
                          />
                          <span className="leading-5">{subject.label}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Assigned classes</label>
                  <div className="grid max-h-48 gap-2.5 overflow-y-auto rounded-2xl border border-sky-200 bg-sky-50/55 p-3.5 sm:grid-cols-2 lg:grid-cols-3">
                    {management.availableClasses.map((assignedClass) => {
                      const checked = form.assignedClasses.some(
                        (entry) => entry.grade === assignedClass.grade && entry.section === assignedClass.section,
                      )

                      return (
                        <label
                          className="flex min-h-[46px] items-center gap-3 rounded-xl border border-transparent bg-white/55 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:border-sky-200 hover:bg-white/80"
                          key={classKey(assignedClass.grade, assignedClass.section)}
                        >
                          <input
                            checked={checked}
                            className="h-4 w-4 shrink-0 rounded border-sky-300 text-sky-600 focus:ring-sky-500"
                            type="checkbox"
                            onChange={() => toggleAssignedClass(assignedClass)}
                          />
                          <span className="truncate">{assignedClass.classDisplay}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </>
            ) : null}

            <div className="flex gap-3">
              <button className="button-primary" type="button" onClick={handleSubmit}>
                {editingId ? 'Save Changes' : 'Create user'}
              </button>
              {editingId ? (
                <button className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold text-slate-700" type="button" onClick={resetForm}>
                  Cancel
                </button>
              ) : null}
            </div>
          </div>
        </article>

        <article className="glass-panel min-w-0 flex-1 p-6">
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
                <button
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${activeView === 'admins' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                  type="button"
                  onClick={() => setActiveView('admins')}
                >
                  Admins
                </button>
              </div>
              <button
                className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-white/80 px-3 py-1.5 text-sm font-semibold text-sky-900 transition hover:border-sky-300 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!hasExportableRows}
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
            </div>
          </div>

          <div className="admin-management-control-bar mt-5">
            <AdminSearchField
              placeholder="Search users..."
              fullWidth={false}
              width={200}
              value={searchTerm}
              onChange={setSearchTerm}
            />

            <div className="admin-management-filter-group">
              {activeView === 'students' || activeView === 'teachers' ? (
                <>
                  <AdminSelectField
                    label="Grade"
                    value={gradeFilter === 'all' ? 'all' : String(gradeFilter)}
                    fullWidth={false}
                    width={130}
                    options={[
                      { value: 'all', label: 'All Grades' },
                      ...gradeOptions.map((grade) => ({ value: String(grade), label: String(grade) })),
                    ]}
                    onChange={(value) => setGradeFilter(value === 'all' ? 'all' : Number(value))}
                  />
                  <AdminSelectField
                    label="Section"
                    value={sectionFilter}
                    fullWidth={false}
                    width={130}
                    options={[
                      { value: 'all', label: 'All Sections' },
                      ...sectionOptions.map((section) => ({ value: section, label: section })),
                    ]}
                    onChange={(value) => setSectionFilter(value)}
                  />
                </>
              ) : null}

              <AdminSelectField
                label="Status"
                value={statusFilter}
                fullWidth={false}
                width={130}
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
                onChange={(value) => setStatusFilter(value as typeof statusFilter)}
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

          {isLoading ? <div className="mt-6 text-slate-600">Loading management data...</div> : null}
          {!isLoading && errorMessage ? <div className="mt-6 text-rose-700">{errorMessage}</div> : null}

          {!isLoading && !errorMessage && activeView === 'students' ? (
            <div className="mt-6 space-y-4">
              {filteredGrades.length ? (
                sortedGrades.map((gradeGroup) => {
                  const isGradeExpanded = expandedGrade === gradeGroup.grade
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

                      <div
                        className={`grid overflow-hidden transition-all duration-300 ease-out ${
                          isGradeExpanded ? 'mt-4 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0'
                        }`}
                      >
                        <div className="min-h-0 space-y-3 overflow-hidden">
                          {gradeGroup.sections.map((sectionGroup) => {
                            const sectionId = classKey(gradeGroup.grade, sectionGroup.section)
                            const isSectionExpanded = expandedSection === sectionId
                            return (
                              <div
                                className="relative rounded-2xl border border-slate-200 bg-slate-50/80"
                                key={sectionId}
                              >
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
                                        <div className="flex-1">
                                          <AdminSelectField
                                            label="Class Teacher"
                                            value={classTeacherDrafts[sectionId] ?? ''}
                                            options={[
                                              { value: '', label: 'Assign a teacher...' },
                                              ...(management?.teachers ?? []).map((teacher) => ({
                                                value: String(teacher.id),
                                                label: getTeacherDisplayName(teacher),
                                              })),
                                            ]}
                                            onChange={(value) =>
                                              setClassTeacherDrafts((current) => ({
                                                ...current,
                                                [sectionId]: value,
                                              }))
                                            }
                                          />
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

                                <div
                                  className={`grid overflow-hidden border-t border-slate-200 bg-white/70 transition-all duration-300 ease-out ${
                                    isSectionExpanded ? 'grid-rows-[1fr] py-4 opacity-100' : 'grid-rows-[0fr] py-0 opacity-0'
                                  }`}
                                >
                                  <div className="min-h-0 overflow-hidden px-4">
                                    <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                                      <colgroup>
                                        <col className="w-[28%]" />
                                        <col className="w-[26%]" />
                                        <col className="w-[14%]" />
                                        <col className="w-[20%]" />
                                        <col className="w-[12%]" />
                                      </colgroup>
                                      <thead className="bg-slate-50/90">
                                        <tr className="text-left text-slate-500">
                                          <th className="px-4 py-3 font-semibold">
                                            <AdminSortHeader
                                              label="Name"
                                              column="name"
                                              activeColumn={sortColumn}
                                              direction={sortDirection}
                                              onToggle={handleSortChange}
                                            />
                                          </th>
                                          <th className="px-4 py-3 font-semibold">Email</th>
                                          <th className="px-4 py-3 font-semibold">
                                            <AdminSortHeader
                                              label="Role"
                                              column="role"
                                              activeColumn={sortColumn}
                                              direction={sortDirection}
                                              onToggle={handleSortChange}
                                            />
                                          </th>
                                          <th className="px-4 py-3 font-semibold">
                                            <AdminSortHeader
                                              label="Date Created"
                                              column="dateCreated"
                                              activeColumn={sortColumn}
                                              direction={sortDirection}
                                              onToggle={handleSortChange}
                                            />
                                          </th>
                                          <th className="px-4 py-3 text-right font-semibold">Actions</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {sectionGroup.students.map((student) => (
                                          <tr className="transition hover:bg-sky-50/35" key={student.id}>
                                            <td className="px-4 py-3">
                                              <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                  <span
                                                    className={`inline-flex h-2.5 w-2.5 rounded-full ${
                                                      student.isApproved
                                                        ? 'bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]'
                                                        : 'bg-rose-500 shadow-[0_0_0_4px_rgba(244,63,94,0.14)]'
                                                    }`}
                                                  />
                                                  <p className="font-medium text-slate-900">{student.fullName}</p>
                                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                                    {student.isApproved ? 'Active' : 'Inactive'}
                                                  </span>
                                                </div>
                                                <p className="text-xs text-slate-500">@{student.username}</p>
                                              </div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">{student.email}</td>
                                            <td className="px-4 py-3 text-slate-600">Student</td>
                                            <td className="px-4 py-3 text-slate-600">{formatDateTime(allUsersById.get(student.id)?.approvedAt)}</td>
                                            <td className="px-4 py-3 text-right">
                                              <IconButton
                                                aria-label={`Open actions for ${student.fullName}`}
                                                size="small"
                                                sx={{
                                                  border: '1px solid rgba(191,219,254,0.9)',
                                                  backgroundColor: 'rgba(255,255,255,0.9)',
                                                  color: '#0f172a',
                                                  transition: 'all 0.2s ease',
                                                  '&:hover': {
                                                    backgroundColor: 'rgba(239,246,255,0.98)',
                                                    borderColor: 'rgba(125,211,252,0.9)',
                                                  },
                                                }}
                                                type="button"
                                                onClick={(event) =>
                                                  openUserActionMenu(event, {
                                                    id: student.id,
                                                    fullName: student.fullName,
                                                    username: student.username,
                                                    email: student.email,
                                                    profileImageUrl: student.profileImageUrl,
                                                    isApproved: student.isApproved,
                                                    role: 'Student',
                                                    classDisplay: sectionGroup.classDisplay,
                                                  })
                                                }
                                              >
                                                <MoreVertIcon fontSize="small" />
                                              </IconButton>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
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
              <div className="overflow-visible rounded-3xl border border-slate-200 bg-white/80 p-4">
                <div className="flex flex-col gap-1">
                  <h3 className="text-lg font-semibold text-slate-900">Teacher Profiles</h3>
                  <p className="text-sm text-slate-500">Review teaching assignments, subjects, and class coverage in one table.</p>
                </div>
                <div className="mt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <colgroup>
                    <col className="w-[18%]" />
                    <col className="w-[18%]" />
                    <col className="w-[10%]" />
                    <col className="w-[22%]" />
                    <col className="w-[18%]" />
                    <col className="w-[10%]" />
                    <col className="w-[4%]" />
                  </colgroup>
                  <thead className="bg-slate-50/90">
                    <tr className="text-left text-slate-500">
                      <th className="px-3 py-3 font-semibold">
                        <AdminSortHeader
                          label="Name"
                          column="name"
                          activeColumn={sortColumn}
                          direction={sortDirection}
                          onToggle={handleSortChange}
                        />
                      </th>
                      <th className="px-3 py-3 font-semibold">Email</th>
                      <th className="px-3 py-3 font-semibold">
                        <AdminSortHeader
                          label="Role"
                          column="role"
                          activeColumn={sortColumn}
                          direction={sortDirection}
                          onToggle={handleSortChange}
                        />
                      </th>
                      <th className="px-3 py-3 font-semibold">Subjects</th>
                      <th className="px-3 py-3 font-semibold">Assigned classes</th>
                      <th className="px-3 py-3 font-semibold">
                        <AdminSortHeader
                          label="Date Created"
                          column="dateCreated"
                          activeColumn={sortColumn}
                          direction={sortDirection}
                          onToggle={handleSortChange}
                        />
                      </th>
                      <th className="px-3 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedTeachers.map((teacher) => {
                      return (
                        <tr className="transition hover:bg-sky-50/35" key={teacher.id}>
                          <td className="px-3 py-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`inline-flex h-2.5 w-2.5 rounded-full ${
                                    teacher.isApproved
                                      ? 'bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]'
                                      : 'bg-rose-500 shadow-[0_0_0_4px_rgba(244,63,94,0.14)]'
                                  }`}
                                />
                                <p className="font-medium text-slate-900">{teacher.fullName}</p>
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                  {teacher.isApproved ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500">@{teacher.username}</p>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-slate-600">{teacher.email}</td>
                          <td className="px-3 py-3 text-slate-600">{teacher.role}</td>
                          <td className="px-3 py-3 text-slate-600">
                            <div className="flex flex-wrap gap-2">
                              {teacher.subjectNames.length ? (
                                teacher.subjectNames.map((subjectName) => (
                                  <span
                                    className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-[#2468a0]"
                                    key={`${teacher.id}-${subjectName}`}
                                  >
                                    {subjectName}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-500">No subjects assigned</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {teacher.assignedClasses.length ? (
                                teacher.assignedClasses.map((assignedClass) => (
                                  <span
                                    className="inline-flex items-center rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-[#2468a0]"
                                    key={assignedClass.classDisplay}
                                  >
                                    {assignedClass.classDisplay}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-500">No classes assigned</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-slate-600">{formatDateTime(allUsersById.get(teacher.id)?.approvedAt)}</td>
                          <td className="px-3 py-3 text-right">
                            <IconButton
                              aria-label={`Open actions for ${teacher.fullName}`}
                              size="small"
                              sx={{
                                border: '1px solid rgba(191,219,254,0.9)',
                                backgroundColor: 'rgba(255,255,255,0.9)',
                                color: '#0f172a',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  backgroundColor: 'rgba(239,246,255,0.98)',
                                  borderColor: 'rgba(125,211,252,0.9)',
                                },
                              }}
                              type="button"
                              onClick={(event) =>
                                openUserActionMenu(event, {
                                  id: teacher.id,
                                  fullName: teacher.fullName,
                                  username: teacher.username,
                                  email: teacher.email,
                                  profileImageUrl: teacher.profileImageUrl,
                                  isApproved: teacher.isApproved,
                                  role: 'Teacher',
                                  subjectNames: teacher.subjectNames,
                                  assignedClasses: teacher.assignedClasses,
                                })
                              }
                            >
                              <MoreVertIcon fontSize="small" />
                            </IconButton>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                </div>
                {!sortedTeachers.length ? (
                  <div className="px-3 py-4 text-sm text-slate-500">No teachers match the current search and filters.</div>
                ) : null}
              </div>
            </div>
          ) : null}

          {!isLoading && !errorMessage && activeView === 'admins' ? (
            <div className="mt-6 space-y-6">
              <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white/80 p-4">
                <h3 className="text-lg font-semibold text-slate-900">Administrators</h3>
                <table className="mt-4 min-w-full divide-y divide-slate-200 text-sm">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="px-3 py-3 font-semibold">
                        <AdminSortHeader
                          label="Name"
                          column="name"
                          activeColumn={sortColumn}
                          direction={sortDirection}
                          onToggle={handleSortChange}
                        />
                      </th>
                      <th className="px-3 py-3 font-semibold">Email</th>
                      <th className="px-3 py-3 font-semibold">
                        <AdminSortHeader
                          label="Role"
                          column="role"
                          activeColumn={sortColumn}
                          direction={sortDirection}
                          onToggle={handleSortChange}
                        />
                      </th>
                      <th className="px-3 py-3 font-semibold">
                        <AdminSortHeader
                          label="Date Created"
                          column="dateCreated"
                          activeColumn={sortColumn}
                          direction={sortDirection}
                          onToggle={handleSortChange}
                        />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedAdmins.map((admin) => (
                      <tr key={admin.id}>
                        <td className="px-3 py-3">
                          <div>
                            <p className="font-medium text-slate-900">{admin.fullName}</p>
                            <p className="text-xs text-slate-500">@{admin.username}</p>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-slate-600">{admin.email}</td>
                        <td className="px-3 py-3 text-slate-600">{admin.role}</td>
                        <td className="px-3 py-3 text-slate-600">{formatDateTime(allUsersById.get(admin.id)?.approvedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!sortedAdmins.length ? (
                  <div className="px-3 py-4 text-sm text-slate-500">No administrators match the current search.</div>
                ) : null}
              </div>
            </div>
          ) : null}
        </article>
      </section>

      <DeleteConfirmationModal
        open={Boolean(pendingDelete)}
        title="Delete user?"
        description={`This will permanently remove ${pendingDelete?.label ?? 'this user'}. This action cannot be undone.`}
        isDeleting={isDeleting}
        onCancel={() => {
          if (!isDeleting) {
            setPendingDelete(null)
          }
        }}
        onConfirm={() => {
          if (pendingDelete) {
            void handleDelete(pendingDelete.id)
          }
        }}
      />

      <Menu
        anchorEl={userActionAnchorEl}
        open={isUserActionMenuOpen}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              minWidth: 220,
              borderRadius: '20px',
              border: '1px solid rgba(191, 219, 254, 0.9)',
              boxShadow: '0 24px 48px rgba(15, 23, 42, 0.16)',
              backgroundColor: 'rgba(255,255,255,0.98)',
              backdropFilter: 'blur(14px)',
              overflow: 'visible',
              zIndex: 1500,
            },
          },
        }}
        onClose={closeUserActionMenu}
      >
        <MenuItem
          onClick={() => {
            if (activeUserAction) {
              setProfileUser(activeUserAction)
            }
            closeUserActionMenu()
          }}
        >
          <ListItemIcon>
            <VisibilityOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Profile</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (activeUserAction) {
              handleManagedUserEdit(activeUserAction)
            }
          }}
        >
          <ListItemIcon>
            <EditOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (activeUserAction) {
              handleManagedUserPasswordOpen(activeUserAction)
            }
          }}
        >
          <ListItemIcon>
            <PasswordOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Change Password</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (activeUserAction) {
              void handleApproval(activeUserAction.id, !activeUserAction.isApproved)
            }
            closeUserActionMenu()
          }}
        >
          <ListItemIcon>
            {activeUserAction?.isApproved ? (
              <ToggleOffOutlinedIcon fontSize="small" />
            ) : (
              <ToggleOnOutlinedIcon fontSize="small" />
            )}
          </ListItemIcon>
          <ListItemText>{activeUserAction?.isApproved ? 'Deactivate' : 'Activate'}</ListItemText>
        </MenuItem>
        <MenuItem
          sx={{ color: '#dc2626' }}
          onClick={() => {
            if (activeUserAction) {
              setPendingDelete({
                id: activeUserAction.id,
                label: activeUserAction.fullName || activeUserAction.username,
              })
            }
            closeUserActionMenu()
          }}
        >
          <ListItemIcon sx={{ color: '#dc2626' }}>
            <DeleteOutlineIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      <Dialog
        fullWidth
        maxWidth={false}
        open={Boolean(profileUser)}
        TransitionComponent={Fade}
        onClose={() => setProfileUser(null)}
        sx={{ zIndex: 1700 }}
        slotProps={{
          backdrop: {
            sx: {
              backgroundColor: 'rgba(15, 23, 42, 0.4)',
              backdropFilter: 'blur(8px)',
            },
          },
          paper: {
            sx: {
              width: '100%',
              maxWidth: '450px',
              borderRadius: '28px',
              border: '1px solid rgba(191,219,254,0.7)',
              boxShadow: '0 28px 56px rgba(15,23,42,0.2)',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(240,249,255,0.95))',
            },
          },
        }}
      >
        <DialogTitle sx={{ px: 3, pt: 3, pb: 1.5 }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <Avatar
                src={getResolvedUserImageSrc(profileUser?.profileImageUrl)}
                sx={{
                  width: 88,
                  height: 88,
                  fontSize: '1.6rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  bgcolor: '#dbeafe',
                  border: '1px solid rgba(191,219,254,0.85)',
                  boxShadow: '0 14px 28px rgba(36,104,160,0.14)',
                  overflow: 'hidden',
                  '& img': {
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    backgroundColor: 'transparent',
                  },
                }}
              >
                {getInitials(profileUser?.fullName, profileUser?.username)}
              </Avatar>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">{profileUser?.role ?? 'User'} Profile</p>
                <h3 className="mt-1 truncate text-[2rem] font-bold leading-tight text-slate-900">{profileUser?.fullName}</h3>
              </div>
            </div>
            <IconButton size="small" onClick={() => setProfileUser(null)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </div>
        </DialogTitle>
        <DialogContent sx={{ px: 3, pb: 2, pt: 0 }}>
          <div className="grid gap-5 pt-2 sm:grid-cols-2">
            <div className="rounded-3xl border border-sky-100 bg-white/90 p-4 shadow-[0_10px_22px_rgba(36,104,160,0.07)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Status</p>
              <div className="mt-3 flex items-center gap-2">
                <span
                  className={`inline-flex h-2.5 w-2.5 rounded-full ${profileUser?.isApproved ? 'bg-emerald-500' : 'bg-rose-500'}`}
                />
                <span className="text-sm font-semibold text-slate-700">
                  {profileUser?.isApproved ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            <div className="rounded-3xl border border-sky-100 bg-white/90 p-4 shadow-[0_10px_22px_rgba(36,104,160,0.07)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Username</p>
              <p className="mt-3 text-sm font-medium text-slate-800">@{profileUser?.username}</p>
            </div>
            <div className="rounded-3xl border border-sky-100 bg-white/90 p-4 shadow-[0_10px_22px_rgba(36,104,160,0.07)] sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Email</p>
              <p className="mt-3 text-sm font-medium text-slate-800">{profileUser?.email}</p>
            </div>
            {profileUser?.role === 'Teacher' ? (
              <>
                <div className="rounded-3xl border border-sky-100 bg-white/90 p-4 shadow-[0_10px_22px_rgba(36,104,160,0.07)] sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Subjects</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {profileUser.subjectNames?.length ? (
                      profileUser.subjectNames.map((subjectName) => (
                        <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-[#2468a0]" key={subjectName}>
                          {subjectName}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500">No subjects assigned</span>
                    )}
                  </div>
                </div>
                <div className="rounded-3xl border border-sky-100 bg-white/90 p-4 shadow-[0_10px_22px_rgba(36,104,160,0.07)] sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Assigned Classes</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {profileUser.assignedClasses?.length ? (
                      profileUser.assignedClasses.map((assignedClass) => (
                        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-[#2468a0]" key={assignedClass.classDisplay}>
                          {assignedClass.classDisplay}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500">No classes assigned</span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-3xl border border-sky-100 bg-white/90 p-4 shadow-[0_10px_22px_rgba(36,104,160,0.07)] sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Class</p>
                <div className="mt-3">
                  {profileUser?.classDisplay ? (
                    <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-[#2468a0]">
                      {profileUser.classDisplay}
                    </span>
                  ) : (
                    <span className="text-sm text-slate-500">No class assigned</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        fullWidth
        maxWidth="sm"
        open={Boolean(passwordResetUser)}
        TransitionComponent={Fade}
        onClose={() => {
          if (!isResettingPassword) {
            setPasswordResetUser(null)
          }
        }}
        sx={{ zIndex: 1700 }}
        slotProps={{
          backdrop: {
            sx: {
              backgroundColor: 'rgba(15, 23, 42, 0.4)',
              backdropFilter: 'blur(8px)',
            },
          },
          paper: {
            sx: {
              borderRadius: '28px',
              border: '1px solid rgba(191,219,254,0.7)',
              boxShadow: '0 28px 56px rgba(15,23,42,0.2)',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(240,249,255,0.95))',
            },
          },
        }}
      >
        <DialogTitle sx={{ px: 3, pt: 3, pb: 1.5 }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">{passwordResetUser?.role ?? 'User'} Access</p>
              <h3 className="mt-1 text-2xl font-semibold text-slate-900">Change Password</h3>
              <p className="mt-1 text-sm text-slate-500">Set a new password for {passwordResetUser?.fullName}.</p>
            </div>
            <IconButton
              size="small"
              onClick={() => {
                if (!isResettingPassword) {
                  setPasswordResetUser(null)
                }
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </div>
        </DialogTitle>
        <DialogContent sx={{ px: 3, pb: 2, pt: 0 }}>
          <div className="space-y-4">
            <div className="password-field">
              <input
                className="w-full rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sky-950 placeholder:text-sky-600/70"
                placeholder="New password"
                type={showResetPassword ? 'text' : 'password'}
                value={passwordResetForm.newPassword}
                onChange={(event) =>
                  setPasswordResetForm((current) => ({
                    ...current,
                    newPassword: event.target.value,
                  }))
                }
              />
              <button className="ghost-toggle" type="button" onClick={() => setShowResetPassword((current) => !current)}>
                {showResetPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              className="w-full rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sky-950 placeholder:text-sky-600/70"
              placeholder="Confirm new password"
              type={showResetPassword ? 'text' : 'password'}
              value={passwordResetForm.confirmPassword}
              onChange={(event) =>
                setPasswordResetForm((current) => ({
                  ...current,
                  confirmPassword: event.target.value,
                }))
              }
            />
            <p className="text-sm text-slate-500">
              Use at least 8 characters with uppercase, lowercase, number, and symbol.
            </p>
          </div>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 0, gap: 1.5 }}>
          <button
            className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50"
            disabled={isResettingPassword}
            type="button"
            onClick={() => setPasswordResetUser(null)}
          >
            Cancel
          </button>
          <button className="button-primary px-4 py-2.5 text-sm" disabled={isResettingPassword} type="button" onClick={() => void handleTeacherPasswordReset()}>
            {isResettingPassword ? 'Saving...' : 'Update Password'}
          </button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
