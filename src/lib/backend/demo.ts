import { pickTeam } from '../dispatch'
import { normalizePhone } from '../geo'
import { storage } from '../storage'
import { OPEN_STATUSES, type Profile, type RescuerLocation, type Sos, type Team } from '../../types'
import type { Backend } from './types'

/**
 * Bản demo: toàn bộ dữ liệu lưu trong localStorage của trình duyệt.
 * Dùng để chạy thử khi chưa cấu hình Supabase. Mở nhiều tab để giả lập dân / cứu hộ / chỉ huy.
 * KHÔNG dùng cho thật: không có bảo mật, dữ liệu chỉ nằm trên một máy.
 */
interface DemoUser extends Profile {
  password: string
}

interface DemoDb {
  users: DemoUser[]
  teams: Team[]
  sos: Sos[]
  locations: RescuerLocation[]
}

const DB_KEY = 'demo_db'
const SESSION_KEY = 'demo_session'
const CHANGE_EVENT = 'demo-db-change'

const now = () => new Date().toISOString()
const minutesAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString()
const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

function baseProfile(p: Partial<DemoUser> & Pick<DemoUser, 'id' | 'full_name' | 'phone' | 'role'>): DemoUser {
  return {
    team_id: null,
    province: 'Huế',
    ward: 'Phường Phú Xuân',
    hamlet: null,
    address_detail: null,
    household_size: 1,
    vulnerable: [],
    relative_phone: null,
    note: null,
    home_lat: null,
    home_lng: null,
    password: '123456',
    ...p,
  }
}

export function seedDb(): DemoDb {
  const team1: Team = { id: 'team-1', name: 'Đội 1 — Phú Xuân', vehicle: 'xuồng máy', capacity: 8, status: 'ready' }
  const team2: Team = { id: 'team-2', name: 'Đội 2 — Thuận Hóa', vehicle: 'ca nô', capacity: 12, status: 'ready' }
  const citizen = baseProfile({
    id: 'u-citizen',
    full_name: 'Nguyễn Thị Lan',
    phone: '0900000003',
    role: 'citizen',
    hamlet: 'Tổ 5',
    address_detail: '12 Kiệt 3 Lê Duẩn',
    household_size: 4,
    vulnerable: ['elderly', 'child'],
    relative_phone: '0911111111',
    note: 'Nhà 1 tầng, không có gác',
    home_lat: 16.4629,
    home_lng: 107.5931,
  })
  return {
    users: [
      baseProfile({ id: 'u-commander', full_name: 'Trần Văn Chỉ Huy', phone: '0900000001', role: 'commander' }),
      baseProfile({ id: 'u-rescuer', full_name: 'Lê Văn Cứu', phone: '0900000002', role: 'rescuer', team_id: team1.id }),
      baseProfile({ id: 'u-rescuer2', full_name: 'Phạm Văn Hộ', phone: '0900000004', role: 'rescuer', team_id: team2.id }),
      citizen,
      baseProfile({ id: 'u-h1', full_name: 'Trần Thị Mai', phone: '0900000011', role: 'citizen', household_size: 3, vulnerable: ['elderly'], home_lat: 16.4701, home_lng: 107.5842 }),
      baseProfile({ id: 'u-h2', full_name: 'Nguyễn Văn Bình', phone: '0900000012', role: 'citizen', household_size: 5, vulnerable: ['child', 'pregnant'], home_lat: 16.4585, home_lng: 107.5968 }),
      baseProfile({ id: 'u-h3', full_name: 'Lê Thị Hạnh', phone: '0900000013', role: 'citizen', household_size: 2, home_lat: 16.4532, home_lng: 107.6055 }),
      baseProfile({ id: 'u-rescuer3', full_name: 'Đặng Văn Tâm', phone: '0900000005', role: 'rescuer', team_id: 'team-1' }),
    ],
    teams: [team1, team2],
    sos: [
      {
        id: 'sos-seed-1',
        user_id: null,
        guest_name: 'Hoàng Văn Nam',
        guest_phone: '0987654321',
        lat: 16.4712,
        lng: 107.5801,
        accuracy: 25,
        battery: 12,
        people_count: 5,
        water_level: 'roof',
        injured: true,
        note: null,
        status: 'waiting',
        assigned_team_id: null,
        assigned_at: null,
        accepted_at: null,
        tried_team_ids: [],
        created_at: minutesAgo(40),
        updated_at: minutesAgo(40),
      },
      {
        id: 'sos-seed-2',
        user_id: null,
        guest_name: 'Võ Thị Hoa',
        guest_phone: '0977123456',
        lat: 16.4551,
        lng: 107.6012,
        accuracy: 60,
        battery: 55,
        people_count: 2,
        water_level: 'knee',
        injured: false,
        note: null,
        status: 'on_way',
        assigned_team_id: team2.id,
        assigned_at: minutesAgo(10),
        accepted_at: minutesAgo(9),
        tried_team_ids: [team2.id],
        created_at: minutesAgo(15),
        updated_at: minutesAgo(10),
      },
    ],
    locations: [
      { user_id: 'u-rescuer', team_id: team1.id, lat: 16.4668, lng: 107.5905, on_duty: true, updated_at: now() },
      { user_id: 'u-rescuer2', team_id: team2.id, lat: 16.4502, lng: 107.6101, on_duty: true, updated_at: now() },
    ],
  }
}

const DISPATCH_ACCEPT_MS = 2 * 60 * 1000

/** Ghi sổ khi đổi đội — giống trigger guard_sos_update trong schema.sql. */
function setTeam(s: Sos, team: string | null) {
  if (team === s.assigned_team_id) return
  s.assigned_team_id = team
  s.assigned_at = team ? now() : null
  s.accepted_at = null
  if (team && !s.tried_team_ids.includes(team)) s.tried_team_ids = [...s.tried_team_ids, team]
}

function autoAssign(db: DemoDb, s: Sos) {
  const team = pickTeam(s, { sos: db.sos, teams: db.teams, locations: db.locations, exclude: s.tried_team_ids, selfId: s.id })
  if (!team) return
  setTeam(s, team)
  s.status = 'assigned'
}

/** Chuyển sang đội kế tiếp, hết đội thì về "Chờ cứu". Trả về true nếu có thay đổi. */
function reassign(db: DemoDb, s: Sos): boolean {
  const team = pickTeam(s, { sos: db.sos, teams: db.teams, locations: db.locations, exclude: s.tried_team_ids, selfId: s.id })
  if (!team && !s.assigned_team_id) return false
  setTeam(s, team)
  s.status = team ? 'assigned' : 'waiting'
  s.updated_at = now()
  return true
}

export function createDemoBackend(): Backend {
  const load = (): DemoDb => storage.get<DemoDb>(DB_KEY) ?? seedDb()
  const save = (db: DemoDb) => {
    storage.set(DB_KEY, db)
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }
  const sessionId = () => storage.get<string>(SESSION_KEY)
  const me = (db = load()) => db.users.find((u) => u.id === sessionId()) ?? null
  const strip = (u: DemoUser): Profile => {
    const { password: _pw, ...p } = u
    void _pw
    return p
  }
  const requireMe = (db: DemoDb) => {
    const u = me(db)
    if (!u) throw new Error('Chưa đăng nhập')
    return u
  }
  const authListeners = new Set<() => void>()
  const emitAuth = () => authListeners.forEach((cb) => cb())

  return {
    mode: 'demo',

    async getProfile() {
      const u = me()
      return u ? strip(u) : null
    },

    onAuthChange(cb) {
      authListeners.add(cb)
      return () => authListeners.delete(cb)
    },

    async signUp(input) {
      const db = load()
      const phone = normalizePhone(input.phone)
      if (db.users.some((u) => u.phone === phone)) throw new Error('Số điện thoại này đã đăng ký')
      const user: DemoUser = {
        ...input,
        phone,
        id: newId(),
        role: 'citizen',
        team_id: null,
      }
      db.users.push(user)
      save(db)
      storage.set(SESSION_KEY, user.id)
      emitAuth()
    },

    async signIn(phone, password) {
      const u = load().users.find((x) => x.phone === normalizePhone(phone) && x.password === password)
      if (!u) throw new Error('Sai số điện thoại hoặc mật khẩu')
      storage.set(SESSION_KEY, u.id)
      emitAuth()
    },

    async signOut() {
      storage.remove(SESSION_KEY)
      emitAuth()
    },

    async updateProfile(patch) {
      const db = load()
      Object.assign(requireMe(db), patch)
      save(db)
    },

    async createSos(input) {
      const db = load()
      const u = requireMe(db)
      const open = db.sos.find((s) => s.user_id === u.id && OPEN_STATUSES.includes(s.status))
      if (open) return open
      const sos: Sos = {
        ...input,
        id: newId(),
        user_id: u.id,
        guest_name: null,
        guest_phone: null,
        water_level: null,
        injured: false,
        note: null,
        status: 'waiting',
        assigned_team_id: null,
        assigned_at: null,
        accepted_at: null,
        tried_team_ids: [],
        created_at: now(),
        updated_at: now(),
      }
      autoAssign(db, sos)
      db.sos.push(sos)
      save(db)
      return sos
    },

    async createGuestSos(input) {
      const db = load()
      const phone = normalizePhone(input.phone)
      const open = db.sos.find((s) => s.guest_phone === phone && OPEN_STATUSES.includes(s.status))
      if (open) return open.id
      const { name, phone: _p, ...rest } = input
      void _p
      const sos: Sos = {
        ...rest,
        id: newId(),
        user_id: null,
        guest_name: name,
        guest_phone: phone,
        water_level: null,
        injured: false,
        note: null,
        status: 'waiting',
        assigned_team_id: null,
        assigned_at: null,
        accepted_at: null,
        tried_team_ids: [],
        created_at: now(),
        updated_at: now(),
      }
      autoAssign(db, sos)
      db.sos.push(sos)
      save(db)
      return sos.id
    },

    async guestSosStatus(id) {
      const db = load()
      const s = db.sos.find((x) => x.id === id)
      if (!s) return null
      return {
        status: s.status,
        team_name: db.teams.find((t) => t.id === s.assigned_team_id)?.name ?? null,
        accepted: s.accepted_at != null,
      }
    },

    async myOpenSos() {
      const db = load()
      const u = me(db)
      if (!u) return null
      return db.sos.find((s) => s.user_id === u.id && OPEN_STATUSES.includes(s.status)) ?? null
    },

    async updateMySos(id, patch) {
      const db = load()
      const u = requireMe(db)
      const s = db.sos.find((x) => x.id === id && x.user_id === u.id)
      if (!s) throw new Error('Không tìm thấy SOS')
      Object.assign(s, patch, { updated_at: now() })
      save(db)
    },

    async listSos() {
      const db = load()
      const u = requireMe(db)
      const withProfile = (s: Sos): Sos => {
        const owner = db.users.find((x) => x.id === s.user_id)
        return { ...s, profile: owner ? strip(owner) : null }
      }
      const list = db.sos
        .filter((s) => u.role === 'commander' || (u.role === 'rescuer' && OPEN_STATUSES.includes(s.status)))
        .map(withProfile)
      return list.sort((a, b) => b.created_at.localeCompare(a.created_at))
    },

    async updateSos(id, patch) {
      const db = load()
      const u = requireMe(db)
      if (u.role === 'citizen') throw new Error('Không có quyền')
      const s = db.sos.find((x) => x.id === id)
      if (!s) throw new Error('Không tìm thấy SOS')
      if (u.role === 'rescuer' && patch.assigned_team_id !== undefined && patch.assigned_team_id !== u.team_id) {
        throw new Error('Cứu hộ chỉ được nhận SOS cho đội mình')
      }
      setTeam(s, patch.assigned_team_id === undefined ? s.assigned_team_id : patch.assigned_team_id)
      Object.assign(s, patch, { updated_at: now() })
      save(db)
    },

    async declineSos(id) {
      const db = load()
      const u = requireMe(db)
      const s = db.sos.find((x) => x.id === id)
      if (!s || u.role !== 'rescuer' || s.assigned_team_id !== u.team_id) throw new Error('SOS này không giao cho đội bạn')
      reassign(db, s)
      save(db)
    },

    async runDispatch() {
      const db = load()
      let changed = false
      const t = Date.now()
      for (const s of db.sos) {
        const expired = s.status === 'assigned' && !s.accepted_at && s.assigned_at && t - new Date(s.assigned_at).getTime() > DISPATCH_ACCEPT_MS
        const waiting = s.status === 'waiting' && !s.assigned_team_id
        if (expired || waiting) changed = reassign(db, s) || changed
      }
      if (changed) save(db)
    },

    async listTeams() {
      return load().teams
    },

    async createTeam(team) {
      const db = load()
      if (requireMe(db).role !== 'commander') throw new Error('Chỉ chỉ huy được tạo đội')
      db.teams.push({ ...team, id: newId() })
      save(db)
    },

    async updateTeam(id, patch) {
      const db = load()
      const t = db.teams.find((x) => x.id === id)
      if (!t) throw new Error('Không tìm thấy đội')
      Object.assign(t, patch)
      save(db)
    },

    async setUserRole(phone, role, teamId) {
      const db = load()
      if (requireMe(db).role !== 'commander') throw new Error('Chỉ chỉ huy được cấp quyền')
      const u = db.users.find((x) => x.phone === normalizePhone(phone))
      if (!u) throw new Error('Không tìm thấy tài khoản có SĐT này')
      u.role = role
      u.team_id = teamId
      save(db)
    },

    async listStaff() {
      const db = load()
      if (requireMe(db).role !== 'commander') throw new Error('Chỉ chỉ huy được xem')
      return db.users.filter((u) => u.role !== 'citizen').map(strip)
    },

    async listHouseholds() {
      const db = load()
      if (requireMe(db).role !== 'commander') throw new Error('Chỉ chỉ huy được xem')
      return db.users.filter((u) => u.role === 'citizen' && u.home_lat != null).map(strip)
    },

    async upsertMyLocation(lat, lng, onDuty) {
      const db = load()
      const u = requireMe(db)
      const loc: RescuerLocation = { user_id: u.id, team_id: u.team_id, lat, lng, on_duty: onDuty, updated_at: now() }
      db.locations = [...db.locations.filter((l) => l.user_id !== u.id), loc]
      save(db)
    },

    async listLocations() {
      const db = load()
      return db.locations.map((l) => {
        const u = db.users.find((x) => x.id === l.user_id)
        return { ...l, profile: u ? { full_name: u.full_name, phone: u.phone } : null }
      })
    },

    subscribe(cb) {
      const onStorage = (e: StorageEvent) => {
        if (e.key === DB_KEY) cb()
      }
      window.addEventListener(CHANGE_EVENT, cb)
      window.addEventListener('storage', onStorage)
      return () => {
        window.removeEventListener(CHANGE_EVENT, cb)
        window.removeEventListener('storage', onStorage)
      }
    },
  }
}
