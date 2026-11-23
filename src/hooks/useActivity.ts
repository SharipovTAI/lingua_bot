import { useEffect, useMemo, useState } from 'react'
import { activityEventName, activityKey, summarizeActivity } from '../lib/activity'

export function useActivity(userId: number | undefined) {
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!userId) return
    const bump = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: number }>).detail
      if (!detail?.userId || detail.userId === userId) {
        setVersion((value) => value + 1)
      }
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === activityKey(userId)) {
        setVersion((value) => value + 1)
      }
    }
    window.addEventListener(activityEventName(), bump)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(activityEventName(), bump)
      window.removeEventListener('storage', onStorage)
    }
  }, [userId])

  return useMemo(() => {
    void version
    return summarizeActivity(userId)
  }, [userId, version])
}
