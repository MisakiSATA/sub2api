import { afterEach, describe, expect, it, vi } from 'vitest'

describe('authStorage', () => {
  afterEach(() => {
    localStorage.clear()
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('memory refresh token mode removes a stale localStorage refresh token when read', async () => {
    localStorage.setItem('refresh_token', 'stale-local-refresh-token')
    vi.stubEnv('VITE_AUTH_REFRESH_TOKEN_STORAGE', 'memory')
    const storage = await import('@/api/authStorage')

    expect(storage.getRefreshToken()).toBeNull()
    expect(localStorage.getItem('refresh_token')).toBeNull()
  })
})
