import { useCallback, useEffect, useState } from 'react'
import { backend } from './lib/backend'
import type { Profile } from './types'
import { AuthPage } from './pages/AuthPage'
import { CitizenHome } from './pages/CitizenHome'
import { CommanderHome } from './pages/CommanderHome'
import { RescuerHome } from './pages/RescuerHome'
import { storage } from './lib/storage'

const PROFILE_CACHE = 'profile_cache'

export default function App() {
  // Dùng hồ sơ lưu trong máy để mở app tức thì, kể cả khi mất mạng
  const [profile, setProfile] = useState<Profile | null>(() => storage.get<Profile>(PROFILE_CACHE))
  const [ready, setReady] = useState(() => storage.get<Profile>(PROFILE_CACHE) != null)

  const load = useCallback(async () => {
    try {
      const p = await backend.getProfile()
      setProfile(p)
      if (p) storage.set(PROFILE_CACHE, p)
      else storage.remove(PROFILE_CACHE)
    } catch {
      /* mất mạng: giữ hồ sơ đã lưu */
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    void load()
    return backend.onAuthChange(() => void load())
  }, [load])

  if (!ready) return <p className="center muted page">Đang mở…</p>
  if (!profile) return <AuthPage />
  if (profile.role === 'commander') return <CommanderHome profile={profile} />
  if (profile.role === 'rescuer') return <RescuerHome profile={profile} />
  return <CitizenHome profile={profile} />
}
