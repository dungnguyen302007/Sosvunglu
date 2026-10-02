import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { backend } from '../lib/backend'
import { formatKm, isValidPhone, nearestTeams } from '../lib/geo'
import { useDispatchLoop, useLive, useNow } from '../lib/hooks'
import { linkMoi } from '../lib/link-moi'
import { ROLE_LABEL, STATUS_LABEL, TEAM_STATUS_LABEL, VULNERABLE_LABEL, WATER_LABEL, timeAgo } from '../lib/labels'
import { PRIORITY_COLOR, priorityScore, sortByPriority } from '../lib/priority'
import { OPEN_STATUSES, type Invite, type Profile, type RescuerLocation, type Role, type Sos, type SosStatus, type Team } from '../types'
import { ErrorLine, Header, Sheet, Stat, Tabs } from '../components/common'
import { SosCard } from '../components/SosCard'
import { isLive, SosMap } from '../components/SosMap'

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
  const staff = useLive(() => backend.listStaff(), 60000)
  const households = useLive(() => backend.listHouseholds(), 120000)
  const [showHouses, setShowHouses] = useState(true)
  const [showOffline, setShowOffline] = useState(true)
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

  const reportFake = async (s: Sos) => {
    if (!confirm('Gắn cờ BÁO GIẢ và huỷ SOS này?')) return
    const lock = !!s.user_id && confirm('Khoá luôn tài khoản người gửi? (Họ sẽ không đăng nhập được nữa)')
    setError(null)
    try {
      await backend.reportFake(s.id, lock)
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
        {s.status !== 'cancelled' && (
          <button className="btn btn-outline btn-small" onClick={() => void reportFake(s)}>
            🚩 Báo giả
          </button>
        )}
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
        <>
          <div className="map-tools">
            <label>
              <input type="checkbox" checked={showHouses} onChange={(e) => setShowHouses(e.target.checked)} />
              🏠 Nhà dân ({households.data?.length ?? 0})
            </label>
            <label>
              <input type="checkbox" checked={showOffline} onChange={(e) => setShowOffline(e.target.checked)} />
              Cứu hộ đã tắt ca (xám)
            </label>
            <span>
              <i className="legend-dot" style={{ background: PRIORITY_COLOR.critical }} />
              nguy cấp <i className="legend-dot" style={{ background: PRIORITY_COLOR.high }} />
              nguy hiểm <i className="legend-dot" style={{ background: PRIORITY_COLOR.normal }} />
              cần cứu · mỗi hình người = 1 người · 🚤 {locList.filter((l) => isLive(l, now)).length} cứu hộ đang trực
            </span>
          </div>
          {locList.filter((l) => isLive(l, now)).length === 0 && (
            <p className="warn-line">
              Chưa có cứu hộ nào đang trực trên bản đồ. Cứu hộ cần đăng nhập và bấm "Bắt đầu ca trực" (cho phép định vị). Xem tab Đội.
            </p>
          )}
          <div className="map-full">
            <SosMap
              sos={open}
              locations={locList}
              showOffline={showOffline}
              households={showHouses ? (households.data ?? []) : []}
              locationLabel={(l) => teamList.find((t) => t.id === l.team_id)?.name}
              renderSosPopup={(s) => <SosCard sos={s} teams={teamList} now={now} compact actions={assignControls(s)} />}
              renderLocationPopup={(l) => <LocationPopup l={l} teams={teamList} now={now} />}
              renderHouseholdPopup={(h) => <HouseholdPopup h={h} />}
            />
          </div>
        </>
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
      {tab === 'teams' && (
        <TeamsPanel
          teams={teamList}
          staff={staff.data ?? []}
          locations={locList}
          sos={open}
          now={now}
          onChanged={() => {
            void teams.reload()
            void staff.reload()
          }}
        />
      )}
    </div>
  )
}

function HouseholdPopup({ h }: { h: Profile }) {
  const address = [h.address_detail, h.hamlet, h.ward, h.province].filter(Boolean).join(', ')
  return (
    <div>
      <b>🏠 {h.full_name}</b>
      <div>👥 {h.household_size} người</div>
      {h.vulnerable.length > 0 && <div className="fact-warn">⚠️ {h.vulnerable.map((v) => VULNERABLE_LABEL[v]).join(', ')}</div>}
      {address && <div className="muted small">{address}</div>}
      {h.note && <div className="muted small">📝 {h.note}</div>}
      <a href={`tel:${h.phone}`}>📞 {h.phone}</a>
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

function TeamsPanel({
  teams,
  staff,
  locations,
  sos,
  now,
  onChanged,
}: {
  teams: Team[]
  staff: Profile[]
  locations: RescuerLocation[]
  sos: Sos[]
  now: number
  onChanged: () => void
}) {
  const [name, setName] = useState('')
  const [vehicle, setVehicle] = useState('xuồng')
  const [capacity, setCapacity] = useState(6)
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<Role>('rescuer')
  const [teamId, setTeamId] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const invites = useLive(() => backend.listInvites(), 60000)

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
        const members = staff.filter((m) => m.team_id === t.id)
        const onDuty = members.filter((m) => {
          const loc = locations.find((l) => l.user_id === m.id)
          return loc && isLive(loc, now)
        })
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
            {members.length === 0 && <p className="warn-line">Đội chưa có thành viên. Tạo mã mời bên dưới rồi gửi cho anh em trong đội.</p>}
            <InviteBox team={t} invite={invites.data?.find((i) => i.team_id === t.id) ?? null} now={now} onChanged={invites.reload} onError={setError} />
            {members.length > 0 && onDuty.length === 0 && (
              <p className="warn-line">Chưa ai bật ca trực, nên đội chưa hiện trên bản đồ và chưa được tự giao việc.</p>
            )}
            {members.map((m) => {
              const loc = locations.find((l) => l.user_id === m.id)
              const live = loc && isLive(loc, now)
              return (
                <div key={m.id} className="member">
                  <span>
                    {live ? '🟢' : '⚪'} {m.full_name} · <a href={`tel:${m.phone}`}>{m.phone}</a>
                  </span>
                  <span className="muted">
                    {live
                      ? `đang trực · ${timeAgo(loc.updated_at, now)}`
                      : loc
                        ? `${loc.on_duty ? 'mất tín hiệu' : 'đã tắt ca'} · ${timeAgo(loc.updated_at, now)}`
                        : 'chưa bật ca lần nào'}
                  </span>
                </div>
              )
            })}
            {tasks.map((s) => (
              <div key={s.id} className="small">
                ↳ {s.profile?.full_name ?? s.guest_name ?? 'SOS'} — {STATUS_LABEL[s.status]} (ưu tiên {priorityScore(s, now)})
              </div>
            ))}
          </article>
        )
      })}

      {staff.some((m) => m.role === 'rescuer' && !m.team_id) && (
        <article className="card">
          <b>Cứu hộ chưa có đội</b>
          {staff
            .filter((m) => m.role === 'rescuer' && !m.team_id)
            .map((m) => (
              <div key={m.id} className="member">
                <span>{m.full_name}</span>
                <a href={`tel:${m.phone}`}>{m.phone}</a>
              </div>
            ))}
          <p className="muted small">Cấp quyền lại bên dưới và chọn đội để họ được tự giao việc.</p>
        </article>
      )}

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

      <LockForm onDone={(m) => setMsg(m)} onError={setError} />

      <form className="card form" onSubmit={grant}>
        <h3>🔑 Cấp quyền cho tài khoản</h3>
        <p className="muted small">
          Thêm cứu hộ vào đội thì dùng <b>mã mời</b> ở thẻ đội cho nhanh. Ô này để cấp chỉ huy, chuyển đội hoặc hạ quyền theo SĐT (người đó phải đăng
          ký trước).
        </p>
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

/**
 * Mã mời của một đội: chỉ huy tạo mã → gửi link vào nhóm Zalo của đội / cho quét QR → ai đăng ký
 * bằng mã là vào thẳng đội, không phải gõ từng SĐT. Mã có hạn + giới hạn lượt, thu hồi được.
 */
function InviteBox({
  team,
  invite,
  now,
  onChanged,
  onError,
}: {
  team: Team
  invite: Invite | null
  now: number
  onChanged: () => Promise<void> | void
  onError: (e: string | null) => void
}) {
  const [qr, setQr] = useState<string | null>(null)
  const [showQr, setShowQr] = useState(false)
  const [copied, setCopied] = useState(false)
  const code = invite?.code

  useEffect(() => {
    if (!showQr || !code) return
    let con = true
    void import('qrcode')
      .then((m) => m.toDataURL(linkMoi(code), { width: 560, margin: 2 }))
      .then((url) => con && setQr(url))
      .catch(() => con && setQr(null))
    return () => {
      con = false
    }
  }, [showQr, code])

  const run = async (fn: () => Promise<unknown>) => {
    onError(null)
    try {
      await fn()
      await onChanged()
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e))
    }
  }

  if (!invite) {
    return (
      <button className="btn btn-primary btn-small" onClick={() => void run(() => backend.createInvite(team.id))}>
        🔗 Tạo mã mời vào đội
      </button>
    )
  }

  const link = linkMoi(invite.code)
  const text = `Mời vào ${team.name} trên app SOS vùng lũ. Mở link rồi đăng ký (hoặc nhập mã ${invite.code}): ${link}`
  const gioCon = Math.max(0, Math.round((new Date(invite.expires_at).getTime() - now) / 3600_000))
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ text })
      else {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 3000)
      }
    } catch {
      /* người dùng đóng bảng chia sẻ */
    }
  }

  return (
    <div className="invite">
      <div>
        Mã mời: <b className="invite-code">{invite.code}</b>
        <span className="muted small">
          {' '}
          · còn {gioCon} giờ · đã dùng {invite.used}/{invite.max_uses}
        </span>
      </div>
      <div className="row wrap">
        <button className="btn btn-primary btn-small" onClick={() => void share()}>
          {copied ? '✅ Đã chép' : '📤 Gửi link mời'}
        </button>
        <button className="btn btn-outline btn-small" onClick={() => setShowQr(true)}>
          ▦ Mã QR
        </button>
        <button
          className="btn btn-outline btn-small"
          onClick={() => {
            if (confirm('Tạo mã mới? Mã cũ sẽ hết dùng được ngay.')) void run(() => backend.createInvite(team.id))
          }}
        >
          🔄 Mã mới
        </button>
        <button
          className="btn btn-outline btn-small"
          onClick={() => {
            if (confirm('Thu hồi mã mời của đội này? Người đã vào đội vẫn ở lại.')) void run(() => backend.revokeInvite(team.id))
          }}
        >
          ⛔ Thu hồi
        </button>
      </div>
      <Sheet open={showQr} onClose={() => setShowQr(false)} title={`Mời vào ${team.name}`}>
        <p className="muted small">Anh em mở camera điện thoại quét mã này, đăng ký là vào thẳng đội.</p>
        {qr ? <img className="qr" src={qr} alt={`Mã QR mời vào ${team.name}`} /> : <p className="center muted">Đang tạo mã QR…</p>}
        <p className="center">
          Hoặc nhập mã: <b className="invite-code">{invite.code}</b>
        </p>
      </Sheet>
    </div>
  )
}

/** Khoá / mở khoá tài khoản phá hoại (khoá xong mọi phiên đang mở của họ chết ngay). */
function LockForm({ onDone, onError }: { onDone: (msg: string) => void; onError: (e: string | null) => void }) {
  const [phone, setPhone] = useState('')
  const submit = async (lock: boolean) => {
    onError(null)
    if (!isValidPhone(phone)) return onError('SĐT không hợp lệ')
    if (lock && !confirm(`Khoá tài khoản ${phone}?`)) return
    try {
      await backend.lockUser(phone, lock)
      onDone(lock ? `Đã khoá ${phone}` : `Đã mở khoá ${phone}`)
      setPhone('')
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e))
    }
  }
  return (
    <div className="card form">
      <h3>🚫 Khoá tài khoản phá hoại</h3>
      <input type="tel" placeholder="SĐT tài khoản" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <div className="grid2">
        <button type="button" className="btn btn-danger" onClick={() => void submit(true)}>
          Khoá
        </button>
        <button type="button" className="btn btn-outline" onClick={() => void submit(false)}>
          Mở khoá
        </button>
      </div>
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
