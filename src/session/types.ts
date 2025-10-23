/**
 * Session 管理类型定义
 */

/**
 * Session 配置
 */
export interface SessionConfig {
  /**
   * Session 超时时间（毫秒）
   * @default 1800000 (30分钟)
   */
  timeout?: number

  /**
   * 是否监控用户活动
   * @default true
   */
  monitorActivity?: boolean

  /**
   * 活动事件类型
   * @default ['mousedown', 'keydown', 'scroll', 'touchstart']
   */
  activityEvents?: string[]

  /**
   * 是否启用多标签页同步
   * @default true
   */
  enableTabSync?: boolean

  /**
   * 同步存储键名
   * @default 'auth-session-sync'
   */
  syncKey?: string

  /**
   * 是否在页面可见性变化时检查 Session
   * @default true
   */
  checkOnVisibilityChange?: boolean
}

/**
 * Session 状态
 */
export interface SessionState {
  /**
   * Session 是否活动
   */
  active: boolean

  /**
   * 最后活动时间
   */
  lastActivity: Date

  /**
   * Session 创建时间
   */
  createdAt: Date

  /**
   * Session 过期时间
   */
  expiresAt: Date
}

/**
 * Session 同步消息类型
 */
export type SessionSyncMessageType =
  | 'activity'
  | 'logout'
  | 'login'
  | 'refresh'

/**
 * Session 同步消息
 */
export interface SessionSyncMessage {
  /**
   * 消息类型
   */
  type: SessionSyncMessageType

  /**
   * 时间戳
   */
  timestamp: number

  /**
   * 数据
   */
  data?: any
}

/**
 * Session 超时回调
 */
export type SessionTimeoutCallback = () => void | Promise<void>

/**
 * Session 活动回调
 */
export type SessionActivityCallback = () => void | Promise<void>


