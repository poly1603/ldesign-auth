/**
 * Token 黑名单管理
 *
 * 用于撤销已登出但尚未过期的 Token
 */

import { CLEANUP_INTERVALS } from '../constants'

/**
 * Token 黑名单接口
 */
export interface ITokenBlacklist {
  /**
   * 添加 Token 到黑名单
   *
   * @param token - Token 字符串或 Token 哈希
   * @param expiresAt - 过期时间戳（毫秒）
   */
  add(token: string, expiresAt: number): Promise<void>

  /**
   * 检查 Token 是否在黑名单中
   *
   * @param token - Token 字符串或 Token 哈希
   * @returns 是否在黑名单中
   */
  has(token: string): Promise<boolean>

  /**
   * 从黑名单中移除 Token
   *
   * @param token - Token 字符串或 Token 哈希
   */
  remove(token: string): Promise<void>

  /**
   * 清理已过期的 Token
   */
  cleanup(): Promise<void>

  /**
   * 清空黑名单
   */
  clear(): Promise<void>

  /**
   * 获取黑名单大小
   */
  size(): Promise<number>
}

/**
 * 内存型 Token 黑名单实现
 *
 * @example
 * ```typescript
 * const blacklist = new MemoryTokenBlacklist()
 *
 * // 添加 Token
 * await blacklist.add('token123', Date.now() + 3600000)
 *
 * // 检查 Token
 * const isBlacklisted = await blacklist.has('token123')
 *
 * // 清理过期 Token
 * await blacklist.cleanup()
 * ```
 */
export class MemoryTokenBlacklist implements ITokenBlacklist {
  private blacklist = new Map<string, number>()
  private cleanupTimer?: NodeJS.Timeout

  constructor(
    private options: {
      /**
       * 自动清理间隔（毫秒）
       * @default 5 * 60 * 1000 (5分钟)
       */
      cleanupInterval?: number
      /**
       * 是否启用自动清理
       * @default true
       */
      autoCleanup?: boolean
    } = {},
  ) {
    const {
      cleanupInterval = CLEANUP_INTERVALS.TOKEN_BLACKLIST,
      autoCleanup = true,
    } = options

    if (autoCleanup) {
      this.startAutoCleanup(cleanupInterval)
    }
  }

  /**
   * 添加 Token 到黑名单
   */
  async add(token: string, expiresAt: number): Promise<void> {
    // 使用 Token 的哈希值作为键（减少内存占用）
    const key = this.hashToken(token)
    this.blacklist.set(key, expiresAt)
  }

  /**
   * 检查 Token 是否在黑名单中
   */
  async has(token: string): Promise<boolean> {
    const key = this.hashToken(token)
    const expiresAt = this.blacklist.get(key)

    if (!expiresAt) {
      return false
    }

    // 检查是否已过期
    const now = Date.now()
    if (now > expiresAt) {
      // 已过期，从黑名单中移除
      this.blacklist.delete(key)
      return false
    }

    return true
  }

  /**
   * 从黑名单中移除 Token
   */
  async remove(token: string): Promise<void> {
    const key = this.hashToken(token)
    this.blacklist.delete(key)
  }

  /**
   * 清理已过期的 Token
   */
  async cleanup(): Promise<void> {
    const now = Date.now()
    let cleanedCount = 0

    for (const [token, expiresAt] of this.blacklist.entries()) {
      if (now > expiresAt) {
        this.blacklist.delete(token)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      console.debug(`[TokenBlacklist] Cleaned ${cleanedCount} expired tokens`)
    }
  }

  /**
   * 清空黑名单
   */
  async clear(): Promise<void> {
    this.blacklist.clear()
  }

  /**
   * 获取黑名单大小
   */
  async size(): Promise<number> {
    return this.blacklist.size
  }

  /**
   * 启动自动清理
   * @private
   */
  private startAutoCleanup(interval: number): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup().catch((error) => {
        console.error('[TokenBlacklist] Auto cleanup error:', error)
      })
    }, interval)

    // 确保 Node.js 进程可以正常退出
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref()
    }
  }

  /**
   * 停止自动清理
   */
  stopAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
  }

  /**
   * 销毁黑名单
   */
  destroy(): void {
    this.stopAutoCleanup()
    this.blacklist.clear()
  }

  /**
   * 计算 Token 的哈希值
   *
   * 使用简单的哈希算法，减少内存占用
   * @private
   */
  private hashToken(token: string): string {
    // 如果 token 长度合理，直接使用
    if (token.length < 100) {
      return token
    }

    // 对于长 token，使用简单的哈希
    let hash = 0
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return hash.toString(36)
  }
}

/**
 * LocalStorage 型 Token 黑名单实现
 *
 * 适用于需要持久化的场景
 *
 * @example
 * ```typescript
 * const blacklist = new StorageTokenBlacklist('auth-blacklist')
 * await blacklist.add('token123', Date.now() + 3600000)
 * ```
 */
export class StorageTokenBlacklist implements ITokenBlacklist {
  private storageKey: string

  constructor(storageKey = 'auth-token-blacklist') {
    this.storageKey = storageKey
  }

  async add(token: string, expiresAt: number): Promise<void> {
    const blacklist = await this.load()
    blacklist.set(this.hashToken(token), expiresAt)
    await this.save(blacklist)
  }

  async has(token: string): Promise<boolean> {
    const blacklist = await this.load()
    const key = this.hashToken(token)
    const expiresAt = blacklist.get(key)

    if (!expiresAt) {
      return false
    }

    const now = Date.now()
    if (now > expiresAt) {
      blacklist.delete(key)
      await this.save(blacklist)
      return false
    }

    return true
  }

  async remove(token: string): Promise<void> {
    const blacklist = await this.load()
    blacklist.delete(this.hashToken(token))
    await this.save(blacklist)
  }

  async cleanup(): Promise<void> {
    const blacklist = await this.load()
    const now = Date.now()
    let cleanedCount = 0

    for (const [token, expiresAt] of blacklist.entries()) {
      if (now > expiresAt) {
        blacklist.delete(token)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      await this.save(blacklist)
    }
  }

  async clear(): Promise<void> {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.storageKey)
    }
  }

  async size(): Promise<number> {
    const blacklist = await this.load()
    return blacklist.size
  }

  /**
   * 从 localStorage 加载黑名单
   * @private
   */
  private async load(): Promise<Map<string, number>> {
    if (typeof localStorage === 'undefined') {
      return new Map()
    }

    try {
      const data = localStorage.getItem(this.storageKey)
      if (!data) {
        return new Map()
      }

      const parsed = JSON.parse(data)
      return new Map(Object.entries(parsed))
    }
    catch (error) {
      console.error('[TokenBlacklist] Load error:', error)
      return new Map()
    }
  }

  /**
   * 保存黑名单到 localStorage
   * @private
   */
  private async save(blacklist: Map<string, number>): Promise<void> {
    if (typeof localStorage === 'undefined') {
      return
    }

    try {
      const data = Object.fromEntries(blacklist)
      localStorage.setItem(this.storageKey, JSON.stringify(data))
    }
    catch (error) {
      console.error('[TokenBlacklist] Save error:', error)
    }
  }

  /**
   * 计算 Token 哈希
   * @private
   */
  private hashToken(token: string): string {
    if (token.length < 100) {
      return token
    }

    let hash = 0
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return hash.toString(36)
  }
}

/**
 * 创建 Token 黑名单
 *
 * @param type - 黑名单类型
 * @param options - 配置选项
 * @returns Token 黑名单实例
 *
 * @example
 * ```typescript
 * // 内存型黑名单
 * const blacklist = createTokenBlacklist('memory')
 *
 * // 持久化黑名单
 * const blacklist = createTokenBlacklist('storage', {
 *   storageKey: 'my-auth-blacklist'
 * })
 * ```
 */
export function createTokenBlacklist(
  type: 'memory' | 'storage' = 'memory',
  options?: any,
): ITokenBlacklist {
  if (type === 'storage') {
    return new StorageTokenBlacklist(options?.storageKey)
  }
  return new MemoryTokenBlacklist(options)
}

