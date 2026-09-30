import type { RescuerLocation, Team } from '../types'

export interface LatLng {
  lat: number
  lng: number
}

/** Khoảng cách theo đường chim bay (km). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export interface TeamDistance {
  team: Team
  km: number
}

/**
 * Xếp các đội theo khoảng cách từ thành viên đang trong ca gần nhất tới điểm SOS.
 * Đội "Sẵn sàng" được ưu tiên trước, sau đó tới khoảng cách.
 */
export function nearestTeams(point: LatLng, teams: Team[], locations: RescuerLocation[]): TeamDistance[] {
  const result: TeamDistance[] = []
  for (const team of teams) {
    const members = locations.filter((l) => l.team_id === team.id && l.on_duty)
    if (members.length === 0) continue
    const km = Math.min(...members.map((m) => distanceKm(point, m)))
    result.push({ team, km })
  }
  return result.sort((a, b) => {
    const ra = a.team.status === 'ready' ? 0 : 1
    const rb = b.team.status === 'ready' ? 0 : 1
    return ra - rb || a.km - b.km
  })
}

export function formatKm(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`
}

export function directionsUrl(p: LatLng): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`
}

/** Chuẩn hóa SĐT Việt Nam: bỏ ký tự thừa, +84/84 → 0. */
export function normalizePhone(raw: string): string {
  let d = raw.replace(/\D/g, '')
  if (d.startsWith('84') && d.length >= 11) d = '0' + d.slice(2)
  return d
}

export function isValidPhone(raw: string): boolean {
  return /^0\d{9,10}$/.test(normalizePhone(raw))
}
