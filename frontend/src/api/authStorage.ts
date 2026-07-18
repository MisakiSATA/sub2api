const AUTH_TOKEN_KEY = 'auth_token'
const AUTH_USER_KEY = 'auth_user'
const REFRESH_TOKEN_KEY = 'refresh_token'
const TOKEN_EXPIRES_AT_KEY = 'token_expires_at'

let memoryRefreshToken: string | null = null

export function isMemoryRefreshTokenStorage(): boolean {
  return import.meta.env.VITE_AUTH_REFRESH_TOKEN_STORAGE === 'memory'
}

export function setAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export function setAuthUser(user: unknown): void {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
}

export function getAuthUser(): string | null {
  return localStorage.getItem(AUTH_USER_KEY)
}

export function setRefreshToken(token: string): void {
  if (isMemoryRefreshTokenStorage()) {
    memoryRefreshToken = token
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    return
  }

  memoryRefreshToken = null
  localStorage.setItem(REFRESH_TOKEN_KEY, token)
}

export function getRefreshToken(): string | null {
  if (isMemoryRefreshTokenStorage()) {
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    return memoryRefreshToken
  }

  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setTokenExpiresAt(expiresIn: number): void {
  localStorage.setItem(TOKEN_EXPIRES_AT_KEY, String(Date.now() + expiresIn * 1000))
}

export function setTokenExpiresAtTimestamp(expiresAt: number): void {
  localStorage.setItem(TOKEN_EXPIRES_AT_KEY, String(expiresAt))
}

export function getTokenExpiresAt(): number | null {
  const value = localStorage.getItem(TOKEN_EXPIRES_AT_KEY)
  return value ? parseInt(value, 10) : null
}

export function clearAuthStorage(): void {
  memoryRefreshToken = null
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_USER_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(TOKEN_EXPIRES_AT_KEY)
}
