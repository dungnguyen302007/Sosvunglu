import { useEffect, useState } from 'react'
import { batThongBaoDay, trangThaiDay, type TrangThaiDay } from '../lib/thong-bao'

/**
 * Nút bật THÔNG BÁO ĐẨY cho cứu hộ / chỉ huy: máy kêu khi có SOS kể cả lúc tắt màn hình.
 * Đã có quyền thì tự làm mới đăng ký mỗi lần mở app, không hiện gì.
 */
export function PushButton() {
  const [tt, setTt] = useState<TrangThaiDay>(() => trangThaiDay())
  const [loi, setLoi] = useState<string | null>(null)

  useEffect(() => {
    if (tt === 'bat') void batThongBaoDay().catch(() => {})
    // chỉ chạy một lần lúc mở màn
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const bat = async () => {
    setLoi(null)
    try {
      setTt(await batThongBaoDay())
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e))
    }
  }

  if (tt === 'bat' || tt === 'chua-cau-hinh') return loi ? <p className="error small">{loi}</p> : null
  if (tt === 'hoi')
    return (
      <>
        <button className="btn btn-outline btn-small" onClick={() => void bat()}>
          🔔 Bật thông báo: máy kêu khi có SOS, kể cả lúc tắt màn hình
        </button>
        {loi && <p className="error small">{loi}</p>}
      </>
    )
  return (
    <p className="muted small">
      {tt === 'ios-chua-cai' &&
        '🔔 iPhone: muốn máy kêu khi có SOS lúc tắt màn hình, bấm nút Chia sẻ → "Thêm vào MH chính", rồi mở app từ biểu tượng đó và bật thông báo.'}
      {tt === 'tu-choi' && '🔕 Thông báo đang bị chặn trên máy này. Mở quyền Thông báo cho trang trong cài đặt trình duyệt để máy kêu khi có SOS.'}
      {tt === 'khong-ho-tro' && '🔕 Trình duyệt này không nhận được thông báo khi tắt màn hình. Giữ màn hình sáng khi trong ca.'}
    </p>
  )
}
