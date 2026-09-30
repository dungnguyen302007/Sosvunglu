import { useEffect, useRef, useState } from 'react'
import { vibrate } from '../lib/device'

const HOLD_MS = 2000

interface Props {
  onTrigger: () => void
  disabled?: boolean
  label?: string
}

/** Nút SOS tròn đỏ nhấp nháy. Nhấn giữ 2 giây để gửi (tránh bấm nhầm trong túi). */
export function SosButton({ onTrigger, disabled, label = 'SOS' }: Props) {
  const [holding, setHolding] = useState(false)
  const timer = useRef<number | null>(null)

  const cancel = () => {
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = null
    setHolding(false)
  }

  const start = () => {
    if (disabled || timer.current) return
    setHolding(true)
    vibrate(40)
    timer.current = window.setTimeout(() => {
      timer.current = null
      setHolding(false)
      vibrate([200, 100, 200])
      onTrigger()
    }, HOLD_MS)
  }

  useEffect(() => cancel, [])

  return (
    <div className="sos-wrap">
      <button
        type="button"
        className={`sos-btn${holding ? ' holding' : ''}`}
        disabled={disabled}
        aria-label="Nhấn giữ 2 giây để gửi SOS"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture?.(e.pointerId)
          start()
        }}
        onPointerUp={cancel}
        onPointerCancel={cancel}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
            e.preventDefault()
            start()
          }
        }}
        onKeyUp={cancel}
      >
        <svg className="sos-ring" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="47" />
        </svg>
        <span className="sos-text">{label}</span>
      </button>
      <p className="sos-hint">{holding ? 'Giữ tiếp…' : 'Nhấn giữ 2 giây để gọi cứu hộ'}</p>
    </div>
  )
}
