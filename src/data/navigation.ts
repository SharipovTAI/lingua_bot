import {
  Award,
  BookMarked,
  BookOpen,
  LayoutDashboard,
  MessageCircle,
  NotebookPen,
  PenLine,
  Settings,
  TrendingUp,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  badge?: boolean
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Панель', icon: LayoutDashboard },
  { to: '/practice', label: 'Разговорная практика', icon: MessageCircle },
  { to: '/lesson', label: 'Ежедневный урок', icon: BookOpen, badge: true },
  { to: '/exercises', label: 'Упражнения', icon: PenLine },
  { to: '/dictionary', label: 'Словарь', icon: BookMarked },
  { to: '/notes', label: 'Заметки', icon: NotebookPen },
  { to: '/progress', label: 'Прогресс', icon: TrendingUp },
  { to: '/achievements', label: 'Достижения', icon: Award },
]

export const settingsItem: NavItem = {
  to: '/settings',
  label: 'Настройки',
  icon: Settings,
}

export const pageCopy: Record<string, { title: string; text: string }> = {
  '/practice': {
    title: 'Разговорная практика',
    text: 'Диалоги с ботом по темам. Здесь появится полный экран чата и выбор сценария.',
  },
  '/lesson': {
    title: 'Ежедневный урок',
    text: 'Короткий урок дня: лексика, грамматика и закрепление. Каркас раздела готов.',
  },
  '/exercises': {
    title: 'Упражнения',
    text: 'Тренировки на слова, слух и грамматику. Экран подключен к общей навигации.',
  },
  '/dictionary': {
    title: 'Словарь',
    text: 'Личная коллекция слов и карточки для повторения. Раздел заложен в каркасе.',
  },
  '/notes': {
    title: 'Заметки',
    text: 'Заметки к урокам и диалогам. Страница доступна из бокового меню.',
  },
  '/progress': {
    title: 'Прогресс',
    text: 'Статистика занятий, серии и цели. Базовый маршрут уже работает.',
  },
  '/achievements': {
    title: 'Достижения',
    text: 'Награды за регулярность и словарный запас. Список будет заполняться позже.',
  },
  '/settings': {
    title: 'Настройки',
    text: 'Профиль, язык интерфейса и уведомления. Каркас настроек подключен.',
  },
}
