import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { MessageCircle, Plus, Send } from 'lucide-react'
import { api } from '../api/client'
import { ApiError } from '../api/types'
import type { ChatMessage, Conversation, Scenario } from '../api/types'

function formatTime(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ChatPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [scenarioId, setScenarioId] = useState<number | ''>('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const active = useMemo(
    () => conversations.find((item) => item.id === activeId) ?? null,
    [conversations, activeId],
  )

  async function loadWorkspace() {
    setError('')
    setLoading(true)
    try {
      const [nextScenarios, nextConversations] = await Promise.all([
        api.scenarios(),
        api.conversations(),
      ])
      setScenarios(nextScenarios)
      setConversations(nextConversations)
      setScenarioId(nextScenarios[0]?.id ?? '')
      const first = nextConversations[0]
      setActiveId(first?.id ?? null)
      if (first) {
        setMessages(await api.history(first.id))
      } else {
        setMessages([])
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось загрузить чат.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadWorkspace()
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function openConversation(id: number) {
    setActiveId(id)
    setError('')
    try {
      setMessages(await api.history(id))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось загрузить историю.')
    }
  }

  async function startConversation(event: FormEvent) {
    event.preventDefault()
    if (scenarioId === '') return
    setError('')
    try {
      const created = await api.createConversation(scenarioId)
      setConversations((current) => [created, ...current])
      setActiveId(created.id)
      setMessages([])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось создать диалог.')
    }
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault()
    if (!activeId || !draft.trim()) return
    setSending(true)
    setError('')
    try {
      const result = await api.send(activeId, draft.trim())
      setDraft('')
      setMessages((current) => {
        const next = [...current, result.user_message]
        if (result.assistant_message) next.push(result.assistant_message)
        return next
      })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось отправить сообщение.')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="chat-page">
      <aside className="chat-list card">
        <h2>Диалоги</h2>
        <form className="new-chat" onSubmit={startConversation}>
          <select
            value={scenarioId}
            onChange={(event) => setScenarioId(event.target.value ? Number(event.target.value) : '')}
            aria-label="Сценарий"
          >
            {scenarios.length === 0 ? <option value="">Нет сценариев</option> : null}
            {scenarios.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
          <button className="btn-primary compact" type="submit" disabled={scenarioId === ''}>
            <Plus size={16} />
            Новый
          </button>
        </form>

        <div className="conversation-items">
          {conversations.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`conversation-item${item.id === activeId ? ' active' : ''}`}
              onClick={() => void openConversation(item.id)}
            >
              <strong>{item.scenario_title}</strong>
              <span>{formatTime(item.created_at)}</span>
            </button>
          ))}
          {!loading && conversations.length === 0 ? (
            <p className="muted">Пока нет диалогов. Выберите сценарий и начните.</p>
          ) : null}
        </div>
      </aside>

      <article className="card card-pad chat chat-main">
        <div className="card-head">
          <h2 className="card-title">
            <span className="title-icon">
              <MessageCircle size={18} />
            </span>
            {active?.scenario_title ?? 'Разговорная практика'}
          </h2>
        </div>

        {error ? <div className="alert">{error}</div> : null}

        <div className="chat-meta">
          {loading ? 'ЗАГРУЗКА' : active ? formatTime(active.created_at).toUpperCase() : 'ВЫБЕРИТЕ ИЛИ СОЗДАЙТЕ ДИАЛОГ'}
        </div>

        <div className="messages chat-history">
          {messages.map((message) => (
            <div key={message.id} className={`msg ${message.role === 'user' ? 'user' : 'bot'}`}>
              {message.role !== 'user' ? (
                <span className="bot-avatar">
                  <MessageCircle size={13} />
                </span>
              ) : null}
              <div>
                <div className="bubble">{message.content}</div>
                <div className="msg-time">{formatTime(message.created_at)}</div>
              </div>
            </div>
          ))}
          {!loading && active && messages.length === 0 ? (
            <p className="muted">История пуста. Сообщения ученика сохраняются в базе; ответ ИИ появится на следующей неделе.</p>
          ) : null}
          <div ref={endRef} />
        </div>

        <form className="composer" onSubmit={sendMessage}>
          <input
            placeholder={active ? 'Напиши сообщение...' : 'Сначала создайте диалог'}
            aria-label="Сообщение"
            value={draft}
            maxLength={2000}
            disabled={!active || sending}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button className="send" type="submit" aria-label="Отправить" disabled={!active || sending || !draft.trim()}>
            <Send size={16} />
          </button>
        </form>
      </article>
    </section>
  )
}
