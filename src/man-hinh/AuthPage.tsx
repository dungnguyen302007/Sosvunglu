import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { backend } from '../lib/backend'
import type { GuestStatus } from '../lib/backend/types'
import { distanceKm, formatKm, isValidPhone, normalizePhone } from '../lib/geo'
import { getPosition, loiGpsGanNhat } from '../lib/device'
import { useSosQueue } from '../lib/hooks'
import { boMaKhoiLink, maTrongLink } from '../lib/link-moi'
import { STATUS_LABEL, VULNERABLE_LABEL, WATER_LABEL } from '../lib/labels'
import { storage } from '../lib/storage'
import type { GuestSosPatch, SignUpInput, Sos, Vulnerable, WaterLevel } from '../types'
import { CallButton, ErrorLine, PendingCard, Sheet, Tabs } from '../components/common'
import { HomeLocation } from '../components/HomeLocation'
import { isLive, LocationPicker, SosMap } from '../components/SosMap'
import { SosTrigger } from '../components/SosTrigger'

type Tab = 'login' | 'register' | 'guest'

export function AuthPage() {
  // Mở bằng link mời đội (?moi=MÃ) → vào thẳng form đăng ký cứu hộ.
  // Còn lại: mở ra là nút SOS khẩn — người dân KHÔNG cần đăng ký mới kêu cứu được.
  const [maMoi] = useState(() => maTrongLink())
  const [tab, setTab] = useState<Tab>(maMoi ? 'register' : 'guest')
  return (
    <div className="page auth">
      <div className="brand">
        <div className="brand-logo">SOS</div>
        <h1>SOS vùng lũ</h1>
        <p className="muted">Một nút bấm — đội cứu hộ biết bạn ở đâu.</p>
      </div>
      {/* Màn mở đầu CHỈ có nút SOS — người dân không phải chọn gì. Đăng nhập / đăng ký (cứu hộ, chỉ huy,
          người dân muốn khai trước) nằm sau một dòng chữ nhỏ ở cuối trang. */}
      {tab === 'guest' ? (
        <>
          <GuestSos />
          <p className="auth-foot muted small">
            Cứu hộ / đã có tài khoản?{' '}
            <button type="button" className="btn-link" onClick={() => setTab('login')}>
              Đăng nhập
            </button>
            {' · '}
            <button type="button" className="btn-link" onClick={() => setTab('register')}>
              Đăng ký trước mùa lũ
            </button>
          </p>
        </>
      ) : (
        <>
          <button type="button" className="btn btn-danger btn-block" onClick={() => setTab('guest')}>
            🆘 Cần cứu ngay? Về nút SOS khẩn
          </button>
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: 'login', label: 'Đăng nhập' },
              { value: 'register', label: 'Đăng ký' },
            ]}
          />
          {tab === 'login' && <LoginForm />}
          {tab === 'register' && <Register maMoi={maMoi} />}
        </>
      )}
    </div>
  )
}

function LoginForm() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await backend.signIn(phone, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card form" onSubmit={submit}>
      <label>
        Số điện thoại
        <input type="tel" inputMode="tel" autoComplete="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} />
      </label>
      <label>
        Mật khẩu
        <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      <ErrorLine error={error} />
      <button className="btn btn-primary btn-block" disabled={busy}>
        {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
      </button>
      <p className="muted small">Đăng nhập một lần, máy sẽ nhớ luôn — lúc khẩn cấp chỉ cần mở app và bấm SOS.</p>
    </form>
  )
}

const VULNERABLE_KEYS = Object.keys(VULNERABLE_LABEL) as Vulnerable[]

/** Đăng ký: người dân (hồ sơ hộ) hoặc cứu hộ (form ngắn + mã mời đội). */
function Register({ maMoi }: { maMoi: string | null }) {
  const [kind, setKind] = useState<'citizen' | 'rescuer'>(maMoi ? 'rescuer' : 'citizen')
  return (
    <>
      <div className="chips">
        <button type="button" className={`chip${kind === 'citizen' ? ' on' : ''}`} onClick={() => setKind('citizen')}>
          🏠 Người dân
        </button>
        <button type="button" className={`chip${kind === 'rescuer' ? ' on' : ''}`} onClick={() => setKind('rescuer')}>
          🚤 Cứu hộ (có mã mời đội)
        </button>
      </div>
      {kind === 'citizen' ? <RegisterForm /> : <RescuerRegisterForm maMoi={maMoi} />}
    </>
  )
}

function RescuerRegisterForm({ maMoi }: { maMoi: string | null }) {
  const [f, setF] = useState({ full_name: '', phone: '', password: '', ma_moi: maMoi ?? '' })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!isValidPhone(f.phone)) return setError('Số điện thoại không hợp lệ')
    if (f.password.length < 6) return setError('Mật khẩu tối thiểu 6 ký tự')
    setBusy(true)
    setError(null)
    try {
      await backend.signUpRescuer({ ...f, phone: normalizePhone(f.phone) })
      boMaKhoiLink()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card form" onSubmit={submit}>
      <p className="muted small">Dành cho thành viên đội cứu hộ. Mã mời do chỉ huy gửi vào nhóm của đội — đăng ký xong là vào thẳng đội.</p>
      <label>
        Mã mời đội *
        <input
          className="code-input"
          required
          autoCapitalize="characters"
          autoComplete="off"
          value={f.ma_moi}
          onChange={(e) => setF({ ...f, ma_moi: e.target.value.toUpperCase() })}
        />
      </label>
      <label>
        Họ và tên *
        <input required autoComplete="name" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} />
      </label>
      <label>
        Số điện thoại * (dùng để đăng nhập)
        <input type="tel" inputMode="tel" required value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      </label>
      <label>
        Mật khẩu * (tối thiểu 6 ký tự)
        <input type="password" autoComplete="new-password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
      </label>
      <ErrorLine error={error} />
      <button className="btn btn-primary btn-block" disabled={busy}>
        {busy ? 'Đang đăng ký…' : '🚤 Đăng ký và vào đội'}
      </button>
      <p className="muted small">Đã có tài khoản? Đăng nhập rồi mở lại link mời (hoặc vào Menu → "Tôi là cứu hộ").</p>
    </form>
  )
}

function RegisterForm() {
  const [f, setF] = useState<SignUpInput>({
    full_name: '',
    phone: '',
    password: '',
    province: '',
    ward: '',
    hamlet: '',
    address_detail: '',
    household_size: 1,
    vulnerable: [],
    relative_phone: '',
    note: '',
    home_lat: null,
    home_lng: null,
    dong_y: false,
  })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof SignUpInput>(k: K, v: SignUpInput[K]) => setF((prev) => ({ ...prev, [k]: v }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!isValidPhone(f.phone)) return setError('Số điện thoại không hợp lệ')
    if (f.password.length < 6) return setError('Mật khẩu tối thiểu 6 ký tự')
    if (f.relative_phone && !isValidPhone(f.relative_phone)) return setError('SĐT người thân không hợp lệ')
    if (!f.dong_y) return setError('Cần đánh dấu ô đồng ý ở cuối trang để đội cứu hộ được dùng thông tin của bạn')
    setBusy(true)
    setError(null)
    try {
      await backend.signUp({ ...f, phone: normalizePhone(f.phone), relative_phone: f.relative_phone ? normalizePhone(f.relative_phone) : '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card form" onSubmit={submit}>
      <p className="muted small">Đăng ký trước mùa mưa bão. Thông tin này giúp đội cứu hộ biết cần mang gì, cứu ai trước.</p>
      <label>
        Họ và tên *
        <input required autoComplete="name" value={f.full_name} onChange={(e) => set('full_name', e.target.value)} />
      </label>
      <label>
        Số điện thoại * (dùng để đăng nhập)
        <input type="tel" inputMode="tel" required value={f.phone} onChange={(e) => set('phone', e.target.value)} />
      </label>
      <label>
        Mật khẩu * (tối thiểu 6 ký tự)
        <input type="password" autoComplete="new-password" required value={f.password} onChange={(e) => set('password', e.target.value)} />
      </label>
      <div className="grid2">
        <label>
          Tỉnh / thành *
          <input required value={f.province} onChange={(e) => set('province', e.target.value)} />
        </label>
        <label>
          Xã / phường *
          <input required value={f.ward} onChange={(e) => set('ward', e.target.value)} />
        </label>
      </div>
      <div className="grid2">
        <label>
          Thôn / tổ
          <input value={f.hamlet} onChange={(e) => set('hamlet', e.target.value)} />
        </label>
        <label>
          Số nhà, đường
          <input value={f.address_detail} onChange={(e) => set('address_detail', e.target.value)} />
        </label>
      </div>
      <HomeLocation
        value={f.home_lat != null && f.home_lng != null ? { lat: f.home_lat, lng: f.home_lng } : null}
        onChange={(p) => setF((prev) => ({ ...prev, home_lat: p?.lat ?? null, home_lng: p?.lng ?? null }))}
      />
      <label>
        Số người trong nhà *
        <Stepper value={f.household_size} onChange={(v) => set('household_size', v)} />
      </label>
      <fieldset>
        <legend>Trong nhà có (chọn nếu có)</legend>
        <div className="chips">
          {VULNERABLE_KEYS.map((k) => {
            const on = f.vulnerable.includes(k)
            return (
              <button
                type="button"
                key={k}
                className={`chip${on ? ' on' : ''}`}
                onClick={() => set('vulnerable', on ? f.vulnerable.filter((x) => x !== k) : [...f.vulnerable, k])}
              >
                {VULNERABLE_LABEL[k]}
              </button>
            )
          })}
        </div>
      </fieldset>
      <label>
        SĐT người thân (ở nơi khác)
        <input type="tel" inputMode="tel" value={f.relative_phone} onChange={(e) => set('relative_phone', e.target.value)} />
      </label>
      <label>
        Ghi chú về nhà ở
        <input placeholder="VD: nhà 1 tầng, không có gác" value={f.note} onChange={(e) => set('note', e.target.value)} />
      </label>
      <label className="consent">
        <input type="checkbox" checked={f.dong_y} onChange={(e) => set('dong_y', e.target.checked)} />
        <span>
          Tôi đồng ý cho <b>đội cứu hộ và trung tâm chỉ huy</b> dùng các thông tin trên (kể cả tình trạng sức khoẻ người trong
          nhà) <b>chỉ để cứu hộ</b>. Đội cứu hộ chỉ thấy thông tin của nhà tôi khi được giao đi cứu nhà tôi.
        </span>
      </label>
      <ErrorLine error={error} />
      <button className="btn btn-primary btn-block" disabled={busy}>
        {busy ? 'Đang đăng ký…' : 'Đăng ký và vào app'}
      </button>
    </form>
  )
}

export function Stepper({ value, onChange, min = 1, max = 100 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="stepper">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} aria-label="Bớt">
        −
      </button>
      <span>{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} aria-label="Thêm">
        +
      </button>
    </div>
  )
}

const WATER_KEYS = Object.keys(WATER_LABEL) as WaterLevel[]

/** Dựng một `Sos` tối thiểu từ trạng thái khách để vẽ lên bản đồ. */
function guestAsSos(id: string, st: GuestStatus): Sos {
  return {
    id,
    user_id: null,
    guest_name: null,
    guest_phone: null,
    guest_vulnerable: st.sos.vulnerable,
    lat: st.sos.lat,
    lng: st.sos.lng,
    accuracy: st.sos.accuracy,
    battery: null,
    people_count: st.sos.people_count,
    water_level: st.sos.water_level,
    injured: st.sos.injured,
    note: null,
    status: st.status,
    assigned_team_id: st.accepted ? 'doi' : null,
    assigned_at: null,
    accepted_at: st.accepted ? st.sos.created_at : null,
    tried_team_ids: [],
    created_at: st.sos.created_at,
    updated_at: st.sos.created_at,
  }
}

/** SOS cho người chưa có tài khoản: chỉ cần tên + SĐT. */
function GuestSos() {
  const [name, setName] = useState(() => storage.get<string>('guest_name') ?? '')
  const [phone, setPhone] = useState(() => storage.get<string>('guest_phone') ?? '')
  const [people, setPeople] = useState(1)
  const [sentId, setSentId] = useState<string | null>(() => storage.get<string>('guest_sos_id'))
  const [status, setStatus] = useState<GuestStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null)
  const [fixing, setFixing] = useState(false)
  const queue = useSosQueue((r) => {
    if (r.kind === 'guest') {
      storage.set('guest_sos_id', r.id)
      setSentId(r.id)
    }
  })

  const load = useCallback(
    (id: string) =>
      backend
        .guestSosStatus(id)
        .then(setStatus)
        .catch(() => {}),
    [],
  )
  useEffect(() => {
    if (!sentId) return
    void load(sentId)
    const t = window.setInterval(() => void load(sentId), 20000)
    return () => window.clearInterval(t)
  }, [sentId, load])

  if (queue.pending?.kind === 'guest') {
    return (
      <PendingCard
        pending={queue.pending}
        name={name}
        phone={phone}
        error={queue.error}
        onRetry={queue.trySend}
        onCancel={queue.cancel}
      />
    )
  }

  if (sentId) {
    const done = status && ['rescued', 'cancelled'].includes(status.status)
    const g = status?.sos
    const patch = async (p: GuestSosPatch) => {
      setError(null)
      try {
        await backend.updateGuestSos(sentId, p)
        await load(sentId)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    }
    const boats = (status?.boats ?? []).filter((b) => isLive(b))
    const nearestKm = g && boats.length ? Math.min(...boats.map((b) => distanceKm(b, g))) : null
    return (
      <>
        <div className="card card-ok">
          <h2>✅ Đã gửi SOS</h2>
          <p>
            Trạng thái: <b>{status ? STATUS_LABEL[status.status] : 'Đã nhận'}</b>
            {status?.team_name && (
              <>
                {' '}
                — <b>{status.team_name}</b>
              </>
            )}
          </p>
          {status?.status === 'assigned' && !status.accepted && <p className="muted small">Đang chờ đội xác nhận…</p>}
          <p className="muted small">Giữ máy, tiết kiệm pin. Đội cứu hộ có thể gọi vào {phone}.</p>
          <CallButton />
          {done && (
            <button
              className="btn btn-outline btn-block"
              onClick={() => {
                storage.remove('guest_sos_id')
                setSentId(null)
                setStatus(null)
              }}
            >
              Gửi SOS mới
            </button>
          )}
        </div>

        {g && !done && (
          <>
            <div className="card">
              {nearestKm != null ? (
                <p className="boat-line">
                  🚤 <b>{status?.team_name ?? 'Đội cứu hộ'}</b> đang cách bạn khoảng <b>{formatKm(nearestKm)}</b>
                </p>
              ) : (
                <p className="muted small">Hình người là vị trí bạn đã gửi. Khi có đội nhận, xuồng của đội sẽ hiện trên bản đồ này.</p>
              )}
              <SosMap sos={[guestAsSos(sentId, status)]} locations={boats} locationLabel={() => status?.team_name ?? undefined} height="240px" />
              <p className="muted small">
                📍 Vị trí đã gửi: {g.accuracy != null ? `sai số khoảng ${Math.round(g.accuracy)} m` : 'chọn tay trên bản đồ'}. Sai chỗ thì sửa:
              </p>
              <button
                className="btn btn-outline btn-block"
                onClick={async () => {
                  const pos = await getPosition()
                  if (pos && !pos.stale) await patch({ lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy })
                  else setError(loiGpsGanNhat())
                }}
              >
                📍 Cập nhật vị trí của tôi (GPS)
              </button>
              <button
                className="btn btn-outline btn-block"
                onClick={() => {
                  setPicked({ lat: g.lat, lng: g.lng })
                  setFixing(true)
                }}
              >
                🗺️ Chỉnh vị trí trên bản đồ
              </button>
              <Sheet open={fixing} onClose={() => setFixing(false)} title="Chạm vào chỗ bạn đang đứng">
                <LocationPicker value={picked} onPick={setPicked} />
                <button
                  className="btn btn-danger btn-block"
                  disabled={!picked}
                  onClick={async () => {
                    if (!picked) return
                    await patch({ lat: picked.lat, lng: picked.lng, accuracy: null })
                    setFixing(false)
                  }}
                >
                  Lưu vị trí này
                </button>
              </Sheet>
            </div>

            <div className="card">
              <h3>Báo thêm cho đội cứu hộ (không bắt buộc)</h3>
              <p className="muted small">Càng rõ, đội càng biết cứu ai trước và mang theo gì.</p>
              <p className="muted small">Nước đang ngập tới:</p>
              <div className="chips">
                {WATER_KEYS.map((w) => (
                  <button key={w} className={`chip${g.water_level === w ? ' on' : ''}`} onClick={() => void patch({ water_level: w })}>
                    {WATER_LABEL[w]}
                  </button>
                ))}
              </div>
              <p className="muted small">Trong nhà có:</p>
              <div className="chips">
                <button className={`chip${g.injured ? ' on' : ''}`} onClick={() => void patch({ injured: !g.injured })}>
                  🩹 Người bị thương
                </button>
                {VULNERABLE_KEYS.map((k) => {
                  const on = g.vulnerable.includes(k)
                  return (
                    <button
                      key={k}
                      className={`chip${on ? ' on' : ''}`}
                      onClick={() => void patch({ vulnerable: on ? g.vulnerable.filter((x) => x !== k) : [...g.vulnerable, k] })}
                    >
                      {VULNERABLE_LABEL[k]}
                    </button>
                  )
                })}
              </div>
              <div className="people-line">
                <span>Số người:</span>
                <Stepper value={g.people_count} onChange={(v) => void patch({ people_count: v })} />
              </div>
              <ErrorLine error={error} />
            </div>
            <div className="cancel-zone">
              <p className="muted small">Đội cứu hộ ĐÃ nhận tin của bạn — không cần bấm gì thêm. Chỉ bấm nút dưới khi bạn KHÔNG cần cứu nữa.</p>
              <button
                className="btn-link"
                onClick={() => {
                  if (confirm('HỦY yêu cầu cứu hộ?\n\nĐội cứu hộ sẽ KHÔNG tới nữa. Chỉ bấm OK nếu bạn đã thật sự an toàn.')) void patch({ status: 'cancelled' })
                }}
              >
                ✖ Hủy yêu cầu cứu hộ (tôi đã an toàn, không cần cứu nữa)
              </button>
            </div>
          </>
        )}
      </>
    )
  }

  const ready = name.trim().length > 1 && isValidPhone(phone)
  return (
    <div className="card form">
      <p className="muted small">Không cần đăng ký. Nhập tên và SĐT (để đội cứu hộ gọi lại) rồi nhấn giữ nút SOS.</p>
      <label>
        Họ tên
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        Số điện thoại
        <input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </label>
      <label>
        Số người cần cứu
        <Stepper value={people} onChange={setPeople} />
      </label>
      {!ready && <p className="muted small center">Nhập tên và số điện thoại để mở nút SOS.</p>}
      <ErrorLine error={error} />
      <SosTrigger
        peopleCount={people}
        disabled={!ready}
        onReady={(input) => {
          setError(null)
          storage.set('guest_name', name)
          storage.set('guest_phone', phone)
          queue.submit({ kind: 'guest', input: { ...input, name: name.trim(), phone: normalizePhone(phone) } })
        }}
      />
      <CallButton className="btn btn-outline btn-block" />
    </div>
  )
}
