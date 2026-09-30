import { beforeEach, describe, expect, it } from 'vitest'
import { createDemoBackend } from './demo'

const pos = { lat: 16.46, lng: 107.59, accuracy: 10, battery: 40, people_count: 2 }

describe('backend demo', () => {
  beforeEach(() => localStorage.clear())

  it('đăng ký → đăng nhập → gửi SOS, không tạo trùng SOS đang mở', async () => {
    const b = createDemoBackend()
    await b.signUp({
      full_name: 'Test',
      phone: '+84 912 000 111',
      password: 'abcdef',
      province: 'Huế',
      ward: 'X',
      hamlet: '',
      address_detail: '',
      household_size: 3,
      vulnerable: ['elderly'],
      relative_phone: '',
      note: '',
    })
    const me = await b.getProfile()
    expect(me?.phone).toBe('0912000111')
    expect(me?.role).toBe('citizen')
    const s1 = await b.createSos(pos)
    const s2 = await b.createSos(pos)
    expect(s2.id).toBe(s1.id)
    await b.updateMySos(s1.id, { status: 'cancelled' })
    expect(await b.myOpenSos()).toBeNull()
  })

  it('người dân không được đổi trạng thái SOS kiểu cứu hộ, không được cấp quyền', async () => {
    const b = createDemoBackend()
    await b.signIn('0900000003', '123456')
    await expect(b.updateSos('sos-seed-1', { status: 'rescued' })).rejects.toThrow()
    await expect(b.setUserRole('0900000003', 'commander', null)).rejects.toThrow()
  })

  it('cứu hộ chỉ thấy SOS đang mở, chỉ huy thấy tất cả', async () => {
    const b = createDemoBackend()
    await b.signIn('0900000001', '123456')
    await b.updateSos('sos-seed-2', { status: 'rescued' })
    expect((await b.listSos()).length).toBe(2)
    await b.signOut()
    await b.signIn('0900000002', '123456')
    const list = await b.listSos()
    expect(list.map((s) => s.id)).toEqual(['sos-seed-1'])
  })

  it('chỉ huy cấp quyền cứu hộ theo SĐT', async () => {
    const b = createDemoBackend()
    await b.signIn('0900000001', '123456')
    await b.setUserRole('0900000003', 'rescuer', 'team-1')
    await b.signOut()
    await b.signIn('0900000003', '123456')
    expect((await b.getProfile())?.role).toBe('rescuer')
  })

  it('SOS khách: tạo và xem trạng thái', async () => {
    const b = createDemoBackend()
    const id = await b.createGuestSos({ ...pos, name: 'Khách', phone: '0987000000' })
    expect((await b.guestSosStatus(id))?.status).toBe('waiting')
  })

  it('sai mật khẩu thì báo lỗi', async () => {
    const b = createDemoBackend()
    await expect(b.signIn('0900000001', 'sai')).rejects.toThrow('Sai số điện thoại hoặc mật khẩu')
  })
})
