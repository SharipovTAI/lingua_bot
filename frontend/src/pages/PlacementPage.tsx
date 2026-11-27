import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ListChecks,
  RefreshCw,
  Target,
} from 'lucide-react'
import { api } from '../api/client'
import { ApiError, LEVELS } from '../api/types'
import type { Exercise, PlacementResult } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { logActivity } from '../lib/activity'
import { formatDateTime } from '../lib/format'

const SCALE = [
  { level: 'A1', range: '0–1 балл' },
  { level: 'A2', range: '2–3 балла' },
  { level: 'B1', range: '4–5 баллов' },
  { level: 'B2', range: '6–7 баллов' },
  { level: 'C1', range: '8–10 баллов' },
]

export function PlacementPage() {
  const { user, refreshProfile } = useAuth()
  const [questions, setQuestions] = useState<Exercise[]>([])
  const [lastResult, setLastResult] = useState<PlacementResult | null>(null)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [index, setIndex] = useState(0)
  const [started, setStarted] = useState(false)
  const [result, setResult] = useState<PlacementResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const requestRef = useRef(crypto.randomUUID())

  useEffect(() => {
    let cancelled = false
    Promise.all([api.placement(), api.statistics()])
      .then(([bank, stats]) => {
        if (cancelled) return
        setQuestions(bank)
        setLastResult(stats.placement)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof ApiError
            ? err.message
            : 'Не удалось загрузить входной тест.',
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const current = questions[index]
  const answered = questions.filter((item) =>
    (answers[item.id] ?? '').trim(),
  ).length
  const isLast = index === questions.length - 1

  function setAnswer(value: string) {
    if (!current) return
    setAnswers((state) => ({ ...state, [current.id]: value }))
    setError('')
  }

  function startTest() {
    setAnswers({})
    setIndex(0)
    setStarted(true)
    setResult(null)
    setError('')
    requestRef.current = crypto.randomUUID()
  }

  async function submit() {
    const missingIndex = questions.findIndex(
      (item) => !(answers[item.id] ?? '').trim(),
    )
    if (missingIndex >= 0) {
      setIndex(missingIndex)
      setError(
        `Ответьте на все вопросы. Осталось ${questions.length - answered}.`,
      )
      return
    }
    setPending(true)
    setError('')
    try {
      const placement = await api.submitPlacement(
        requestRef.current,
        questions.map((item) => ({
          exercise_id: item.id,
          answer: answers[item.id].trim(),
        })),
      )
      setResult(placement)
      setStarted(false)
      setLastResult(placement)
      if (user) logActivity(user.id, 'placement')
      await refreshProfile()
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Не удалось отправить тест.',
      )
    } finally {
      setPending(false)
    }
  }

  if (loading) {
    return (
      <section className="placeholder">
        <h1>Входной тест</h1>
        <p>Загружаем вопросы…</p>
      </section>
    )
  }

  if (result) {
    return (
      <section className="placement-page">
        <article className="card card-pad placement-result">
          <div className="result-hero">
            <span className="result-score">
              {result.score}
              <small>из {result.total}</small>
            </span>
            <div>
              <div className="kicker">РЕЗУЛЬТАТ СОХРАНЁН</div>
              <h1>Ваш ориентировочный уровень — {result.level}</h1>
              <p>Группа подготовки: {result.band}</p>
              <p className="muted">
                {formatDateTime(result.created_at)}. Уровень обновлён в профиле.
                Это короткая диагностика: она не заменяет проверку речи,
                аудирования и письма.
              </p>
            </div>
          </div>

          <div className="scale-table">
            {SCALE.map((item) => (
              <div
                key={item.level}
                className={`scale-row${item.level === result.level ? ' current' : ''}`}
              >
                <strong>{item.level}</strong>
                <span>{item.range}</span>
                {item.level === result.level ? <Check size={16} /> : null}
              </div>
            ))}
          </div>

          <div className="result-actions">
            <Link className="btn-primary compact" to="/exercises">
              <ArrowRight size={16} />К упражнениям уровня
            </Link>
            <Link className="btn-ghost compact" to="/progress">
              Смотреть прогресс
            </Link>
            <button
              className="btn-ghost compact"
              type="button"
              onClick={startTest}
            >
              <RefreshCw size={16} />
              Пройти заново
            </button>
          </div>
        </article>
      </section>
    )
  }

  if (!started) {
    return (
      <section className="placement-page">
        <article className="card card-pad placement-intro">
          <span className="title-icon">
            <Target size={20} />
          </span>
          <div>
            <div className="kicker">ДИАГНОСТИКА УРОВНЯ</div>
            <h1>Входной тест</h1>
            <p>
              10 вопросов по грамматике и лексике. Ответы проверяются по
              эталону, результат сохраняется, а уровень в профиле обновляется
              автоматически.
            </p>
          </div>

          {error ? <div className="alert">{error}</div> : null}

          {lastResult ? (
            <div className="last-result">
              <ListChecks size={18} />
              <span>
                Последний результат: <strong>{lastResult.score}</strong> из{' '}
                {lastResult.total}, уровень <strong>{lastResult.level}</strong>{' '}
                · {formatDateTime(lastResult.created_at)}
              </span>
            </div>
          ) : null}

          <div className="scale-table compact-table">
            {SCALE.map((item) => (
              <div key={item.level} className="scale-row">
                <strong>{item.level}</strong>
                <span>{item.range}</span>
              </div>
            ))}
          </div>

          <div className="result-actions">
            <button
              className="btn-primary compact"
              type="button"
              onClick={startTest}
            >
              {lastResult ? 'Пройти снова' : 'Начать тест'}
              <ArrowRight size={16} />
            </button>
            <Link className="btn-ghost compact" to="/progress">
              Мой прогресс
            </Link>
          </div>
        </article>
      </section>
    )
  }

  return (
    <section className="placement-page">
      <article className="card card-pad placement-quiz">
        <div className="quiz-head">
          <div>
            <div className="kicker">ВХОДНОЙ ТЕСТ</div>
            <h1>
              Вопрос {index + 1} из {questions.length}
            </h1>
          </div>
          <span className="chip quiz-counter">
            <ListChecks size={16} />
            Отвечено {answered} из {questions.length}
          </span>
        </div>

        <div className="quiz-progress" aria-hidden>
          <span
            style={{ width: `${((index + 1) / questions.length) * 100}%` }}
          />
        </div>

        <div className="quiz-dots">
          {questions.map((item, itemIndex) => (
            <button
              key={item.id}
              type="button"
              className={`quiz-dot${itemIndex === index ? ' current' : ''}${
                (answers[item.id] ?? '').trim() ? ' done' : ''
              }`}
              onClick={() => setIndex(itemIndex)}
              aria-label={`Вопрос ${itemIndex + 1}`}
            >
              {itemIndex + 1}
            </button>
          ))}
        </div>

        {error ? <div className="alert">{error}</div> : null}

        {current ? (
          <div className="quiz-question">
            <div className="exercise-meta">
              <span className="level-badge">{current.level}</span>
              <span className="topic-pill">{current.topic || 'общее'}</span>
              <span className="kind-pill">
                {current.kind === 'grammar' ? 'Грамматика' : 'Лексика'}
              </span>
            </div>
            <h2>{current.question}</h2>
            {current.options.length ? (
              <div className="option-list">
                {current.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`option${answers[current.id] === option ? ' selected' : ''}`}
                    onClick={() => setAnswer(option)}
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
                  value={answers[current.id] ?? ''}
                  maxLength={2000}
                  onChange={(event) => setAnswer(event.target.value)}
                  placeholder="Введите ответ"
                />
              </label>
            )}
          </div>
        ) : null}

        <div className="quiz-nav">
          <button
            className="btn-ghost compact"
            type="button"
            disabled={index === 0}
            onClick={() => setIndex((value) => Math.max(0, value - 1))}
          >
            <ArrowLeft size={16} />
            Назад
          </button>
          {isLast ? (
            <button
              className="btn-primary compact"
              type="button"
              onClick={() => void submit()}
              disabled={pending}
            >
              {pending ? 'Отправляем…' : 'Завершить тест'}
              <Check size={16} />
            </button>
          ) : (
            <button
              className="btn-primary compact"
              type="button"
              disabled={!(answers[current?.id ?? -1] ?? '').trim()}
              onClick={() =>
                setIndex((value) => Math.min(questions.length - 1, value + 1))
              }
            >
              Далее
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </article>

      <aside className="card card-pad quiz-aside">
        <h2>Шкала уровня</h2>
        {SCALE.map((item) => (
          <div key={item.level} className="scale-row">
            <strong>{item.level}</strong>
            <span>{item.range}</span>
          </div>
        ))}
        <p className="muted">
          Диапазоны: {LEVELS.join(' · ')}. Тест короткий, поэтому уровень можно
          уточнить вручную в настройках профиля.
        </p>
        <Link className="link" to="/settings">
          Уточнить уровень в профиле
        </Link>
      </aside>
    </section>
  )
}
