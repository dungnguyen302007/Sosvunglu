import { describe, expect, it } from 'vitest'
import type { Sos } from '../types'
import { priorityLevel, priorityScore, sortByPriority } from './priority'

const NOW = new Date('2026-10-01T10:00:00Z').getTime()

function sos(p: Partial<Sos> = {}): Sos {
  return {
    id: 'x',
    user_id: null,
    guest_name: 'A',
    guest_phone: '0900000000',
    lat: 16,
    lng: 107,
    accuracy: 10,
    battery: null,
    people_count: 1,
    water_level: null,
    injured: false,
    note: null,
    status: 'waiting',
    assigned_team_id: null,
    created_at: new Date(NOW).toISOString(),
    updated_at: new Date(NOW).toISOString(),
    ...p,
  }
}

describe('priorityScore', () => {
  it('nước tới mái nhà + bị thương là rất nguy cấp', () => {
    const s = priorityScore(sos({ water_level: 'roof', injured: true }), NOW)
    expect(priorityLevel(s)).toBe('critical')
  })

  it('nước mắt cá, 1 người, vừa gửi là mức thường', () => {
    expect(priorityLevel(priorityScore(sos({ water_level: 'ankle' }), NOW))).toBe('normal')
  })

  it('pin yếu được cộng điểm', () => {
    expect(priorityScore(sos({ battery: 10 }), NOW)).toBeGreaterThan(priorityScore(sos({ battery: 90 }), NOW))
  })

  it('chờ càng lâu càng ưu tiên, nhưng có trần', () => {
    const old = sos({ created_at: new Date(NOW - 60 * 60000).toISOString() })
    const veryOld = sos({ created_at: new Date(NOW - 600 * 60000).toISOString() })
    expect(priorityScore(old, NOW)).toBeGreaterThan(priorityScore(sos(), NOW))
    expect(priorityScore(veryOld, NOW) - priorityScore(sos(), NOW)).toBe(20)
  })

  it('người dễ tổn thương trong hồ sơ được cộng điểm', () => {
    const profile = { vulnerable: ['elderly', 'child'] } as Sos['profile']
    expect(priorityScore(sos({ profile }), NOW)).toBe(priorityScore(sos(), NOW) + 16)
  })

  it('sortByPriority xếp nguy cấp lên đầu', () => {
    const list = sortByPriority([sos({ id: 'a' }), sos({ id: 'b', water_level: 'roof' })], NOW)
    expect(list.map((s) => s.id)).toEqual(['b', 'a'])
  })
})
