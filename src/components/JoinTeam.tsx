import { useState, type FormEvent } from 'react'
import { backend } from '../lib/backend'
import { ErrorLine } from './common'

/** Người đã có tài khoản nhập mã mời đội → thành cứu hộ của đội đó (app tự chuyển sang màn cứu hộ). */
export function JoinTeam({ initialCode = '' }: { initialCode?: string }) {
  const [code, setCode] = useState(initialCode)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await backend.joinTeam(code)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <p className="muted small">Nhập mã mời do chỉ huy gửi cho đội. Vào đội xong, app chuyển sang màn hình cứu hộ.</p>
      <label>
        Mã mời đội
        <input className="code-input" required autoCapitalize="characters" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
      </label>
      <ErrorLine error={error} />
      <button className="btn btn-primary btn-block" disabled={busy}>
        {busy ? 'Đang vào đội…' : '🚤 Vào đội cứu hộ'}
      </button>
    </form>
  )
}
