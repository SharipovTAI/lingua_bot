import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api, clearSession, getStoredSession, storeSession } from '../api/client'
import { ApiError } from '../api/types'
import type { Profile, User } from '../api/types'

type AuthContextValue = {
  user: User | null
  profile: Profile | null
  ready: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
  setProfile: (profile: Profile) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [{ token, user: storedUser }] = useState(getStoredSession)
  const [user, setUser] = useState<User | null>(token ? storedUser : null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [ready, setReady] = useState(!token)

  useEffect(() => {
    if (!token) return

    let cancelled = false
    api
      .profile()
      .then((data) => {
        if (cancelled) return
        setProfile(data)
        setReady(true)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        if (error instanceof ApiError && error.status === 401) {
          clearSession()
          setUser(null)
          setProfile(null)
        }
        setReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [token])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      ready,
      async login(email, password) {
        const result = await api.login(email, password)
        storeSession(result.token, result.user)
        setUser(result.user)
        const nextProfile = await api.profile()
        setProfile(nextProfile)
      },
      async register(email, password) {
        await api.register(email, password)
        const result = await api.login(email, password)
        storeSession(result.token, result.user)
        setUser(result.user)
        const nextProfile = await api.profile()
        setProfile(nextProfile)
      },
      async logout() {
        try {
          await api.logout()
        } catch {
          // Токен всё равно снимаем на клиенте.
        }
        clearSession()
        setUser(null)
        setProfile(null)
      },
      async refreshProfile() {
        const data = await api.profile()
        setProfile(data)
      },
      setProfile,
    }),
    [user, profile, ready],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth должен вызываться внутри AuthProvider')
  }
  return context
}
