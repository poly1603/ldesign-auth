/**
 * 认证流程集成测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthManager } from '../../src/core/AuthManager'
import type { HttpClient } from '@ldesign/http'

describe('Auth Flow Integration', () => {
  let authManager: AuthManager
  let mockHttpClient: HttpClient

  beforeEach(() => {
    // 模拟 HTTP 客户端
    mockHttpClient = {
      post: vi.fn(),
      get: vi.fn(),
    } as any

    authManager = new AuthManager({}, mockHttpClient)
  })

  it('should complete login flow', async () => {
    // 模拟登录响应
    vi.mocked(mockHttpClient.post).mockResolvedValueOnce({
      user: { id: 1, username: 'testuser', email: 'test@example.com' },
      token: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjo5OTk5OTk5OTk5fQ.sig',
        refreshToken: 'refresh_token',
        expiresIn: 3600,
      },
    })

    await authManager.login({
      username: 'testuser',
      password: 'password',
    })

    expect(authManager.isAuthenticated()).toBe(true)
    expect(authManager.getUser()).not.toBeNull()
    expect(authManager.getAccessToken()).toBeDefined()
  })

  it('should handle login failure', async () => {
    vi.mocked(mockHttpClient.post).mockRejectedValueOnce(new Error('Invalid credentials'))

    await expect(authManager.login({
      username: 'wrong',
      password: 'wrong',
    })).rejects.toThrow()

    expect(authManager.isAuthenticated()).toBe(false)
  })

  it('should complete logout flow', async () => {
    // 先登录
    vi.mocked(mockHttpClient.post).mockResolvedValueOnce({
      user: { id: 1, username: 'testuser' },
      token: {
        accessToken: 'token',
        expiresIn: 3600,
      },
    })

    await authManager.login({ username: 'user', password: 'pass' })

    // 然后登出
    await authManager.logout()

    expect(authManager.isAuthenticated()).toBe(false)
    expect(authManager.getUser()).toBeNull()
    expect(authManager.getAccessToken()).toBeNull()
  })
})

