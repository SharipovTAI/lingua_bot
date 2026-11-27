import { Award } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Statistics } from '../api/types'
import type { ActivitySummary } from './activity'

export type AchievementAccent = 'mint' | 'orange' | 'purple' | 'blue'

export type Achievement = {
  id: string
  title: string
  description: string
  icon: LucideIcon
  value: number
  target: number
  unlocked: boolean
  accent: AchievementAccent
}

export function buildAchievements(
  stats: Statistics | null,
  activity: ActivitySummary,
): Achievement[] {
  void activity
  return (stats?.achievements ?? []).map((item) => ({ ...item, icon: Award }))
}

export function unlockedCount(items: Achievement[]) {
  return items.filter((item) => item.unlocked).length
}
