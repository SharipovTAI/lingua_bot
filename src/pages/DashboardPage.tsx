import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  BookMarked,
  BookOpen,
  Check,
  CheckCircle2,
  Flame,
  MessageCircle,
  PenLine,
  RefreshCw,
  Target,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useActivity } from '../hooks/useActivity'
import { useStatistics } from '../hooks/useStatistics'
import { buildAchievements, unlockedCount } from '../lib/achievements'
import { plural } from '../lib/format'
import { ActivityChart } from '../components/progress/ActivityChart'
import { AchievementGrid } from '../components/achievements/AchievementGrid'
import { LevelLadder } from '../components/progress/LevelLadder'

export function DashboardPage() {
  const { user, profile } = useAuth()
  const stats = useStatistics()
  const activity = useActivity(user?.id)
  const data = stats.data
  const achievements = buildAchievements(data, activity)
  const name = user?.email.split('@')[0] ?? 'ученик'

  const dailyTasks = [
    {
      id: 'attempts',
      title: 'Выполнить 3 упражнения',
      to: '/exercises',
      count: activity.today.attempt,
      target: 3,
      xp: 20,
    },
    {
      id: 'reviews',
      title: 'Повторить 3 слова',
      to: '/dictionary',
      count: activity.today.review,
      target: 3,
      xp: 20,
    },
    {
      id: 'word',
      title: 'Добавить слово в словарь',
      to: '/dictionary',
      count: activity.today.word,
      target: 1,
      xp: 10,
    },
  ]
  const tasksDone = dailyTasks.filter((task) => task.count >= task.target).length
  const tasksProgress = Math.round((tasksDone / dailyTasks.length) * 100)

  const metrics = [
    {
      id: 'attempts',
      label: 'Попытки упражнений',
      value: data?.attempts ?? 0,
      hint: `${data?.correct ?? 0} верных`,
      icon: PenLine,
      accent: 'mint',
    },
    {
      id: 'accuracy',
      label: 'Точность',
      value: `${data?.accuracy ?? 0}%`,
      hint: 'по всем попыткам',
      icon: Target,
      accent: 'orange',
    },
    {
      id: 'completed',
      label: 'Задания освоены',
      value: data?.completed_exercises ?? 0,
      hint: 'есть верная попытка',
      icon: CheckCircle2,
      accent: 'blue',
    },
    {
      id: 'words',
      label: 'Слов в словаре',
      value: data?.vocabulary_words ?? 0,
      hint: `${data?.words_due ?? 0} к повторению`,
      icon: BookMarked,
      accent: 'purple',
    },
  ]

  return (
    <section className="dashboard-page">
      <article className="dash-hero card">
        <div className="dash-hero-main">
          <div className="kicker">ЛИЧНЫЙ КАБИНЕТ · УРОВЕНЬ {data?.level ?? profile?.level ?? 'A1'}</div>
          <h1>С возвращением, {name}!</h1>
          <p>
            {data?.placement
              ? `Входной тест пройден: ${data.placement.score} из ${data.placement.total}, уровень ${data.placement.level}.`
              : 'Пройдите короткий входной тест — сервер сохранит результат и подберёт задания по уровню.'}
            {data?.words_due
              ? ` Сегодня ждут повторения ${data.words_due} ${plural(data.words_due, 'слово', 'слова', 'слов')}.`
              : ''}
          </p>
          <div className="dash-actions">
            {data?.placement ? (
              <Link className="btn-primary compact" to="/exercises">
                <PenLine size={16} />
                Продолжить упражнения
              </Link>
            ) : (
              <Link className="btn-primary compact" to="/placement">
                <Target size={16} />
                Пройти входной тест
              </Link>
            )}
            <Link className="btn-ghost compact" to="/dictionary">
              <BookMarked size={16} />
              Словарь
              {data?.words_due ? <span className="btn-count">{data.words_due}</span> : null}
            </Link>
          </div>
        </div>

        <div className="dash-hero-side">
          <div className="streak-card">
            <span className="streak-flame">
              <Flame size={24} />
            </span>
            <div>
              <strong>{activity.streak}</strong>
              <span>
                {plural(activity.streak, 'день', 'дня', 'дней')} подряд
              </span>
            </div>
          </div>
          <div className="hero-mini-grid">
            <div>
              <span>Сегодня</span>
              <strong>{activity.todayTotal}</strong>
              <small>{plural(activity.todayTotal, 'действие', 'действия', 'действий')}</small>
            </div>
            <div>
              <span>За неделю</span>
              <strong>{activity.weekTotal}</strong>
              <small>по журналу браузера</small>
            </div>
          </div>
          <p className="hero-note">
            Серия и график считаются по успешным действиям в этом браузере: отдельной дневной серии
            в API четвёртой недели пока нет.
          </p>
        </div>
      </article>

      <div className="dash-main">
        <div className="stack">
          <article className="card card-pad">
            <div className="card-head">
              <h2 className="card-title">Твои ежедневные задания</h2>
              <span className="progress-copy">
                {tasksDone} из {dailyTasks.length} выполнено
              </span>
            </div>
            <div className="task-progress">
              <span style={{ width: `${tasksProgress}%` }} />
            </div>
            {dailyTasks.map((task) => {
              const done = task.count >= task.target
              return (
                <Link key={task.id} className="task task-link" to={task.to}>
                  <span className={`check ${done ? 'done' : 'open'}`}>
                    {done ? <Check size={12} strokeWidth={3} /> : null}
                  </span>
                  <span>
                    {task.title}
                    <small className="task-sub">
                      {Math.min(task.count, task.target)} из {task.target} сегодня
                    </small>
                  </span>
                  <span className="xp">+{task.xp} XP</span>
                </Link>
              )
            })}
            <p className="muted daily-note">
              Прогресс дня считается по действиям за сегодня; сами упражнения, слова и статистика
              хранятся в Django.
            </p>
          </article>

          <article className="card card-pad">
            <div className="card-head">
              <h2 className="card-title">
                <span className="title-icon">
                  <ArrowRight size={18} />
                </span>
                Продолжить занятие
              </h2>
              <Link className="link" to="/progress">
                Весь прогресс
              </Link>
            </div>
            <div className="continue-list">
              <Link className="continue-row" to="/placement">
                <span className="tool-icon" style={{ background: '#dff3ee', color: '#1a9a86' }}>
                  <Target size={18} />
                </span>
                <span>
                  <strong>Входной тест</strong>
                  <small>
                    {data?.placement
                      ? `${data.placement.score} из ${data.placement.total} · уровень ${data.placement.level}`
                      : 'Уровень ещё не определён'}
                  </small>
                </span>
                <ArrowUpRight size={17} />
              </Link>
              <Link className="continue-row" to="/exercises">
                <span className="tool-icon" style={{ background: '#fde8d2', color: '#e38b3a' }}>
                  <PenLine size={18} />
                </span>
                <span>
                  <strong>Упражнения уровня {data?.level ?? 'A1'}</strong>
                  <small>
                    {data?.attempts ?? 0} {plural(data?.attempts ?? 0, 'попытка', 'попытки', 'попыток')} ·
                    точность {data?.accuracy ?? 0}%
                  </small>
                </span>
                <ArrowUpRight size={17} />
              </Link>
              <Link className="continue-row" to="/dictionary">
                <span className="tool-icon" style={{ background: '#eee6fb', color: '#8b6cc9' }}>
                  <BookMarked size={18} />
                </span>
                <span>
                  <strong>Словарь</strong>
                  <small>
                    {data?.vocabulary_words ?? 0}{' '}
                    {plural(data?.vocabulary_words ?? 0, 'слово', 'слова', 'слов')} ·{' '}
                    {data?.words_due ?? 0} к повторению
                  </small>
                </span>
                <ArrowUpRight size={17} />
              </Link>
              <Link className="continue-row" to="/practice">
                <span className="tool-icon" style={{ background: '#e6f0fb', color: '#4d82c4' }}>
                  <MessageCircle size={18} />
                </span>
                <span>
                  <strong>Разговорная практика</strong>
                  <small>
                    {data?.conversations ?? 0}{' '}
                    {plural(data?.conversations ?? 0, 'диалог', 'диалога', 'диалогов')} ·{' '}
                    {data?.user_messages ?? 0} реплик
                  </small>
                </span>
                <ArrowUpRight size={17} />
              </Link>
            </div>
          </article>

          <article className="card card-pad">
            <div className="card-head">
              <h2 className="card-title">Активность</h2>
              <span className="muted">Последние 7 дней</span>
            </div>
            <ActivityChart activity={activity} />
          </article>
        </div>

        <div className="stack">
          <article className="card card-pad">
            <div className="card-head">
              <h2 className="card-title">Сводка прогресса</h2>
              <button
                className="icon-btn"
                type="button"
                onClick={() => void stats.reload()}
                aria-label="Обновить статистику"
              >
                <RefreshCw size={16} className={stats.loading ? 'spin' : undefined} />
              </button>
            </div>
            {stats.error ? <div className="alert">{stats.error}</div> : null}
            <div className="metric-grid">
              {metrics.map((metric) => (
                <div key={metric.id} className={`metric-card accent-${metric.accent}`}>
                  <span className="metric-icon">
                    <metric.icon size={18} />
                  </span>
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                  <small>{metric.hint}</small>
                </div>
              ))}
            </div>
            <div className="level-block">
              <div className="level-block-head">
                <span>
                  <TrendingUp size={15} />
                  Уровень английского
                </span>
                <strong>{data?.level ?? profile?.level ?? 'A1'}</strong>
              </div>
              <LevelLadder level={data?.level ?? profile?.level ?? 'A1'} />
            </div>
          </article>

          <article className="card card-pad">
            <div className="card-head">
              <h2 className="card-title">Ваши достижения</h2>
              <Link className="link" to="/achievements">
                Все ({unlockedCount(achievements)}/{achievements.length})
              </Link>
            </div>
            <AchievementGrid items={achievements.slice(0, 4)} dense />
            <Link className="hint-link" to="/achievements">
              Открыть витрину достижений
            </Link>
          </article>

          <article className="card card-pad tools">
            <h2 style={{ marginBottom: 8 }}>Инструменты</h2>
            <Link className="tool-row" to="/exercises">
              <span className="tool-icon" style={{ background: '#fde8d2', color: '#e38b3a' }}>
                <PenLine size={18} />
              </span>
              Упражнения
              <ArrowUpRight size={16} />
            </Link>
            <Link className="tool-row" to="/dictionary">
              <span className="tool-icon" style={{ background: '#dff3ee', color: '#1a9a86' }}>
                <BookMarked size={18} />
              </span>
              Словарь
              <ArrowUpRight size={16} />
            </Link>
            <Link className="tool-row" to="/progress">
              <span className="tool-icon" style={{ background: '#e6f0fb', color: '#4d82c4' }}>
                <TrendingUp size={18} />
              </span>
              Прогресс
              <ArrowUpRight size={16} />
            </Link>
            <Link className="tool-row" to="/achievements">
              <span className="tool-icon" style={{ background: '#eee6fb', color: '#8b6cc9' }}>
                <Trophy size={18} />
              </span>
              Достижения
              <ArrowUpRight size={16} />
            </Link>
            <Link className="tool-row" to="/practice">
              <span className="tool-icon" style={{ background: '#f3f7f6', color: '#5b6e6b' }}>
                <MessageCircle size={18} />
              </span>
              Разговорная практика
              <ArrowUpRight size={16} />
            </Link>
          </article>
        </div>
      </div>

      <article className="card card-pad dash-tip">
        <span className="title-icon">
          <BookOpen size={18} />
        </span>
        <div>
          <strong>Что дальше</strong>
          <p className="muted">
            Ошибки в упражнениях поднимают тему в начало списка, а словарь возвращает слова по
            расписанию. Входной тест можно пройти повторно — сохранится последний результат.
          </p>
        </div>
        <Link className="link" to="/lesson">
          Ежедневный урок
          <Award size={15} />
        </Link>
      </article>
    </section>
  )
}
