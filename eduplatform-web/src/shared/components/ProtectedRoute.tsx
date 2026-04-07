import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../app/AuthContext'

type ProtectedRouteProps = {
  children: ReactNode
  allowedRole?: string
  allowedRoles?: string[]
}

export function ProtectedRoute({ children, allowedRole, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

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
