import { useEffect, useState, type FormEvent } from 'react'
import { backend } from '../lib/backend'
import type { GuestStatus } from '../lib/backend/types'
import { isValidPhone, normalizePhone } from '../lib/geo'
import { useSosQueue } from '../lib/hooks'
import { STATUS_LABEL, VULNERABLE_LABEL } from '../lib/labels'
import { storage } from '../lib/storage'
import type { SignUpInput, Vulnerable } from '../types'
import { CallButton, ErrorLine, PendingCard, Tabs } from '../components/common'
import { SosTrigger } from '../components/SosTrigger'

type Tab = 'login' | 'register' | 'guest'

export function AuthPage() {
  const [tab, setTab] = useState<Tab>(() => (storage.get('guest_sos_id') ? 'guest' : 'login'))
  return (
    <div className="page auth">
      <div className="brand">
        <div className="brand-logo">SOS</div>
        <h1>SOS vùng lũ</h1>
        <p className="muted">Một nút bấm — đội cứu hộ biết bạn ở đâu.</p>
      </div>
      {backend.mode === 'demo' && <DemoNotice />}
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'login', label: 'Đăng nhập' },
          { value: 'register', label: 'Đăng ký' },
          { value: 'guest', label: '🆘 SOS khẩn' },
        ]}
      />
      {tab === 'login' && <LoginForm />}
      {tab === 'register' && <RegisterForm />}
      {tab === 'guest' && <GuestSos />}
    </div>
  )
}

function DemoNotice() {
  return (
    <div className="card card-info">
      <b>Bản chạy thử</b> — dữ liệu chỉ lưu trên máy này. Tài khoản mẫu (mật khẩu <code>123456</code>):
      <ul>
        <li>Chỉ huy: 0900000001</li>
        <li>Cứu hộ: 0900000002</li>
        <li>Người dân: 0900000003</li>
      </ul>
      Mở nhiều tab để thử cùng lúc.
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
  })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof SignUpInput>(k: K, v: SignUpInput[K]) => setF((prev) => ({ ...prev, [k]: v }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!isValidPhone(f.phone)) return setError('Số điện thoại không hợp lệ')
    if (f.password.length < 6) return setError('Mật khẩu tối thiểu 6 ký tự')
    if (f.relative_phone && !isValidPhone(f.relative_phone)) return setError('SĐT người thân không hợp lệ')
    setBusy(true)
    setError(null)
    try {
      await backend.signUp({ ...f, phone: normalizePhone(f.phone), relative_phone: f.relative_phone ? normalizePhone(f.relative_phone) : '' })
      // Supabase: đăng ký xong đăng nhập luôn (cần tắt "Confirm email" trong Supabase)
      if (backend.mode === 'supabase') await backend.signIn(f.phone, f.password)
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

/** SOS cho người chưa có tài khoản: chỉ cần tên + SĐT. */
function GuestSos() {
  const [name, setName] = useState(() => storage.get<string>('guest_name') ?? '')
  const [phone, setPhone] = useState(() => storage.get<string>('guest_phone') ?? '')
  const [people, setPeople] = useState(1)
  const [sentId, setSentId] = useState<string | null>(() => storage.get<string>('guest_sos_id'))
  const [status, setStatus] = useState<GuestStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const queue = useSosQueue((r) => {
    if (r.kind === 'guest') {
      storage.set('guest_sos_id', r.id)
      setSentId(r.id)
    }
  })

  useEffect(() => {
    if (!sentId) return
    const load = () =>
      backend
        .guestSosStatus(sentId)
        .then(setStatus)
        .catch(() => {})
    void load()
    const t = window.setInterval(load, 20000)
    return () => window.clearInterval(t)
  }, [sentId])

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
    return (
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
    )
  }

  const ready = name.trim().length > 1 && isValidPhone(phone)
  return (
    <div className="card form">
      <p className="muted small">Chưa có tài khoản? Nhập tên và SĐT rồi nhấn giữ nút SOS.</p>
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
