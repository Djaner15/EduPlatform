import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { useTranslation } from './AppSettingsContext'
import { AdminLayout } from '../layouts/AdminLayout'
import { StudentLayout } from '../layouts/StudentLayout'
import { TeacherLayout } from '../layouts/TeacherLayout'
import { RoleBasedLayout } from '../layouts/RoleBasedLayout'
import { ProtectedRoute } from '../shared/components/ProtectedRoute'
import { SiteFooter } from '../shared/components/SiteFooter'

const AdminOverviewPage = lazy(() => import('../features/admin/pages/AdminOverviewPage').then((module) => ({ default: module.AdminOverviewPage })),)
const AdminLessonsPage = lazy(() => import('../features/admin/pages/AdminLessonsPage').then((module) => ({ default: module.AdminLessonsPage })),)
const AdminSubjectsPage = lazy(() => import('../features/admin/pages/AdminSubjectsPage').then((module) => ({ default: module.AdminSubjectsPage })),)
const AdminTestsPage = lazy(() => import('../features/admin/pages/AdminTestsPage').then((module) => ({ default: module.AdminTestsPage })),)
const AdminUsersPage = lazy(() => import('../features/admin/pages/AdminUsersPage').then((module) => ({ default: module.AdminUsersPage })),)
const LoginPage = lazy(() => import('../features/auth/pages/LoginPage').then((module) => ({ default: module.LoginPage })),)
const LessonDetailsPage = lazy(() => import('../features/student/pages/LessonDetailsPage').then((module) => ({ default: module.LessonDetailsPage })),)
const LessonsPage = lazy(() => import('../features/student/pages/LessonsPage').then((module) => ({ default: module.LessonsPage })),)
const ProfilePage = lazy(() => import('../features/student/pages/ProfilePage').then((module) => ({ default: module.ProfilePage })),)
const StudentHomePage = lazy(() => import('../features/student/pages/StudentHomePage').then((module) => ({ default: module.StudentHomePage })),)
const SubjectsPage = lazy(() => import('../features/student/pages/SubjectsPage').then((module) => ({ default: module.SubjectsPage })),)
const TestPage = lazy(() => import('../features/student/pages/TestPage').then((module) => ({ default: module.TestPage })),)
const TestsPage = lazy(() => import('../features/student/pages/TestsPage').then((module) => ({ default: module.TestsPage })),)
const TeacherOverviewPage = lazy(() => import('../features/teacher/pages/TeacherOverviewPage').then((module) => ({ default: module.TeacherOverviewPage })),)
const TeacherSubjectsPage = lazy(() => import('../features/teacher/pages/TeacherSubjectsPage').then((module) => ({ default: module.TeacherSubjectsPage })),)
const AboutPage = lazy(() => import('../shared/pages/AboutPage').then((module) => ({ default: module.AboutPage })),)
const ContactPage = lazy(() => import('../shared/pages/ContactPage').then((module) => ({ default: module.ContactPage })),)
const PrivacyPage = lazy(() => import('../shared/pages/PrivacyPage').then((module) => ({ default: module.PrivacyPage })),)
const SettingsPage = lazy(() => import('../shared/pages/SettingsPage').then((module) => ({ default: module.SettingsPage })),)

function RouteFallback() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-screen items-center justify-center px-6 text-center text-slate-600">
      {t('common.loadingPage')}
    </div>
  )
}

export function App() {
  const { isAuthenticated, isReady, user } = useAuth()
  const location = useLocation()
  const homePath = !isReady
    ? location.pathname
    : !isAuthenticated()
      ? '/login'
      : user?.role === 'Admin'
        ? '/admin'
        : user?.role === 'Teacher'
          ? '/teacher'
          : '/student'
  const isAdminRoute = location.pathname.startsWith('/admin')
  const isTeacherRoute = location.pathname.startsWith('/teacher')
  const isStudentRoute = location.pathname.startsWith('/student')
  const isSettingsRoute = location.pathname.startsWith('/settings')
  const hasSidebarOffset =
    isAdminRoute ||
    isTeacherRoute ||
    isStudentRoute ||
    (isSettingsRoute && isAuthenticated())

  const shouldUseStudentSidebarOffset =
    isStudentRoute || (isSettingsRoute && isAuthenticated() && user?.role === 'Student')

  const footerSidebarWidthClass = shouldUseStudentSidebarOffset
    ? 'lg:ml-[19rem] lg:w-[calc(100%-19rem)]'
    : 'lg:ml-[22rem] lg:w-[calc(100%-22rem)]'

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1">
        <Suspense fallback={<RouteFallback />}>
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
              <Route path="subjects" element={<TeacherSubjectsPage />} />
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
        </Suspense>
      </div>

      <div
        className={`px-3 pb-3 sm:px-6 lg:px-6 ${hasSidebarOffset ? footerSidebarWidthClass : 'w-full lg:px-8'}`}
      >
        <div className={`mx-auto w-full ${hasSidebarOffset ? 'max-w-[1200px]' : 'max-w-6xl'}`}>
          <SiteFooter />
        </div>
      </div>
    </div>
  )
}
