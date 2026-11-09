import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { LogOut } from 'lucide-react'
import { api } from '../api/client'
import { ApiError, LEVELS } from '../api/types'
import type { Level } from '../api/types'
import { useAuth } from '../auth/AuthContext'

export function ProfilePage() {
  const { user, profile, logout, setProfile } = useAuth()
  const [level, setLevel] = useState<Level>(profile?.level ?? 'A1')
  const [goal, setGoal] = useState(profile?.goal ?? '')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!profile) return
    setLevel(profile.level)
    setGoal(profile.goal)
  }, [profile])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSaved('')
    setPending(true)
    try {
      const next = await api.updateProfile({ level, goal })
      setProfile(next)
      setSaved('Профиль сохранён.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось сохранить профиль.')
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="placeholder profile-page">
      <h1>Профиль</h1>
      <p>Уровень и цель обучения хранятся на сервере и принадлежат только вашему аккаунту.</p>

      <div className="profile-email">{user?.email}</div>

      {error ? <div className="alert">{error}</div> : null}
      {saved ? <div className="alert success">{saved}</div> : null}

      <form className="profile-form" onSubmit={onSubmit}>
        <label className="field">
          Уровень английского
          <select value={level} onChange={(event) => setLevel(event.target.value as Level)}>
            {LEVELS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          Цель обучения
          <textarea
            maxLength={200}
            rows={3}
            value={goal}
            placeholder="Например: общение в путешествиях"
            onChange={(event) => setGoal(event.target.value)}
          />
          <span className="field-hint">{goal.length}/200</span>
        </label>

        <div className="profile-actions">
          <button className="btn-primary" type="submit" disabled={pending}>
            {pending ? 'Сохраняем…' : 'Сохранить'}
          </button>
          <button className="btn-ghost" type="button" onClick={() => void logout()}>
            <LogOut size={16} />
            Выйти
          </button>
        </div>
      </form>
    </section>
  )
}
