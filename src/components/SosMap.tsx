import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useMemo, type ReactNode } from 'react'
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import type { LatLng } from '../lib/geo'
import { PRIORITY_COLOR, priorityLevel, priorityScore } from '../lib/priority'
import type { RescuerLocation, Sos } from '../types'

const DEFAULT_CENTER: LatLng = { lat: 16.4637, lng: 107.5909 } // Huế

const rescuerIcon = L.divIcon({
  className: 'rescuer-icon',
  html: '🚤',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
})

const meIcon = L.divIcon({ className: 'me-icon', html: '', iconSize: [18, 18], iconAnchor: [9, 9] })

function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap()
  const key = points.length
  useEffect(() => {
    if (points.length === 0) return
    if (points.length === 1) map.setView(points[0], 15)
    else map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [30, 30], maxZoom: 15 })
    // chỉ căn lại khi số điểm thay đổi, không giật bản đồ mỗi lần cập nhật
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map])
  return null
}

interface Props {
  sos: Sos[]
  locations?: RescuerLocation[]
  me?: LatLng | null
  renderSosPopup?: (s: Sos) => ReactNode
  renderLocationPopup?: (l: RescuerLocation) => ReactNode
  height?: string
}

export function SosMap({ sos, locations = [], me, renderSosPopup, renderLocationPopup, height = '100%' }: Props) {
  const points = useMemo(
    () => [...sos, ...locations.filter((l) => l.on_duty), ...(me ? [me] : [])],
    [sos, locations, me],
  )
  return (
    <MapContainer center={DEFAULT_CENTER} zoom={13} style={{ height, width: '100%' }} className="map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={points} />
      {sos.map((s) => {
        const color = PRIORITY_COLOR[priorityLevel(priorityScore(s))]
        return (
          <CircleMarker
            key={s.id}
            center={[s.lat, s.lng]}
            radius={s.assigned_team_id ? 9 : 12}
            pathOptions={{
              color: s.assigned_team_id ? '#4dabf7' : '#fff',
              weight: 3,
              fillColor: color,
              fillOpacity: 0.9,
            }}
          >
            {renderSosPopup && <Popup>{renderSosPopup(s)}</Popup>}
          </CircleMarker>
        )
      })}
      {locations
        .filter((l) => l.on_duty)
        .map((l) => (
          <Marker key={l.user_id} position={[l.lat, l.lng]} icon={rescuerIcon}>
            {renderLocationPopup && <Popup>{renderLocationPopup(l)}</Popup>}
          </Marker>
        ))}
      {me && <Marker position={[me.lat, me.lng]} icon={meIcon} />}
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
    <MapContainer center={value ?? DEFAULT_CENTER} zoom={value ? 16 : 12} style={{ height: '50vh', width: '100%' }} className="map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickToPick onPick={onPick} />
      {value && <CircleMarker center={[value.lat, value.lng]} radius={12} pathOptions={{ color: '#fff', fillColor: '#ff2d2d', fillOpacity: 1 }} />}
    </MapContainer>
  )
}
