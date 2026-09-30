import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { normalizePhone } from '../geo'
import { OPEN_STATUSES, type Profile, type RescuerLocation, type Sos, type Team } from '../../types'
import type { Backend } from './types'

/** Supabase bắt đăng nhập bằng email → quy đổi SĐT thành email nội bộ. */
export function phoneToEmail(phone: string): string {
  return `${normalizePhone(phone)}@sosvunglu.app`
}

function unwrap<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data
}

let channelSeq = 0

export function createSupabaseBackend(url: string, anonKey: string): Backend {
  const sb: SupabaseClient = createClient(url, anonKey, {
    auth: {
      // Lưu phiên trong máy và tự gia hạn → đăng nhập một lần dùng mãi
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'sosvunglu-auth',
    },
  })

  const uid = async () => {
    const { data } = await sb.auth.getSession()
    return data.session?.user.id ?? null
  }

  return {
    mode: 'supabase',

    async getProfile() {
      const id = await uid()
      if (!id) return null
      const res = await sb.from('profiles').select('*').eq('id', id).maybeSingle()
      return unwrap(res) as Profile | null
    },

    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((event) => {
        if (event !== 'TOKEN_REFRESHED') cb()
      })
      return () => data.subscription.unsubscribe()
    },

    async signUp(input) {
      const { password, ...meta } = input
      const phone = normalizePhone(input.phone)
      const { error } = await sb.auth.signUp({
        email: phoneToEmail(phone),
        password,
        options: { data: { ...meta, phone } },
      })
      if (error) {
        if (/already registered/i.test(error.message)) throw new Error('Số điện thoại này đã đăng ký')
        throw new Error(error.message)
      }
    },

    async signIn(phone, password) {
      const { error } = await sb.auth.signInWithPassword({ email: phoneToEmail(phone), password })
      if (error) throw new Error('Sai số điện thoại hoặc mật khẩu')
    },

    async signOut() {
      await sb.auth.signOut()
    },

    async updateProfile(patch) {
      const id = await uid()
      unwrap(await sb.from('profiles').update(patch).eq('id', id))
    },

    async createSos(input) {
      const id = await uid()
      const res = await sb
        .from('sos_requests')
        .insert({ ...input, user_id: id })
        .select('*')
        .single()
      if (res.error?.code === '23505') {
        // Đã có SOS đang mở → trả về cái đó
        const open = await this.myOpenSos()
        if (open) return open
      }
      return unwrap(res) as Sos
    },

    async createGuestSos(input) {
      const res = await sb.rpc('create_guest_sos', {
        p_name: input.name,
        p_phone: normalizePhone(input.phone),
        p_lat: input.lat,
        p_lng: input.lng,
        p_accuracy: input.accuracy,
        p_battery: input.battery,
        p_people: input.people_count,
      })
      return unwrap(res) as string
    },

    async guestSosStatus(id) {
      const res = await sb.rpc('guest_sos_status', { p_id: id })
      const rows = unwrap(res) as { status: Sos['status']; team_name: string | null; accepted: boolean }[]
      return rows[0] ?? null
    },

    async myOpenSos() {
      const id = await uid()
      if (!id) return null
      const res = await sb
        .from('sos_requests')
        .select('*')
        .eq('user_id', id)
        .in('status', OPEN_STATUSES)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      return unwrap(res) as Sos | null
    },

    async updateMySos(id, patch) {
      unwrap(await sb.from('sos_requests').update(patch).eq('id', id))
    },

    async listSos() {
      const res = await sb
        .from('sos_requests')
        .select('*, profile:profiles(*)')
        .order('created_at', { ascending: false })
        .limit(1000)
      return (unwrap(res) ?? []) as Sos[]
    },

    async updateSos(id, patch) {
      unwrap(await sb.from('sos_requests').update(patch).eq('id', id))
    },

    async declineSos(id) {
      unwrap(await sb.rpc('decline_sos', { p_id: id }))
    },

    async runDispatch() {
      unwrap(await sb.rpc('run_dispatch'))
    },

    async listTeams() {
      return (unwrap(await sb.from('teams').select('*').order('name')) ?? []) as Team[]
    },

    async createTeam(team) {
      unwrap(await sb.from('teams').insert(team))
    },

    async updateTeam(id, patch) {
      unwrap(await sb.from('teams').update(patch).eq('id', id))
    },

    async setUserRole(phone, role, teamId) {
      unwrap(await sb.rpc('set_user_role', { p_phone: normalizePhone(phone), p_role: role, p_team: teamId }))
    },

    async listStaff() {
      const res = await sb.from('profiles').select('*').in('role', ['rescuer', 'commander']).order('full_name')
      return (unwrap(res) ?? []) as Profile[]
    },

    async listHouseholds() {
      const res = await sb
        .from('profiles')
        .select('*')
        .eq('role', 'citizen')
        .not('home_lat', 'is', null)
        .limit(5000)
      return (unwrap(res) ?? []) as Profile[]
    },

    async upsertMyLocation(lat, lng, onDuty) {
      const id = await uid()
      const profile = await this.getProfile()
      unwrap(
        await sb.from('rescuer_locations').upsert({
          user_id: id,
          team_id: profile?.team_id ?? null,
          lat,
          lng,
          on_duty: onDuty,
          updated_at: new Date().toISOString(),
        }),
      )
    },

    async listLocations() {
      const res = await sb.from('rescuer_locations').select('*, profile:profiles(full_name, phone)')
      return (unwrap(res) ?? []) as RescuerLocation[]
    },

    subscribe(cb) {
      // Mỗi lần đăng ký một tên kênh riêng: nhiều màn hình cùng nghe thì không đụng nhau
      const channel = sb
        .channel(`sos-live-${++channelSeq}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sos_requests' }, cb)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rescuer_locations' }, cb)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, cb)
        .subscribe()
      return () => {
        void sb.removeChannel(channel)
      }
    },
  }
}
