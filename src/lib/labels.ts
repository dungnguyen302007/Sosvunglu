import type { Role, SosStatus, TeamStatus, Vulnerable, WaterLevel } from '../types'

export const STATUS_LABEL: Record<SosStatus, string> = {
  waiting: 'Chờ cứu',
  assigned: 'Đã giao đội',
  on_way: 'Đang tới',
  arrived: 'Đã tới nơi',
  rescued: 'Đã an toàn',
  cannot_reach: 'Không tiếp cận được',
  cancelled: 'Đã hủy',
}

export const WATER_LABEL: Record<WaterLevel, string> = {
  ankle: 'Mắt cá',
  knee: 'Đầu gối',
  chest: 'Ngực',
  roof: 'Mái nhà',
}

export const VULNERABLE_LABEL: Record<Vulnerable, string> = {
  elderly: 'Người già',
  child: 'Trẻ nhỏ',
  disabled: 'Khuyết tật',
  chronic: 'Bệnh nền',
  pregnant: 'Mang thai',
}

export const ROLE_LABEL: Record<Role, string> = {
  citizen: 'Người dân',
  rescuer: 'Cứu hộ',
  commander: 'Chỉ huy',
}

export const TEAM_STATUS_LABEL: Record<TeamStatus, string> = {
  ready: 'Sẵn sàng',
  busy: 'Đang làm nhiệm vụ',
  resting: 'Nghỉ',
  out_of_fuel: 'Hết nhiên liệu',
}

export function timeAgo(iso: string, now = Date.now()): string {
  const min = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000))
  if (min < 1) return 'vừa xong'
  if (min < 60) return `${min} phút trước`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} giờ trước`
  return `${Math.floor(h / 24)} ngày trước`
}
