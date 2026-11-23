import { Check } from 'lucide-react'
import { LEVELS } from '../../api/types'
import type { Level } from '../../api/types'

type LevelLadderProps = {
  level: Level
}

export function LevelLadder({ level }: LevelLadderProps) {
  const current = Math.max(LEVELS.indexOf(level), 0)
  return (
    <div className="level-ladder" aria-label={`Текущий уровень ${level}`}>
      {LEVELS.map((item, index) => (
        <div
          key={item}
          className={`ladder-step${index === current ? ' current' : ''}${
            index < current ? ' passed' : ''
          }`}
        >
          <span className="ladder-dot">{index < current ? <Check size={12} /> : null}</span>
          {item}
        </div>
      ))}
    </div>
  )
}
