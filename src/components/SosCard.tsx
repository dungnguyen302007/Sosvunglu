import type { ReactNode } from 'react'
import { directionsUrl, distanceKm, formatKm, type LatLng } from '../lib/geo'
import { STATUS_LABEL, VULNERABLE_LABEL, WATER_LABEL, timeAgo } from '../lib/labels'
import { PRIORITY_COLOR, PRIORITY_LABEL, priorityLevel, priorityScore } from '../lib/priority'
import type { Sos, Team } from '../types'

interface Props {
  sos: Sos
  teams?: Team[]
  from?: LatLng | null
  now: number
  actions?: ReactNode
  compact?: boolean
}

/** Thẻ thông tin SOS cho cứu hộ / chỉ huy: đủ thông tin để quyết định cứu. */
export function SosCard({ sos, teams = [], from, now, actions, compact }: Props) {
  const score = priorityScore(sos, now)
  const level = priorityLevel(score)
  const name = sos.profile?.full_name ?? sos.guest_name ?? 'Người dân đã đăng ký'
  const phone = sos.profile?.phone ?? sos.guest_phone
  const team = teams.find((t) => t.id === sos.assigned_team_id)
  const p = sos.profile
  const address = p ? [p.address_detail, p.hamlet, p.ward, p.province].filter(Boolean).join(', ') : null

  return (
    <article className="sos-card" style={{ borderLeftColor: PRIORITY_COLOR[level] }}>
      <div className="sos-card-head">
        <span className="pill" style={{ background: PRIORITY_COLOR[level] }}>
          {PRIORITY_LABEL[level]} · {score}
        </span>
        <span className={`status status-${sos.status}`}>{STATUS_LABEL[sos.status]}</span>
      </div>
      <div className="sos-card-name">
        {name} {!sos.user_id && <span className="muted">(khách)</span>}
      </div>
      <div className="facts">
        <span>👥 {sos.people_count} người</span>
        {sos.water_level && <span className="fact-hot">🌊 Nước tới {WATER_LABEL[sos.water_level].toLowerCase()}</span>}
        {sos.injured && <span className="fact-hot">🩹 Có người bị thương</span>}
        {sos.battery != null && <span className={sos.battery <= 15 ? 'fact-hot' : ''}>🔋 {sos.battery}%</span>}
        {from && <span>📍 {formatKm(distanceKm(from, sos))}</span>}
        <span>🕒 {timeAgo(sos.created_at, now)}</span>
        {sos.accuracy != null && <span className="muted">GPS ±{Math.round(sos.accuracy)} m</span>}
      </div>
      {p && p.vulnerable.length > 0 && (
        <div className="facts">
          {p.vulnerable.map((v) => (
            <span key={v} className="fact-warn">
              ⚠️ {VULNERABLE_LABEL[v]}
            </span>
          ))}
        </div>
      )}
      {!compact && (
        <>
          {address && <div className="muted">🏠 {address}</div>}
          {p?.note && <div className="muted">📝 {p.note}</div>}
          {sos.note && <div className="muted">💬 {sos.note}</div>}
          {team && <div className="muted">🚤 {team.name}</div>}
        </>
      )}
      <div className="row wrap">
        {phone && (
          <a className="btn btn-small btn-outline" href={`tel:${phone}`}>
            📞 {phone}
          </a>
        )}
        {!compact && p?.relative_phone && (
          <a className="btn btn-small btn-outline" href={`tel:${p.relative_phone}`}>
            📞 Người thân
          </a>
        )}
        <a className="btn btn-small btn-outline" href={directionsUrl(sos)} target="_blank" rel="noreferrer">
          🧭 Chỉ đường
        </a>
      </div>
      {actions && <div className="row wrap">{actions}</div>}
    </article>
  )
}
