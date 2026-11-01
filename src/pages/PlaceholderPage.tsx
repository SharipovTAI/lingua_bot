import { useLocation } from 'react-router-dom'
import { pageCopy } from '../data/navigation'

export function PlaceholderPage() {
  const { pathname } = useLocation()
  const copy = pageCopy[pathname] ?? {
    title: 'Раздел',
    text: 'Страница подключена к каркасу приложения.',
  }

  return (
    <section className="placeholder">
      <h1>{copy.title}</h1>
      <p>{copy.text}</p>
    </section>
  )
}
