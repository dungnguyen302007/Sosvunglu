import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { Fragment, useMemo, useState, type ReactNode } from 'react'
import { Circle, CircleMarker, LayersControl, MapContainer, Marker, Popup, TileLayer, ZoomControl, useMap, useMapEvents } from 'react-leaflet'
import { useEffect } from 'react'
import { backend } from '../lib/backend'
import { cauHinh } from '../lib/config'
import type { LatLng } from '../lib/geo'
import { PRIORITY_COLOR, priorityLevel, priorityScore } from '../lib/priority'
import type { AddressHit, Profile, RescuerLocation, Sos } from '../types'

const DEFAULT_CENTER: LatLng = { lat: 16.4637, lng: 107.5909 } // Huế

/**
 * Nền bản đồ, không cần khóa:
 *  - Bản đồ: Esri World Street Map (sáng, sạch, gần giống Google Maps)
 *  - OpenStreetMap: dự phòng nếu nền trên lỗi
 *  - Vệ tinh: Esri World Imagery
 * Có khóa riêng (MapTiler, Vietmap...) thì đặt BAN_DO_URL (+ BAN_DO_NGUON) trong .env để thay nền đầu tiên.
 * (Bản Vite có lớp Google Maps tuỳ chọn — bỏ ở bản này vì cần thẻ thanh toán, chưa dùng.)
 */
function tiles() {
  const rieng = cauHinh.banDoUrl
  return {
    street: {
      url: rieng || 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      attribution: rieng ? cauHinh.banDoNguon : 'Tiles &copy; Esri',
      maxZoom: 19,
    },
    osm: {
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri',
      maxZoom: 19,
    },
  }
}

function BaseLayers() {
  const t = useMemo(tiles, [])
  return (
    <LayersControl position="topright">
      <LayersControl.BaseLayer checked name="Bản đồ">
        <TileLayer {...t.street} />
      </LayersControl.BaseLayer>
      <LayersControl.BaseLayer name="OpenStreetMap">
        <TileLayer {...t.osm} />
      </LayersControl.BaseLayer>
      <LayersControl.BaseLayer name="Vệ tinh">
        <TileLayer {...t.satellite} />
      </LayersControl.BaseLayer>
    </LayersControl>
  )
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
}

/**
 * Cứu hộ = hình XUỒNG to, viền xanh dương; đội của mình viền xanh lá; đã tắt ca / mất tín hiệu
 * > 15 phút thì xám (chỉ chỉ huy thấy). Dưới xuồng có tên đội.
 */
function rescuerIcon(kind: 'live' | 'mine' | 'off', label?: string) {
  return L.divIcon({
    className: 'rescuer-wrap',
    html: `<div class="rescuer-icon ${kind}">🚤</div>${label ? `<span class="rescuer-label">${esc(label)}</span>` : ''}`,
    iconSize: [46, 46],
    iconAnchor: [23, 23],
    popupAnchor: [0, -24],
  })
}

const STALE_MS = 15 * 60 * 1000

export function isLive(l: RescuerLocation, now = Date.now()): boolean {
  return l.on_duty && now - new Date(l.updated_at).getTime() <= STALE_MS
}

function houseIcon(vulnerable: boolean) {
  return L.divIcon({
    className: 'house-pin-wrap',
    html: `<div class="house-pin${vulnerable ? ' vulnerable' : ''}">🏠</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  })
}
const HOUSE = houseIcon(false)
const HOUSE_VULNERABLE = houseIcon(true)

const meIcon = L.divIcon({ className: 'me-icon', html: '', iconSize: [18, 18], iconAnchor: [9, 9] })

const PERSON_SVG =
  '<svg viewBox="0 0 12 26" width="12" height="26" aria-hidden="true"><circle cx="6" cy="4" r="3.6"/><path d="M1 12.2C1 10.4 2.4 9 4.2 9h3.6C9.6 9 11 10.4 11 12.2V18H9.2v8H2.8v-8H1z"/></svg>'
/** Vẽ tối đa chừng này hình người; đông hơn thì thêm số tổng ở góc. */
const MAX_FIGURES = 5

/** Màu theo TÌNH TRẠNG (chủ dự án chốt 02/10/2026): chưa đội nào nhận = đỏ nháy; đã có đội nhận = vàng đứng yên. */
export const SOS_COLOR = { waiting: '#ff2d2d', taken: '#ffd60a' }

/** Đã có đội NHẬN (đội bấm nhận rồi) — mới giao mà đội chưa xác nhận thì vẫn tính là chưa. */
export function sosTaken(s: Sos): boolean {
  return !!s.assigned_team_id && !!s.accepted_at && s.status !== 'waiting' && s.status !== 'cannot_reach'
}

/**
 * Người dân cần cứu = HÌNH NGƯỜI: 1 người 1 hình, 2 người 2 hình… (quá 5 thì 5 hình + số tổng).
 * ĐỎ NHÁY = chưa đội nào nhận; VÀNG = đã có đội nhận. Ca "rất nguy cấp" có thêm dấu ! ở góc.
 */
function sosIcon(people: number, taken: boolean, critical: boolean) {
  const n = Math.max(1, people)
  const figures = Math.min(n, MAX_FIGURES)
  const w = 20 + figures * 13
  return L.divIcon({
    className: 'sos-pin-wrap',
    html: `<div class="sos-pin ${taken ? 'taken' : 'waiting'}" style="background:${taken ? SOS_COLOR.taken : SOS_COLOR.waiting}">${PERSON_SVG.repeat(figures)}${n > figures ? `<b>${n}</b>` : ''}${critical ? '<i>!</i>' : ''}</div>`,
    iconSize: [w, 40],
    iconAnchor: [w / 2, 20],
    popupAnchor: [0, -22],
  })
}

function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap()
  const key = points.length
  useEffect(() => {
    if (points.length === 0) return
    if (points.length === 1) map.setView(points[0], 15)
    else map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 15 })
    // chỉ căn lại khi số điểm thay đổi, không giật bản đồ mỗi lần cập nhật
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map])
  return null
}

/** Nút "vị trí của tôi" góc dưới trái, bay tới vị trí hiện tại. */
function LocateButton({ me }: { me: LatLng }) {
  const map = useMap()
  return (
    <div className="leaflet-bottom leaflet-left">
      <div className="leaflet-control locate-ctl">
        <button type="button" aria-label="Vị trí của tôi" onClick={() => map.flyTo([me.lat, me.lng], Math.max(map.getZoom(), 16))}>
          ◎
        </button>
      </div>
    </div>
  )
}

interface Props {
  sos: Sos[]
  locations?: RescuerLocation[]
  me?: LatLng | null
  renderSosPopup?: (s: Sos) => ReactNode
  renderLocationPopup?: (l: RescuerLocation) => ReactNode
  households?: Profile[]
  renderHouseholdPopup?: (p: Profile) => ReactNode
  /** Hiện cả cứu hộ đã tắt ca / mất tín hiệu (xám) */
  showOffline?: boolean
  /** Đội của người đang xem (cứu hộ) — xuồng đội mình viền xanh lá */
  myTeamId?: string | null
  /** Chữ nhỏ dưới xuồng (tên đội) */
  locationLabel?: (l: RescuerLocation) => string | undefined
  height?: string
}

export function SosMap({
  sos,
  locations = [],
  me,
  renderSosPopup,
  renderLocationPopup,
  households = [],
  renderHouseholdPopup,
  showOffline = false,
  myTeamId,
  locationLabel,
  height = '100%',
}: Props) {
  const visibleLocations = useMemo(
    () => (showOffline ? locations : locations.filter((l) => l.on_duty)),
    [locations, showOffline],
  )
  const points = useMemo(
    () => [
      ...sos,
      ...visibleLocations,
      ...households.map((h) => ({ lat: h.home_lat!, lng: h.home_lng! })),
      ...(me ? [me] : []),
    ],
    [sos, visibleLocations, households, me],
  )
  return (
    <MapContainer center={DEFAULT_CENTER} zoom={13} style={{ height, width: '100%' }} className="map" zoomControl={false}>
      <BaseLayers />
      <ZoomControl position="bottomright" />
      <FitBounds points={points} />
      {sos.map((s) => {
        const score = priorityScore(s)
        const level = priorityLevel(score)
        return (
          <Fragment key={s.id}>
          {s.accuracy != null && s.accuracy >= 50 && s.accuracy <= 3000 && (
            <Circle center={[s.lat, s.lng]} radius={s.accuracy} pathOptions={{ color: PRIORITY_COLOR[level], weight: 1, fillOpacity: 0.12 }} />
          )}
          <Marker position={[s.lat, s.lng]} icon={sosIcon(s.people_count, sosTaken(s), level === 'critical')} zIndexOffset={score + (sosTaken(s) ? 0 : 1000)}>
            {renderSosPopup && <Popup minWidth={240} maxWidth={290} autoPanPadding={[24, 80]}>{renderSosPopup(s)}</Popup>}
          </Marker>
          </Fragment>
        )
      })}
      {households.map((h) => (
        <Marker key={h.id} position={[h.home_lat!, h.home_lng!]} icon={h.vulnerable.length ? HOUSE_VULNERABLE : HOUSE} zIndexOffset={-1000}>
          {renderHouseholdPopup && <Popup>{renderHouseholdPopup(h)}</Popup>}
        </Marker>
      ))}
      {visibleLocations.map((l) => {
        const live = isLive(l)
        return (
          <Marker key={l.user_id} position={[l.lat, l.lng]} icon={rescuerIcon(!live ? 'off' : myTeamId && l.team_id === myTeamId ? 'mine' : 'live', locationLabel?.(l))} zIndexOffset={live ? 5000 : 3000}>
            {renderLocationPopup && <Popup>{renderLocationPopup(l)}</Popup>}
          </Marker>
        )
      })}
      {me && <Marker position={[me.lat, me.lng]} icon={meIcon} zIndexOffset={4000} />}
      {me && <LocateButton me={me} />}
    </MapContainer>
  )
}

function ClickToPick({ onPick }: { onPick: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) })
  return null
}

/** Đưa bản đồ tới điểm vừa tìm được theo địa chỉ. */
function FlyTo({ to }: { to: LatLng | null }) {
  const map = useMap()
  useEffect(() => {
    if (to) map.setView([to.lat, to.lng], 17)
  }, [to, map])
  return null
}

/**
 * Chọn vị trí: GÕ ĐỊA CHỈ để bản đồ nhảy tới đó, rồi chạm lên bản đồ chỉnh cho đúng nhà
 * (dùng khi không lấy được GPS / GPS lệch).
 */
export function LocationPicker({ value, onPick }: { value: LatLng | null; onPick: (p: LatLng) => void }) {
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [hits, setHits] = useState<AddressHit[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [flyTo, setFlyTo] = useState<LatLng | null>(null)

  const search = async () => {
    if (q.trim().length < 3) return
    setBusy(true)
    setError(null)
    try {
      const ds = await backend.searchAddress(q.trim(), value)
      setHits(ds)
      if (ds.length === 1) choose(ds[0])
    } catch (err) {
      setHits(null)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }
  const choose = (h: AddressHit) => {
    const p = { lat: h.lat, lng: h.lng }
    onPick(p)
    setFlyTo(p)
    setHits(null)
  }

  return (
    <div className="picker">
      {/* KHÔNG dùng <form>: bảng này có khi nằm trong form đăng ký — form lồng form là bấm Tìm thành gửi form ngoài. */}
      <div className="picker-search">
        <input
          type="search"
          enterKeyHint="search"
          placeholder="Gõ địa chỉ: thôn, xã, đường, tỉnh…"
          aria-label="Tìm theo địa chỉ"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            void search()
          }}
        />
        <button type="button" className="btn btn-primary" disabled={busy || q.trim().length < 3} onClick={() => void search()}>
          {busy ? '…' : '🔍 Tìm'}
        </button>
      </div>
      {error && <p className="error small">{error}</p>}
      {hits && hits.length === 0 && <p className="muted small">Không tìm thấy. Thử gõ ngắn hơn (tên xã + tỉnh), rồi chạm lên bản đồ.</p>}
      {hits && hits.length > 1 && (
        <div className="picker-hits">
          {hits.map((h) => (
            <button type="button" key={`${h.lat},${h.lng}`} onClick={() => choose(h)}>
              📍 {h.name}
            </button>
          ))}
        </div>
      )}
      {flyTo && <p className="muted small">Bản đồ đã tới địa chỉ vừa tìm. Phóng to và chạm đúng nhà bạn để chỉnh.</p>}
      <LocationPickerMap value={value} onPick={onPick} flyTo={flyTo} />
    </div>
  )
}

function LocationPickerMap({ value, onPick, flyTo }: { value: LatLng | null; onPick: (p: LatLng) => void; flyTo: LatLng | null }) {
  return (
    <MapContainer center={value ?? DEFAULT_CENTER} zoom={value ? 16 : 12} style={{ height: '45vh', width: '100%' }} className="map" zoomControl={false}>
      <BaseLayers />
      <ZoomControl position="bottomright" />
      <ClickToPick onPick={onPick} />
      <FlyTo to={flyTo} />
      {value && <CircleMarker center={[value.lat, value.lng]} radius={12} pathOptions={{ color: '#fff', weight: 3, fillColor: '#ff2d2d', fillOpacity: 1 }} />}
    </MapContainer>
  )
}
