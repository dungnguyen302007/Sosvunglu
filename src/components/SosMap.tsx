import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { Fragment, useMemo, type ReactNode } from 'react'
import { Circle, CircleMarker, LayersControl, MapContainer, Marker, Popup, TileLayer, ZoomControl, useMap, useMapEvents } from 'react-leaflet'
import { useEffect } from 'react'
import { cauHinh } from '../lib/config'
import type { LatLng } from '../lib/geo'
import { PRIORITY_COLOR, priorityLevel, priorityScore } from '../lib/priority'
import type { Profile, RescuerLocation, Sos } from '../types'

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

const rescuerIcon = L.divIcon({
  className: 'rescuer-icon',
  html: '🚤',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
})

/** Cứu hộ đã tắt ca hoặc mất tín hiệu > 15 phút: hiện xám ở vị trí cuối cùng. */
const rescuerOffIcon = L.divIcon({
  className: 'rescuer-icon off',
  html: '🚤',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
})

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

function sosIcon(color: string, people: number, assigned: boolean, critical: boolean) {
  return L.divIcon({
    className: 'sos-pin-wrap',
    html: `<div class="sos-pin${assigned ? ' assigned' : ''}${critical ? ' critical' : ''}" style="background:${color}">${people}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
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
          <Marker position={[s.lat, s.lng]} icon={sosIcon(PRIORITY_COLOR[level], s.people_count, !!s.assigned_team_id, level === 'critical')} zIndexOffset={score}>
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
          <Marker key={l.user_id} position={[l.lat, l.lng]} icon={live ? rescuerIcon : rescuerOffIcon} zIndexOffset={live ? 5000 : 3000}>
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

/** Chọn vị trí bằng cách chạm lên bản đồ (khi không lấy được GPS). */
export function LocationPicker({ value, onPick }: { value: LatLng | null; onPick: (p: LatLng) => void }) {
  return (
    <MapContainer center={value ?? DEFAULT_CENTER} zoom={value ? 16 : 12} style={{ height: '50vh', width: '100%' }} className="map" zoomControl={false}>
      <BaseLayers />
      <ZoomControl position="bottomright" />
      <ClickToPick onPick={onPick} />
      {value && <CircleMarker center={[value.lat, value.lng]} radius={12} pathOptions={{ color: '#fff', weight: 3, fillColor: '#ff2d2d', fillOpacity: 1 }} />}
    </MapContainer>
  )
}
