import { beforeEach, describe, expect, it } from 'vitest'
import { clearPending, enqueue, flush, getPending, smsBody } from './queue'

const input = { lat: 16.46371, lng: 107.59091, accuracy: 20, battery: 50, people_count: 3 }

describe('hàng đợi SOS', () => {
  beforeEach(() => clearPending())

  it('gửi thành công thì xóa khỏi hàng đợi', async () => {
    enqueue({ kind: 'user', input })
    const r = await flush(async () => 'ok')
    expect(r).toBe('ok')
    expect(getPending()).toBeNull()
  })

  it('lỗi mạng thì giữ lại và tăng số lần thử', async () => {
    enqueue({ kind: 'user', input })
    const r = await flush(async () => {
      throw new TypeError('Failed to fetch')
    })
    expect(r).toBeNull()
    expect(getPending()?.attempts).toBe(1)
  })

  it('lỗi dữ liệu thì báo lỗi nhưng vẫn giữ SOS', async () => {
    enqueue({ kind: 'user', input })
    await expect(
      flush(async () => {
        throw new Error('permission denied')
      }),
    ).rejects.toThrow('permission denied')
    expect(getPending()).not.toBeNull()
  })

  it('không có gì để gửi thì trả null', async () => {
    expect(await flush(async () => 'x')).toBeNull()
  })
})

describe('smsBody', () => {
  it('bỏ dấu và vừa một tin nhắn', () => {
    const body = smsBody({ name: 'Nguyễn Thị Đào', phone: '0912345678', lat: input.lat, lng: input.lng, people: 3 })
    expect(body).toContain('Nguyen Thi Dao')
    expect(body).toContain('16.46371,107.59091')
    expect(body.length).toBeLessThanOrEqual(160)
    expect(/^[\x20-\x7e]+$/.test(body)).toBe(true)
  })
})
