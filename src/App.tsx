import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { DashboardPage } from './pages/DashboardPage'
import { PlaceholderPage } from './pages/PlaceholderPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="practice" element={<PlaceholderPage />} />
        <Route path="lesson" element={<PlaceholderPage />} />
        <Route path="exercises" element={<PlaceholderPage />} />
        <Route path="dictionary" element={<PlaceholderPage />} />
        <Route path="notes" element={<PlaceholderPage />} />
        <Route path="progress" element={<PlaceholderPage />} />
        <Route path="achievements" element={<PlaceholderPage />} />
        <Route path="settings" element={<PlaceholderPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
