/**
 * AuthManager 单元测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthManager } from '../../src/core/AuthManager'

describe('AuthManager', () => {
  let authManager: AuthManager

  beforeEach(() => {
    authManager = new AuthManager({})
  })

  it('should initialize with default state', () => {
    const state = authManager.getState()

    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
    expect(state.loading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('should check authentication status', () => {
    expect(authManager.isAuthenticated()).toBe(false)
  })

  it('should get null user when not authenticated', () => {
    expect(authManager.getUser()).toBeNull()
  })

  it('should get null token when not authenticated', () => {
    expect(authManager.getAccessToken()).toBeNull()
  })

  it('should subscribe to state changes', () => {
    const listener = vi.fn()
    const unsubscribe = authManager.subscribe(listener)

    expect(typeof unsubscribe).toBe('function')
    unsubscribe()
  })

  it('should get event emitter', () => {
    const events = authManager.getEvents()
    expect(events).toBeDefined()
    expect(typeof events.on).toBe('function')
  })

  it('should get session manager', () => {
    const sessionManager = authManager.getSessionManager()
    expect(sessionManager).toBeDefined()
  })

  it('should get token manager', () => {
    const tokenManager = authManager.getTokenManager()
    expect(tokenManager).toBeDefined()
  })

  it('should set endpoints', () => {
    authManager.setEndpoints({
      login: '/api/v2/login',
      logout: '/api/v2/logout',
    })

    // 端点已更新（内部状态）
    expect(() => authManager.setEndpoints({})).not.toThrow()
  })
})

