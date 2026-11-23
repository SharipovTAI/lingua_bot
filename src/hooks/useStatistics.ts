import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import { ApiError } from '../api/types'
import type { Statistics } from '../api/types'

export function useStatistics() {
  const [data, setData] = useState<Statistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await api.statistics())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось загрузить статистику.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { data, loading, error, reload }
}
