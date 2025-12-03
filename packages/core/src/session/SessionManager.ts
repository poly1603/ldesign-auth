/**
 * 会话管理器
 *
 * 负责管理用户会话状态、会话过期检测和自动续期
 *
 * @module @ldesign/auth-core/session
 * @author LDesign Team
 */

import type { DeviceInfo, SessionInfo } from '../types'
import { SessionStatus } from '../types'

/**
 * 会话配置选项
 */
export interface SessionOptions {
  /** 会话超时时间（毫秒），默认 30 分钟 */
  timeout?: number
  /** 是否自动续期，默认 true */
  autoRenew?: boolean
  /** 活动检测间隔（毫秒），默认 1 分钟 */
  activityCheckInterval?: number
  /** 存储键名 */
  storageKey?: string
}

/**
 * 默认会话配置
 */
const DEFAULT_OPTIONS: Required<SessionOptions> = {
  timeout: 30 * 60 * 1000, // 30 分钟
  autoRenew: true,
  activityCheckInterval: 60 * 1000, // 1 分钟
  storageKey: 'ldesign_auth_session',
}

/**
 * 会话管理器类
 *
 * @example
 * ```ts
 * const sessionManager = new SessionManager({
 *   timeout: 30 * 60 * 1000, // 30 分钟
 *   autoRenew: true,
 * })
 *
 * // 创建会话
 * sessionManager.createSession()
 *
 * // 检查会话状态
 * if (sessionManager.isSessionValid()) {
 *   // 会话有效
 * }
 *
 * // 更新活动时间
 * sessionManager.touch()
 * ```
 */
export class SessionManager {
  /** 配置选项 */
  private options: Required<SessionOptions>
  /** 当前会话信息 */
  private session: SessionInfo | null = null
  /** 活动检测定时器 */
  private activityTimer: number | null = null
  /** 会话过期回调 */
  private onExpiredCallbacks: Array<() => void> = []
  /** 是否已销毁 */
  private destroyed = false

  /**
   * 创建会话管理器实例
   *
   * @param options - 会话配置选项
   */
  constructor(options: SessionOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
    this.loadSession()
  }

  /**
   * 从存储中加载会话信息
   */
  private loadSession(): void {
    if (typeof window === 'undefined') return

    try {
      const stored = sessionStorage.getItem(this.options.storageKey)
      if (stored) {
        this.session = JSON.parse(stored) as SessionInfo
        // 检查是否已过期
        if (this.isSessionExpired()) {
          this.session = { ...this.session, status: SessionStatus.EXPIRED }
        }
      }
    }
    catch {
      this.session = null
    }
  }

  /**
   * 保存会话信息到存储
   */
  private saveSession(): void {
    if (typeof window === 'undefined' || !this.session) return

    try {
      sessionStorage.setItem(this.options.storageKey, JSON.stringify(this.session))
    }
    catch {
      // 存储失败，静默处理
    }
  }

  /**
   * 生成唯一会话 ID
   */
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  /**
   * 获取设备信息
   */
  private getDeviceInfo(): DeviceInfo {
    if (typeof window === 'undefined') {
      return {}
    }

    const ua = navigator.userAgent
    let deviceType: DeviceInfo['deviceType'] = 'desktop'

    if (/Mobile|Android|iPhone/i.test(ua)) {
      deviceType = 'mobile'
    }
    else if (/iPad|Tablet/i.test(ua)) {
      deviceType = 'tablet'
    }

    return {
      deviceType,
      browser: this.detectBrowser(ua),
      os: this.detectOS(ua),
    }
  }

  /**
   * 检测浏览器
   */
  private detectBrowser(ua: string): string {
    if (ua.includes('Chrome')) return 'Chrome'
    if (ua.includes('Firefox')) return 'Firefox'
    if (ua.includes('Safari')) return 'Safari'
    if (ua.includes('Edge')) return 'Edge'
    if (ua.includes('Opera')) return 'Opera'
    return 'Unknown'
  }

  /**
   * 检测操作系统
   */
  private detectOS(ua: string): string {
    if (ua.includes('Windows')) return 'Windows'
    if (ua.includes('Mac')) return 'macOS'
    if (ua.includes('Linux')) return 'Linux'
    if (ua.includes('Android')) return 'Android'
    if (ua.includes('iOS') || ua.includes('iPhone')) return 'iOS'
    return 'Unknown'
  }

  /**
   * 创建新会话
   *
   * @returns 创建的会话信息
   */
  createSession(): SessionInfo {
    const now = Date.now()

    this.session = {
      id: this.generateSessionId(),
      status: SessionStatus.ACTIVE,
      createdAt: now,
      lastActivityAt: now,
      expiresAt: now + this.options.timeout,
      deviceInfo: this.getDeviceInfo(),
    }

    this.saveSession()
    this.startActivityMonitor()

    return this.session
  }

  /**
   * 获取当前会话信息
   *
   * @returns 当前会话信息，如果不存在则返回 null
   */
  getSession(): SessionInfo | null {
    return this.session
  }

  /**
   * 检查会话是否有效
   *
   * @returns 会话是否有效
   */
  isSessionValid(): boolean {
    return this.session?.status === SessionStatus.ACTIVE && !this.isSessionExpired()
  }

  /**
   * 检查会话是否已过期
   *
   * @returns 会话是否已过期
   */
  isSessionExpired(): boolean {
    if (!this.session?.expiresAt) return true
    return Date.now() >= this.session.expiresAt
  }

  /**
   * 更新会话活动时间（心跳）
   */
  touch(): void {
    if (!this.session || this.session.status !== SessionStatus.ACTIVE) return

    const now = Date.now()
    this.session.lastActivityAt = now

    if (this.options.autoRenew) {
      this.session.expiresAt = now + this.options.timeout
    }

    this.saveSession()
  }

  /**
   * 启动活动监控
   * 使用 setTimeout 替代 setInterval，更容易控制和清理
   */
  private startActivityMonitor(): void {
    if (this.destroyed || typeof window === 'undefined') return

    this.stopActivityMonitor()

    const checkActivity = () => {
      // 检查是否已销毁
      if (this.destroyed) return

      // 检查会话是否过期
      if (this.isSessionExpired()) {
        this.handleSessionExpired()
        return
      }

      // 继续下一次检查
      this.activityTimer = window.setTimeout(
        checkActivity,
        this.options.activityCheckInterval
      )
    }

    // 启动检查
    checkActivity()
  }

  /**
   * 停止活动监控
   */
  private stopActivityMonitor(): void {
    if (this.activityTimer !== null) {
      clearTimeout(this.activityTimer)
      this.activityTimer = null
    }
  }

  /**
   * 处理会话过期
   */
  private handleSessionExpired(): void {
    if (this.session) {
      this.session.status = SessionStatus.EXPIRED
      this.saveSession()
    }

    this.stopActivityMonitor()

    // 触发过期回调
    this.onExpiredCallbacks.forEach(cb => cb())
  }

  /**
   * 注册会话过期回调
   *
   * @param callback - 过期回调函数
   * @returns 取消注册的函数
   */
  onExpired(callback: () => void): () => void {
    this.onExpiredCallbacks.push(callback)
    return () => {
      const index = this.onExpiredCallbacks.indexOf(callback)
      if (index > -1) {
        this.onExpiredCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * 销毁会话
   */
  destroySession(): void {
    if (this.session) {
      this.session.status = SessionStatus.LOGGED_OUT
    }

    this.stopActivityMonitor()

    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(this.options.storageKey)
    }

    this.session = null
  }

  /**
   * 获取会话剩余时间（毫秒）
   *
   * @returns 剩余时间，如果已过期返回 0
   */
  getRemainingTime(): number {
    if (!this.session?.expiresAt) return 0
    return Math.max(0, this.session.expiresAt - Date.now())
  }

  /**
   * 销毁管理器，清理资源
   */
  destroy(): void {
    // 标记为已销毁
    this.destroyed = true

    // 停止监控
    this.stopActivityMonitor()

    // 清理回调
    this.onExpiredCallbacks = []

    // 清理会话数据
    this.session = null
  }
}

