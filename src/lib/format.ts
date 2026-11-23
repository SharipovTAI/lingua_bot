export function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatRelativeReview(iso: string | null | undefined) {
  if (!iso) return 'готово к повторению'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const diff = date.getTime() - Date.now()
  if (diff <= 0) return 'готово к повторению'
  const minutes = Math.round(diff / 60000)
  if (minutes < 60) return `через ${minutes} мин.`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `через ${hours} ч.`
  const days = Math.round(hours / 24)
  if (days === 1) return 'завтра'
  return `через ${days} дн.`
}

export function plural(count: number, one: string, few: string, many: string) {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}
