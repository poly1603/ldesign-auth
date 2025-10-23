/**
 * Token 管理类型定义
 */

import type { TokenInfo } from '../types'

/**
 * 存储类型
 */
export type StorageType = 'localStorage' | 'sessionStorage' | 'cookie' | 'memory'

/**
 * Token 配置
 */
export interface TokenConfig {
  /**
   * Token 存储键名
   * @default 'auth-token'
   */
  tokenKey?: string

  /**
   * Refresh Token 存储键名
   * @default 'auth-refresh-token'
   */
  refreshTokenKey?: string

  /**
   * 默认存储类型
   * @default 'localStorage'
   */
  defaultStorage?: StorageType

  /**
   * Token 刷新 API 端点
   * @default '/api/auth/refresh'
   */
  refreshEndpoint?: string

  /**
   * Token 刷新阈值（秒）
   * 当 Token 剩余时间小于此值时触发刷新
   * @default 300 (5分钟)
   */
  refreshThreshold?: number

  /**
   * 是否自动刷新 Token
   * @default true
   */
  autoRefresh?: boolean

  /**
   * 刷新失败后的重试次数
   * @default 3
   */
  maxRetries?: number

  /**
   * 重试间隔（毫秒）
   * @default 1000
   */
  retryDelay?: number
}

/**
 * Token 存储接口
 */
export interface ITokenStorage {
  /**
   * 保存 Token
   */
  save(key: string, value: string): void

  /**
   * 读取 Token
   */
  load(key: string): string | null

  /**
   * 删除 Token
   */
  remove(key: string): void

  /**
   * 清空所有 Token
   */
  clear(): void

  /**
   * 检查存储是否可用
   */
  isAvailable(): boolean
}

/**
 * Token 刷新回调
 */
export type TokenRefreshCallback = (token: TokenInfo) => void | Promise<void>

/**
 * Token 过期回调
 */
export type TokenExpiredCallback = () => void | Promise<void>


