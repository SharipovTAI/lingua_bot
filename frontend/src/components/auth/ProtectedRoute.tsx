import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

export function ProtectedRoute() {
  const { user, ready } = useAuth()
  const location = useLocation()

  if (!ready) {
    return <div className="boot-screen">Загрузка…</div>
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
