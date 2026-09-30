import { describe, expect, it } from 'vitest'
import type { RescuerLocation, Sos, Team } from '../types'
import { acceptSecondsLeft, pickTeam } from './dispatch'

const NOW = Date.parse('2026-10-01T10:00:00Z')
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString()
const team = (id: string, status: Team['status'] = 'ready'): Team => ({ id, name: id, vehicle: 'xuồng', capacity: 6, status })
const loc = (team_id: string, lat: number, ago = 0, on_duty = true): RescuerLocation => ({
  user_id: team_id + lat,
  team_id,
  lat,
  lng: 107,
  on_duty,
  updated_at: iso(ago),
})
const sos = (p: Partial<Sos>): Sos =>
  ({ id: 's', lat: 16, lng: 107, status: 'waiting', assigned_team_id: null, accepted_at: null, assigned_at: null, tried_team_ids: [], ...p }) as Sos

const P = { lat: 16, lng: 107 }

describe('pickTeam', () => {
  it('chọn đội sẵn sàng gần nhất trong 3 km', () => {
    const r = pickTeam(P, { sos: [], teams: [team('A'), team('B')], locations: [loc('A', 16.02), loc('B', 16.005)], exclude: [], now: NOW })
    expect(r).toBe('B')
  })
  it('bỏ đội ngoài 3 km, đội bận, đội đã thử, vị trí cũ, người hết ca', () => {
    const r = pickTeam(P, {
      sos: [],
      teams: [team('far'), team('busy', 'busy'), team('tried'), team('stale'), team('off')],
      locations: [loc('far', 16.05), loc('busy', 16.001), loc('tried', 16.001), loc('stale', 16.001, 20 * 60000), loc('off', 16.001, 0, false)],
      exclude: ['tried'],
      now: NOW,
    })
    expect(r).toBeNull()
  })
  it('gộp SOS trùng: trong 100 m có SOS đang cứu → giao cùng đội, kể cả đội đang bận', () => {
    const r = pickTeam(P, {
      sos: [sos({ id: 'x', lat: 16.0005, status: 'on_way', assigned_team_id: 'busy' })],
      teams: [team('busy', 'busy'), team('A')],
      locations: [loc('A', 16.001)],
      exclude: [],
      now: NOW,
    })
    expect(r).toBe('busy')
  })
})

describe('acceptSecondsLeft', () => {
  it('đếm ngược 2 phút khi chưa xác nhận', () => {
    expect(acceptSecondsLeft(sos({ status: 'assigned', assigned_at: iso(30000) }), NOW)).toBe(90)
    expect(acceptSecondsLeft(sos({ status: 'assigned', assigned_at: iso(300000) }), NOW)).toBe(0)
    expect(acceptSecondsLeft(sos({ status: 'assigned', assigned_at: iso(1000), accepted_at: iso(0) }), NOW)).toBeNull()
  })
})
