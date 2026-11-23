import { Link } from 'react-router-dom'
import { Award, Flame, RefreshCw, Sparkles, Trophy } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useActivity } from '../hooks/useActivity'
import { useStatistics } from '../hooks/useStatistics'
import { AchievementGrid } from '../components/achievements/AchievementGrid'
import { buildAchievements, unlockedCount } from '../lib/achievements'
import { plural } from '../lib/format'

export function AchievementsPage() {
  const { user } = useAuth()
  const stats = useStatistics()
  const activity = useActivity(user?.id)
  const items = buildAchievements(stats.data, activity)
  const unlocked = unlockedCount(items)
  const progress = items.length ? Math.round((unlocked / items.length) * 100) : 0

  return (
    <section className="achievements-page">
      <header className="page-head">
        <div>
          <div className="kicker">ВИТРИНА ДОСТИЖЕНИЙ</div>
          <h1>Достижения</h1>
          <p className="muted">
            Награды за упражнения, словарный запас, повторения и регулярность. Прогресс
            пересчитывается из статистики и журнала занятий.
          </p>
        </div>
        <div className="page-head-actions">
          <button className="btn-ghost compact" type="button" onClick={() => void stats.reload()}>
            <RefreshCw size={16} className={stats.loading ? 'spin' : undefined} />
            Обновить
          </button>
        </div>
      </header>

      {stats.error ? <div className="alert">{stats.error}</div> : null}

      <article className="card card-pad achievements-summary">
        <span className="summary-icon">
          <Trophy size={26} />
        </span>
        <div className="summary-body">
          <div className="card-head">
            <h2>
              Открыто {unlocked} из {items.length}
            </h2>
            <span className="progress-copy">{progress}%</span>
          </div>
          <div className="task-progress summary-progress">
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="summary-chips">
            <span className="chip">
              <Flame size={15} />
              Серия: {activity.streak} {plural(activity.streak, 'день', 'дня', 'дней')}
            </span>
            <span className="chip">
              <Sparkles size={15} />
              Слов: {stats.data?.vocabulary_words ?? 0}
            </span>
            <span className="chip">
              <Award size={15} />
              Точность: {stats.data?.accuracy ?? 0}%
            </span>
          </div>
        </div>
      </article>

      <AchievementGrid items={items} />

      <article className="card card-pad achievements-note">
        <p className="muted">
          Часть достижений опирается на <code>GET /statistics/</code>: попытки, точность, слова и
          повторения. Серия дней считается по успешным действиям в этом браузере, потому что
          отдельной дневной серии в API четвёртой недели нет. Записи не редактируются вручную —
          они открываются автоматически.
        </p>
        <div className="achievements-links">
          <Link className="btn-primary compact" to="/exercises">
            Выполнить упражнение
          </Link>
          <Link className="btn-ghost compact" to="/dictionary">
            Повторить слова
          </Link>
          <Link className="btn-ghost compact" to="/progress">
            Открыть прогресс
          </Link>
        </div>
      </article>
    </section>
  )
}
