import type { ActivityKind } from '../api/types'
import { LEVELS } from '../api/types'

const STORAGE_PREFIX = 'linguabot_activity_'
const EVENT_NAME = 'linguabot-activity'
const MAX_EVENTS = 600

export type ActivityEvent = {
  kind: ActivityKind
  at: string
}

export type ActivityDay = {
  key: string
  label: string
  count: number
  isToday: boolean
}

export type ActivitySummary = {
  today: Record<ActivityKind, number>
  todayTotal: number
  week: ActivityDay[]
  weekTotal: number
  streak: number
  lastActive: string | null
}

const WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

export function activityKey(userId: number) {
  return `${STORAGE_PREFIX}${userId}`
}

export function readActivity(userId: number): ActivityEvent[] {
  const raw = localStorage.getItem(activityKey(userId))
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as ActivityEvent[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item) => item && typeof item.at === 'string' && typeof item.kind === 'string',
    )
  } catch {
    return []
  }
}

/**
 * Backend четвёртой недели отдаёт только накопленные показатели.
 * Журнал действий в браузере позволяет показать недельный график и серию
 * без выдуманных чисел: запись появляется только после успешного ответа API.
 */
export function logActivity(userId: number, kind: ActivityKind) {
  const events = readActivity(userId)
  events.push({ kind, at: new Date().toISOString() })
  localStorage.setItem(activityKey(userId), JSON.stringify(events.slice(-MAX_EVENTS)))
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { userId } }))
}

export function activityEventName() {
  return EVENT_NAME
}

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function startOfDay(date: Date) {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function emptyToday(): Record<ActivityKind, number> {
  return { attempt: 0, review: 0, word: 0, placement: 0, conversation: 0, message: 0 }
}

export function summarizeActivity(userId: number | undefined): ActivitySummary {
  const today = emptyToday()
  const week: ActivityDay[] = []
  const now = startOfDay(new Date())

  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(now)
    day.setDate(now.getDate() - offset)
    week.push({
      key: dateKey(day),
      label: WEEKDAYS[day.getDay()],
      count: 0,
      isToday: offset === 0,
    })
  }

  if (!userId) {
    return { today, todayTotal: 0, week, weekTotal: 0, streak: 0, lastActive: null }
  }

  const events = readActivity(userId)
  const days = new Set<string>()
  let lastActive: string | null = null

  for (const event of events) {
    const date = new Date(event.at)
    if (Number.isNaN(date.getTime())) continue
    const key = dateKey(date)
    days.add(key)
    if (!lastActive || event.at > lastActive) lastActive = event.at
    if (key === week[week.length - 1].key) {
      today[event.kind] = (today[event.kind] ?? 0) + 1
    }
    const bucket = week.find((item) => item.key === key)
    if (bucket) bucket.count += 1
  }

  let cursor = new Date(now)
  if (!days.has(dateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
  }
  let streak = 0
  while (days.has(dateKey(cursor)) && streak < 366) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  return {
    today,
    todayTotal: Object.values(today).reduce((sum, value) => sum + value, 0),
    week,
    weekTotal: week.reduce((sum, item) => sum + item.count, 0),
    streak,
    lastActive,
  }
}

export function levelIndex(level: string) {
  return Math.max(LEVELS.indexOf(level as (typeof LEVELS)[number]), 0)
}
