/**
 * Token 刷新队列
 *
 * 防止并发请求导致的重复 Token 刷新问题
 * 
 * @module @ldesign/auth-core/token
 * @author LDesign Team
 */

import type { TokenInfo } from '../types'

/**
 * 刷新处理函数类型
 */
export type RefreshHandler = () => Promise<TokenInfo | null>

/**
 * 等待队列项
 */
interface QueueItem {
  resolve: (token: TokenInfo | null) => void
  reject: (error: Error) => void
}

/**
 * Token 刷新队列类
 * 
 * 确保同一时间只有一个 Token 刷新请求在进行
 * 其他并发请求会等待该请求完成并共享结果
 * 
 * @example
 * ```ts
 * const queue = new TokenRefreshQueue()
 * 
 * // 多个并发请求
 * const promise1 = queue.refresh(() => apiRefreshToken())
 * const promise2 = queue.refresh(() => apiRefreshToken()) // 复用 promise1
 * const promise3 = queue.refresh(() => apiRefreshToken()) // 复用 promise1
 * 
 * // 只会发送一次实际的刷新请求
 * const [token1, token2, token3] = await Promise.all([promise1, promise2, promise3])
 * // token1 === token2 === token3
 * ```
 */
export class TokenRefreshQueue {
  /**
   * 当前进行中的刷新 Promise
   */
  private refreshPromise: Promise<TokenInfo | null> | null = null

  /**
   * 等待队列
   */
  private waitingQueue: QueueItem[] = []

  /**
   * 是否正在刷新
   */
  private isRefreshing = false

  /**
   * 执行 Token 刷新
   * 
   * 如果已有刷新请求在进行中，则加入等待队列
   * 否则执行新的刷新请求
   * 
   * @param handler - 刷新处理函数
   * @returns Token 信息
   * 
   * @example
   * ```ts
   * const token = await queue.refresh(async () => {
   *   const response = await fetch('/api/refresh', {
   *     method: 'POST',
   *     body: JSON.stringify({ refreshToken })
   *   })
   *   return response.json()
   * })
   * ```
   */
  async refresh(handler: RefreshHandler): Promise<TokenInfo | null> {
    // 如果已有刷新请求在进行中，加入等待队列
    if (this.isRefreshing && this.refreshPromise) {
      return new Promise<TokenInfo | null>((resolve, reject) => {
        this.waitingQueue.push({ resolve, reject })
      })
    }

    // 标记为刷新中
    this.isRefreshing = true

    // 执行刷新
    this.refreshPromise = this.executeRefresh(handler)

    try {
      const result = await this.refreshPromise
      return result
    } finally {
      // 清理状态
      this.refreshPromise = null
      this.isRefreshing = false
    }
  }

  /**
   * 执行实际的刷新逻辑
   * 
   * @param handler - 刷新处理函数
   * @returns Token 信息
   */
  private async executeRefresh(handler: RefreshHandler): Promise<TokenInfo | null> {
    try {
      // 执行刷新
      const result = await handler()

      // 通知所有等待者成功
      this.notifyWaiters(result, null)

      return result
    }
    catch (error) {
      // 通知所有等待者失败
      this.notifyWaiters(null, error as Error)

      // 重新抛出错误
      throw error
    }
  }

  /**
   * 通知所有等待者
   * 
   * @param result - 刷新结果
   * @param error - 错误信息
   */
  private notifyWaiters(result: TokenInfo | null, error: Error | null): void {
    const waiters = [...this.waitingQueue]
    this.waitingQueue = []

    waiters.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error)
      }
      else {
        resolve(result)
      }
    })
  }

  /**
   * 取消所有等待中的请求
   * 
   * @param reason - 取消原因
   */
  cancelAll(reason = 'Token refresh cancelled'): void {
    const error = new Error(reason)
    this.notifyWaiters(null, error)
    this.isRefreshing = false
    this.refreshPromise = null
  }

  /**
   * 获取当前状态
   * 
   * @returns 当前刷新状态
   */
  getStatus(): {
    isRefreshing: boolean
    waitingCount: number
  } {
    return {
      isRefreshing: this.isRefreshing,
      waitingCount: this.waitingQueue.length,
    }
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.cancelAll('Queue destroyed')
  }
}