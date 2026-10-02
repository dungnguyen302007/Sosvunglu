import type { Sos, WaterLevel } from '../types'

export type PriorityLevel = 'critical' | 'high' | 'normal'

const WATER_SCORE: Record<WaterLevel, number> = { roof: 50, chest: 35, knee: 15, ankle: 5 }

/**
 * Điểm ưu tiên cứu: mức nước > bị thương / người dễ tổn thương > pin yếu > đông người > chờ lâu.
 */
export function priorityScore(sos: Sos, now = Date.now()): number {
  let score = sos.water_level ? WATER_SCORE[sos.water_level] : 10
  if (sos.injured) score += 25
  score += Math.min((sos.profile?.vulnerable ?? sos.guest_vulnerable ?? []).length * 8, 24)
  if (sos.battery != null) {
    if (sos.battery <= 15) score += 15
    else if (sos.battery <= 30) score += 8
  }
  score += Math.min(sos.people_count, 10) * 2
  const waitedMin = (now - new Date(sos.created_at).getTime()) / 60000
  score += Math.min(Math.max(waitedMin, 0) / 5, 20)
  return Math.round(score)
}

export function priorityLevel(score: number): PriorityLevel {
  if (score >= 60) return 'critical'
  if (score >= 35) return 'high'
  return 'normal'
}

export const PRIORITY_COLOR: Record<PriorityLevel, string> = {
  critical: '#ff2d2d',
  high: '#ff9500',
  normal: '#ffd60a',
}

export const PRIORITY_LABEL: Record<PriorityLevel, string> = {
  critical: 'Rất nguy cấp',
  high: 'Nguy hiểm',
  normal: 'Cần cứu',
}

export function sortByPriority(list: Sos[], now = Date.now()): Sos[] {
  return [...list].sort((a, b) => priorityScore(b, now) - priorityScore(a, now))
}
