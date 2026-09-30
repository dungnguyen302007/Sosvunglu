import { distanceKm, type LatLng } from './geo'
import type { RescuerLocation, Sos, Team } from '../types'

/** Tham số điều phối — khớp với pick_team / run_dispatch trong supabase/schema.sql. */
export const DISPATCH = {
  /** Bán kính tìm đội (km) */
  radiusKm: 3,
  /** SOS trong khoảng này coi như cùng chỗ → giao cùng đội (km) */
  duplicateKm: 0.1,
  /** Đội phải xác nhận trong thời gian này (ms) */
  acceptMs: 2 * 60 * 1000,
  /** Vị trí cứu hộ cũ hơn thời gian này coi như mất liên lạc (ms) */
  staleLocationMs: 15 * 60 * 1000,
}

const ACTIVE = ['assigned', 'on_way', 'arrived']

/**
 * Chọn đội cho một điểm SOS:
 *  1) Có SOS đang cứu trong 100 m → giao luôn đội đó (gộp SOS trùng).
 *  2) Không thì đội "Sẵn sàng" có thành viên trong ca gần nhất, trong 3 km.
 */
export function pickTeam(
  point: LatLng,
  opts: {
    sos: Sos[]
    teams: Team[]
    locations: RescuerLocation[]
    exclude: string[]
    selfId?: string
    now?: number
  },
): string | null {
  const now = opts.now ?? Date.now()
  const dup = opts.sos
    .filter(
      (s) =>
        s.id !== opts.selfId &&
        s.assigned_team_id &&
        !opts.exclude.includes(s.assigned_team_id) &&
        ACTIVE.includes(s.status),
    )
    .map((s) => ({ team: s.assigned_team_id!, km: distanceKm(point, s) }))
    .filter((x) => x.km <= DISPATCH.duplicateKm)
    .sort((a, b) => a.km - b.km)[0]
  if (dup) return dup.team

  let best: { team: string; km: number } | null = null
  for (const t of opts.teams) {
    if (t.status !== 'ready' || opts.exclude.includes(t.id)) continue
    for (const l of opts.locations) {
      if (l.team_id !== t.id || !l.on_duty) continue
      if (now - new Date(l.updated_at).getTime() > DISPATCH.staleLocationMs) continue
      const km = distanceKm(point, l)
      if (km <= DISPATCH.radiusKm && (!best || km < best.km)) best = { team: t.id, km }
    }
  }
  return best?.team ?? null
}

/** Số giây còn lại để đội xác nhận (null nếu không áp dụng). */
export function acceptSecondsLeft(s: Sos, now = Date.now()): number | null {
  if (s.status !== 'assigned' || s.accepted_at || !s.assigned_at) return null
  return Math.max(0, Math.round((new Date(s.assigned_at).getTime() + DISPATCH.acceptMs - now) / 1000))
}
