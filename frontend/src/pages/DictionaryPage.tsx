import { ExternalDictionary } from '../components/dictionary/ExternalDictionary'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookMarked,
  CheckCircle2,
  EyeOff,
  Flame,
  Pencil,
  Plus,
  Repeat2,
  Trash2,
  X,
  XCircle,
} from 'lucide-react'
import { api } from '../api/client'
import { ApiError } from '../api/types'
import type { ReviewCard, VocabularyWord, WordReview } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { logActivity } from '../lib/activity'
import { formatRelativeReview, plural } from '../lib/format'

export function DictionaryPage() {
  const { user } = useAuth()
  const [words, setWords] = useState<VocabularyWord[]>([])
  const [cards, setCards] = useState<ReviewCard[]>([])
  const [word, setWord] = useState('')
  const [translation, setTranslation] = useState('')
  const [answer, setAnswer] = useState('')
  const [reviewResult, setReviewResult] = useState<WordReview | null>(null)
  const [editing, setEditing] = useState<VocabularyWord | null>(null)
  const [editWord, setEditWord] = useState('')
  const [editTranslation, setEditTranslation] = useState('')
  const [pending, setPending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const requestIds = useRef(new Map<string, string>())

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [nextWords, nextCards] = await Promise.all([
        api.vocabulary(),
        api.reviewCards(),
      ])
      setWords(nextWords)
      setCards(nextCards)
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Не удалось загрузить словарь.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const activeCard = cards[0]

  async function addWord(event: FormEvent) {
    event.preventDefault()
    if (!word.trim() || !translation.trim()) {
      setError('Введите слово и перевод.')
      return
    }
    setPending(true)
    setError('')
    setNotice('')
    try {
      const saved = await api.addWord(word.trim(), translation.trim())
      const isNew = !words.some((item) => item.id === saved.id)
      if (isNew && user) logActivity(user.id, 'word')
      setWord('')
      setTranslation('')
      setNotice(
        isNew
          ? `Слово «${saved.word}» добавлено.`
          : `Слово «${saved.word}» уже было в словаре.`,
      )
      await load()
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Не удалось добавить слово.',
      )
    } finally {
      setPending(false)
    }
  }

  function startEdit(item: VocabularyWord) {
    setEditing(item)
    setEditWord(item.word)
    setEditTranslation(item.translation)
    setNotice('')
    setError('')
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault()
    if (!editing) return
    if (!editWord.trim() || !editTranslation.trim()) {
      setError('Слово и перевод не должны быть пустыми.')
      return
    }
    setPending(true)
    setError('')
    try {
      await api.updateWord(editing.id, {
        word: editWord.trim(),
        translation: editTranslation.trim(),
      })
      setNotice('Слово изменено, серия повторений сброшена.')
      setEditing(null)
      await load()
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Не удалось изменить слово.',
      )
    } finally {
      setPending(false)
    }
  }

  async function removeWord(item: VocabularyWord) {
    if (
      !window.confirm(
        `Удалить слово «${item.word}» вместе с историей повторений?`,
      )
    )
      return
    setPending(true)
    setError('')
    setNotice('')
    try {
      await api.deleteWord(item.id)
      setNotice(`Слово «${item.word}» удалено.`)
      if (editing?.id === item.id) setEditing(null)
      await load()
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Не удалось удалить слово.',
      )
    } finally {
      setPending(false)
    }
  }

  async function submitReview(event: FormEvent) {
    event.preventDefault()
    if (!activeCard || !answer.trim()) return
    const replayKey = `${activeCard.id}:${answer.trim().toLocaleLowerCase('ru-RU')}`
    let requestId = requestIds.current.get(replayKey)
    if (!requestId) {
      requestId = crypto.randomUUID()
      requestIds.current.set(replayKey, requestId)
    }
    setPending(true)
    setError('')
    try {
      const result = await api.reviewWord(
        activeCard.id,
        answer.trim(),
        requestId,
      )
      requestIds.current.delete(replayKey)
      setReviewResult(result)
      setCards((items) => items.filter((item) => item.id !== activeCard.id))
      if (user) logActivity(user.id, 'review')
      const nextWords = await api.vocabulary()
      setWords(nextWords)
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Не удалось проверить перевод.',
      )
    } finally {
      setPending(false)
    }
  }

  function nextCard() {
    setReviewResult(null)
    setAnswer('')
    setError('')
  }

  return (
    <section className="dictionary-page">
      <header className="page-head">
        <div>
          <div className="kicker">ЛИЧНЫЙ СЛОВАРЬ</div>
          <h1>Словарь</h1>
          <p className="muted">
            Слова и переводы доступны только владельцу. Режим карточек скрывает
            перевод до проверки, а интервалы повторения растут: 1, 3, 7, 14 и 30
            дней.
          </p>
        </div>
        <div className="page-head-actions">
          <span className="chip">
            <BookMarked size={16} />
            {words.length} {plural(words.length, 'слово', 'слова', 'слов')}
          </span>
          <span className="chip">
            <Repeat2 size={16} />К повторению: {cards.length}
          </span>
        </div>
      </header>

      {error ? <div className="alert">{error}</div> : null}
      {notice ? <div className="alert success">{notice}</div> : null}

      <ExternalDictionary
        onSelect={(nextWord, nextTranslation) => {
          setWord(nextWord)
          setTranslation(nextTranslation)
          setNotice(
            'Перевод подставлен. Нажмите «Добавить», чтобы сохранить слово.',
          )
        }}
      />
      <div className="dictionary-grid">
        <div className="stack">
          <article className="card card-pad">
            <div className="card-head">
              <h2 className="card-title">
                <span className="title-icon">
                  <Plus size={18} />
                </span>
                Добавить слово
              </h2>
            </div>
            <form className="word-form" onSubmit={addWord}>
              <label className="field">
                Изучаемое слово
                <input
                  maxLength={100}
                  value={word}
                  placeholder="tea"
                  onChange={(event) => setWord(event.target.value)}
                />
              </label>
              <label className="field">
                Перевод
                <input
                  maxLength={200}
                  value={translation}
                  placeholder="чай"
                  onChange={(event) => setTranslation(event.target.value)}
                />
              </label>
              <button
                className="btn-primary compact"
                type="submit"
                disabled={pending}
              >
                <Plus size={16} />
                {pending ? 'Сохраняем…' : 'Добавить'}
              </button>
            </form>
            <p className="muted form-note">
              Регистр слова и лишние пробелы нормализуются. Если слово уже есть
              с другим переводом, измените его в списке.
            </p>
          </article>

          <article className="card card-pad review-card">
            <div className="card-head">
              <h2 className="card-title">
                <span className="title-icon">
                  <Repeat2 size={18} />
                </span>
                Повторение
              </h2>
              <span className="muted">
                {cards.length}{' '}
                {plural(cards.length, 'карточка', 'карточки', 'карточек')} в
                очереди
              </span>
            </div>

            {reviewResult ? (
              <div
                className={`review-result${reviewResult.is_correct ? ' correct' : ' wrong'}`}
              >
                <div className="review-result-head">
                  {reviewResult.is_correct ? (
                    <CheckCircle2 size={22} />
                  ) : (
                    <XCircle size={22} />
                  )}
                  <strong>
                    {reviewResult.is_correct ? 'Верно!' : 'Пока нет'}
                  </strong>
                </div>
                <p>
                  Правильный перевод:{' '}
                  <strong>{reviewResult.translation}</strong>
                </p>
                <p className="muted">
                  Следующее повторение:{' '}
                  {formatRelativeReview(reviewResult.next_review)} ·{' '}
                  {new Date(reviewResult.next_review).toLocaleString('ru-RU', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                <button
                  className="btn-primary compact"
                  type="button"
                  onClick={nextCard}
                >
                  {cards.length ? 'Следующая карточка' : 'Завершить повторение'}
                  <ArrowRight size={16} />
                </button>
              </div>
            ) : activeCard ? (
              <form className="review-form" onSubmit={submitReview}>
                <div className="review-word">{activeCard.word}</div>
                <div className="review-hint">
                  <EyeOff size={15} />
                  Перевод скрыт. Введите его по памяти.
                </div>
                <label className="field">
                  Перевод
                  <input
                    autoFocus
                    maxLength={200}
                    value={answer}
                    placeholder="Введите перевод"
                    onChange={(event) => setAnswer(event.target.value)}
                  />
                </label>
                <button
                  className="btn-primary compact"
                  type="submit"
                  disabled={pending || !answer.trim()}
                >
                  {pending ? 'Проверяем…' : 'Проверить'}
                  <ArrowRight size={16} />
                </button>
                <p className="muted form-note">
                  После верного ответа интервал: 1 → 3 → 7 → 14 → 30 дней. После
                  ошибки — через час.
                </p>
              </form>
            ) : (
              <div className="review-empty">
                <CheckCircle2 size={26} />
                <div>
                  <strong>Нет карточек к повторению</strong>
                  <p className="muted">
                    {words.length
                      ? 'Все слова повторены. Следующие карточки появятся в назначенный срок.'
                      : 'Добавьте первое слово — оно сразу появится в очереди повторения.'}
                  </p>
                </div>
              </div>
            )}
          </article>
        </div>

        <article className="card card-pad dictionary-list">
          <div className="card-head">
            <h2 className="card-title">
              <span className="title-icon">
                <BookMarked size={18} />
              </span>
              Мои слова
            </h2>
            <Link className="link" to="/progress">
              Прогресс
            </Link>
          </div>

          {loading ? (
            <p className="muted">Загружаем словарь…</p>
          ) : words.length === 0 ? (
            <div className="empty-state compact-empty">
              <h3>Словарь пока пуст</h3>
              <p className="muted">Добавьте слово через форму слева.</p>
            </div>
          ) : (
            <div className="word-list">
              {words.map((item) => (
                <div key={item.id} className="word-item">
                  {editing?.id === item.id ? (
                    <form className="word-edit" onSubmit={saveEdit}>
                      <input
                        value={editWord}
                        maxLength={100}
                        aria-label="Слово"
                        onChange={(event) => setEditWord(event.target.value)}
                      />
                      <input
                        value={editTranslation}
                        maxLength={200}
                        aria-label="Перевод"
                        onChange={(event) =>
                          setEditTranslation(event.target.value)
                        }
                      />
                      <div className="word-edit-actions">
                        <button
                          className="btn-primary compact"
                          type="submit"
                          disabled={pending}
                        >
                          Сохранить
                        </button>
                        <button
                          className="btn-ghost compact"
                          type="button"
                          onClick={() => setEditing(null)}
                        >
                          <X size={15} />
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="word-main">
                        <strong>{item.word}</strong>
                        <span>{item.translation}</span>
                      </div>
                      <div className="word-meta">
                        <span
                          className="streak-badge"
                          title="Серия успешных повторений"
                        >
                          <Flame size={13} />
                          {item.streak}
                        </span>
                        <span className="muted">
                          {formatRelativeReview(item.next_review)}
                        </span>
                      </div>
                      <div className="word-actions">
                        <button
                          className="icon-btn"
                          type="button"
                          aria-label={`Изменить ${item.word}`}
                          onClick={() => startEdit(item)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="icon-btn danger"
                          type="button"
                          aria-label={`Удалить ${item.word}`}
                          onClick={() => void removeWord(item)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </article>
      </div>
    </section>
  )
}
