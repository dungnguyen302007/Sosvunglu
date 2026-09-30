import { createDemoBackend } from './demo'
import { createSupabaseBackend } from './supabase'
import type { Backend } from './types'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

/** Có cấu hình Supabase thì dùng thật, chưa có thì chạy bản demo lưu trên máy. */
export const backend: Backend = url && key ? createSupabaseBackend(url, key) : createDemoBackend()

export type { Backend } from './types'
