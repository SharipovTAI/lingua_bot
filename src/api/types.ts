export type User = {
  id: number
  email: string
}

export type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1'

export type Profile = {
  level: Level
  goal: string
  language: 'en'
}

export type Scenario = {
  id: number
  slug: string
  title: string
  description: string
}

export type Conversation = {
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
