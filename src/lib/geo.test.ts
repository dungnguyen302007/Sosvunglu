import { describe, expect, it } from 'vitest'
import type { RescuerLocation, Team } from '../types'
import { distanceKm, formatKm, isValidPhone, nearestTeams, normalizePhone } from './geo'

describe('distanceKm', () => {
  it('Huế → Đà Nẵng khoảng 80 km', () => {
    const d = distanceKm({ lat: 16.4637, lng: 107.5909 }, { lat: 16.0544, lng: 108.2022 })
    expect(d).toBeGreaterThan(75)
    expect(d).toBeLessThan(85)
  })
  it('cùng điểm = 0', () => {
    expect(distanceKm({ lat: 1, lng: 1 }, { lat: 1, lng: 1 })).toBe(0)
  })
})

describe('nearestTeams', () => {
  const t = (id: string, status: Team['status'] = 'ready'): Team => ({ id, name: id, vehicle: 'xuồng', capacity: 6, status })
  const loc = (user: string, team: string, lat: number, on_duty = true): RescuerLocation => ({
    user_id: user,
    team_id: team,
    lat,
    lng: 107,
    on_duty,
    updated_at: '',
  })

  it('chọn đội gần nhất, bỏ qua người hết ca', () => {
    const res = nearestTeams({ lat: 16, lng: 107 }, [t('A'), t('B')], [loc('1', 'A', 16.05), loc('2', 'B', 16.01), loc('3', 'A', 16.0, false)])
    expect(res.map((r) => r.team.id)).toEqual(['B', 'A'])
  })

  it('đội sẵn sàng được ưu tiên hơn đội đang bận dù xa hơn', () => {
    const res = nearestTeams({ lat: 16, lng: 107 }, [t('A', 'busy'), t('B')], [loc('1', 'A', 16.001), loc('2', 'B', 16.05)])
    expect(res[0].team.id).toBe('B')
  })

  it('đội không có ai trong ca thì không được gợi ý', () => {
    expect(nearestTeams({ lat: 16, lng: 107 }, [t('A')], [])).toEqual([])
  })
})

describe('phone', () => {
  it('chuẩn hóa +84', () => {
    expect(normalizePhone('+84 912 345 678')).toBe('0912345678')
    expect(normalizePhone('0912.345.678')).toBe('0912345678')
  })
  it('kiểm tra hợp lệ', () => {
    expect(isValidPhone('0912345678')).toBe(true)
    expect(isValidPhone('12345')).toBe(false)
  })
})

it('formatKm', () => {
  expect(formatKm(0.45)).toBe('450 m')
  expect(formatKm(3.26)).toBe('3,3 km')
})
