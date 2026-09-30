import type { ReactNode } from 'react'
import { useNow, useOnline } from '../lib/hooks'
import { smsBody, smsLink, type PendingSos } from '../lib/queue'
import { timeAgo } from '../lib/labels'
import { HOTLINE } from '../lib/config'

export function Header({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const online = useOnline()
  return (
    <header className="topbar">
      <div>
        <div className="topbar-title">{title}</div>
        {subtitle && <div className="topbar-sub">{subtitle}</div>}
      </div>
      <div className="topbar-right">
        {!online && <span className="badge badge-offline">Mất mạng</span>}
        {right}
      </div>
    </header>
  )
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="btn-ghost" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: string }[] }) {
  return (
    <nav className="tabs">
      {items.map((it) => (
        <button key={it.value} className={it.value === value ? 'active' : ''} onClick={() => onChange(it.value)}>
          {it.label}
        </button>
      ))}
    </nav>
  )
}

export function CallButton({ className = 'btn btn-outline' }: { className?: string }) {
  return (
    <a className={className} href={`tel:${HOTLINE}`}>
      📞 Gọi {HOTLINE}
    </a>
  )
}

/** Thẻ "SOS chưa gửi được": báo chờ sóng, sau 20 giây hiện nút SMS dự phòng. */
export function PendingCard({
  pending,
  name,
  phone,
  error,
  onRetry,
  onCancel,
}: {
  pending: PendingSos
  name: string
  phone: string
  error: string | null
  onRetry: () => void
  onCancel: () => void
}) {
  const now = useNow(5000)
  const waitedSec = (now - new Date(pending.queuedAt).getTime()) / 1000
  const showSms = waitedSec > 20
  const body = smsBody({ name, phone, lat: pending.input.lat, lng: pending.input.lng, people: pending.input.people_count })
  return (
    <div className="card card-warn">
      <h2>⏳ Chưa gửi được — đang chờ sóng</h2>
      <p>
        SOS đã lưu trong máy ({timeAgo(pending.queuedAt, now)}). Có sóng là app <b>tự gửi</b>, bạn không cần làm gì thêm.
      </p>
      {error && <p className="error">Lỗi: {error}</p>}
      {showSms && (
        <>
          <p>Mạng yếu quá? Gửi bằng <b>tin nhắn SMS</b> — thường vẫn đi được khi 3G/4G không có:</p>
          <a className="btn btn-danger" href={smsLink(body)}>
            ✉️ Gửi SMS cứu hộ
          </a>
        </>
      )}
      <div className="row">
        <button className="btn btn-outline" onClick={onRetry}>
          🔄 Thử lại ngay
        </button>
        <CallButton />
      </div>
      <button className="btn-link" onClick={onCancel}>
        Hủy SOS này
      </button>
    </div>
  )
}

export function Stat({ label, value, tone }: { label: string; value: number | string; tone?: 'red' | 'orange' | 'green' | 'blue' }) {
  return (
    <div className={`stat stat-${tone ?? 'plain'}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

export function ErrorLine({ error }: { error: string | null }) {
  return error ? <p className="error">{error}</p> : null
}
