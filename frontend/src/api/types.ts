import type { ActivitySummary } from '../lib/activity'
export type User = {
  id: number
  email: string
}

export type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1'

export type Language = 'en' | 'de' | 'ru'
export const LANGUAGES: Record<Language, string> = {
  en: 'Английский',
  de: 'Немецкий',
  ru: 'Русский',
}

export type Profile = {
  level: Level
  goal: string
  language: Language
}

export type Scenario = {
  id: number
  slug: string
  title: string
  description: string
}

export type Conversation = {
  language: Language
  id: number
  scenario_id: number
  scenario_title: string
  created_at: string
}

export type ChatMessage = {
  id: number
  role: 'user' | 'assistant'
  content: string
  feedback: Record<string, unknown>
  created_at: string
}

export type MessageSendResult = {
  user_message: ChatMessage
  assistant_message: ChatMessage | null
  feedback: unknown[]
}

export type ExerciseKind = 'grammar' | 'vocabulary'

export type Exercise = {
  id: number
  title: string
  level: Level
  kind: ExerciseKind
  topic: string
  question: string
  options: string[]
}

export type PlacementAnswer = {
  exercise_id: number
  answer: string
}

export type PlacementResult = {
  band: string
  id: number
  request_id: string
  score: number
  total: number
  level: Level
  created_at: string
}

export type Attempt = {
  id: number
  request_id: string
  exercise_id: number
  answer: string
  is_correct: boolean
  correct_answer: string
  explanation: string
  created_at: string
}

export type VocabularyWord = {
  id: number
  word: string
  translation: string
  next_review: string | null
  streak: number
}

export type ReviewCard = {
  id: number
  word: string
  next_review: string | null
}

export type WordReview = {
  id: number
  request_id: string
  word_id: number
  answer: string
  is_correct: boolean
  translation: string
  next_review: string
  created_at: string
}

export type KindStatistics = {
  attempts: number
  correct: number
}

export type AchievementData = {
  id: string
  title: string
  description: string
  value: number
  target: number
  unlocked: boolean
  unlocked_at: string | null
  accent: 'mint' | 'orange' | 'purple' | 'blue'
  difficulty: string
}
export type DailyTask = {
  id: string
  title: string
  to: string
  count: number
  target: number
  xp: number
}
export type LearningStep = { title: string; description: string; to: string }
export type Note = {
  id: number
  title: string
  content: string
  language: Language
  updated_at: string
}
export type LookupResult = {
  word: string
  language: Language
  target: Language
  translation: string
  definitions: string[]
  examples: string[]
  source: string
  source_url: string
  translation_url: string
}
export type Statistics = {
  language: Language
  activity: ActivitySummary
  achievements: AchievementData[]
  daily_tasks: DailyTask[]
  xp_today: number
  learning_plan: LearningStep[]
  focus_topics: string[]

  level: Level
  attempts: number
  correct: number
  accuracy: number
  completed_exercises: number
  by_kind: Record<string, KindStatistics>
  vocabulary_words: number
  words_due: number
  word_reviews: number
  correct_reviews: number
  conversations: number
  user_messages: number
  placement: PlacementResult | null
}

export type ActivityKind =
  | 'attempt'
  | 'review'
  | 'word'
  | 'placement'
  | 'conversation'
  | 'message'

export class ApiError extends Error {
  status: number
  details: unknown

  constructor(status: number, details: unknown, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1']
