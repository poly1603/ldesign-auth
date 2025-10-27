/**
 * 重试策略工具
 *
 * 提供指数退避、抖动等重试策略
 */

import { RETRY_STRATEGY } from '../constants'

/**
 * 重试选项配置
 */
export interface RetryOptions {
  /**
   * 最大重试次数
   */
  maxRetries: number

  /**
   * 初始延迟（毫秒）
   * @default 1000
   */
  initialDelay?: number

  /**
   * 最大延迟（毫秒）
   * @default 30000
   */
  maxDelay?: number

  /**
   * 退避因子（指数增长倍数）
   * @default 2
   */
  backoffFactor?: number

  /**
   * 是否添加随机抖动
   * @default true
   */
  jitter?: boolean

  /**
   * 判断是否应该重试的函数
   */
  shouldRetry?: (error: Error, attempt: number) => boolean

  /**
   * 重试前的回调
   */
  onRetry?: (error: Error, attempt: number, delay: number) => void
}

/**
 * 使用指数退避策略重试函数
 *
 * @param fn - 要重试的异步函数
 * @param options - 重试选项
 * @returns Promise 结果
 *
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   async () => {
 *     const response = await fetch('/api/data')
 *     return response.json()
 *   },
 *   {
 *     maxRetries: 3,
 *     initialDelay: 1000,
 *     backoffFactor: 2,
 *   }
 * )
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const {
    maxRetries,
    initialDelay = RETRY_STRATEGY.INITIAL_DELAY,
    maxDelay = RETRY_STRATEGY.MAX_DELAY,
    backoffFactor = RETRY_STRATEGY.BACKOFF_FACTOR,
    jitter = true,
    shouldRetry,
    onRetry,
  } = options

  let lastError: Error
  let delay = initialDelay

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    }
    catch (error) {
      lastError = error as Error

      // 最后一次尝试失败
      if (attempt === maxRetries) {
        break
      }

      // 检查是否应该重试
      if (shouldRetry && !shouldRetry(lastError, attempt)) {
        break
      }

      // 计算延迟时间
      const currentDelay = calculateDelay(delay, maxDelay, jitter)

      // 触发重试回调
      onRetry?.(lastError, attempt + 1, currentDelay)

      // 等待后重试
      await sleep(currentDelay)

      // 增加延迟（指数退避）
      delay = Math.min(delay * backoffFactor, maxDelay)
    }
  }

  throw lastError!
}

/**
 * 计算延迟时间（带抖动）
 *
 * @param delay - 基础延迟
 * @param maxDelay - 最大延迟
 * @param jitter - 是否添加抖动
 * @returns 实际延迟时间
 * @private
 */
function calculateDelay(delay: number, maxDelay: number, jitter: boolean): number {
  let actualDelay = Math.min(delay, maxDelay)

  if (jitter) {
    // 添加 ±25% 的随机抖动
    const jitterAmount = actualDelay * 0.25
    actualDelay += (Math.random() * 2 - 1) * jitterAmount
  }

  return Math.max(0, actualDelay)
}

/**
 * 睡眠函数
 *
 * @param ms - 毫秒数
 * @returns Promise
 * @private
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 创建可中断的重试函数
 *
 * @param fn - 要重试的函数
 * @param options - 重试选项
 * @returns 可中断的重试执行器
 *
 * @example
 * ```typescript
 * const retrier = createAbortableRetry(
 *   async () => fetchData(),
 *   { maxRetries: 3 }
 * )
 *
 * const promise = retrier.execute()
 *
 * // 可以中断重试
 * retrier.abort()
 * ```
 */
export function createAbortableRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): {
  execute: () => Promise<T>
  abort: () => void
} {
  let aborted = false

  const abort = () => {
    aborted = true
  }

  const execute = async (): Promise<T> => {
    aborted = false

    return retryWithBackoff(
      async () => {
        if (aborted) {
          throw new Error('Retry aborted')
        }
        return fn()
      },
      {
        ...options,
        shouldRetry: (error, attempt) => {
          if (aborted) {
            return false
          }
          return options.shouldRetry ? options.shouldRetry(error, attempt) : true
        },
      },
    )
  }

  return {
    execute,
    abort,
  }
}

/**
 * 默认的网络错误重试判断函数
 *
 * @param error - 错误对象
 * @returns 是否应该重试
 *
 * @example
 * ```typescript
 * await retryWithBackoff(
 *   async () => fetchData(),
 *   {
 *     maxRetries: 3,
 *     shouldRetry: isRetryableNetworkError,
 *   }
 * )
 * ```
 */
export function isRetryableNetworkError(error: Error): boolean {
  // 网络错误
  if (error.message.includes('network') || error.message.includes('timeout')) {
    return true
  }

  // 服务器错误（5xx）
  if ('status' in error && typeof (error as any).status === 'number') {
    const status = (error as any).status
    return status >= 500 && status < 600
  }

  // 特定错误码
  if ('code' in error) {
    const retryableCodes = [
      'ECONNRESET',
      'ENOTFOUND',
      'ESOCKETTIMEDOUT',
      'ETIMEDOUT',
      'ECONNREFUSED',
      'EHOSTUNREACH',
      'EPIPE',
      'EAI_AGAIN',
    ]
    return retryableCodes.includes((error as any).code)
  }

  return false
}

