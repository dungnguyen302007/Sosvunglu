import type { Backend, GuestStatus } from './types'
import type { Profile, RescuerLocation, Sos, Team } from '../../types'

/**
 * Lớp dữ liệu gọi máy chủ Next.js của chính app (thay bản Supabase + bản demo của bản Vite).
 * Giao diện `Backend` giữ nguyên, nên các màn hình chép từ bản cũ không phải sửa.
 */

async function goi<T>(duongDan: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  let res: Response
  try {
    res = await fetch(duongDan, {
      ...init,
      credentials: 'same-origin',
      headers: init?.json !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
    })
  } catch {
    // Giữ chữ "fetch/network" để queue.ts nhận ra lỗi MẠNG (thử lại) chứ không phải lỗi dữ liệu.
    throw new Error('Lỗi mạng (network) — chưa kết nối được máy chủ')
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) phatSuKienDangNhap()
    throw new Error((data as { loi?: string } | null)?.loi ?? `Máy chủ trả lỗi ${res.status}`)
  }
  return data as T
}

const dangNhapDoi = new EventTarget()
function phatSuKienDangNhap() {
  dangNhapDoi.dispatchEvent(new Event('doi'))
}

/** Hỏi /api/thay-doi mỗi 10 giây khi màn hình đang mở; có thay đổi thì báo mọi nơi đăng ký. */
const nguoiNghe = new Set<() => void>()
let dongHo: number | null = null
let phienBanCuoi = ''
async function hoiThayDoi() {
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
  try {
    const { v } = await goi<{ v: string }>('/api/thay-doi')
    if (phienBanCuoi && v !== phienBanCuoi) nguoiNghe.forEach((cb) => cb())
    phienBanCuoi = v
  } catch {
    /* mất mạng: lần sau hỏi lại */
  }
}

export const apiBackend: Backend = {
  mode: 'may-chu',

  getProfile: () => goi<Profile | null>('/api/toi'),
  onAuthChange(cb) {
    const nghe = () => cb()
    dangNhapDoi.addEventListener('doi', nghe)
    return () => dangNhapDoi.removeEventListener('doi', nghe)
  },
  async signUp(input) {
    await goi('/api/dang-ky', { method: 'POST', json: input })
    phatSuKienDangNhap()
  },
  async signIn(phone, password) {
    await goi('/api/dang-nhap', { method: 'POST', json: { phone, password } })
    phatSuKienDangNhap()
  },
  async signOut() {
    await goi('/api/dang-xuat', { method: 'POST' }).catch(() => {})
    try {
      localStorage.removeItem('profile_cache')
      localStorage.removeItem('on_duty')
    } catch {
      /* bỏ qua */
    }
    phatSuKienDangNhap()
  },
  async updateProfile(patch) {
    await goi('/api/toi', { method: 'PATCH', json: patch })
    phatSuKienDangNhap()
  },

  createSos: (input) => goi<Sos>('/api/sos', { method: 'POST', json: input }),
  createGuestSos: async (input) => (await goi<{ id: string }>('/api/sos-khach', { method: 'POST', json: input })).id,
  guestSosStatus: (id) => goi<GuestStatus | null>(`/api/sos-khach/${encodeURIComponent(id)}`),
  myOpenSos: () => goi<Sos | null>('/api/sos/cua-toi'),
  async updateMySos(id, patch) {
    await goi(`/api/sos/${id}/dan`, { method: 'PATCH', json: patch })
  },

  listSos: () => goi<Sos[]>('/api/sos'),
  async updateSos(id, patch) {
    await goi(`/api/sos/${id}`, { method: 'PATCH', json: patch })
  },
  async declineSos(id) {
    await goi(`/api/sos/${id}/tu-choi`, { method: 'POST' })
  },
  async reportFake(id, lockSender) {
    await goi(`/api/sos/${id}/bao-gia`, { method: 'POST', json: { khoaNguoiGui: lockSender } })
  },
  async runDispatch() {
    await goi('/api/dieu-phoi', { method: 'POST' })
  },

  listTeams: () => goi<Team[]>('/api/doi'),
  async createTeam(team) {
    await goi('/api/doi', { method: 'POST', json: team })
  },
  async updateTeam(id, patch) {
    await goi(`/api/doi/${id}`, { method: 'PATCH', json: patch })
  },
  async setUserRole(phone, role, teamId) {
    await goi('/api/quyen', { method: 'POST', json: { phone, role, team_id: teamId } })
  },
  async lockUser(phone, lock) {
    await goi('/api/quyen/khoa', { method: 'POST', json: { phone, khoa: lock } })
  },

  listStaff: () => goi<Profile[]>('/api/nhan-su'),
  listHouseholds: () => goi<Profile[]>('/api/ho-dan'),

  async upsertMyLocation(lat, lng, onDuty) {
    await goi('/api/vi-tri', { method: 'POST', json: { lat, lng, on_duty: onDuty } })
  },
  listLocations: () => goi<RescuerLocation[]>('/api/vi-tri'),

  subscribe(cb) {
    nguoiNghe.add(cb)
    if (dongHo == null && typeof window !== 'undefined') {
      void hoiThayDoi()
      dongHo = window.setInterval(() => void hoiThayDoi(), 10000)
    }
    return () => {
      nguoiNghe.delete(cb)
      if (nguoiNghe.size === 0 && dongHo != null) {
        window.clearInterval(dongHo)
        dongHo = null
      }
    }
  },
}
