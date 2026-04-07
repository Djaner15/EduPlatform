import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { AdminOverviewPage } from '../features/admin/pages/AdminOverviewPage'
import { AdminLessonsPage } from '../features/admin/pages/AdminLessonsPage'
import { AdminSubjectsPage } from '../features/admin/pages/AdminSubjectsPage'
import { AdminTestsPage } from '../features/admin/pages/AdminTestsPage'
import { AdminUsersPage } from '../features/admin/pages/AdminUsersPage'
import { LoginPage } from '../features/auth/pages/LoginPage'
import { LessonDetailsPage } from '../features/student/pages/LessonDetailsPage'
import { LessonsPage } from '../features/student/pages/LessonsPage'
import { ProfilePage } from '../features/student/pages/ProfilePage'
import { StudentHomePage } from '../features/student/pages/StudentHomePage'
import { SubjectsPage } from '../features/student/pages/SubjectsPage'
import { TestPage } from '../features/student/pages/TestPage'
import { TestsPage } from '../features/student/pages/TestsPage'
import { TeacherOverviewPage } from '../features/teacher/pages/TeacherOverviewPage'
import { AdminLayout } from '../layouts/AdminLayout'
import { StudentLayout } from '../layouts/StudentLayout'
import { TeacherLayout } from '../layouts/TeacherLayout'
import { RoleBasedLayout } from '../layouts/RoleBasedLayout'
import { ProtectedRoute } from '../shared/components/ProtectedRoute'
import { AboutPage } from '../shared/pages/AboutPage'
import { ContactPage } from '../shared/pages/ContactPage'
import { PrivacyPage } from '../shared/pages/PrivacyPage'
import { SettingsPage } from '../shared/pages/SettingsPage'

export function App() {
  const { isAuthenticated, user } = useAuth()
  const homePath = !isAuthenticated() ? '/login' : user?.role === 'Admin' ? '/admin' : user?.role === 'Teacher' ? '/teacher' : '/student'

  return (
    <Routes>
      <Route path="/" element={<Navigate to={homePath} replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <RoleBasedLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<SettingsPage />} />
      </Route>
      <Route
        path="/teacher"
        element={
          <ProtectedRoute allowedRole="Teacher">
            <TeacherLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<TeacherOverviewPage />} />
        <Route path="subjects" element={<AdminSubjectsPage />} />
        <Route path="lessons" element={<AdminLessonsPage />} />
        <Route path="tests" element={<AdminTestsPage />} />
      </Route>
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRole="Admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminOverviewPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="subjects" element={<AdminSubjectsPage />} />
        <Route path="lessons" element={<AdminLessonsPage />} />
        <Route path="tests" element={<AdminTestsPage />} />
      </Route>
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRole="Student">
            <StudentLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<StudentHomePage />} />
        <Route path="subjects" element={<SubjectsPage />} />
        <Route path="lessons" element={<LessonsPage />} />
        <Route path="lessons/:id" element={<LessonDetailsPage />} />
        <Route path="tests" element={<TestsPage />} />
        <Route path="tests/:id" element={<TestPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to={homePath} replace />} />
    </Routes>
  )
}
