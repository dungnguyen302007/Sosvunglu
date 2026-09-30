import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { Fragment, useMemo, type ReactNode } from 'react'
import { Circle, CircleMarker, LayersControl, MapContainer, Marker, Popup, TileLayer, ZoomControl, useMap, useMapEvents } from 'react-leaflet'
import { useEffect } from 'react'
import type { LatLng } from '../lib/geo'
import { PRIORITY_COLOR, priorityLevel, priorityScore } from '../lib/priority'
import type { RescuerLocation, Sos } from '../types'

const DEFAULT_CENTER: LatLng = { lat: 16.4637, lng: 107.5909 } // Huế

/**
 * Nền bản đồ, không cần khóa:
 *  - Bản đồ: Esri World Street Map (sáng, sạch, gần giống Google Maps)
 *  - OpenStreetMap: dự phòng nếu nền trên lỗi
 *  - Vệ tinh: Esri World Imagery
 * Có khóa riêng (MapTiler, Stadia...) thì đặt VITE_MAP_TILE_URL để thay nền đầu tiên.
 */
const CUSTOM_TILE_URL = import.meta.env.VITE_MAP_TILE_URL
const CUSTOM_ATTRIBUTION = import.meta.env.VITE_MAP_ATTRIBUTION || '&copy; OpenStreetMap contributors'

const TILES = {
  street: {
    url: CUSTOM_TILE_URL || 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: CUSTOM_TILE_URL ? CUSTOM_ATTRIBUTION : 'Tiles &copy; Esri',
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

function BaseLayers() {
  return (
    <LayersControl position="topright">
      <LayersControl.BaseLayer checked name="Bản đồ">
        <TileLayer {...TILES.street} />
      </LayersControl.BaseLayer>
      <LayersControl.BaseLayer name="OpenStreetMap">
        <TileLayer {...TILES.osm} />
      </LayersControl.BaseLayer>
      <LayersControl.BaseLayer name="Vệ tinh">
        <TileLayer {...TILES.satellite} />
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
  height?: string
}

export function SosMap({ sos, locations = [], me, renderSosPopup, renderLocationPopup, height = '100%' }: Props) {
  const points = useMemo(
    () => [...sos, ...locations.filter((l) => l.on_duty), ...(me ? [me] : [])],
    [sos, locations, me],
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
      {locations
        .filter((l) => l.on_duty)
        .map((l) => (
          <Marker key={l.user_id} position={[l.lat, l.lng]} icon={rescuerIcon} zIndexOffset={5000}>
            {renderLocationPopup && <Popup>{renderLocationPopup(l)}</Popup>}
          </Marker>
        ))}
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
