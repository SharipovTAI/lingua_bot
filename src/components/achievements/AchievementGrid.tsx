import { Check, Lock } from 'lucide-react'
import type { Achievement } from '../../lib/achievements'

type AchievementGridProps = {
  items: Achievement[]
  dense?: boolean
}

export function AchievementGrid({ items, dense = false }: AchievementGridProps) {
  return (
    <div className={`achievement-grid${dense ? ' dense' : ''}`}>
      {items.map((item) => {
        const progress = Math.min(1, item.target ? item.value / item.target : 0)
        return (
          <article
            key={item.id}
            className={`achievement-card accent-${item.accent}${item.unlocked ? ' unlocked' : ' locked'}`}
          >
            <span className="achievement-icon">
              <item.icon size={dense ? 18 : 22} strokeWidth={1.9} />
            </span>
            <div className="achievement-body">
              <div className="achievement-title">
                {item.title}
                <span className="achievement-state">
                  {item.unlocked ? <Check size={14} /> : <Lock size={13} />}
                </span>
              </div>
              {!dense ? <p>{item.description}</p> : null}
              <div className="achievement-progress">
                <span style={{ width: `${progress * 100}%` }} />
              </div>
              <span className="achievement-count">
                {item.unlocked
                  ? 'Получено'
                  : `${Math.min(item.value, item.target)} из ${item.target}`}
              </span>
            </div>
          </article>
        )
      })}
    </div>
  )
}
