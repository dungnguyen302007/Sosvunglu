import { useCallback, useEffect, useRef, useState } from 'react'
import { backend } from './backend'
import { clearPending, enqueue, flush, getPending, type PendingSos } from './queue'
import type { Sos } from '../types'

/**
 * Tải dữ liệu và tự tải lại khi: có thay đổi realtime, có mạng lại, hoặc mỗi `intervalMs`
 * (phòng khi realtime rớt).
 */
export function useLive<T>(fetcher: () => Promise<T>, intervalMs = 30000) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fetcherRef = useRef(fetcher)
  useEffect(() => {
    fetcherRef.current = fetcher
  })

  const reload = useCallback(async () => {
    try {
      setData(await fetcherRef.current())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    void reload()
    const unsub = backend.subscribe(() => void reload())
    const timer = window.setInterval(() => void reload(), intervalMs)
    const onOnline = () => void reload()
    window.addEventListener('online', onOnline)
    return () => {
      unsub()
      window.clearInterval(timer)
      window.removeEventListener('online', onOnline)
    }
  }, [reload, intervalMs])

  return { data, error, reload }
}

export type SentResult = { kind: 'user'; sos: Sos } | { kind: 'guest'; id: string }

async function send(p: PendingSos): Promise<SentResult> {
  if (p.kind === 'user') return { kind: 'user', sos: await backend.createSos(p.input) }
  return { kind: 'guest', id: await backend.createGuestSos(p.input) }
}

/** Gửi SOS qua hàng đợi: mất mạng thì giữ lại và tự thử lại mỗi 10 giây / khi có mạng. */
export function useSosQueue(onSent: (r: SentResult) => void) {
  const [pending, setPending] = useState<PendingSos | null>(() => getPending())
  const [error, setError] = useState<string | null>(null)
  const onSentRef = useRef(onSent)
  useEffect(() => {
    onSentRef.current = onSent
  })

  const trySend = useCallback(async () => {
    try {
      const r = await flush(send)
      setError(null)
      if (r) onSentRef.current(r)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setPending(getPending())
    }
  }, [])

  const hasPending = pending != null
  useEffect(() => {
    if (!hasPending) return
    void trySend()
    const timer = window.setInterval(() => void trySend(), 10000)
    const onOnline = () => void trySend()
    window.addEventListener('online', onOnline)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('online', onOnline)
    }
  }, [hasPending, trySend])

  const submit = useCallback(
    (item: Omit<PendingSos, 'queuedAt' | 'attempts'>) => {
      setPending(enqueue(item))
    },
    [],
  )

  const cancel = useCallback(() => {
    clearPending()
    setPending(null)
    setError(null)
  }, [])

  return { pending, error, submit, cancel, trySend }
}

/** Đồng hồ tick để cập nhật "x phút trước". */
export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(t)
  }, [intervalMs])
  return now
}

export function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}
