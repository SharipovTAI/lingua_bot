import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  ListFilter,
  RefreshCw,
  Target,
  XCircle,
} from 'lucide-react'
import { api } from '../api/client'
import { ApiError } from '../api/types'
import type { Attempt, Exercise, ExerciseKind } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { logActivity } from '../lib/activity'
import { plural } from '../lib/format'

type Filter = 'all' | ExerciseKind

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'grammar', label: 'Грамматика' },
  { id: 'vocabulary', label: 'Лексика' },
]

export function ExercisesPage() {
  const { user, profile } = useAuth()
  const [items, setItems] = useState<Exercise[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [results, setResults] = useState<Record<number, Attempt>>({})
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const requestIds = useRef(new Map<string, string>())

  async function load(kind: Filter = filter) {
    setLoading(true)
    setError('')
    try {
      setItems(await api.exercises(kind === 'all' ? undefined : kind))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось загрузить упражнения.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load('all')
  }, [])

  function changeFilter(next: Filter) {
    setFilter(next)
    void load(next)
  }

  async function submit(exercise: Exercise) {
    const answer = (answers[exercise.id] ?? '').trim()
    if (!answer) {
      setError('Выберите или введите ответ перед проверкой.')
      return
    }
    const replayKey = `${exercise.id}:${answer.toLocaleLowerCase('ru-RU')}`
    let requestId = requestIds.current.get(replayKey)
    if (!requestId) {
      requestId = crypto.randomUUID()
      requestIds.current.set(replayKey, requestId)
    }

    setPendingId(exercise.id)
    setError('')
    try {
      const attempt = await api.attempt(exercise.id, answer, requestId)
      requestIds.current.delete(replayKey)
      setResults((state) => ({ ...state, [exercise.id]: attempt }))
      if (user) logActivity(user.id, 'attempt')
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось проверить ответ.')
    } finally {
      setPendingId(null)
    }
  }

  const checked = Object.keys(results).length

  return (
    <section className="practice-page">
      <header className="page-head">
        <div>
          <div className="kicker">ТРЕНИРОВКА</div>
          <h1>Упражнения</h1>
          <p className="muted">
            Задания уровня {profile?.level ?? 'A1'}. Эталонные ответы и объяснения открываются после
            проверки. Темы с ошибками в последних попытках поднимаются выше.
          </p>
        </div>
        <div className="page-head-actions">
          <span className="chip">
            <Target size={16} />
            Уровень {profile?.level ?? 'A1'}
          </span>
          <Link className="btn-ghost compact" to="/placement">
            <CircleHelp size={16} />
            Входной тест
          </Link>
        </div>
      </header>

      <div className="practice-toolbar">
        <div className="filter-group">
          <span className="filter-label">
            <ListFilter size={15} />
            Тип
          </span>
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`filter-chip${filter === item.id ? ' active' : ''}`}
              onClick={() => changeFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="practice-stat">
          <strong>{items.length}</strong>{' '}
          {plural(items.length, 'задание', 'задания', 'заданий')} · проверено в сессии: {checked}
          <button className="icon-btn refresh-btn" type="button" onClick={() => void load()} aria-label="Обновить">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {error ? <div className="alert">{error}</div> : null}

      {loading ? (
        <div className="card card-pad muted">Загружаем упражнения…</div>
      ) : items.length === 0 ? (
        <div className="card card-pad empty-state">
          <h2>Для этого уровня пока нет заданий</h2>
          <p className="muted">
            Проверьте, что миграции и <code>seed_exercises</code> выполнены, или смените уровень в
            профиле.
          </p>
          <Link className="link" to="/settings">
            Настройки профиля
          </Link>
        </div>
      ) : (
        <div className="exercise-list">
          {items.map((exercise) => {
            const result = results[exercise.id]
            const selected = answers[exercise.id] ?? ''
            const isPending = pendingId === exercise.id
            return (
              <article
                key={exercise.id}
                className={`card card-pad exercise-card${result ? (result.is_correct ? ' solved' : ' failed') : ''}`}
              >
                <div className="exercise-head">
                  <div className="exercise-meta">
                    <span className="level-badge">{exercise.level}</span>
                    <span className="topic-pill">{exercise.topic || 'общее'}</span>
                    <span className="kind-pill">
                      {exercise.kind === 'grammar' ? 'Грамматика' : 'Лексика'}
                    </span>
                  </div>
                  {result ? (
                    <span className={`result-pill${result.is_correct ? ' correct' : ' wrong'}`}>
                      {result.is_correct ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                      {result.is_correct ? 'Верно' : 'Ошибка'}
                    </span>
                  ) : null}
                </div>

                <h3 className="exercise-question">{exercise.question}</h3>

                {exercise.options.length ? (
                  <div className="option-list">
                    {exercise.options.map((option) => (
                      <button
                        key={option}
                        type="button"
                        disabled={isPending}
                        className={`option${selected === option ? ' selected' : ''}${
                          result && option === result.correct_answer ? ' correct' : ''
                        }${
                          result && option === result.answer && !result.is_correct ? ' wrong' : ''
                        }`}
                        onClick={() =>
                          setAnswers((state) => ({ ...state, [exercise.id]: option }))
                        }
                      >
                        <span className="option-radio" />
                        {option}
                      </button>
                    ))}
                  </div>
                ) : (
                  <label className="field">
                    Ответ
                    <input
                      maxLength={2000}
                      value={selected}
                      disabled={isPending}
                      placeholder="Введите ответ"
                      onChange={(event) =>
                        setAnswers((state) => ({ ...state, [exercise.id]: event.target.value }))
                      }
                    />
                  </label>
                )}

                {result ? (
                  <div className={`attempt-result${result.is_correct ? ' correct' : ' wrong'}`}>
                    <div className="attempt-title">
                      {result.is_correct ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                      {result.is_correct ? 'Ответ принят' : 'Правильный ответ: '}
                      {!result.is_correct ? <strong>{result.correct_answer}</strong> : null}
                    </div>
                    {result.explanation ? <p>{result.explanation}</p> : null}
                    <span className="attempt-note">
                      Попытка сохранена. Чтобы проверить себя ещё раз, измените ответ.
                    </span>
                  </div>
                ) : null}

                <div className="exercise-actions">
                  <button
                    className="btn-primary compact"
                    type="button"
                    disabled={isPending || !selected.trim()}
                    onClick={() => void submit(exercise)}
                  >
                    {isPending ? 'Проверяем…' : 'Проверить ответ'}
                    <ArrowRight size={16} />
                  </button>
                  <span className="muted exercise-hint">
                    Проверка по эталону, без учёта регистра и лишних пробелов.
                  </span>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
