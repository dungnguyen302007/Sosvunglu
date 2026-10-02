import { useEffect, useMemo, useRef, useState } from 'react'
import { backend } from '../lib/backend'
import { beep, lastKnownPosition, vibrate } from '../lib/device'
import { distanceKm, formatKm, type LatLng } from '../lib/geo'
import { useDispatchLoop, useLive, useNow } from '../lib/hooks'
import { TEAM_STATUS_LABEL, timeAgo } from '../lib/labels'
import { sortByPriority } from '../lib/priority'
import { storage } from '../lib/storage'
import { OPEN_STATUSES, type Profile, type Sos, type SosStatus, type TeamStatus } from '../types'
import { ErrorLine, Header, Tabs } from '../components/common'
import { SosCard } from '../components/SosCard'
import { isLive, SosMap } from '../components/SosMap'

const SEND_EVERY_MS = 60000
/** Đang trên đường tới cứu: gửi dày hơn để người dân thấy xuồng nhích dần. */
const SEND_FAST_MS = 20000
/** Khớp BAN_KINH_GAN_KM ở src/lib/quyen-sos.ts (máy chủ lọc 10 km). */
const NEARBY_KM = 10

/** Khi đang trong ca: theo dõi GPS, gửi vị trí về trung tâm mỗi 60 giây (đỡ tốn pin); đang đi cứu thì 20 giây. */
function useDutyTracking(onDuty: boolean, fast: boolean) {
  const [pos, setPos] = useState<LatLng | null>(() => lastKnownPosition())
  const latest = useRef<LatLng | null>(pos)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!onDuty) return
    if (!('geolocation' in navigator)) {
      setError('Máy không hỗ trợ GPS')
      return
    }
    const watch = navigator.geolocation.watchPosition(
      (p) => {
        const next = { lat: p.coords.latitude, lng: p.coords.longitude }
        latest.current = next
        setPos(next)
        storage.set('last_pos', { ...next, accuracy: Math.round(p.coords.accuracy), at: new Date().toISOString() })
        setError(null)
      },
      (e) => setError(`GPS: ${e.message}`),
      { enableHighAccuracy: true, maximumAge: 30000 },
    )
    const send = () => {
      const p = latest.current
      if (p) backend.upsertMyLocation(p.lat, p.lng, true).catch(() => {})
    }
    const first = window.setTimeout(send, 3000)
    const timer = window.setInterval(send, fast ? SEND_FAST_MS : SEND_EVERY_MS)
    return () => {
      navigator.geolocation.clearWatch(watch)
      window.clearTimeout(first)
      window.clearInterval(timer)
    }
  }, [onDuty, fast])

  return { pos, error }
}

const NEXT_STEP: Partial<Record<SosStatus, { status: SosStatus; label: string }>> = {
  assigned: { status: 'on_way', label: '🚤 Đang tới' },
  on_way: { status: 'arrived', label: '📍 Đã tới nơi' },
  arrived: { status: 'rescued', label: '✅ Đã cứu xong' },
}

export function RescuerHome({ profile }: { profile: Profile }) {
  const [tab, setTab] = useState<'mine' | 'nearby' | 'map'>('mine')
  const [onDuty, setOnDuty] = useState(() => storage.get<boolean>('on_duty') ?? false)
  const sos = useLive(() => backend.listSos(), 20000)
  const dangDiCuu = (sos.data ?? []).some((s) => s.assigned_team_id === profile.team_id && s.status === 'on_way')
  const { pos, error: gpsError } = useDutyTracking(onDuty, dangDiCuu)
  // Đồng đội + đội khác trong 10 km (chỉ người đang trong ca) — máy chủ lọc.
  const locs = useLive(() => backend.listLocations(), 20000)
  const [notice, setNotice] = useState<string | null>(null)
  useDispatchLoop(onDuty)
  const teams = useLive(() => backend.listTeams(), 60000)
  const now = useNow()
  const [error, setError] = useState<string | null>(null)
  const myTeam = teams.data?.find((t) => t.id === profile.team_id) ?? null

  const toggleDuty = async () => {
    const next = !onDuty
    setNotice(null)
    if (!next) {
      const dangDo = (sos.data ?? []).filter((s) => s.assigned_team_id === profile.team_id && OPEN_STATUSES.includes(s.status)).length
      if (
        dangDo > 0 &&
        !confirm(`Đội đang có ${dangDo} việc dở. Nếu không còn ai trong đội đang trực, các việc này sẽ được trả về trung tâm để điều đội khác. Tắt ca?`)
      )
        return
    }
    setOnDuty(next)
    storage.set('on_duty', next)
    if (!next) {
      // Tắt ca: ngừng GPS, biến khỏi bản đồ của dân / đội khác, thôi nhận việc tự giao.
      try {
        const tra = await backend.endDuty()
        if (tra > 0) setNotice(`Đã trả ${tra} việc đang dở về trung tâm để điều đội khác.`)
        await sos.reload()
      } catch (e) {
        setError(`Chưa báo được tắt ca cho trung tâm (${e instanceof Error ? e.message : String(e)}). Có sóng hãy bật rồi tắt ca lại.`)
      }
    }
    if (next && 'Notification' in window && Notification.permission === 'default') void Notification.requestPermission()
  }

  const open = useMemo(() => (sos.data ?? []).filter((s) => OPEN_STATUSES.includes(s.status) || s.status === 'cannot_reach'), [sos.data])
  const mine = useMemo(() => sortByPriority(open.filter((s) => s.assigned_team_id && s.assigned_team_id === profile.team_id), now), [open, profile.team_id, now])
  const nearby = useMemo(() => {
    const unassigned = open.filter((s) => !s.assigned_team_id)
    const list = pos ? unassigned.filter((s) => distanceKm(pos, s) <= NEARBY_KM) : unassigned
    return sortByPriority(list, now)
  }, [open, pos, now])

  useAlertOnNew(mine, nearby, onDuty)

  const act = async (s: Sos, patch: Parameters<typeof backend.updateSos>[1] | 'decline') => {
    setError(null)
    try {
      if (patch === 'decline') await backend.declineSos(s.id)
      else await backend.updateSos(s.id, patch)
      await sos.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const actions = (s: Sos) => {
    if (!s.assigned_team_id || s.status === 'cannot_reach') {
      if (!profile.team_id) return <span className="muted small">Bạn chưa thuộc đội nào — liên hệ chỉ huy.</span>
      return (
        <button
          className="btn btn-danger btn-small"
          onClick={() => act(s, { assigned_team_id: profile.team_id, status: 'assigned', accepted_at: new Date().toISOString() })}
        >
          🙋 Đội tôi nhận
        </button>
      )
    }
    if (s.status === 'assigned' && !s.accepted_at) {
      return (
        <>
          <button className="btn btn-ok btn-small" onClick={() => act(s, { accepted_at: new Date().toISOString() })}>
            ✅ Nhận việc
          </button>
          <button
            className="btn btn-outline btn-small"
            onClick={() => {
              if (confirm('Từ chối? Hệ thống sẽ chuyển cho đội gần nhất khác.')) void act(s, 'decline')
            }}
          >
            ↪️ Từ chối
          </button>
        </>
      )
    }
    const next = NEXT_STEP[s.status]
    return (
      <>
        {next && (
          <button className="btn btn-primary btn-small" onClick={() => act(s, { status: next.status })}>
            {next.label}
          </button>
        )}
        <button
          className="btn btn-outline btn-small"
          onClick={() => {
            if (confirm('Báo không tiếp cận được? Trung tâm sẽ điều đội khác.')) void act(s, { status: 'cannot_reach' })
          }}
        >
          ⛔ Không tiếp cận được
        </button>
      </>
    )
  }

  return (
    <div className="page staff">
      <Header
        title={profile.full_name}
        subtitle={myTeam ? `${myTeam.name} · ${myTeam.vehicle}` : 'Cứu hộ — chưa có đội'}
        right={
          <button className="btn-ghost small" onClick={() => void backend.signOut()}>
            Thoát
          </button>
        }
      />
      <div className="duty-bar">
        <button className={`btn btn-block ${onDuty ? 'btn-ok' : 'btn-outline'}`} onClick={toggleDuty}>
          {onDuty ? '🟢 Đang trong ca — bấm để nghỉ (tắt GPS)' : '⚪ Đang nghỉ — bấm để bắt đầu ca trực'}
        </button>
        {myTeam && (
          <select
            value={myTeam.status}
            onChange={(e) => backend.updateTeam(myTeam.id, { status: e.target.value as TeamStatus }).then(teams.reload).catch((err) => setError(String(err)))}
            aria-label="Trạng thái đội"
          >
            {Object.entries(TEAM_STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        )}
      </div>
      {notice && <p className="ok">{notice}</p>}
      <ErrorLine error={gpsError} />
      <ErrorLine error={error ?? sos.error} />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'mine', label: `Việc của đội (${mine.length})` },
          { value: 'nearby', label: `Chờ cứu gần tôi (${nearby.length})` },
          { value: 'map', label: 'Bản đồ' },
        ]}
      />
      {tab === 'mine' && (
        <div className="list">
          {mine.length === 0 && <p className="center muted">Chưa có việc được giao.</p>}
          {mine.map((s) => (
            <SosCard key={s.id} sos={s} teams={teams.data ?? []} from={pos} now={now} actions={actions(s)} />
          ))}
        </div>
      )}
      {tab === 'nearby' && (
        <div className="list">
          {!pos && <p className="muted small">Bật ca trực (cho phép định vị) để thấy SOS chờ cứu trong {NEARBY_KM} km quanh bạn.</p>}
          <p className="muted small">SOS chưa có đội chỉ hiện vị trí, số người, mức nước. Bấm "Đội tôi nhận" để xem tên, SĐT, hồ sơ và gọi cho người dân.</p>
          {nearby.length === 0 && <p className="center muted">Không có SOS chờ cứu gần đây.</p>}
          {nearby.map((s) => (
            <SosCard key={s.id} sos={s} teams={teams.data ?? []} from={pos} now={now} actions={actions(s)} />
          ))}
        </div>
      )}
      {tab === 'map' && (
        <div className="map-full">
          <SosMap
            sos={[...mine, ...nearby]}
            me={pos}
            locations={(locs.data ?? []).filter((l) => l.user_id !== profile.id && isLive(l, now))}
            myTeamId={profile.team_id}
            locationLabel={(l) => teams.data?.find((t) => t.id === l.team_id)?.name}
            renderLocationPopup={(l) => {
              const t = teams.data?.find((x) => x.id === l.team_id)
              return (
                <div>
                  <b>🚤 {t?.name ?? 'Cứu hộ chưa có đội'}</b>
                  {t && (
                    <div>
                      {t.vehicle} · chở {t.capacity} · {TEAM_STATUS_LABEL[t.status]}
                    </div>
                  )}
                  {l.profile && <div>{l.profile.full_name}</div>}
                  {pos && (
                    <div className="muted small">
                      Cách tôi {formatKm(distanceKm(pos, l))} · cập nhật {timeAgo(l.updated_at, now)}
                    </div>
                  )}
                  {l.profile?.phone && <a href={`tel:${l.profile.phone}`}>📞 {l.profile.phone}</a>}
                </div>
              )
            }}
            renderSosPopup={(s) => <SosCard sos={s} teams={teams.data ?? []} from={pos} now={now} compact actions={actions(s)} />}
          />
        </div>
      )}
    </div>
  )
}

/** Báo động (bíp + rung + thông báo) khi có SOS mới giao cho đội / mới xuất hiện gần mình. */
function useAlertOnNew(mine: Sos[], nearby: Sos[], onDuty: boolean) {
  const seen = useRef<Set<string> | null>(null)
  useEffect(() => {
    const ids = [...mine, ...nearby].map((s) => `${s.id}:${s.assigned_team_id ?? ''}`)
    if (seen.current === null) {
      seen.current = new Set(ids)
      return
    }
    const fresh = ids.filter((id) => !seen.current!.has(id))
    ids.forEach((id) => seen.current!.add(id))
    if (fresh.length === 0 || !onDuty) return
    beep(3)
    vibrate([400, 200, 400, 200, 400])
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('🆘 Có SOS mới', { body: `${fresh.length} yêu cầu cứu hộ mới`, tag: 'sos-new' })
      } catch {
        /* một số trình duyệt chỉ cho thông báo qua service worker */
      }
    }
  }, [mine, nearby, onDuty])
}
