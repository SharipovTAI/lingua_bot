import type { ActivitySummary } from '../../lib/activity'
import { formatDateTime, plural } from '../../lib/format'

type ActivityChartProps = {
  activity: ActivitySummary
  compact?: boolean
}

export function ActivityChart({ activity, compact = false }: ActivityChartProps) {
  const max = Math.max(1, ...activity.week.map((day) => day.count))
  return (
    <div className={`activity-chart${compact ? ' compact' : ''}`}>
      <div className="bars" role="img" aria-label="Активность за последние семь дней">
        {activity.week.map((day) => (
          <div
            key={day.key}
            className={`bar${day.isToday ? ' active' : ''}`}
            title={`${day.label}: ${day.count} ${plural(day.count, 'действие', 'действия', 'действий')}`}
          >
            <i
              style={{
                height: `${day.count ? Math.max(14, (day.count / max) * 100) : 5}%`,
              }}
            />
            <span>{day.label}</span>
          </div>
        ))}
      </div>
      <p className="activity-note">
        {activity.weekTotal} {plural(activity.weekTotal, 'действие', 'действия', 'действий')} за
        неделю
        {activity.lastActive ? ` · последнее ${formatDateTime(activity.lastActive)}` : ''}. Журнал
        ведётся в этом браузере по успешным ответам API.
      </p>
    </div>
  )
}
