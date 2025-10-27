/**
 * 优化的 Session 管理器 - 改进内存管理和性能
 */

import type {
  SessionActivityCallback,
  SessionConfig,
  SessionState,
  SessionSyncMessage,
  SessionTimeoutCallback,
} from './types'
import { AUTH_DEFAULTS, MEMORY_LIMITS } from '../constants'
import { DisposableManager } from '../utils/DisposableManager'
import { debounce } from '../utils/debounce'

export class OptimizedSessionManager {
  private config: Required<SessionConfig>
  private lastActivity: Date = new Date()
  private createdAt: Date = new Date()
  private active: boolean = true
  private timeoutCallbacks: Set<SessionTimeoutCallback>
  private activityCallbacks: Set<SessionActivityCallback>
  private broadcastChannel?: BroadcastChannel
  private disposables: DisposableManager = new DisposableManager()
  private debouncedRecordActivity: () => void
  private activeTimers = 0

  constructor(config: SessionConfig = {}) {
    this.config = {
      timeout: config.timeout || AUTH_DEFAULTS.SESSION_TIMEOUT,
      monitorActivity: config.monitorActivity !== undefined ? config.monitorActivity : true,
      activityEvents: config.activityEvents || ['mousedown', 'keydown', 'scroll', 'touchstart'],
      enableTabSync: config.enableTabSync !== undefined ? config.enableTabSync : true,
      syncKey: config.syncKey || AUTH_DEFAULTS.SESSION_SYNC_KEY,
      checkOnVisibilityChange: config.checkOnVisibilityChange !== undefined
        ? config.checkOnVisibilityChange
        : true,
    }

    // 限制回调数量
    this.timeoutCallbacks = new Set()
    this.activityCallbacks = new Set()

    // 创建防抖的活动记录函数
    this.debouncedRecordActivity = debounce(
      () => this.recordActivityInternal(),
      AUTH_DEFAULTS.ACTIVITY_DEBOUNCE_DELAY,
    )

    this.init()
  }

  /**
   * 初始化
   */
  private init(): void {
    this.startSessionTimer()

    if (this.config.monitorActivity) {
      this.startActivityMonitoring()
    }

    if (this.config.enableTabSync) {
      this.enableTabSync()
    }

    if (this.config.checkOnVisibilityChange && typeof document !== 'undefined') {
      this.disposables.addEventListener(
        document,
        'visibilitychange',
        this.handleVisibilityChange
      )
    }
  }

  /**
   * 启动 Session 超时定时器
   */
  private startSessionTimer(): void {
    this.activeTimers++
    this.disposables.setTimeout(() => {
      this.activeTimers--
      this.handleSessionTimeout()
    }, this.config.timeout)
  }

  /**
   * 处理 Session 超时
   */
  private handleSessionTimeout(): void {
    this.active = false

    if (this.timeoutCallbacks.size < MEMORY_LIMITS.MAX_LISTENERS_PER_EVENT) {
      this.timeoutCallbacks.forEach((callback) => {
        try {
          callback()
        }
        catch (error) {
          console.error('[SessionManager] Timeout callback error:', error)
        }
      })
    }

    this.broadcastMessage({
      type: 'logout',
      timestamp: Date.now(),
    })
  }

  /**
   * 启动活动监控
   */
  private startActivityMonitoring(): void {
    if (typeof window === 'undefined') {
      return
    }

    this.config.activityEvents.forEach((eventType) => {
      this.disposables.addEventListener(
        window,
        eventType,
        () => this.debouncedRecordActivity(),
        { passive: true }
      )
    })
  }

  /**
   * 记录用户活动
   */
  recordActivity(): void {
    this.debouncedRecordActivity()
  }

  /**
   * 记录用户活动的内部实现
   */
  private recordActivityInternal(): void {
    if (!this.active) {
      return
    }

    this.lastActivity = new Date()
    this.extendSession()

    if (this.activityCallbacks.size < MEMORY_LIMITS.MAX_LISTENERS_PER_EVENT) {
      this.activityCallbacks.forEach((callback) => {
        try {
          callback()
        }
        catch (error) {
          console.error('[SessionManager] Activity callback error:', error)
        }
      })
    }

    this.broadcastMessage({
      type: 'activity',
      timestamp: Date.now(),
    })
  }

  /**
   * 延长 Session
   */
  extendSession(): void {
    if (!this.active) {
      return
    }

    this.startSessionTimer()
  }

  /**
   * 启用多标签页同步
   */
  private enableTabSync(): void {
    if (typeof window === 'undefined') {
      return
    }

    if (typeof BroadcastChannel !== 'undefined') {
      this.broadcastChannel = new BroadcastChannel(this.config.syncKey)

      this.broadcastChannel.onmessage = (event: MessageEvent<SessionSyncMessage>) => {
        this.handleSyncMessage(event.data)
      }

      this.disposables.add(() => {
        this.broadcastChannel?.close()
      })
    }
    else {
      const storageHandler = (event: StorageEvent) => {
        if (event.key === this.config.syncKey && event.newValue) {
          try {
            const message: SessionSyncMessage = JSON.parse(event.newValue)
            this.handleSyncMessage(message)
          }
          catch (error) {
            console.error('[SessionManager] Parse sync message error:', error)
          }
        }
      }

      this.disposables.addEventListener(window, 'storage', storageHandler)
    }
  }

  /**
   * 处理同步消息
   */
  private handleSyncMessage(message: SessionSyncMessage): void {
    switch (message.type) {
      case 'activity':
        this.extendSession()
        break

      case 'logout':
        this.handleSessionTimeout()
        break

      case 'login':
        this.activate()
        break

      case 'refresh':
        this.extendSession()
        break
    }
  }

  /**
   * 广播消息到其他标签页
   */
  private broadcastMessage(message: SessionSyncMessage): void {
    if (typeof window === 'undefined') {
      return
    }

    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage(message)
    }
    else {
      try {
        localStorage.setItem(this.config.syncKey, JSON.stringify(message))
        // 使用 disposables 管理清理
        this.disposables.setTimeout(() => {
          localStorage.removeItem(this.config.syncKey)
        }, 100)
      }
      catch (error) {
        console.error('[SessionManager] Broadcast message error:', error)
      }
    }
  }

  /**
   * 处理页面可见性变化
   */
  private handleVisibilityChange = (): void => {
    if (typeof document === 'undefined') {
      return
    }

    if (document.visibilityState === 'visible') {
      const now = Date.now()
      const elapsed = now - this.lastActivity.getTime()

      if (elapsed > this.config.timeout) {
        this.handleSessionTimeout()
      }
      else {
        this.extendSession()
      }
    }
  }

  /**
   * 激活 Session
   */
  activate(): void {
    this.active = true
    this.createdAt = new Date()
    this.lastActivity = new Date()
    this.startSessionTimer()

    this.broadcastMessage({
      type: 'login',
      timestamp: Date.now(),
    })
  }

  /**
   * 停用 Session
   */
  deactivate(): void {
    this.active = false

    this.broadcastMessage({
      type: 'logout',
      timestamp: Date.now(),
    })
  }

  /**
   * 获取 Session 状态
   */
  getState(): SessionState {
    return {
      active: this.active,
      lastActivity: this.lastActivity,
      createdAt: this.createdAt,
      expiresAt: new Date(this.lastActivity.getTime() + this.config.timeout),
    }
  }

  /**
   * 获取剩余时间
   */
  getRemainingTime(): number {
    if (!this.active) {
      return 0
    }

    const now = Date.now()
    const elapsed = now - this.lastActivity.getTime()
    const remaining = this.config.timeout - elapsed

    return Math.max(0, remaining)
  }

  /**
   * 检查是否过期
   */
  isExpired(): boolean {
    return !this.active || this.getRemainingTime() === 0
  }

  /**
   * 监听 Session 超时事件
   */
  onTimeout(callback: SessionTimeoutCallback): () => void {
    if (this.timeoutCallbacks.size >= MEMORY_LIMITS.MAX_LISTENERS_PER_EVENT) {
      console.warn(`[SessionManager] Timeout callback limit (${MEMORY_LIMITS.MAX_LISTENERS_PER_EVENT}) reached`)
      return () => { }
    }

    this.timeoutCallbacks.add(callback)
    return () => {
      this.timeoutCallbacks.delete(callback)
    }
  }

  /**
   * 监听用户活动事件
   */
  onActivity(callback: SessionActivityCallback): () => void {
    if (this.activityCallbacks.size >= MEMORY_LIMITS.MAX_LISTENERS_PER_EVENT) {
      console.warn(`[SessionManager] Activity callback limit (${MEMORY_LIMITS.MAX_LISTENERS_PER_EVENT}) reached`)
      return () => { }
    }

    this.activityCallbacks.add(callback)
    return () => {
      this.activityCallbacks.delete(callback)
    }
  }

  /**
   * 获取活动定时器数量
   */
  getActiveTimersCount(): number {
    return this.activeTimers
  }

  /**
   * 销毁 Session 管理器
   */
  destroy(): void {
    this.disposables.dispose()
    this.broadcastChannel = undefined
    this.timeoutCallbacks.clear()
    this.activityCallbacks.clear()
  }
}

/**
 * 创建优化的 Session 管理器
 */
export function createOptimizedSessionManager(config?: SessionConfig): OptimizedSessionManager {
  return new OptimizedSessionManager(config)
}
