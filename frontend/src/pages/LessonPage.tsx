import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useStatistics } from '../hooks/useStatistics'
import { useAuth } from '../auth/AuthContext'
import { LANGUAGES } from '../api/types'

export function LessonPage() {
  const stats = useStatistics()
  const { profile } = useAuth()
  const data = stats.data
  return (
    <section>
      <header className="page-head">
        <div>
          <h1>План на сегодня</h1>
          <p className="muted">
            {LANGUAGES[profile?.language ?? 'en']} · Уровень{' '}
            {data?.level ?? profile?.level}. Цель:{' '}
            {profile?.goal || 'регулярная практика'}.
          </p>
        </div>
      </header>
      {stats.error && <div className="alert">{stats.error}</div>}
      {stats.loading && <p role="status">Загружаем план…</p>}
      <div className="dictionary-grid">
        <div className="plan-list">
          {(data?.learning_plan ?? []).map((step) => (
            <article className="card card-pad" key={step.to}>
              <h2>{step.title}</h2>
              <p>{step.description}</p>
              <Link className="btn-primary compact" to={step.to}>
                Перейти к занятию
              </Link>
            </article>
          ))}
        </div>
        <article className="card card-pad">
          <h2>Ежедневные задания</h2>
          {(data?.daily_tasks ?? []).map((task) => (
            <Link className="task task-link" key={task.id} to={task.to}>
              <span
                className={
                  'check ' + (task.count >= task.target ? 'done' : 'open')
                }
              >
                {task.count >= task.target && <Check size={12} />}
              </span>
              <span>
                {task.title}
                <small className="task-sub">
                  {Math.min(task.count, task.target)} из {task.target}
                </small>
              </span>
              <span className="xp">+{task.xp} XP</span>
            </Link>
          ))}
          <p className="muted">
            Сегодня получено {data?.xp_today ?? 0} XP. Задания обновляются
            каждый день.
          </p>
          <p>
            Упражнения учитывают уровень и темы последних ошибок. Словарь
            предлагает слова с наступившим сроком повторения.
          </p>
        </article>
      </div>
    </section>
  )
}
