import { useState } from 'react'
import { getPosition, POOR_ACCURACY_M } from '../lib/device'
import type { LatLng } from '../lib/geo'
import { Sheet } from './common'
import { LocationPicker } from './SosMap'

/**
 * Lưu vị trí nhà (tùy chọn): bấm khi đang ở nhà để lấy GPS, hoặc chạm chọn trên bản đồ.
 * Chỉ huy dùng để thấy toàn cảnh hộ dân trước khi lũ tới.
 */
export function HomeLocation({ value, onChange }: { value: LatLng | null; onChange: (p: LatLng | null) => void }) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  const [picked, setPicked] = useState<LatLng | null>(value)

  const useGps = async () => {
    setBusy(true)
    setNote(null)
    const pos = await getPosition()
    setBusy(false)
    if (!pos || pos.stale) {
      setNote('Không lấy được GPS. Hãy chọn trên bản đồ.')
      return
    }
    onChange({ lat: pos.lat, lng: pos.lng })
    setNote(
      (pos.accuracy ?? 0) > POOR_ACCURACY_M
        ? `Đã lưu, nhưng sai số khoảng ${pos.accuracy} m. Nên chỉnh lại trên bản đồ.`
        : `Đã lưu (sai số khoảng ${pos.accuracy} m).`,
    )
  }

  return (
    <fieldset>
      <legend>Vị trí nhà (nên có, giúp đội cứu hộ tìm nhanh)</legend>
      {value ? (
        <p className="small ok">
          📍 Đã lưu: {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
        </p>
      ) : (
        <p className="muted small">Chưa lưu. Bấm nút dưới khi bạn đang ở nhà, hoặc chọn trên bản đồ.</p>
      )}
      {note && <p className="muted small">{note}</p>}
      <div className="row wrap">
        <button type="button" className="btn btn-outline btn-small" disabled={busy} onClick={useGps}>
          {busy ? 'Đang lấy GPS…' : '📍 Tôi đang ở nhà — lấy GPS'}
        </button>
        <button
          type="button"
          className="btn btn-outline btn-small"
          onClick={() => {
            setPicked(value)
            setPicking(true)
          }}
        >
          🗺️ Chọn trên bản đồ
        </button>
        {value && (
          <button type="button" className="btn-link" onClick={() => onChange(null)}>
            Xóa
          </button>
        )}
      </div>
      <Sheet open={picking} onClose={() => setPicking(false)} title="Chạm vào nhà bạn">
        <p className="muted small">Phóng to, đổi sang Vệ tinh (góc phải trên) để nhìn nhà, rồi chạm đúng vị trí.</p>
        <LocationPicker value={picked} onPick={setPicked} />
        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={!picked}
          onClick={() => {
            onChange(picked)
            setNote('Đã lưu vị trí chọn trên bản đồ.')
            setPicking(false)
          }}
        >
          Lưu vị trí nhà
        </button>
      </Sheet>
    </fieldset>
  )
}
