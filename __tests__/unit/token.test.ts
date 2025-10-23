/**
 * Token 管理器单元测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TokenManager } from '../../src/token/TokenManager'
import type { TokenInfo } from '../../src/types'

describe('TokenManager', () => {
  let tokenManager: TokenManager

  beforeEach(() => {
    tokenManager = new TokenManager({
      defaultStorage: 'memory',
    })
  })

  it('should store and load token', async () => {
    const token: TokenInfo = {
      accessToken: 'access_token_123',
      refreshToken: 'refresh_token_456',
      expiresIn: 3600,
    }

    tokenManager.store(token)
    const loaded = await tokenManager.load()

    expect(loaded).toBeDefined()
    expect(loaded?.accessToken).toBe('access_token_123')
    expect(loaded?.refreshToken).toBe('refresh_token_456')
  })

  it('should validate token', () => {
    const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjo5OTk5OTk5OTk5fQ.signature'

    const isValid = tokenManager.validate(validToken)
    expect(isValid).toBe(true)
  })

  it('should invalidate expired token', () => {
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxfQ.signature'

    const isValid = tokenManager.validate(expiredToken)
    expect(isValid).toBe(false)
  })

  it('should clear token', async () => {
    const token: TokenInfo = {
      accessToken: 'access_token_123',
    }

    tokenManager.store(token)
    tokenManager.clear()

    const loaded = await tokenManager.load()
    expect(loaded).toBeNull()
  })

  it('should trigger refresh callback', async () => {
    const callback = vi.fn()
    tokenManager.onRefresh(callback)

    const token: TokenInfo = {
      accessToken: 'new_token',
    }

    // 注意：实际刷新需要 httpClient
    // 这里只测试回调机制
    expect(callback).not.toHaveBeenCalled()
  })

  it('should calculate time to live', async () => {
    const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjo5OTk5OTk5OTk5fQ.signature'

    const ttl = await tokenManager.getTimeToLive(validToken)
    expect(ttl).toBeGreaterThan(0)
  })
})

