import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { api, isLocalApi } from '../api/client'
import { ApiError } from '../api/types'
import { useAuth } from '../auth/AuthContext'

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [serverOk, setServerOk] = useState<boolean | null>(null)

  useEffect(() => {
    api
      .health()
      .then(() => setServerOk(true))
      .catch(() => setServerOk(false))
  }, [])

  if (user) {
    return <Navigate to={from} replace />
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setPending(true)
    try {
      await login(email.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось войти.')
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
        <h1>Вход</h1>
        <p className="muted">Войдите по email и паролю, чтобы продолжить занятия.</p>

        {isLocalApi ? (
          <div className="alert success">
            Локальный режим: Django не нужен. Введите любую почту и пароль — аккаунт сохранится в этом браузере.
          </div>
        ) : null}
        {!isLocalApi && serverOk === false ? (
          <div className="alert">
            Бэкенд сейчас недоступен. API живёт в ветке main на http://127.0.0.1:8000.
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
            autoComplete="current-password"
            required
            maxLength={128}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        <button className="btn-primary" type="submit" disabled={pending}>
          {pending ? 'Входим…' : 'Войти'}
        </button>

        <p className="auth-switch">
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </p>
      </form>
    </div>
  )
}
