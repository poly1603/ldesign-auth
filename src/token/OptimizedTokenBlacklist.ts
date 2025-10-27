/**
 * 优化的 Token 黑名单 - 支持自动清理过期条目
 */

interface BlacklistEntry {
  token: string
  expiresAt: number
}

export class OptimizedTokenBlacklist {
  private blacklist = new Map<string, number>() // token -> expiresAt
  private cleanupInterval: NodeJS.Timeout | null = null
  private cleanupIntervalMs = 60000 // 1 分钟
  private maxSize = 10000 // 最大条目数

  constructor(options?: {
    cleanupIntervalMs?: number
    maxSize?: number
    autoCleanup?: boolean
  }) {
    if (options?.cleanupIntervalMs) {
      this.cleanupIntervalMs = options.cleanupIntervalMs
    }
    if (options?.maxSize) {
      this.maxSize = options.maxSize
    }
    if (options?.autoCleanup !== false) {
      this.startAutoCleanup()
    }
  }

  /**
   * 添加 Token 到黑名单
   */
  async add(token: string, expiresAt: number): Promise<void> {
    // 如果已经过期，不添加
    if (expiresAt <= Date.now()) {
      return
    }

    // 如果达到最大容量，清理最早过期的条目
    if (this.blacklist.size >= this.maxSize) {
      this.cleanupExpired()

      // 如果还是满的，删除最早过期的
      if (this.blacklist.size >= this.maxSize) {
        let earliestToken: string | null = null
        let earliestExpiry = Infinity

        for (const [t, exp] of this.blacklist.entries()) {
          if (exp < earliestExpiry) {
            earliestToken = t
            earliestExpiry = exp
          }
        }

        if (earliestToken) {
          this.blacklist.delete(earliestToken)
        }
      }
    }

    this.blacklist.set(token, expiresAt)
  }

  /**
   * 检查 Token 是否在黑名单中
   */
  async has(token: string): Promise<boolean> {
    const expiresAt = this.blacklist.get(token)

    if (!expiresAt) {
      return false
    }

    // 如果已过期，删除并返回 false
    if (expiresAt <= Date.now()) {
      this.blacklist.delete(token)
      return false
    }

    return true
  }

  /**
   * 从黑名单中移除 Token
   */
  async remove(token: string): Promise<void> {
    this.blacklist.delete(token)
  }

  /**
   * 清理过期的条目
   */
  cleanupExpired(): number {
    const now = Date.now()
    let cleaned = 0

    for (const [token, expiresAt] of this.blacklist.entries()) {
      if (expiresAt <= now) {
        this.blacklist.delete(token)
        cleaned++
      }
    }

    return cleaned
  }

  /**
   * 开始自动清理
   */
  private startAutoCleanup(): void {
    this.stopAutoCleanup()

    this.cleanupInterval = setInterval(() => {
      const cleaned = this.cleanupExpired()
      if (cleaned > 0) {
        console.debug(`[TokenBlacklist] Cleaned ${cleaned} expired tokens`)
      }
    }, this.cleanupIntervalMs)

    // 使用 unref 避免阻止进程退出
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref()
    }
  }

  /**
   * 停止自动清理
   */
  private stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
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
  size(): number {
    return this.blacklist.size
  }

  /**
   * 销毁黑名单
   */
  destroy(): void {
    this.stopAutoCleanup()
    this.blacklist.clear()
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    size: number
    expired: number
    active: number
  } {
    const now = Date.now()
    let expired = 0
    let active = 0

    for (const expiresAt of this.blacklist.values()) {
      if (expiresAt <= now) {
        expired++
      } else {
        active++
      }
    }

    return {
      size: this.blacklist.size,
      expired,
      active
    }
  }
}

