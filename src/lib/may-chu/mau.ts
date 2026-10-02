import 'server-only'

import { z } from 'zod'
import { isValidPhone, normalizePhone } from '@/lib/geo'

/** Khuôn kiểm dữ liệu gửi lên (zod). Mọi route đọc body qua các khuôn này — không tin client. */

const chu = (max: number) => z.string().trim().max(max)
const chuHoacRong = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null))

export const sdt = z
  .string()
  .refine(isValidPhone, 'Số điện thoại không hợp lệ')
  .transform(normalizePhone)

const sdtHoacRong = z
  .string()
  .nullish()
  .transform((v) => (v ? v : null))
  .refine((v) => v == null || isValidPhone(v), 'SĐT người thân không hợp lệ')
  .transform((v) => (v ? normalizePhone(v) : null))

const vi = z.number().min(-90).max(90)
const kinh = z.number().min(-180).max(180)
const toaDoHoacRong = z.number().nullable().optional()

export const nhom = z.array(z.enum(['elderly', 'child', 'disabled', 'chronic', 'pregnant'])).max(5)

export const dangKy = z.object({
  full_name: chu(100).min(1, 'Nhập họ tên'),
  phone: sdt,
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự').max(100),
  province: chu(100).min(1),
  ward: chu(100).min(1),
  hamlet: chuHoacRong(100),
  address_detail: chuHoacRong(200),
  household_size: z.number().int().min(1).max(100),
  vulnerable: nhom,
  relative_phone: sdtHoacRong,
  note: chuHoacRong(300),
  home_lat: toaDoHoacRong,
  home_lng: toaDoHoacRong,
  dong_y: z.literal(true, { errorMap: () => ({ message: 'Cần đồng ý cho đội cứu hộ dùng thông tin' }) }),
})

const maMoi = z.string().trim().min(4).max(20)

/** Cứu hộ đăng ký bằng mã mời đội: không cần hồ sơ hộ, không cần ô đồng ý (không khai dữ liệu sức khoẻ). */
export const dangKyCuuHo = z.object({
  full_name: chu(100).min(1, 'Nhập họ tên'),
  phone: sdt,
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự').max(100),
  ma_moi: maMoi,
})

export const dungMaMoi = z.object({ code: maMoi })
export const doiCuaMa = z.object({ team_id: z.string().uuid() })

export const dangNhap =z.object({ phone: z.string().max(30), password: z.string().max(100) })

export const suaHoSo = z
  .object({
    full_name: chu(100).min(1),
    province: chuHoacRong(100),
    ward: chuHoacRong(100),
    hamlet: chuHoacRong(100),
    address_detail: chuHoacRong(200),
    household_size: z.number().int().min(1).max(100),
    vulnerable: nhom,
    relative_phone: sdtHoacRong,
    note: chuHoacRong(300),
    home_lat: toaDoHoacRong,
    home_lng: toaDoHoacRong,
  })
  .partial()

export const sosMoi = z.object({
  lat: vi,
  lng: kinh,
  accuracy: z.number().min(0).max(100000).nullable(),
  battery: z.number().int().min(0).max(100).nullable(),
  people_count: z.number().int().min(1).max(100),
})

export const sosKhach = sosMoi.extend({ name: chu(100).min(1, 'Nhập tên'), phone: sdt })

export const danSuaSos = z
  .object({
    water_level: z.enum(['ankle', 'knee', 'chest', 'roof']).nullable(),
    injured: z.boolean(),
    people_count: z.number().int().min(1).max(100),
    note: chuHoacRong(300),
    lat: vi,
    lng: kinh,
    accuracy: z.number().min(0).max(100000).nullable(),
    battery: z.number().int().min(0).max(100).nullable(),
    status: z.literal('cancelled'),
  })
  .partial()

/** Khách sửa SOS khẩn của mình: như người dân + tự khai người dễ tổn thương. */
export const khachSuaSos = danSuaSos.extend({ vulnerable: nhom.optional() })

const trangThaiSos = z.enum(['waiting', 'assigned', 'on_way', 'arrived', 'rescued', 'cannot_reach', 'cancelled'])

export const nhanVienSuaSos = z
  .object({
    status: trangThaiSos,
    assigned_team_id: z.string().uuid().nullable(),
    accepted_at: z.string().nullable(),
  })
  .partial()

export const doiMoi = z.object({
  name: chu(100).min(1, 'Nhập tên đội'),
  vehicle: chu(50).min(1),
  capacity: z.number().int().min(1).max(500),
  status: z.enum(['ready', 'busy', 'resting', 'out_of_fuel']).default('ready'),
})

export const suaDoi = doiMoi.partial()

export const capQuyen = z.object({
  phone: sdt,
  role: z.enum(['citizen', 'rescuer', 'commander']),
  team_id: z.string().uuid().nullable(),
})

export const khoaTaiKhoan = z.object({ phone: sdt, khoa: z.boolean() })

export const viTriMoi = z.object({ lat: vi, lng: kinh, on_duty: z.boolean() })
