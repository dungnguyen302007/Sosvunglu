import { huongDanMoQuyenViTri } from '../lib/device'

/**
 * Hướng dẫn MỞ LẠI quyền vị trí khi trình duyệt đã ghi "từ chối" (mã lỗi 1). Lúc đó trình duyệt không
 * hỏi lại nữa, app không tự gỡ được — người dùng phải mở tay một lần. Các bước theo loại máy.
 */
export function GpsHelp({ onRetry }: { onRetry: () => void }) {
  const hd = huongDanMoQuyenViTri()
  return (
    <div className="card card-warn gps-help">
      <h3>📍 Máy đang chặn quyền vị trí</h3>
      <p className="small">Chưa có vị trí thì không ai biết bạn đang ở đâu. Làm theo các bước ({hd.may}):</p>
      <ol>
        {hd.buoc.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ol>
      <button type="button" className="btn btn-primary btn-block" onClick={onRetry}>
        ✅ Tôi đã mở quyền — thử lại
      </button>
    </div>
  )
}
