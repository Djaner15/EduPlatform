import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../app/AuthContext'

type ProtectedRouteProps = {
  children: ReactNode
  allowedRole?: string
  allowedRoles?: string[]
}

export function ProtectedRoute({ children, allowedRole, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isReady, user } = useAuth()
  const location = useLocation()

  if (!isReady) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-6 text-center text-slate-600">
        Loading workspace...
      </div>
    )
  }

  if (!isAuthenticated()) {
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  const isAllowed =
    allowedRole ? user?.role === allowedRole : allowedRoles ? allowedRoles.includes(user?.role ?? '') : true

  if (!isAllowed) {
    const redirectPath =
      user?.role === 'Admin' ? '/admin' : user?.role === 'Teacher' ? '/teacher' : '/student'
    return <Navigate replace to={redirectPath} />
  }

  return <>{children}</>
}
