import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  BookMarked,
  BookOpen,
  Check,
  Flame,
  Lock,
  MessageCircle,
  MoreHorizontal,
  NotebookPen,
  Send,
  Sprout,
  WandSparkles,
  WifiOff,
} from 'lucide-react'

const messages = [
  {
    from: 'bot' as const,
    text: "Hi, Alex! Let's practice ordering at a cafe. I'll be the barista. What do you want to order?",
  },
  {
    from: 'user' as const,
    text: 'I would like a coffee and a croissant, please!',
  },
  {
    from: 'bot' as const,
    text: 'Great choice! What kind of coffee would you like, cappuccino, latte, or americano?',
  },
]

const tasks = [
  { title: 'Повторить 10 слов словаря', xp: 20, done: true },
  { title: 'Завершить ежедневный урок', xp: 30, done: true },
  { title: 'Провести 5-минутный разговор', xp: 50, done: false },
]

const bars = [
  { day: 'Пн', h: 28 },
  { day: 'Вт', h: 46 },
  { day: 'Ср', h: 22 },
  { day: 'Чт', h: 58 },
  { day: 'Пт', h: 86, active: true },
  { day: 'Сб', h: 64 },
  { day: 'Вс', h: 18 },
]

export function DashboardPage() {
  return (
    <>
      <section className="page-grid">
        <article className="card card-pad chat">
          <div className="card-head">
            <h2 className="card-title">
              <span className="title-icon">
                <MessageCircle size={18} />
              </span>
              Разговорная практика
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="chip" style={{ boxShadow: 'none', padding: '6px 10px' }}>
                ☕ В кафе
              </span>
              <button className="icon-btn" type="button" aria-label="Ещё">
                <MoreHorizontal size={18} />
              </button>
            </div>
          </div>

          <div className="chat-meta">СЕГОДНЯ, 9:41</div>
          <div className="messages">
            {messages.map((message) => (
              <div key={message.text} className={`msg ${message.from}`}>
                {message.from === 'bot' ? (
                  <span className="bot-avatar">
                    <MessageCircle size={13} />
                  </span>
                ) : null}
                <div className="bubble">{message.text}</div>
              </div>
            ))}
          </div>

          <form className="composer" onSubmit={(event) => event.preventDefault()}>
            <input placeholder="Напиши сообщение..." aria-label="Сообщение" />
            <button className="send" type="submit" aria-label="Отправить">
              <Send size={16} />
            </button>
          </form>
          <a className="hint-link" href="#hint">
            Нужна подсказка?
          </a>
        </article>

        <div className="stack">
          <article className="card card-pad">
            <div className="card-head">
              <h2 className="card-title">Твои ежедневные задания</h2>
              <span className="progress-copy">2 из 3 выполнено</span>
            </div>
            <div className="task-progress">
              <span />
            </div>
            {tasks.map((task) => (
              <div key={task.title} className="task">
                <span className={`check ${task.done ? 'done' : 'open'}`}>
                  {task.done ? <Check size={12} strokeWidth={3} /> : null}
                </span>
                <span>{task.title}</span>
                <span className="xp">+{task.xp} XP</span>
              </div>
            ))}
          </article>

          <article className="card card-pad">
            <div className="card-head">
              <h2 className="card-title">Ваши достижения</h2>
              <Link className="link" to="/achievements">
                Все
              </Link>
            </div>
            <div className="achievements">
              <div className="badge">
                <span className="badge-icon" style={{ background: '#dff3ee', color: '#1a9a86' }}>
                  <Sprout size={20} />
                </span>
                Первые слова
              </div>
              <div className="badge">
                <span className="badge-icon" style={{ background: '#fde8d2', color: '#e38b3a' }}>
                  <Flame size={20} />
                </span>
                В ударе
              </div>
              <div className="badge">
                <span className="badge-icon" style={{ background: '#eee6fb', color: '#8b6cc9' }}>
                  <WandSparkles size={20} />
                </span>
                Волшебник слов
              </div>
              <div className="badge">
                <span className="badge-icon" style={{ background: '#eef1f1', color: '#8a9a97' }}>
                  <Lock size={18} />
                </span>
                Следующая
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="bottom-grid">
        <article className="card card-pad">
          <div className="activity-head">
            <div>
              <h2>Активность</h2>
              <div className="stat">
                <strong>84</strong>
                <span>минут практики</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="muted">На этой неделе</div>
              <div className="delta">
                <ArrowUpRight size={14} />
                24%
              </div>
            </div>
          </div>
          <div className="bars">
            {bars.map((bar) => (
              <div key={bar.day} className={`bar${bar.active ? ' active' : ''}`}>
                <i style={{ height: `${bar.h}%` }} />
                <span>{bar.day}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="card card-pad">
          <div className="reco-head">
            <h2>Рекомендации</h2>
            <Link className="link" to="/lesson">
              Изучить
            </Link>
          </div>
          <div className="reco">
            <div>
              <div className="kicker">РАЗГОВОР</div>
              <h3>Поход к стоматологу</h3>
              <p>Здоровье · 8 мин</p>
            </div>
            <span className="arrow">
              <ArrowUpRight size={16} />
            </span>
          </div>
          <div className="reco">
            <div>
              <div className="kicker">ГРАММАТИКА</div>
              <h3>Просто о прошлом</h3>
              <p>Основы прошедшего времени · 6 мин</p>
            </div>
            <span className="arrow">
              <ArrowUpRight size={16} />
            </span>
          </div>
        </article>

        <article className="card card-pad tools">
          <h2 style={{ marginBottom: 8 }}>Инструменты</h2>
          <Link className="tool-row" to="/dictionary">
            <span className="tool-icon" style={{ background: '#dff3ee', color: '#1a9a86' }}>
              <BookMarked size={18} />
            </span>
            Словарь
            <ArrowUpRight size={16} />
          </Link>
          <Link className="tool-row" to="/notes">
            <span className="tool-icon" style={{ background: '#e6f0fb', color: '#4d82c4' }}>
              <NotebookPen size={18} />
            </span>
            Заметки
            <ArrowUpRight size={16} />
          </Link>
          <Link className="tool-row" to="/dictionary">
            <span className="tool-icon" style={{ background: '#eee6fb', color: '#8b6cc9' }}>
              <BookOpen size={18} />
            </span>
            Словарь
            <ArrowUpRight size={16} />
          </Link>
          <Link className="tool-row" to="/exercises">
            <span className="tool-icon" style={{ background: '#fde8d2', color: '#e38b3a' }}>
              <WifiOff size={18} />
            </span>
            Упражнения без интернета
            <ArrowUpRight size={16} />
          </Link>
        </article>
      </section>
    </>
  )
}
