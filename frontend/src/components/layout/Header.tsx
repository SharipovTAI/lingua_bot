import { useState } from 'react'
import { Flame, Menu, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useActivity } from '../../hooks/useActivity'
import { api } from '../../api/client'
import { LANGUAGES } from '../../api/types'
import type { Language } from '../../api/types'

export function Header({ onMenu }: { onMenu: () => void }) {
  const { user, profile, setProfile } = useAuth()
  const activity = useActivity(user?.id)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  async function switchLanguage(language: Language) {
    setPending(true)
    setError('')
    try {
      setProfile(await api.updateProfile({ language }))
    } catch {
      setError('Не удалось сменить язык. Повторите.')
    } finally {
      setPending(false)
    }
  }
  return (
    <header className="topbar">
      <button
        className="menu-btn"
        type="button"
        onClick={onMenu}
        aria-label="Меню"
      >
        <Menu size={18} />
      </button>
      <label className="chip language-switch">
        <select
          aria-label="Изучаемый язык"
          value={profile?.language ?? 'en'}
          disabled={pending}
          onChange={(event) =>
            void switchLanguage(event.target.value as Language)
          }
        >
          {Object.entries(LANGUAGES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <Link className="chip" to="/progress">
        <Flame size={16} />
        {activity.streak}-дневная серия
      </Link>
      {error && <span role="alert">{error}</span>}
      <Link className="chip user-chip" to="/settings">
        <span className="avatar">
          <UserRound size={16} />
        </span>
        <span className="user-meta">
          {user?.email.split('@')[0]}
          <small>Уровень: {profile?.level ?? 'A1'}</small>
        </span>
      </Link>
    </header>
  )
}
