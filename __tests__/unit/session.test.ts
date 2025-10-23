/**
 * Session 管理器单元测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SessionManager } from '../../src/session/SessionManager'

describe('SessionManager', () => {
  let sessionManager: SessionManager

  beforeEach(() => {
    sessionManager = new SessionManager({
      timeout: 5000, // 5秒（测试用）
      monitorActivity: false,
      enableTabSync: false,
    })
  })

  it('should initialize with inactive state', () => {
    const state = sessionManager.getState()
    expect(state.active).toBe(true) // 初始化时是 active 的
  })

  it('should activate session', () => {
    sessionManager.activate()
    const state = sessionManager.getState()

    expect(state.active).toBe(true)
    expect(state.createdAt).toBeInstanceOf(Date)
  })

  it('should deactivate session', () => {
    sessionManager.activate()
    sessionManager.deactivate()

    const state = sessionManager.getState()
    expect(state.active).toBe(false)
  })

  it('should extend session', () => {
    sessionManager.activate()
    const beforeExtend = sessionManager.getRemainingTime()

    sessionManager.extendSession()
    const afterExtend = sessionManager.getRemainingTime()

    // 延长后剩余时间应该更长或相等
    expect(afterExtend).toBeGreaterThanOrEqual(beforeExtend - 100) // 允许一些误差
  })

  it('should calculate remaining time', () => {
    sessionManager.activate()
    const remaining = sessionManager.getRemainingTime()

    expect(remaining).toBeGreaterThan(0)
    expect(remaining).toBeLessThanOrEqual(5000)
  })

  it('should not be expired initially', () => {
    sessionManager.activate()
    expect(sessionManager.isExpired()).toBe(false)
  })

  it('should call timeout callback', async () => {
    const callback = vi.fn()
    sessionManager.onTimeout(callback)

    // 等待超时（5秒 + 一点缓冲）
    await new Promise(resolve => setTimeout(resolve, 5100))

    expect(callback).toHaveBeenCalled()
  })

  it('should call activity callback', () => {
    const callback = vi.fn()
    sessionManager.onActivity(callback)

    sessionManager.recordActivity()

    expect(callback).toHaveBeenCalled()
  })

  it('should unsubscribe from timeout', () => {
    const callback = vi.fn()
    const unsubscribe = sessionManager.onTimeout(callback)

    unsubscribe()

    // 回调应该不会被调用
    expect(callback).not.toHaveBeenCalled()
  })
})

