import { useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../../api/client'
import { ApiError, LANGUAGES } from '../../api/types'
import type { Language, LookupResult } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'

export function ExternalDictionary({
  onSelect,
}: {
  onSelect: (word: string, translation: string) => void
}) {
  const { profile } = useAuth()
  const language = profile?.language ?? 'en'
  const [word, setWord] = useState('')
  const [target, setTarget] = useState<Language>(
    language === 'ru' ? 'en' : 'ru',
  )
  const [result, setResult] = useState<LookupResult | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  async function search(event: FormEvent) {
    event.preventDefault()
    if (!word.trim() || pending) return
    setError('')
    setResult(null)
    setPending(true)
    try {
      setResult(await api.lookup(word.trim(), target))
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Не удалось найти перевод.',
      )
    } finally {
      setPending(false)
    }
  }
  return (
    <article className="card card-pad">
      <h2 className="card-title">Внешний словарь и переводчик</h2>
      <form className="word-form" onSubmit={search}>
        <label className="field">
          Слово или короткая фраза
          <input
            aria-label="Поиск во внешнем словаре"
            value={word}
            maxLength={100}
            onChange={(e) => setWord(e.target.value)}
            required
          />
        </label>
        <label className="field">
          Язык перевода
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value as Language)}
          >
            {Object.entries(LANGUAGES)
              .filter(([key]) => key !== language)
              .map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
          </select>
        </label>
        <button
          className="btn-primary compact"
          disabled={pending || !word.trim()}
        >
          {pending ? 'Ищем…' : 'Найти перевод'}
        </button>
      </form>
      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}
      {result && (
        <div className="external-result">
          <h3>
            {result.word} — {result.translation}
          </h3>
          {result.definitions.map((text, index) => (
            <p key={index}>{text}</p>
          ))}
          {result.examples.length > 0 && (
            <>
              <h3>Примеры употребления</h3>
              {result.examples.map((text, index) => (
                <p key={index}>{text}</p>
              ))}
            </>
          )}
          {!result.examples.length && (
            <p className="muted">
              Для этого слова источник не вернул примеров.
            </p>
          )}
          <p className="muted">
            Источники:{' '}
            <a href={result.translation_url} target="_blank" rel="noreferrer">
              MyMemory
            </a>
            {result.definitions.length > 0 && (
              <>
                {' '}
                и{' '}
                <a href={result.source_url} target="_blank" rel="noreferrer">
                  Wiktionary (CC BY-SA)
                </a>
              </>
            )}
          </p>
          <button
            className="btn-ghost compact"
            type="button"
            disabled={result.translation.length > 200}
            onClick={() => onSelect(result.word, result.translation)}
          >
            Подставить в личный словарь
          </button>
        </div>
      )}
    </article>
  )
}
