import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { DashboardPage } from './pages/DashboardPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ProfilePage } from './pages/ProfilePage'
import { ChatPage } from './pages/ChatPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="practice" element={<ChatPage />} />
          <Route path="lesson" element={<PlaceholderPage />} />
          <Route path="exercises" element={<PlaceholderPage />} />
          <Route path="dictionary" element={<PlaceholderPage />} />
          <Route path="notes" element={<PlaceholderPage />} />
          <Route path="progress" element={<PlaceholderPage />} />
          <Route path="achievements" element={<PlaceholderPage />} />
          <Route path="settings" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
