/**
 * 速率限制器
 *
 * @module @ldesign/auth-core/security
 * @author LDesign Team
 */

/**
 * 速率限制器配置
 */
export interface RateLimiterConfig {
  /** 时间窗口（毫秒） */
  windowMs?: number
  /** 窗口内最大请求数 */
  maxRequests?: number
  /** 被限制时的消息 */
  message?: string
  /** 是否滑动窗口 */
  slidingWindow?: boolean
  /** 键名生成函数 */
  keyGenerator?: (identifier: string) => string
  /** 跳过限制的判断函数 */
  skip?: (identifier: string) => boolean
  /** 被限制时的回调 */
  onLimited?: (identifier: string, retryAfter: number) => void
}

/**
 * 请求记录
 */
interface RequestRecord {
  /** 请求次数 */
  count: number
  /** 窗口开始时间 */
  windowStart: number
  /** 请求时间戳列表（滑动窗口用） */
  timestamps: number[]
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<RateLimiterConfig> = {
  windowMs: 60 * 1000, // 1 分钟
  maxRequests: 100,
  message: '请求过于频繁，请稍后再试',
  slidingWindow: false,
  keyGenerator: (identifier: string) => identifier,
  skip: () => false,
  onLimited: () => {},
}

/**
 * 限制检查结果
 */
export interface RateLimitResult {
  /** 是否被限制 */
  limited: boolean
  /** 剩余请求次数 */
  remaining: number
  /** 重试等待时间（毫秒） */
  retryAfter: number
  /** 限制信息 */
  message?: string
}

/**
 * 速率限制器
 *
 * 提供基于内存的请求速率限制功能，支持固定窗口和滑动窗口算法
 *
 * @example
 * ```ts
 * const limiter = new RateLimiter({
 *   windowMs: 60000, // 1 分钟
 *   maxRequests: 5, // 最多 5 次
 * })
 *
 * // 检查是否可以请求
 * const result = limiter.check('user_123')
 * if (result.limited) {
 *   console.log(`请稍后再试，剩余 ${result.retryAfter}ms`)
 * } else {
 *   // 执行请求
 *   limiter.hit('user_123')
 * }
 * ```
 */
export class RateLimiter {
  /** 配置选项 */
  private config: Required<RateLimiterConfig>
  /** 请求记录存储 */
  private records = new Map<string, RequestRecord>()
  /** 清理定时器 */
  private cleanupTimer: ReturnType<typeof setInterval> | null = null

  /**
   * 创建速率限制器实例
   *
   * @param config - 配置选项
   */
  constructor(config: RateLimiterConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }

    // 启动定期清理
    this.startCleanup()
  }

  /**
   * 检查请求是否被限制（不增加计数）
   *
   * @param identifier - 标识符（如用户 ID、IP 地址等）
   * @returns 限制检查结果
   *
   * @example
   * ```ts
   * const result = limiter.check('user_123')
   * console.log(`剩余请求: ${result.remaining}`)
   * ```
   */
  check(identifier: string): RateLimitResult {
    // 检查是否跳过
    if (this.config.skip(identifier)) {
      return {
        limited: false,
        remaining: this.config.maxRequests,
        retryAfter: 0,
      }
    }

    const key = this.config.keyGenerator(identifier)
    const now = Date.now()
    const record = this.records.get(key)

    if (!record) {
      return {
        limited: false,
        remaining: this.config.maxRequests,
        retryAfter: 0,
      }
    }

    if (this.config.slidingWindow) {
      return this.checkSlidingWindow(record, now)
    } else {
      return this.checkFixedWindow(record, now)
    }
  }

  /**
   * 记录一次请求
   *
   * @param identifier - 标识符
   * @returns 限制检查结果
   *
   * @example
   * ```ts
   * const result = limiter.hit('user_123')
   * if (result.limited) {
   *   throw new Error(result.message)
   * }
   * ```
   */
  hit(identifier: string): RateLimitResult {
    // 检查是否跳过
    if (this.config.skip(identifier)) {
      return {
        limited: false,
        remaining: this.config.maxRequests,
        retryAfter: 0,
      }
    }

    const key = this.config.keyGenerator(identifier)
    const now = Date.now()

    let record = this.records.get(key)

    // 初始化或重置记录
    if (!record || this.shouldResetWindow(record, now)) {
      record = {
        count: 0,
        windowStart: now,
        timestamps: [],
      }
      this.records.set(key, record)
    }

    // 检查是否被限制
    const result = this.config.slidingWindow
      ? this.checkSlidingWindow(record, now)
      : this.checkFixedWindow(record, now)

    if (result.limited) {
      // 触发限制回调
      this.config.onLimited(identifier, result.retryAfter)
      return {
        ...result,
        message: this.config.message,
      }
    }

    // 增加计数
    record.count++
    if (this.config.slidingWindow) {
      record.timestamps.push(now)
    }

    return {
      limited: false,
      remaining: this.config.maxRequests - record.count,
      retryAfter: 0,
    }
  }

  /**
   * 重置特定标识符的限制
   *
   * @param identifier - 标识符
   *
   * @example
   * ```ts
   * limiter.reset('user_123')
   * ```
   */
  reset(identifier: string): void {
    const key = this.config.keyGenerator(identifier)
    this.records.delete(key)
  }

  /**
   * 重置所有限制
   *
   * @example
   * ```ts
   * limiter.resetAll()
   * ```
   */
  resetAll(): void {
    this.records.clear()
  }

  /**
   * 获取当前状态
   *
   * @param identifier - 标识符
   * @returns 当前状态信息
   */
  getStatus(identifier: string): {
    count: number
    remaining: number
    resetAt: number
  } | null {
    const key = this.config.keyGenerator(identifier)
    const record = this.records.get(key)

    if (!record) {
      return null
    }

    const now = Date.now()

    if (this.config.slidingWindow) {
      const validTimestamps = record.timestamps.filter(
        ts => now - ts < this.config.windowMs
      )
      return {
        count: validTimestamps.length,
        remaining: Math.max(0, this.config.maxRequests - validTimestamps.length),
        resetAt: validTimestamps.length > 0
          ? validTimestamps[0] + this.config.windowMs
          : now + this.config.windowMs,
      }
    } else {
      return {
        count: record.count,
        remaining: Math.max(0, this.config.maxRequests - record.count),
        resetAt: record.windowStart + this.config.windowMs,
      }
    }
  }

  /**
   * 销毁限制器，清理资源
   */
  destroy(): void {
    this.stopCleanup()
    this.records.clear()
  }

  /**
   * 检查固定窗口限制
   */
  private checkFixedWindow(record: RequestRecord, now: number): RateLimitResult {
    // 检查窗口是否过期
    if (this.shouldResetWindow(record, now)) {
      return {
        limited: false,
        remaining: this.config.maxRequests,
        retryAfter: 0,
      }
    }

    const remaining = this.config.maxRequests - record.count

    if (remaining <= 0) {
      const retryAfter = record.windowStart + this.config.windowMs - now
      return {
        limited: true,
        remaining: 0,
        retryAfter: Math.max(0, retryAfter),
      }
    }

    return {
      limited: false,
      remaining,
      retryAfter: 0,
    }
  }

  /**
   * 检查滑动窗口限制
   */
  private checkSlidingWindow(record: RequestRecord, now: number): RateLimitResult {
    // 过滤出窗口内的请求
    const windowStart = now - this.config.windowMs
    const validTimestamps = record.timestamps.filter(ts => ts > windowStart)

    // 更新记录
    record.timestamps = validTimestamps
    record.count = validTimestamps.length

    const remaining = this.config.maxRequests - validTimestamps.length

    if (remaining <= 0) {
      // 计算最早的请求何时过期
      const oldestTimestamp = Math.min(...validTimestamps)
      const retryAfter = oldestTimestamp + this.config.windowMs - now

      return {
        limited: true,
        remaining: 0,
        retryAfter: Math.max(0, retryAfter),
      }
    }

    return {
      limited: false,
      remaining,
      retryAfter: 0,
    }
  }

  /**
   * 判断是否应该重置窗口
   */
  private shouldResetWindow(record: RequestRecord, now: number): boolean {
    if (this.config.slidingWindow) {
      return false // 滑动窗口不需要重置
    }
    return now - record.windowStart >= this.config.windowMs
  }

  /**
   * 启动定期清理
   */
  private startCleanup(): void {
    // 每分钟清理一次过期记录
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, 60 * 1000)
  }

  /**
   * 停止定期清理
   */
  private stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }

  /**
   * 清理过期记录
   */
  private cleanup(): void {
    const now = Date.now()
    const expireTime = this.config.windowMs * 2 // 保留 2 倍窗口时间

    for (const [key, record] of this.records.entries()) {
      if (this.config.slidingWindow) {
        // 滑动窗口：检查最新的时间戳
        const latestTimestamp = Math.max(...record.timestamps, 0)
        if (now - latestTimestamp > expireTime) {
          this.records.delete(key)
        }
      } else {
        // 固定窗口：检查窗口开始时间
        if (now - record.windowStart > expireTime) {
          this.records.delete(key)
        }
      }
    }
  }
}

/**
 * 创建登录限制器
 *
 * 预配置的登录尝试限制器
 *
 * @param config - 额外配置
 * @returns 登录限制器实例
 *
 * @example
 * ```ts
 * const loginLimiter = createLoginLimiter({
 *   maxRequests: 5, // 5 次尝试
 *   windowMs: 15 * 60 * 1000, // 15 分钟
 * })
 *
 * // 登录时检查
 * const result = loginLimiter.hit(username)
 * if (result.limited) {
 *   throw new Error('登录尝试次数过多，请稍后再试')
 * }
 * ```
 */
export function createLoginLimiter(config: Partial<RateLimiterConfig> = {}): RateLimiter {
  return new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 分钟
    maxRequests: 5, // 5 次尝试
    message: '登录尝试次数过多，请稍后再试',
    slidingWindow: true,
    ...config,
  })
}

/**
 * 创建 API 限制器
 *
 * 预配置的 API 请求限制器
 *
 * @param config - 额外配置
 * @returns API 限制器实例
 *
 * @example
 * ```ts
 * const apiLimiter = createApiLimiter({
 *   maxRequests: 100, // 100 次请求
 *   windowMs: 60 * 1000, // 1 分钟
 * })
 * ```
 */
export function createApiLimiter(config: Partial<RateLimiterConfig> = {}): RateLimiter {
  return new RateLimiter({
    windowMs: 60 * 1000, // 1 分钟
    maxRequests: 100,
    message: '请求过于频繁，请稍后再试',
    slidingWindow: false,
    ...config,
  })
}
