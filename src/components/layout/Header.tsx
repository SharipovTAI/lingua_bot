import { Bell, ChevronDown, Flame, Menu, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

type HeaderProps = {
  onMenu: () => void
}

export function Header({ onMenu }: HeaderProps) {
  const { user, profile } = useAuth()
  const name = user?.email.split('@')[0] ?? 'Пользователь'

  return (
    <header className="topbar">
      <button className="menu-btn" type="button" onClick={onMenu} aria-label="Меню">
        <Menu size={18} />
      </button>

      <button className="chip" type="button">
        <span className="flag" aria-hidden>
          <svg viewBox="0 0 16 12" width="16" height="12">
            <rect width="16" height="12" fill="#012169" />
            <path d="M0 0l16 12M16 0L0 12" stroke="#fff" strokeWidth="2.4" />
            <path d="M0 0l16 12M16 0L0 12" stroke="#C8102E" strokeWidth="1.2" />
            <path d="M8 0v12M0 6h16" stroke="#fff" strokeWidth="4" />
            <path d="M8 0v12M0 6h16" stroke="#C8102E" strokeWidth="2.2" />
          </svg>
        </span>
        Английский
        <ChevronDown size={14} color="#7a8c89" />
      </button>

      <button className="chip" type="button">
        <Flame size={16} />
        12-дневная серия
      </button>

      <button className="chip ghost" type="button" aria-label="Уведомления">
        <Bell size={16} />
      </button>

      <Link className="chip user-chip" to="/settings">
        <span className="avatar">
          <UserRound size={16} />
        </span>
        <span className="user-meta">
          {name}
          <small>Уровень: {profile?.level ?? 'A1'}</small>
        </span>
        <ChevronDown size={14} color="#7a8c89" />
      </Link>
    </header>
  )
}
