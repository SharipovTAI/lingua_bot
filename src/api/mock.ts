import { ApiError, LEVELS } from './types'
import type {
  ChatMessage,
  Conversation,
  Level,
  MessageSendResult,
  Profile,
  Scenario,
  User,
} from './types'

const DB_KEY = 'linguabot_local_db'
const TOKEN_KEY = 'linguabot_token'

type StoredUser = User & {
  password: string
  token: string | null
  profile: Profile
}

type StoredConversation = Conversation & { user_id: number }
type StoredMessage = ChatMessage & { conversation_id: number }

type LocalDb = {
  nextUserId: number
  nextConversationId: number
  nextMessageId: number
  users: StoredUser[]
  scenarios: Scenario[]
  conversations: StoredConversation[]
  messages: StoredMessage[]
}

const scenarios: Scenario[] = [
  {
    id: 1,
    slug: 'cafe',
    title: 'В кафе',
    description: 'Заказ напитков и еды у бариста.',
  },
  {
    id: 2,
    slug: 'airport',
    title: 'В аэропорту',
    description: 'Регистрация на рейс и вопросы на стойке.',
  },
  {
    id: 3,
    slug: 'shop',
    title: 'В магазине',
    description: 'Покупка одежды и уточнение размера.',
  },
]

function emptyDb(): LocalDb {
  return {
    nextUserId: 1,
    nextConversationId: 1,
    nextMessageId: 1,
    users: [],
    scenarios,
    conversations: [],
    messages: [],
  }
}

function loadDb(): LocalDb {
  const raw = localStorage.getItem(DB_KEY)
  if (!raw) return emptyDb()
  try {
    const parsed = JSON.parse(raw) as LocalDb
    if (!Array.isArray(parsed.users) || !Array.isArray(parsed.scenarios)) return emptyDb()
    if (parsed.scenarios.length === 0) parsed.scenarios = scenarios
    return parsed
  } catch {
    return emptyDb()
  }
}

function saveDb(db: LocalDb) {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

function delay() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 120)
  })
}

function fail(status: number, details: unknown, message: string): never {
  throw new ApiError(status, details, message)
}

function currentUser(db: LocalDb): StoredUser {
  const token = localStorage.getItem(TOKEN_KEY)
  const user = db.users.find((item) => item.token && item.token === token)
  if (!user) {
    fail(401, { detail: 'Учётные данные не были предоставлены.' }, 'Нужно войти снова.')
  }
  return user
}

export function createMockApi() {
  return {
    async health() {
      await delay()
      return { status: 'ok' }
    },

    async register(email: string, password: string) {
      await delay()
      const db = loadDb()
      const normalized = email.trim().toLowerCase()
      if (!normalized || !normalized.includes('@')) {
        fail(400, { email: ['Введите корректный email.'] }, 'Введите корректный email.')
      }
      if (!password) {
        fail(400, { password: ['Введите пароль.'] }, 'Введите пароль.')
      }
      if (db.users.some((item) => item.email === normalized)) {
        fail(
          400,
          { email: ['Пользователь с таким email уже зарегистрирован.'] },
          'Пользователь с таким email уже зарегистрирован.',
        )
      }

      const user: StoredUser = {
        id: db.nextUserId++,
        email: normalized,
        password,
        token: null,
        profile: { level: 'A1', goal: '', language: 'en' },
      }
      db.users.push(user)
      saveDb(db)
      return { user: { id: user.id, email: user.email } }
    },

    async login(email: string, password: string) {
      await delay()
      const db = loadDb()
      const normalized = email.trim().toLowerCase()
      const user = db.users.find((item) => item.email === normalized && item.password === password)
      if (!user) {
        fail(401, { detail: 'Неверный email или пароль.' }, 'Неверный email или пароль.')
      }
      user.token = `local-${crypto.randomUUID()}`
      saveDb(db)
      return { token: user.token, user: { id: user.id, email: user.email } }
    },

    async logout() {
      await delay()
      const db = loadDb()
      const token = localStorage.getItem(TOKEN_KEY)
      const user = db.users.find((item) => item.token === token)
      if (user) user.token = null
      saveDb(db)
      return null
    },

    async profile() {
      await delay()
      const db = loadDb()
      return { ...currentUser(db).profile }
    },

    async updateProfile(data: Partial<Profile>) {
      await delay()
      const db = loadDb()
      const user = currentUser(db)
      if (data.level !== undefined && !LEVELS.includes(data.level as Level)) {
        fail(400, { level: ['Недопустимый уровень.'] }, 'Недопустимый уровень.')
      }
      if (data.goal !== undefined && data.goal.length > 200) {
        fail(400, { goal: ['Не длиннее 200 символов.'] }, 'Не длиннее 200 символов.')
      }
      user.profile = {
        ...user.profile,
        ...(data.level ? { level: data.level } : {}),
        ...(data.goal !== undefined ? { goal: data.goal } : {}),
        language: 'en',
      }
      saveDb(db)
      return { ...user.profile }
    },

    async scenarios() {
      await delay()
      return loadDb().scenarios.map((item) => ({ ...item }))
    },

    async conversations() {
      await delay()
      const db = loadDb()
      const user = currentUser(db)
      return db.conversations
        .filter((item) => item.user_id === user.id)
        .map((item) => ({
          id: item.id,
          scenario_id: item.scenario_id,
          scenario_title: item.scenario_title,
          created_at: item.created_at,
        }))
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
    },

    async createConversation(scenarioId: number) {
      await delay()
      const db = loadDb()
      const user = currentUser(db)
      const scenario = db.scenarios.find((item) => item.id === scenarioId)
      if (!scenario) {
        fail(400, { scenario_id: ['Сценарий не найден.'] }, 'Сценарий не найден.')
      }
      const conversation: StoredConversation = {
        id: db.nextConversationId++,
        user_id: user.id,
        scenario_id: scenario.id,
        scenario_title: scenario.title,
        created_at: new Date().toISOString(),
      }
      db.conversations.push(conversation)
      saveDb(db)
      return {
        id: conversation.id,
        scenario_id: conversation.scenario_id,
        scenario_title: conversation.scenario_title,
        created_at: conversation.created_at,
      }
    },

    async history(conversationId: number) {
      await delay()
      const db = loadDb()
      const user = currentUser(db)
      const conversation = db.conversations.find((item) => item.id === conversationId)
      if (!conversation || conversation.user_id !== user.id) {
        fail(404, { detail: 'Диалог не найден.' }, 'Диалог не найден.')
      }
      return db.messages
        .filter((item) => item.conversation_id === conversationId)
        .map((item) => ({
          id: item.id,
          role: item.role,
          content: item.content,
          feedback: item.feedback,
          created_at: item.created_at,
        }))
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
    },

    async send(conversationId: number, content: string): Promise<MessageSendResult> {
      await delay()
      const db = loadDb()
      const user = currentUser(db)
      const conversation = db.conversations.find((item) => item.id === conversationId)
      if (!conversation || conversation.user_id !== user.id) {
        fail(404, { detail: 'Диалог не найден.' }, 'Диалог не найден.')
      }
      const text = content.trim()
      if (!text) {
        fail(400, { content: ['Введите сообщение.'] }, 'Введите сообщение.')
      }
      if (text.length > 2000) {
        fail(400, { content: ['Не длиннее 2000 символов.'] }, 'Не длиннее 2000 символов.')
      }
      const message: StoredMessage = {
        id: db.nextMessageId++,
        conversation_id: conversationId,
        role: 'user',
        content: text,
        feedback: {},
        created_at: new Date().toISOString(),
      }
      db.messages.push(message)
      saveDb(db)
      return {
        user_message: {
          id: message.id,
          role: message.role,
          content: message.content,
          feedback: message.feedback,
          created_at: message.created_at,
        },
        assistant_message: null,
        feedback: [],
      }
    },
  }
}
