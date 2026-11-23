import {
  Award,
  BookMarked,
  Flame,
  MessageCircle,
  PenLine,
  Repeat2,
  Sparkles,
  Sprout,
  Target,
  TrendingUp,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Statistics } from '../api/types'
import type { ActivitySummary } from './activity'
import { levelIndex } from './activity'

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
  const words = stats?.vocabulary_words ?? 0
  const attempts = stats?.attempts ?? 0
  const completed = stats?.completed_exercises ?? 0
  const reviews = stats?.word_reviews ?? 0
  const conversations = stats?.conversations ?? 0
  const level = stats?.level ?? 'A1'

  return [
    {
      id: 'first-word',
      title: 'Первые слова',
      description: 'Добавьте первое слово в личный словарь.',
      icon: Sprout,
      value: words,
      target: 1,
      unlocked: words >= 1,
      accent: 'mint',
    },
    {
      id: 'ten-words',
      title: 'Коллекционер',
      description: 'Соберите 10 слов в личном словаре.',
      icon: BookMarked,
      value: words,
      target: 10,
      unlocked: words >= 10,
      accent: 'blue',
    },
    {
      id: 'first-exercise',
      title: 'Первый шаг',
      description: 'Выполните первое упражнение.',
      icon: PenLine,
      value: attempts,
      target: 1,
      unlocked: attempts >= 1,
      accent: 'mint',
    },
    {
      id: 'ten-exercises',
      title: 'Тренировка в ритме',
      description: 'Решите 10 разных упражнений хотя бы по разу.',
      icon: Target,
      value: completed,
      target: 10,
      unlocked: completed >= 10,
      accent: 'orange',
    },
    {
      id: 'accuracy',
      title: 'Точный удар',
      description: 'Достигните точности 80% минимум на 10 попытках.',
      icon: Sparkles,
      value: attempts,
      target: 10,
      unlocked: attempts >= 10 && (stats?.accuracy ?? 0) >= 80,
      accent: 'purple',
    },
    {
      id: 'reviews',
      title: 'Память на пять',
      description: 'Повторите слова 10 раз в режиме карточек.',
      icon: Repeat2,
      value: reviews,
      target: 10,
      unlocked: reviews >= 10,
      accent: 'blue',
    },
    {
      id: 'streak',
      title: 'В ударе',
      description: 'Занимайтесь 7 дней подряд.',
      icon: Flame,
      value: activity.streak,
      target: 7,
      unlocked: activity.streak >= 7,
      accent: 'orange',
    },
    {
      id: 'placement',
      title: 'Уровень определён',
      description: 'Пройдите входной тест и сохраните результат.',
      icon: TrendingUp,
      value: stats?.placement ? 1 : 0,
      target: 1,
      unlocked: Boolean(stats?.placement),
      accent: 'mint',
    },
    {
      id: 'level-b1',
      title: 'Уверенный B1',
      description: 'Достигните уровня B1 или выше.',
      icon: Award,
      value: levelIndex(level),
      target: 2,
      unlocked: levelIndex(level) >= 2,
      accent: 'purple',
    },
    {
      id: 'conversations',
      title: 'Собеседник',
      description: 'Проведите 5 разговорных тренировок.',
      icon: MessageCircle,
      value: conversations,
      target: 5,
      unlocked: conversations >= 5,
      accent: 'blue',
    },
  ]
}

export function unlockedCount(items: Achievement[]) {
  return items.filter((item) => item.unlocked).length
}
