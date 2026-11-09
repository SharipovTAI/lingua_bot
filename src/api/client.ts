import { createMockApi } from './mock'
import { ApiError } from './types'
import type {
  ChatMessage,
  Conversation,
  MessageSendResult,
  Profile,
  Scenario,
  User,
} from './types'

const TOKEN_KEY = 'linguabot_token'
const USER_KEY = 'linguabot_user'

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api/v1'

/** Локальная копия контракта main. Включается через VITE_USE_MOCK, пути и типы ответов не меняются. */
export const isLocalApi = import.meta.env.VITE_USE_MOCK === 'true'

function readUser(): User | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function getStoredSession(): { token: string; user: User | null } {
  return {
    token: localStorage.getItem(TOKEN_KEY) ?? '',
    user: readUser(),
  }
}

export function storeSession(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

function fieldMessage(details: unknown): string {
  if (!details || typeof details !== 'object') {
    return 'Не удалось выполнить запрос.'
  }

  const body = details as Record<string, unknown>
  if (typeof body.detail === 'string') return body.detail

  const lines = Object.entries(body).flatMap(([key, value]) => {
    if (Array.isArray(value)) {
      return value.map((item) => (typeof item === 'string' ? item : `${key}: ${String(item)}`))
    }
    if (typeof value === 'string') return [value]
    return []
  })

  return lines.join('\n') || 'Не удалось выполнить запрос.'
}

async function request<T>(path: string, method = 'GET', data?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) headers.Authorization = `Token ${token}`

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    })
  } catch {
    throw new ApiError(0, null, 'Бэкенд недоступен. Запустите Django на http://127.0.0.1:8000 (ветка main).')
  }

  const text = await response.text()
  let body: unknown = null
  if (response.status !== 204 && text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = { detail: text.slice(0, 180) }
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, body, fieldMessage(body))
  }

  return body as T
}

const liveApi = {
  health: () => request<{ status: string }>('/health/'),
  register: (email: string, password: string) =>
    request<{ user: User }>('/auth/register/', 'POST', { email, password }),
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login/', 'POST', { email, password }),
  logout: () => request<null>('/auth/logout/', 'POST'),
  profile: () => request<Profile>('/profile/'),
  updateProfile: (data: Partial<Profile>) => request<Profile>('/profile/', 'PATCH', data),
  scenarios: () => request<Scenario[]>('/scenarios/'),
  conversations: () => request<Conversation[]>('/conversations/'),
  createConversation: (scenarioId: number) =>
    request<Conversation>('/conversations/', 'POST', { scenario_id: scenarioId }),
  history: (conversationId: number) =>
    request<ChatMessage[]>(`/conversations/${conversationId}/messages/`),
  send: (conversationId: number, content: string) =>
    request<MessageSendResult>(`/conversations/${conversationId}/messages/`, 'POST', { content }),
}

export const api = isLocalApi ? createMockApi() : liveApi
