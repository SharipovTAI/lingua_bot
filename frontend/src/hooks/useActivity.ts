import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { activityEventName, emptyActivity } from '../lib/activity'

export function useActivity(userId: number | undefined) {
  const { profile } = useAuth()
  const [activity, setActivity] = useState(emptyActivity)
  useEffect(() => {
    let cancelled = false
    setActivity(emptyActivity())
    const load = () => {
      if (!userId) return
      void api
        .statistics()
        .then((data) => {
          if (!cancelled) setActivity(data.activity)
        })
        .catch(() => {})
    }
    load()
    window.addEventListener(activityEventName(), load)
    return () => {
      cancelled = true
      window.removeEventListener(activityEventName(), load)
    }
  }, [userId, profile?.language])
  return activity
}
