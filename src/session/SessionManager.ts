/**
 * Session 管理器
 *
 * 负责 Session 的超时管理、活动监控和多标签页同步
 */

import type {
  SessionActivityCallback,
  SessionConfig,
  SessionState,
  SessionSyncMessage,
  SessionTimeoutCallback,
} from './types'
import { AUTH_DEFAULTS } from '../constants'
import { DisposableManager } from '../utils/DisposableManager'
import { debounce } from '../utils/debounce'

/**
 * Session 管理器类
 */
export class SessionManager {
  private config: Required<SessionConfig>
  private sessionTimer?: NodeJS.Timeout
  private activityTimer?: NodeJS.Timeout
  private lastActivity: Date = new Date()
  private createdAt: Date = new Date()
  private active: boolean = true
  private timeoutCallbacks: Set<SessionTimeoutCallback> = new Set()
  private activityCallbacks: Set<SessionActivityCallback> = new Set()
  private activityHandlers: Map<string, EventListener> = new Map()
  private broadcastChannel?: BroadcastChannel
  private storageHandler?: (e: StorageEvent) => void
  private disposables: DisposableManager = new DisposableManager()
  private debouncedRecordActivity: () => void

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

    // 创建防抖的活动记录函数
    this.debouncedRecordActivity = debounce(
      () => this.recordActivityInternal(),
      AUTH_DEFAULTS.ACTIVITY_DEBOUNCE_DELAY,
    )

    this.init()
  }

  /**
   * 初始化 Session 管理器
   * @private
   */
  private init(): void {
    // 启动 Session 超时定时器
    this.startSessionTimer()

    // 启动活动监控
    if (this.config.monitorActivity) {
      this.startActivityMonitoring()
    }

    // 启用多标签页同步
    if (this.config.enableTabSync) {
      this.enableTabSync()
    }

    // 监听页面可见性变化
    if (this.config.checkOnVisibilityChange && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange)
      // 添加到资源管理器
      this.disposables.add(() => {
        document.removeEventListener('visibilitychange', this.handleVisibilityChange)
      })
    }
  }

  /**
   * 启动 Session 超时定时器
   * @private
   */
  private startSessionTimer(): void {
    this.stopSessionTimer()

    this.sessionTimer = setTimeout(() => {
      this.handleSessionTimeout()
    }, this.config.timeout)
  }

  /**
   * 停止 Session 超时定时器
   * @private
   */
  private stopSessionTimer(): void {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer)
      this.sessionTimer = undefined
    }
  }

  /**
   * 处理 Session 超时
   * @private
   */
  private handleSessionTimeout(): void {
    this.active = false

    // 触发超时回调
    this.timeoutCallbacks.forEach((callback) => {
      try {
        callback()
      }
      catch (error) {
        console.error('[SessionManager] Timeout callback error:', error)
      }
    })

    // 通知其他标签页
    this.broadcastMessage({
      type: 'logout',
      timestamp: Date.now(),
    })
  }

  /**
   * 启动活动监控
   * @private
   */
  private startActivityMonitoring(): void {
    if (typeof window === 'undefined') {
      return
    }

    this.config.activityEvents.forEach((eventType) => {
      const handler = () => {
        // 使用防抖函数，避免频繁触发
        this.debouncedRecordActivity()
      }

      window.addEventListener(eventType, handler, { passive: true })
      this.activityHandlers.set(eventType, handler)

      // 添加到资源管理器
      this.disposables.add(() => {
        window.removeEventListener(eventType, handler)
      })
    })
  }

  /**
   * 停止活动监控
   * @private
   */
  private stopActivityMonitoring(): void {
    // 不需要手动清理，DisposableManager 会处理
    this.activityHandlers.clear()
  }

  /**
   * 记录用户活动（公共接口，使用防抖）
   *
   * @example
   * ```typescript
   * const sessionManager = new SessionManager()
   * sessionManager.recordActivity() // 记录活动并延长 Session
   * ```
   */
  recordActivity(): void {
    this.debouncedRecordActivity()
  }

  /**
   * 记录用户活动的内部实现
   * @private
   */
  private recordActivityInternal(): void {
    if (!this.active) {
      return
    }

    this.lastActivity = new Date()

    // 延长 Session
    this.extendSession()

    // 触发活动回调
    this.activityCallbacks.forEach((callback) => {
      try {
        callback()
      }
      catch (error) {
        console.error('[SessionManager] Activity callback error:', error)
      }
    })

    // 通知其他标签页
    this.broadcastMessage({
      type: 'activity',
      timestamp: Date.now(),
    })
  }

  /**
   * 延长 Session
   *
   * 重置超时定时器
   *
   * @example
   * ```typescript
   * const sessionManager = new SessionManager()
   * sessionManager.extendSession()
   * ```
   */
  extendSession(): void {
    if (!this.active) {
      return
    }

    this.startSessionTimer()
  }

  /**
   * 启用多标签页同步
   * @private
   */
  private enableTabSync(): void {
    if (typeof window === 'undefined') {
      return
    }

    // 优先使用 BroadcastChannel
    if (typeof BroadcastChannel !== 'undefined') {
      this.broadcastChannel = new BroadcastChannel(this.config.syncKey)

      this.broadcastChannel.onmessage = (event: MessageEvent<SessionSyncMessage>) => {
        this.handleSyncMessage(event.data)
      }

      // 添加到资源管理器
      this.disposables.add(() => {
        this.broadcastChannel?.close()
      })
    }
    // 降级使用 localStorage 事件
    else {
      this.storageHandler = (event: StorageEvent) => {
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

      window.addEventListener('storage', this.storageHandler)

      // 添加到资源管理器
      this.disposables.add(() => {
        if (this.storageHandler && typeof window !== 'undefined') {
          window.removeEventListener('storage', this.storageHandler)
        }
      })
    }
  }

  /**
   * 处理同步消息
   * @private
   */
  private handleSyncMessage(message: SessionSyncMessage): void {
    switch (message.type) {
      case 'activity':
        // 其他标签页有活动，延长本标签页的 Session
        this.extendSession()
        break

      case 'logout':
        // 其他标签页登出，本标签页也登出
        this.handleSessionTimeout()
        break

      case 'login':
        // 其他标签页登录，重新激活 Session
        this.activate()
        break

      case 'refresh':
        // 其他标签页刷新了 Token，延长 Session
        this.extendSession()
        break
    }
  }

  /**
   * 广播消息到其他标签页
   * @private
   */
  private broadcastMessage(message: SessionSyncMessage): void {
    if (typeof window === 'undefined') {
      return
    }

    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage(message)
    }
    else {
      // 使用 localStorage
      try {
        localStorage.setItem(this.config.syncKey, JSON.stringify(message))
        // 立即删除，避免影响下次同步
        localStorage.removeItem(this.config.syncKey)
      }
      catch (error) {
        console.error('[SessionManager] Broadcast message error:', error)
      }
    }
  }

  /**
   * 处理页面可见性变化
   * @private
   */
  private handleVisibilityChange = (): void => {
    if (typeof document === 'undefined') {
      return
    }

    if (document.visibilityState === 'visible') {
      // 页面可见时，检查 Session 是否过期
      const now = Date.now()
      const elapsed = now - this.lastActivity.getTime()

      if (elapsed > this.config.timeout) {
        // Session 已过期
        this.handleSessionTimeout()
      }
      else {
        // Session 仍有效，延长
        this.extendSession()
      }
    }
  }

  /**
   * 激活 Session
   *
   * @example
   * ```typescript
   * const sessionManager = new SessionManager()
   * sessionManager.activate()
   * ```
   */
  activate(): void {
    this.active = true
    this.createdAt = new Date()
    this.lastActivity = new Date()
    this.startSessionTimer()

    // 通知其他标签页
    this.broadcastMessage({
      type: 'login',
      timestamp: Date.now(),
    })
  }

  /**
   * 停用 Session
   *
   * @example
   * ```typescript
   * const sessionManager = new SessionManager()
   * sessionManager.deactivate()
   * ```
   */
  deactivate(): void {
    this.active = false
    this.stopSessionTimer()

    // 通知其他标签页
    this.broadcastMessage({
      type: 'logout',
      timestamp: Date.now(),
    })
  }

  /**
   * 获取 Session 状态
   *
   * @returns Session 状态
   *
   * @example
   * ```typescript
   * const sessionManager = new SessionManager()
   * const state = sessionManager.getState()
   * console.log('Session active:', state.active)
   * console.log('Expires at:', state.expiresAt)
   * ```
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
   * 获取剩余时间（毫秒）
   *
   * @returns 剩余毫秒数
   *
   * @example
   * ```typescript
   * const sessionManager = new SessionManager()
   * const remaining = sessionManager.getRemainingTime()
   * console.log(`Session 剩余 ${Math.floor(remaining / 1000)} 秒`)
   * ```
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
   * 检查 Session 是否过期
   *
   * @returns 是否过期
   */
  isExpired(): boolean {
    return !this.active || this.getRemainingTime() === 0
  }

  /**
   * 监听 Session 超时事件
   *
   * @param callback - 超时回调
   * @returns 取消监听的函数
   *
   * @example
   * ```typescript
   * const sessionManager = new SessionManager()
   * const unsubscribe = sessionManager.onTimeout(() => {
   *   console.log('Session 超时，请重新登录')
   * })
   * ```
   */
  onTimeout(callback: SessionTimeoutCallback): () => void {
    this.timeoutCallbacks.add(callback)
    return () => {
      this.timeoutCallbacks.delete(callback)
    }
  }

  /**
   * 监听用户活动事件
   *
   * @param callback - 活动回调
   * @returns 取消监听的函数
   *
   * @example
   * ```typescript
   * const sessionManager = new SessionManager()
   * const unsubscribe = sessionManager.onActivity(() => {
   *   console.log('用户有活动')
   * })
   * ```
   */
  onActivity(callback: SessionActivityCallback): () => void {
    this.activityCallbacks.add(callback)
    return () => {
      this.activityCallbacks.delete(callback)
    }
  }

  /**
   * 销毁 Session 管理器
   *
   * 清理所有资源和监听器
   */
  destroy(): void {
    this.stopSessionTimer()
    this.stopActivityMonitoring()

    // 使用 DisposableManager 统一清理所有资源
    this.disposables.dispose()

    // 清空引用
    this.broadcastChannel = undefined
    this.storageHandler = undefined

    this.timeoutCallbacks.clear()
    this.activityCallbacks.clear()
  }
}

/**
 * 创建 Session 管理器
 *
 * @param config - Session 配置
 * @returns Session 管理器实例
 *
 * @example
 * ```typescript
 * import { createSessionManager } from '@ldesign/auth/session'
 *
 * const sessionManager = createSessionManager({
 *   timeout: 30 * 60 * 1000, // 30分钟
 *   monitorActivity: true,
 *   enableTabSync: true,
 * })
 *
 * // 监听超时
 * sessionManager.onTimeout(() => {
 *   console.log('Session 超时')
 * })
 *
 * // 激活 Session
 * sessionManager.activate()
 * ```
 */
export function createSessionManager(config?: SessionConfig): SessionManager {
  return new SessionManager(config)
}


