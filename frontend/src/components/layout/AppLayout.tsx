import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  const { profile } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="app-shell">
      <button
        className={`backdrop${menuOpen ? ' open' : ''}`}
        type="button"
        aria-label="Закрыть меню"
        onClick={() => setMenuOpen(false)}
      />
      <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />
      <div className="workspace">
        <Header onMenu={() => setMenuOpen(true)} />
        <main className="content">
          <Outlet key={profile?.language} />
        </main>
      </div>
    </div>
  )
}
