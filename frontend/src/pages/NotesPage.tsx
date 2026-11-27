import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../api/client'
import { ApiError } from '../api/types'
import type { Note } from '../api/types'

export function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [editing, setEditing] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  useEffect(() => {
    let cancelled = false
    void api
      .notes()
      .then((data) => {
        if (!cancelled) setNotes(data)
      })
      .catch(() => {
        if (!cancelled) setError('Не удалось загрузить заметки.')
      })
    return () => {
      cancelled = true
    }
  }, [])
  async function save(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError('')
    try {
      if (editing) await api.updateNote(editing, title, content)
      else await api.addNote(title, content)
      setNotes(await api.notes())
      setTitle('')
      setContent('')
      setEditing(null)
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Не удалось сохранить заметку.',
      )
    } finally {
      setPending(false)
    }
  }
  async function remove(id: number) {
    if (!confirm('Удалить заметку?')) return
    setPending(true)
    setError('')
    try {
      await api.deleteNote(id)
      setNotes(await api.notes())
    } catch {
      setError('Не удалось удалить заметку.')
    } finally {
      setPending(false)
    }
  }
  return (
    <section>
      <header className="page-head">
        <div>
          <h1>Заметки</h1>
          <p className="muted">
            Правила, выражения и выводы из разговоров. Сохраняются для
            выбранного языка.
          </p>
        </div>
      </header>
      {error && <div className="alert">{error}</div>}
      <div className="dictionary-grid">
        <article className="card card-pad">
          <h2>{editing ? 'Изменить заметку' : 'Новая заметка'}</h2>
          <form className="word-form" onSubmit={save}>
            <label className="field">
              Заголовок
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                required
              />
            </label>
            <label className="field">
              Текст
              <textarea
                rows={7}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={5000}
                required
              />
            </label>
            <button className="btn-primary compact" disabled={pending}>
              {pending ? 'Сохраняем…' : 'Сохранить заметку'}
            </button>
            {editing && (
              <button
                type="button"
                className="btn-ghost compact"
                onClick={() => {
                  setEditing(null)
                  setTitle('')
                  setContent('')
                }}
              >
                Отменить
              </button>
            )}
          </form>
        </article>
        <div className="stack">
          {!notes.length && <p className="muted">Пока нет заметок.</p>}
          {notes.map((note) => (
            <article key={note.id} className="card card-pad">
              <h2>{note.title}</h2>
              <p className="note-body">{note.content}</p>
              <div className="profile-actions">
                <button
                  className="btn-ghost compact"
                  disabled={pending}
                  onClick={() => {
                    setEditing(note.id)
                    setTitle(note.title)
                    setContent(note.content)
                  }}
                >
                  Изменить
                </button>
                <button
                  className="btn-ghost compact"
                  disabled={pending}
                  onClick={() => void remove(note.id)}
                >
                  Удалить
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
