import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { isLocalApi } from '../api/client'
import { ApiError } from '../api/types'
import { useAuth } from '../auth/AuthContext'

export function RegisterPage() {
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  if (user) {
    return <Navigate to="/" replace />
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setPending(true)
    try {
      await register(email.trim(), password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось зарегистрироваться.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={onSubmit}>
        <div className="brand auth-brand">
          <span className="brand-mark">
            <MessageCircle size={18} strokeWidth={2.2} />
          </span>
          LinguaBot
        </div>
        <h1>Регистрация</h1>
        <p className="muted">Создайте аккаунт по email и паролю. Профиль начнётся с уровня A1.</p>

        {isLocalApi ? (
          <div className="alert success">
            Локальный режим: Django не нужен. Любая почта и пароль откроют приложение.
          </div>
        ) : null}
        {error ? <div className="alert">{error}</div> : null}

        <label className="field">
          Email
          <input
            type="email"
            autoComplete="email"
            required
            maxLength={150}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="field">
          Пароль
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={isLocalApi ? 1 : 8}
            maxLength={128}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {isLocalApi ? null : (
          <p className="field-hint">Не меньше 8 символов, не только цифры, не слишком простой пароль.</p>
        )}

        <button className="btn-primary" type="submit" disabled={pending}>
          {pending ? 'Создаём…' : 'Зарегистрироваться'}
        </button>

        <p className="auth-switch">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </form>
    </div>
  )
}
