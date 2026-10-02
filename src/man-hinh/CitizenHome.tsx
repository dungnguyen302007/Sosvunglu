import { useCallback, useEffect, useState } from 'react'
import { backend } from '../lib/backend'
import { getBattery, getPosition, loiGpsGanNhat, POOR_ACCURACY_M } from '../lib/device'
import { distanceKm, formatKm, type LatLng } from '../lib/geo'
import { useLive, useNow, useSosQueue } from '../lib/hooks'
import { boMaKhoiLink, maTrongLink } from '../lib/link-moi'
import { STATUS_LABEL, VULNERABLE_LABEL, WATER_LABEL, timeAgo } from '../lib/labels'
import type { CitizenSosPatch, Profile, Sos, Vulnerable, WaterLevel } from '../types'
import { CallButton, ErrorLine, Header, PendingCard, Sheet } from '../components/common'
import { isLive, LocationPicker, SosMap } from '../components/SosMap'
import { JoinTeam } from '../components/JoinTeam'
import { HomeLocation } from '../components/HomeLocation'
import { SosTrigger } from '../components/SosTrigger'
import { Stepper } from './AuthPage'
import { PrepGuide } from './PrepGuide'

const STATUS_MESSAGE: Record<Sos['status'], string> = {
  waiting: 'Hệ thống đã nhận. Đang tìm đội cứu hộ gần bạn…',
  assigned: 'Đã có đội cứu hộ nhận. Giữ máy để họ gọi.',
  on_way: 'Đội cứu hộ đang trên đường tới!',
  arrived: 'Đội cứu hộ đã tới khu vực của bạn. Hãy ra dấu hiệu (vẫy áo, đèn pin).',
  rescued: 'Bạn đã an toàn.',
  cannot_reach: 'Đội chưa tiếp cận được. Trung tâm đang điều đội khác — giữ máy.',
  cancelled: 'Đã hủy.',
}

export function CitizenHome({ profile }: { profile: Profile }) {
  // Mở bằng link mời đội (?moi=MÃ) khi đã đăng nhập → hỏi vào đội luôn.
  const [maMoi] = useState(() => maTrongLink())
  const [menu, setMenu] = useState<null | 'menu' | 'profile' | 'prep' | 'join'>(maMoi ? 'join' : null)
  const [sos, setSos] = useState<Sos | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [people, setPeople] = useState(profile.household_size)
  const teams = useLive(() => backend.listTeams(), 120000)

  const reload = useCallback(async () => {
    try {
      setSos(await backend.myOpenSos())
    } catch {
      /* mất mạng: giữ trạng thái cũ */
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    void reload()
    const unsub = backend.subscribe(() => void reload())
    const t = window.setInterval(() => void reload(), 20000)
    return () => {
      unsub()
      window.clearInterval(t)
    }
  }, [reload])

  const queue = useSosQueue((r) => {
    if (r.kind === 'user') setSos(r.sos)
  })

  const team = teams.data?.find((t) => t.id === sos?.assigned_team_id)

  return (
    <div className="page citizen">
      <Header
        title={profile.full_name}
        subtitle={profile.phone}
        right={
          <button className="btn-ghost" onClick={() => setMenu('menu')} aria-label="Menu">
            ☰
          </button>
        }
      />

      {queue.pending ? (
        <PendingCard
          pending={queue.pending}
          name={profile.full_name}
          phone={profile.phone}
          error={queue.error}
          onRetry={queue.trySend}
          onCancel={queue.cancel}
        />
      ) : sos ? (
        <SosStatus sos={sos} teamName={team?.name ?? null} onChanged={setSos} />
      ) : loaded ? (
        <div className="sos-home">
          <SosTrigger peopleCount={people} onReady={(input) => queue.submit({ kind: 'user', input })} />
          <div className="people-line">
            <span>Số người cần cứu:</span>
            <Stepper value={people} onChange={setPeople} />
          </div>
          <CallButton className="btn btn-outline btn-block" />
        </div>
      ) : (
        <p className="center muted">Đang tải…</p>
      )}

      <Sheet open={menu === 'menu'} onClose={() => setMenu(null)} title="Menu">
        <div className="menu-list">
          <button className="btn btn-outline btn-block" onClick={() => setMenu('profile')}>
            👤 Thông tin của tôi
          </button>
          <button className="btn btn-outline btn-block" onClick={() => setMenu('prep')}>
            🎒 Chuẩn bị trước mưa lũ
          </button>
          <button className="btn btn-outline btn-block" onClick={() => setMenu('join')}>
            🚤 Tôi là cứu hộ — nhập mã mời đội
          </button>
          <button className="btn btn-outline btn-block" onClick={() => void backend.signOut()}>
            Đăng xuất
          </button>
        </div>
      </Sheet>
      <Sheet
        open={menu === 'join'}
        onClose={() => {
          boMaKhoiLink()
          setMenu(null)
        }}
        title="Vào đội cứu hộ"
      >
        <JoinTeam initialCode={maMoi ?? ''} />
      </Sheet>
      <Sheet open={menu === 'profile'} onClose={() => setMenu(null)} title="Thông tin của tôi">
        <ProfileForm profile={profile} onDone={() => setMenu(null)} />
      </Sheet>
      <Sheet open={menu === 'prep'} onClose={() => setMenu(null)} title="Chuẩn bị trước mưa lũ">
        <PrepGuide />
      </Sheet>
    </div>
  )
}

const WATER_KEYS = Object.keys(WATER_LABEL) as WaterLevel[]

function SosStatus({ sos, teamName, onChanged }: { sos: Sos; teamName: string | null; onChanged: (s: Sos | null) => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fixing, setFixing] = useState(false)
  const [picked, setPicked] = useState<LatLng | null>(null)
  const poor = sos.accuracy == null || sos.accuracy > POOR_ACCURACY_M
  const now = useNow(10000)
  // Máy chủ chỉ trả vị trí khi đội ĐÃ NHẬN đi cứu mình; ngoài ra danh sách rỗng.
  const locs = useLive(() => backend.listLocations(), 20000)
  const boats = (locs.data ?? []).filter((l) => isLive(l, now))
  const nearestKm = boats.length ? Math.min(...boats.map((b) => distanceKm(b, sos))) : null
  const teamComing = !!sos.assigned_team_id && !!sos.accepted_at && ['assigned', 'on_way', 'arrived'].includes(sos.status)

  const patch = async (p: CitizenSosPatch) => {
    setBusy(true)
    setError(null)
    try {
      await backend.updateMySos(sos.id, p)
      onChanged(p.status === 'cancelled' ? null : { ...sos, ...p })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const refreshLocation = async () => {
    setBusy(true)
    const [pos, battery] = await Promise.all([getPosition(), getBattery()])
    setBusy(false)
    // Vị trí CŨ lưu trong máy (stale) không phải là "đã cập nhật" — báo rõ thay vì lặng lẽ gửi lại số cũ.
    if (pos && !pos.stale) await patch({ lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy, battery })
    else setError(loiGpsGanNhat())
  }

  return (
    <div className="status-page">
      <div className={`card status-card status-${sos.status}`}>
        <div className="status-big">{STATUS_LABEL[sos.status]}</div>
        <p>
          {sos.status === 'assigned' && !sos.accepted_at
            ? 'Đã báo cho đội cứu hộ gần nhất, đang chờ đội xác nhận. Giữ máy.'
            : STATUS_MESSAGE[sos.status]}
        </p>
        {teamName && <p>🚤 <b>{teamName}</b></p>}
        <p className="muted small">Gửi lúc {timeAgo(sos.created_at)} · {sos.people_count} người</p>
      </div>

      <div className="card map-card">
        {teamComing && nearestKm != null && (
          <p className="boat-line">
            🚤 <b>{teamName ?? 'Đội cứu hộ'}</b> đang cách bạn khoảng <b>{formatKm(nearestKm)}</b>
          </p>
        )}
        {teamComing && nearestKm == null && <p className="muted small">Đội đã nhận nhưng chưa gửi được vị trí (mất sóng). Giữ máy để họ gọi.</p>}
        {!teamComing && <p className="muted small">Hình người là vị trí bạn đã gửi. Khi có đội nhận, xuồng của đội sẽ hiện trên bản đồ này.</p>}
        <SosMap sos={[sos]} locations={boats} locationLabel={() => teamName ?? undefined} height="260px" />
      </div>

      <div className="card">
        <h3>Cập nhật nhanh cho đội cứu hộ</h3>
        <p className="muted small">Nước đang ngập tới:</p>
        <div className="chips">
          {WATER_KEYS.map((w) => (
            <button key={w} disabled={busy} className={`chip${sos.water_level === w ? ' on' : ''}`} onClick={() => patch({ water_level: w })}>
              {WATER_LABEL[w]}
            </button>
          ))}
        </div>
        <div className="chips">
          <button disabled={busy} className={`chip${sos.injured ? ' on' : ''}`} onClick={() => patch({ injured: !sos.injured })}>
            🩹 Có người bị thương
          </button>
        </div>
        <div className="people-line">
          <span>Số người:</span>
          <Stepper value={sos.people_count} onChange={(v) => patch({ people_count: v })} />
        </div>
        <p className={`small${poor ? ' error' : ' muted'}`}>
          📍 Vị trí đã gửi: {sos.accuracy != null ? `sai số khoảng ${Math.round(sos.accuracy)} m` : 'chọn tay trên bản đồ / chưa rõ độ chính xác'}
          {poor && sos.accuracy != null ? ' — có thể lệch, hãy cập nhật lại hoặc chỉnh tay.' : ''}
        </p>
        <button className="btn btn-outline btn-block" disabled={busy} onClick={refreshLocation}>
          📍 Cập nhật vị trí của tôi (GPS)
        </button>
        <button className="btn btn-outline btn-block" disabled={busy} onClick={() => { setPicked({ lat: sos.lat, lng: sos.lng }); setFixing(true) }}>
          🗺️ Chỉnh vị trí trên bản đồ
        </button>
        <Sheet open={fixing} onClose={() => setFixing(false)} title="Chạm vào chỗ bạn đang đứng">
          <p className="muted small">Phóng to, chạm đúng vị trí nhà bạn (đổi sang Vệ tinh ở góc phải trên nếu cần), rồi bấm Lưu.</p>
          <LocationPicker value={picked} onPick={setPicked} />
          <button
            className="btn btn-danger btn-block"
            disabled={!picked || busy}
            onClick={async () => {
              if (!picked) return
              await patch({ lat: picked.lat, lng: picked.lng, accuracy: null })
              setFixing(false)
            }}
          >
            Lưu vị trí này
          </button>
        </Sheet>
        <ErrorLine error={error} />
      </div>

      <p className="muted small center">Để máy yên, bật tiết kiệm pin. Mở lại app mỗi 15–30 phút để xem tình hình.</p>
      <CallButton className="btn btn-outline btn-block" />
      <button
        className="btn btn-ok btn-block"
        disabled={busy}
        onClick={() => {
          if (confirm('Bạn đã an toàn và muốn hủy yêu cầu cứu hộ?')) void patch({ status: 'cancelled' })
        }}
      >
        ✅ Tôi đã an toàn — hủy SOS
      </button>
    </div>
  )
}

const VULNERABLE_KEYS = Object.keys(VULNERABLE_LABEL) as Vulnerable[]

function ProfileForm({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const [f, setF] = useState({
    full_name: profile.full_name,
    household_size: profile.household_size,
    vulnerable: profile.vulnerable,
    relative_phone: profile.relative_phone ?? '',
    note: profile.note ?? '',
    address_detail: profile.address_detail ?? '',
    home_lat: profile.home_lat,
    home_lng: profile.home_lng,
  })
  const [error, setError] = useState<string | null>(null)
  const save = async () => {
    try {
      await backend.updateProfile(f)
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }
  return (
    <div className="form">
      <p className="muted small">
        SĐT: {profile.phone} · {[profile.hamlet, profile.ward, profile.province].filter(Boolean).join(', ')}
      </p>
      <label>
        Họ tên
        <input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} />
      </label>
      <label>
        Số nhà, đường
        <input value={f.address_detail} onChange={(e) => setF({ ...f, address_detail: e.target.value })} />
      </label>
      <HomeLocation
        value={f.home_lat != null && f.home_lng != null ? { lat: f.home_lat, lng: f.home_lng } : null}
        onChange={(p) => setF({ ...f, home_lat: p?.lat ?? null, home_lng: p?.lng ?? null })}
      />
      <label>
        Số người trong nhà
        <Stepper value={f.household_size} onChange={(v) => setF({ ...f, household_size: v })} />
      </label>
      <div className="chips">
        {VULNERABLE_KEYS.map((k) => {
          const on = f.vulnerable.includes(k)
          return (
            <button
              key={k}
              type="button"
              className={`chip${on ? ' on' : ''}`}
              onClick={() => setF({ ...f, vulnerable: on ? f.vulnerable.filter((x) => x !== k) : [...f.vulnerable, k] })}
            >
              {VULNERABLE_LABEL[k]}
            </button>
          )
        })}
      </div>
      <label>
        SĐT người thân
        <input type="tel" value={f.relative_phone} onChange={(e) => setF({ ...f, relative_phone: e.target.value })} />
      </label>
      <label>
        Ghi chú nhà ở
        <input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
      </label>
      <ErrorLine error={error} />
      <button className="btn btn-primary btn-block" onClick={save}>
        Lưu
      </button>
    </div>
  )
}
