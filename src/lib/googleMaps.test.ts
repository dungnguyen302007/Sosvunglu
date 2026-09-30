import { describe, expect, it } from 'vitest'
import { loadGoogleMaps } from './googleMaps'

describe('loadGoogleMaps', () => {
  it('không có khóa thì không tải gì và trả về false', async () => {
    expect(await loadGoogleMaps(undefined)).toBe(false)
    expect(await loadGoogleMaps('')).toBe(false)
  })
})
