import type { ActivityKind } from '../api/types'
import { LEVELS } from '../api/types'

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
const EVENT_NAME = 'linguabot-activity'
export function activityEventName() {
  return EVENT_NAME
}
export function logActivity(userId: number, kind: ActivityKind) {
  window.dispatchEvent(
    new CustomEvent(EVENT_NAME, { detail: { userId, kind } }),
  )
}
export function emptyActivity(): ActivitySummary {
  return {
    today: {
      attempt: 0,
      review: 0,
      word: 0,
      placement: 0,
      conversation: 0,
      message: 0,
    },
    todayTotal: 0,
    week: [],
    weekTotal: 0,
    streak: 0,
    lastActive: null,
  }
}
export function levelIndex(level: string) {
  return Math.max(LEVELS.indexOf(level as (typeof LEVELS)[number]), 0)
}
