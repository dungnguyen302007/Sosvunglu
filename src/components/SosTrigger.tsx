import { useState } from 'react'
import { getBattery, getPosition, POOR_ACCURACY_M, type Position } from '../lib/device'
import type { LatLng } from '../lib/geo'
import type { NewSos } from '../types'
import { Sheet } from './common'
import { SosButton } from './SosButton'
import { LocationPicker } from './SosMap'

/**
 * Nút SOS + lấy vị trí. Không có GPS thì dùng vị trí cuối cùng;
 * không có cả hai thì cho chạm chọn trên bản đồ.
 */
export function SosTrigger({ peopleCount, onReady, disabled }: { peopleCount: number; onReady: (input: NewSos) => void; disabled?: boolean }) {
  const [busy, setBusy] = useState(false)
  const [picking, setPicking] = useState(false)
  const [picked, setPicked] = useState<LatLng | null>(null)
  const [battery, setBattery] = useState<number | null>(null)
  const [staleNote, setStaleNote] = useState<string | null>(null)

  const finish = (pos: Pick<Position, 'lat' | 'lng' | 'accuracy'>, bat: number | null) => {
    onReady({ lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy, battery: bat, people_count: peopleCount })
  }

  const trigger = async () => {
    setBusy(true)
    const [pos, bat] = await Promise.all([getPosition(), getBattery()])
    setBusy(false)
    setBattery(bat)
    if (pos) {
      if (pos.stale) setStaleNote('Không bắt được GPS lúc này — đã gửi vị trí gần nhất máy ghi nhận. Sau khi gửi, hãy kiểm tra và chỉnh lại vị trí.')
      else if ((pos.accuracy ?? 0) > POOR_ACCURACY_M) setStaleNote(`Vị trí có thể lệch khoảng ${pos.accuracy} m. Sau khi gửi, hãy kiểm tra và chỉnh lại vị trí trên bản đồ.`)
      finish(pos, bat)
    } else {
      setPicking(true)
    }
  }

  return (
    <>
      <SosButton onTrigger={trigger} disabled={disabled || busy} label={busy ? '…' : 'SOS'} />
      {busy && <p className="center muted">Đang lấy vị trí GPS…</p>}
      {staleNote && <p className="center muted">{staleNote}</p>}
      <Sheet open={picking} onClose={() => setPicking(false)} title="Không lấy được GPS">
        <p>Chạm lên bản đồ vào chỗ bạn đang ở, rồi bấm Gửi.</p>
        <LocationPicker value={picked} onPick={setPicked} />
        <button
          className="btn btn-danger btn-block"
          disabled={!picked}
          onClick={() => {
            if (!picked) return
            setPicking(false)
            finish({ ...picked, accuracy: null }, battery)
          }}
        >
          Gửi SOS tại vị trí này
        </button>
      </Sheet>
    </>
  )
}
