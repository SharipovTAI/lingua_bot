import { Link } from 'react-router-dom'
import {
  BookMarked,
  CheckCircle2,
  Flame,
  MessageCircle,
  PenLine,
  RefreshCw,
  Repeat2,
  Target,
  TrendingUp,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useActivity } from '../hooks/useActivity'
import { useStatistics } from '../hooks/useStatistics'
import { ActivityChart } from '../components/progress/ActivityChart'
import { LevelLadder } from '../components/progress/LevelLadder'
import { formatDate, plural } from '../lib/format'

const KIND_LABELS: Record<string, string> = {
  grammar: 'Грамматика',
  vocabulary: 'Лексика',
}

export function ProgressPage() {
  const { user, profile } = useAuth()
  const stats = useStatistics()
  const activity = useActivity(user?.id)
  const data = stats.data
  const level = data?.level ?? profile?.level ?? 'A1'
  const accuracy = data?.accuracy ?? 0
  const kinds = Object.entries(data?.by_kind ?? {})

  return (
    <section className="progress-page">
      <header className="page-head">
        <div>
          <div className="kicker">ПРОГРЕСС</div>
          <h1>Статистика обучения</h1>
          <p className="muted">
            Показатели приходят из <code>GET /api/v1/statistics/</code> и принадлежат только вашему
            аккаунту. После выхода и нового входа значения сохраняются.
          </p>
        </div>
        <div className="page-head-actions">
          <span className="chip">
            <TrendingUp size={16} />
            Уровень {level}
          </span>
          <button className="btn-ghost compact" type="button" onClick={() => void stats.reload()}>
            <RefreshCw size={16} className={stats.loading ? 'spin' : undefined} />
            Обновить
          </button>
        </div>
      </header>

      {stats.error ? <div className="alert">{stats.error}</div> : null}

      <div className="progress-overview">
        <article className="card card-pad accuracy-card">
          <div className="accuracy-dial" style={{ background: `conic-gradient(var(--primary) ${accuracy * 3.6}deg, #e7f0ee 0deg)` }}>
            <div>
              <strong>{accuracy}%</strong>
              <span>точность</span>
            </div>
          </div>
          <div>
            <h2>Качество ответов</h2>
            <p className="muted">
              {data?.correct ?? 0} верных из {data?.attempts ?? 0}{' '}
              {plural(data?.attempts ?? 0, 'попытки', 'попыток', 'попыток')} упражнений.
              Повторная доставка запроса с тем же request_id не увеличивает счётчики.
            </p>
          </div>
        </article>

        <div className="progress-tiles">
          <div className="card card-pad progress-tile">
            <span className="metric-icon accent-mint">
              <PenLine size={18} />
            </span>
            <strong>{data?.attempts ?? 0}</strong>
            <span>попыток</span>
            <small>{data?.correct ?? 0} верных</small>
          </div>
          <div className="card card-pad progress-tile">
            <span className="metric-icon accent-orange">
              <CheckCircle2 size={18} />
            </span>
            <strong>{data?.completed_exercises ?? 0}</strong>
            <span>заданий освоено</span>
            <small>есть верная попытка</small>
          </div>
          <div className="card card-pad progress-tile">
            <span className="metric-icon accent-purple">
              <BookMarked size={18} />
            </span>
            <strong>{data?.vocabulary_words ?? 0}</strong>
            <span>слов в словаре</span>
            <small>{data?.words_due ?? 0} к повторению</small>
          </div>
          <div className="card card-pad progress-tile">
            <span className="metric-icon accent-blue">
              <Repeat2 size={18} />
            </span>
            <strong>{data?.word_reviews ?? 0}</strong>
            <span>повторений слов</span>
            <small>{data?.correct_reviews ?? 0} верных</small>
          </div>
        </div>
      </div>

      <div className="progress-grid">
        <article className="card card-pad">
          <div className="card-head">
            <h2 className="card-title">Упражнения по типам</h2>
            <span className="muted">grammar и vocabulary</span>
          </div>
          {kinds.length === 0 ? (
            <div className="empty-state compact-empty">
              <h3>Попыток пока нет</h3>
              <p className="muted">Выполните первое упражнение, чтобы увидеть разбивку.</p>
              <Link className="link" to="/exercises">
                Перейти к упражнениям
              </Link>
            </div>
          ) : (
            <div className="kind-stats">
              {kinds.map(([kind, value]) => {
                const kindAccuracy = value.attempts
                  ? Math.round((value.correct / value.attempts) * 100)
                  : 0
                return (
                  <div key={kind} className="kind-row">
                    <div className="kind-head">
                      <strong>{KIND_LABELS[kind] ?? kind}</strong>
                      <span>
                        {value.correct} из {value.attempts} · {kindAccuracy}%
                      </span>
                    </div>
                    <div className="kind-bar">
                      <span style={{ width: `${kindAccuracy}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="level-block">
            <div className="level-block-head">
              <span>
                <TrendingUp size={15} />
                Текущий уровень
              </span>
              <strong>{level}</strong>
            </div>
            <LevelLadder level={level} />
          </div>
        </article>

        <article className="card card-pad">
          <div className="card-head">
            <h2 className="card-title">Входной тест</h2>
            <Link className="link" to="/placement">
              {data?.placement ? 'Пройти снова' : 'Пройти'}
            </Link>
          </div>
          {data?.placement ? (
            <div className="placement-summary">
              <div className="placement-score">
                <strong>{data.placement.score}</strong>
                <span>из {data.placement.total}</span>
              </div>
              <div>
                <span className="level-badge big">{data.placement.level}</span>
                <p className="muted">
                  Последний результат от {formatDate(data.placement.created_at)} · уровень обновлён
                  в профиле.
                </p>
              </div>
            </div>
          ) : (
            <div className="empty-state compact-empty">
              <h3>Тест ещё не пройден</h3>
              <p className="muted">10 вопросов, ориентировочная оценка A1–C1.</p>
              <Link className="link" to="/placement">
                Начать входной тест
              </Link>
            </div>
          )}
          <div className="mini-stat-row">
            <div>
              <MessageCircle size={15} />
              <strong>{data?.conversations ?? 0}</strong>
              <span>{plural(data?.conversations ?? 0, 'диалог', 'диалога', 'диалогов')}</span>
            </div>
            <div>
              <PenLine size={15} />
              <strong>{data?.user_messages ?? 0}</strong>
              <span>реплик в чате</span>
            </div>
          </div>
        </article>

        <article className="card card-pad progress-activity">
          <div className="card-head">
            <h2 className="card-title">Активность за неделю</h2>
            <span className="chip">
              <Flame size={15} />
              {activity.streak} {plural(activity.streak, 'день', 'дня', 'дней')} подряд
            </span>
          </div>
          <ActivityChart activity={activity} />
          <div className="mini-stat-row">
            <div>
              <Target size={15} />
              <strong>{activity.today.attempt + activity.today.review}</strong>
              <span>действий сегодня</span>
            </div>
            <div>
              <Flame size={15} />
              <strong>{activity.weekTotal}</strong>
              <span>за 7 дней</span>
            </div>
            <div>
              <BookMarked size={15} />
              <strong>{data?.words_due ?? 0}</strong>
              <span>слов к повторению</span>
            </div>
          </div>
        </article>
      </div>
    </section>
  )
}
