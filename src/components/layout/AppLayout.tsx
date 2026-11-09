import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { isLocalApi } from '../../api/client'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export function AppLayout() {
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
          {isLocalApi ? (
            <p className="local-mode">
              Локальный режим: профиль и сообщения хранятся в браузере. Запросы к Django те же, что в main.
            </p>
          ) : null}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
