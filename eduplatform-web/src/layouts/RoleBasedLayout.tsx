import { useAuth } from '../app/AuthContext'
import { AdminLayout } from './AdminLayout'
import { StudentLayout } from './StudentLayout'
import { TeacherLayout } from './TeacherLayout'

export function RoleBasedLayout() {
  const { user } = useAuth()

  if (user?.role === 'Admin') {
    return <AdminLayout />
  }

  if (user?.role === 'Teacher') {
    return <TeacherLayout />
  }

  return <StudentLayout />
}
