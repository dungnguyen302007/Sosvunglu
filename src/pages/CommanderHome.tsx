import { useMemo, useState, type FormEvent } from 'react'
import { backend } from '../lib/backend'
import { formatKm, isValidPhone, nearestTeams } from '../lib/geo'
import { useDispatchLoop, useLive, useNow } from '../lib/hooks'
import { ROLE_LABEL, STATUS_LABEL, TEAM_STATUS_LABEL, VULNERABLE_LABEL, WATER_LABEL, timeAgo } from '../lib/labels'
import { priorityScore, sortByPriority } from '../lib/priority'
import { OPEN_STATUSES, type Profile, type RescuerLocation, type Role, type Sos, type SosStatus, type Team } from '../types'
import { ErrorLine, Header, Stat, Tabs } from '../components/common'
import { SosCard } from '../components/SosCard'
import { SosMap } from '../components/SosMap'

type Filter = 'todo' | 'active' | 'done' | 'all'
const ACTIVE: SosStatus[] = ['assigned', 'on_way', 'arrived']

const FILTERS: Record<Filter, (s: Sos) => boolean> = {
  todo: (s) => s.status === 'waiting' || s.status === 'cannot_reach',
  active: (s) => ACTIVE.includes(s.status),
  done: (s) => s.status === 'rescued' || s.status === 'cancelled',
  all: () => true,
}

export function CommanderHome({ profile }: { profile: Profile }) {
  const [tab, setTab] = useState<'map' | 'sos' | 'teams'>('map')
  const [filter, setFilter] = useState<Filter>('todo')
  const sos = useLive(() => backend.listSos(), 20000)
  useDispatchLoop()
  const teams = useLive(() => backend.listTeams(), 30000)
  const locs = useLive(() => backend.listLocations(), 20000)
  const now = useNow()
  const [error, setError] = useState<string | null>(null)

  const all = useMemo(() => sos.data ?? [], [sos.data])
  const teamList = useMemo(() => teams.data ?? [], [teams.data])
  const locList = useMemo(() => locs.data ?? [], [locs.data])
  const open = useMemo(() => all.filter((s) => OPEN_STATUSES.includes(s.status) || s.status === 'cannot_reach'), [all])

  const stats = useMemo(() => {
    const rescued = all.filter((s) => s.status === 'rescued')
    return {
      todo: all.filter(FILTERS.todo).length,
      active: all.filter(FILTERS.active).length,
      rescued: rescued.length,
      rescuedPeople: rescued.reduce((n, s) => n + s.people_count, 0),
      onDuty: new Set(locList.filter((l) => l.on_duty && l.team_id).map((l) => l.team_id)).size,
    }
  }, [all, locList])

  const act = async (id: string, patch: Parameters<typeof backend.updateSos>[1]) => {
    setError(null)
    try {
      await backend.updateSos(id, patch)
      await sos.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const assignControls = (s: Sos) => {
    const suggestions = nearestTeams(s, teamList, locList).slice(0, 2)
    return (
      <>
        {suggestions
          .filter((x) => x.team.id !== s.assigned_team_id)
          .map((x) => (
            <button key={x.team.id} className="btn btn-danger btn-small" onClick={() => act(s.id, { assigned_team_id: x.team.id, status: 'assigned' })}>
              ➜ {x.team.name} ({formatKm(x.km)}
              {x.team.status !== 'ready' ? `, ${TEAM_STATUS_LABEL[x.team.status].toLowerCase()}` : ''})
            </button>
          ))}
        <select
          aria-label="Giao cho đội"
          value={s.assigned_team_id ?? ''}
          onChange={(e) => act(s.id, e.target.value ? { assigned_team_id: e.target.value, status: 'assigned' } : { assigned_team_id: null, status: 'waiting' })}
        >
          <option value="">— Chưa giao —</option>
          {teamList.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select aria-label="Trạng thái" value={s.status} onChange={(e) => act(s.id, { status: e.target.value as SosStatus })}>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </>
    )
  }

  const list = useMemo(() => sortByPriority(all.filter(FILTERS[filter]), now), [all, filter, now])

  return (
    <div className="page staff commander">
      <Header
        title="Trung tâm chỉ huy"
        subtitle={profile.full_name}
        right={
          <button className="btn-ghost small" onClick={() => void backend.signOut()}>
            Thoát
          </button>
        }
      />
      <div className="stats">
        <Stat label="Chờ cứu" value={stats.todo} tone="red" />
        <Stat label="Đang cứu" value={stats.active} tone="orange" />
        <Stat label={`An toàn (${stats.rescuedPeople} người)`} value={stats.rescued} tone="green" />
        <Stat label="Đội đang trực" value={stats.onDuty} tone="blue" />
      </div>
      <ErrorLine error={error ?? sos.error} />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'map', label: 'Bản đồ' },
          { value: 'sos', label: `SOS (${open.length})` },
          { value: 'teams', label: `Đội (${teamList.length})` },
        ]}
      />
      {tab === 'map' && (
        <div className="map-full">
          <SosMap
            sos={open}
            locations={locList}
            renderSosPopup={(s) => <SosCard sos={s} teams={teamList} now={now} compact actions={assignControls(s)} />}
            renderLocationPopup={(l) => <LocationPopup l={l} teams={teamList} now={now} />}
          />
        </div>
      )}
      {tab === 'sos' && (
        <>
          <div className="row wrap filters">
            {(['todo', 'active', 'done', 'all'] as Filter[]).map((f) => (
              <button key={f} className={`chip${filter === f ? ' on' : ''}`} onClick={() => setFilter(f)}>
                {{ todo: 'Cần xử lý', active: 'Đang cứu', done: 'Đã xong', all: 'Tất cả' }[f]}
              </button>
            ))}
            <button className="chip" onClick={() => exportCsv(all, teamList)}>
              ⬇️ Xuất Excel (CSV)
            </button>
          </div>
          <div className="list">
            {list.length === 0 && <p className="center muted">Không có SOS.</p>}
            {list.map((s) => (
              <SosCard key={s.id} sos={s} teams={teamList} now={now} actions={assignControls(s)} />
            ))}
          </div>
        </>
      )}
      {tab === 'teams' && <TeamsPanel teams={teamList} locations={locList} sos={open} now={now} onChanged={teams.reload} />}
    </div>
  )
}

function LocationPopup({ l, teams, now }: { l: RescuerLocation; teams: Team[]; now: number }) {
  const team = teams.find((t) => t.id === l.team_id)
  return (
    <div>
      <b>{l.profile?.full_name ?? 'Cứu hộ'}</b>
      <div>{team?.name ?? 'Chưa có đội'}</div>
      <div className="muted small">Cập nhật {timeAgo(l.updated_at, now)}</div>
      {l.profile?.phone && <a href={`tel:${l.profile.phone}`}>📞 {l.profile.phone}</a>}
    </div>
  )
}

function TeamsPanel({ teams, locations, sos, now, onChanged }: { teams: Team[]; locations: RescuerLocation[]; sos: Sos[]; now: number; onChanged: () => void }) {
  const [name, setName] = useState('')
  const [vehicle, setVehicle] = useState('xuồng')
  const [capacity, setCapacity] = useState(6)
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<Role>('rescuer')
  const [teamId, setTeamId] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async (fn: () => Promise<void>, ok: string) => {
    setError(null)
    setMsg(null)
    try {
      await fn()
      setMsg(ok)
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const createTeam = (e: FormEvent) => {
    e.preventDefault()
    void run(() => backend.createTeam({ name: name.trim(), vehicle, capacity, status: 'ready' }), `Đã tạo ${name}`).then(() => setName(''))
  }

  const grant = (e: FormEvent) => {
    e.preventDefault()
    if (!isValidPhone(phone)) return setError('SĐT không hợp lệ')
    void run(() => backend.setUserRole(phone, role, role === 'rescuer' ? teamId || null : null), `Đã cấp quyền ${ROLE_LABEL[role]} cho ${phone}`)
  }

  return (
    <div className="list">
      {teams.map((t) => {
        const members = locations.filter((l) => l.team_id === t.id)
        const onDuty = members.filter((l) => l.on_duty)
        const tasks = sos.filter((s) => s.assigned_team_id === t.id)
        return (
          <article key={t.id} className="card team-card">
            <div className="sos-card-head">
              <b>{t.name}</b>
              <span className={`status team-${t.status}`}>{TEAM_STATUS_LABEL[t.status]}</span>
            </div>
            <div className="facts">
              <span>🚤 {t.vehicle}</span>
              <span>👥 chở {t.capacity}</span>
              <span>🟢 {onDuty.length} người trong ca</span>
              <span>📋 {tasks.length} việc đang mở</span>
            </div>
            {onDuty.map((l) => (
              <div key={l.user_id} className="muted small">
                • {l.profile?.full_name ?? 'Thành viên'} — cập nhật {timeAgo(l.updated_at, now)}
              </div>
            ))}
            {tasks.map((s) => (
              <div key={s.id} className="small">
                ↳ {s.profile?.full_name ?? s.guest_name ?? 'SOS'} — {STATUS_LABEL[s.status]} (ưu tiên {priorityScore(s, now)})
              </div>
            ))}
          </article>
        )
      })}

      <form className="card form" onSubmit={createTeam}>
        <h3>➕ Tạo đội mới</h3>
        <input placeholder="Tên đội (VD: Đội 3 — Hương Thủy)" required value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid2">
          <select value={vehicle} onChange={(e) => setVehicle(e.target.value)}>
            {['xuồng', 'xuồng máy', 'ca nô', 'xe tải', 'đi bộ', 'trực thăng'].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <input type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} aria-label="Sức chở" />
        </div>
        <button className="btn btn-primary btn-block">Tạo đội</button>
      </form>

      <form className="card form" onSubmit={grant}>
        <h3>🔑 Cấp quyền cho tài khoản</h3>
        <p className="muted small">Người đó phải đăng ký tài khoản trước, sau đó nhập SĐT của họ ở đây.</p>
        <input type="tel" placeholder="SĐT đã đăng ký" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <div className="grid2">
          <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {Object.entries(ROLE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select value={teamId} onChange={(e) => setTeamId(e.target.value)} disabled={role !== 'rescuer'}>
            <option value="">— Chọn đội —</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary btn-block">Cấp quyền</button>
      </form>
      {msg && <p className="ok">{msg}</p>}
      <ErrorLine error={error} />
    </div>
  )
}

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function exportCsv(list: Sos[], teams: Team[]) {
  const header = ['Thời gian', 'Họ tên', 'SĐT', 'Số người', 'Người dễ tổn thương', 'Mức nước', 'Bị thương', 'Pin %', 'Vĩ độ', 'Kinh độ', 'Trạng thái', 'Đội', 'Ưu tiên']
  const rows = list.map((s) => [
    new Date(s.created_at).toLocaleString('vi-VN'),
    s.profile?.full_name ?? s.guest_name,
    s.profile?.phone ?? s.guest_phone,
    s.people_count,
    s.profile?.vulnerable.map((v) => VULNERABLE_LABEL[v]).join('; '),
    s.water_level ? WATER_LABEL[s.water_level] : '',
    s.injured ? 'Có' : '',
    s.battery,
    s.lat,
    s.lng,
    STATUS_LABEL[s.status],
    teams.find((t) => t.id === s.assigned_team_id)?.name,
    priorityScore(s),
  ])
  const csv = '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  a.download = `sos-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}
