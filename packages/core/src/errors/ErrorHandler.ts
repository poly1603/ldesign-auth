/**
 * 错误处理器
 *
 * @module @ldesign/auth-core/errors
 * @author LDesign Team
 */

import type { AuthError } from './AuthError'
import type { AuthErrorCode } from './errorCodes'

/**
 * 错误处理函数类型
 */
export type ErrorHandlerFunction = (error: AuthError) => void | Promise<void>

/**
 * 错误处理器配置
 */
export interface ErrorHandlerConfig {
  /** 是否在控制台输出错误 */
  logErrors?: boolean
  /** 是否自动重试可重试的错误 */
  autoRetry?: boolean
  /** 最大重试次数 */
  maxRetries?: number
  /** 重试延迟（毫秒） */
  retryDelay?: number
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<ErrorHandlerConfig> = {
  logErrors: true,
  autoRetry: false,
  maxRetries: 3,
  retryDelay: 1000,
}

/**
 * 错误处理器类
 * 
 * 统一管理认证错误的处理逻辑
 * 
 * @example
 * ```ts
 * const errorHandler = new ErrorHandler({
 *   logErrors: true,
 *   autoRetry: true,
 * })
 * 
 * // 注册特定错误码的处理器
 * errorHandler.register(AuthErrorCode.TOKEN_EXPIRED, async (error) => {
 *   console.log('Token 过期，尝试刷新')
 *   await refreshToken()
 * })
 * 
 * // 注册全局错误处理器
 * errorHandler.registerGlobal((error) => {
 *   console.error('认证错误:', error.message)
 * })
 * 
 * // 处理错误
 * await errorHandler.handle(error)
 * ```
 */
export class ErrorHandler {
  /** 配置选项 */
  private config: Required<ErrorHandlerConfig>
  /** 错误码对应的处理器映射 */
  private handlers = new Map<AuthErrorCode, Set<ErrorHandlerFunction>>()
  /** 全局错误处理器 */
  private globalHandlers = new Set<ErrorHandlerFunction>()
  /** 重试计数器 */
  private retryCounters = new Map<string, number>()

  /**
   * 创建错误处理器实例
   * 
   * @param config - 配置选项
   */
  constructor(config: ErrorHandlerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * 注册错误处理器
   * 
   * @param code - 错误码
   * @param handler - 处理函数
   * @returns 取消注册的函数
   * 
   * @example
   * ```ts
   * const unregister = errorHandler.register(
   *   AuthErrorCode.TOKEN_EXPIRED,
   *   (error) => {
   *     console.log('处理 Token 过期')
   *   }
   * )
   * 
   * // 取消注册
   * unregister()
   * ```
   */
  register(code: AuthErrorCode, handler: ErrorHandlerFunction): () => void {
    if (!this.handlers.has(code)) {
      this.handlers.set(code, new Set())
    }
    this.handlers.get(code)!.add(handler)

    return () => {
      this.handlers.get(code)?.delete(handler)
    }
  }

  /**
   * 注册全局错误处理器
   * 
   * @param handler - 处理函数
   * @returns 取消注册的函数
   * 
   * @example
   * ```ts
   * const unregister = errorHandler.registerGlobal((error) => {
   *   // 上报错误到监控系统
   *   reportError(error)
   * })
   * ```
   */
  registerGlobal(handler: ErrorHandlerFunction): () => void {
    this.globalHandlers.add(handler)

    return () => {
      this.globalHandlers.delete(handler)
    }
  }

  /**
   * 处理错误
   * 
   * @param error - 认证错误
   * @returns Promise
   * 
   * @example
   * ```ts
   * try {
   *   await someAuthOperation()
   * } catch (err) {
   *   if (AuthError.isAuthError(err)) {
   *     await errorHandler.handle(err)
   *   }
   * }
   * ```
   */
  async handle(error: AuthError): Promise<void> {
    // 输出错误日志
    if (this.config.logErrors) {
      console.error('[ErrorHandler]', error.toString(), error.details)
    }

    // 执行特定错误码的处理器
    const handlers = this.handlers.get(error.code)
    if (handlers && handlers.size > 0) {
      await Promise.all(
        Array.from(handlers).map(handler => this.safeExecute(handler, error))
      )
    }

    // 执行全局处理器
    if (this.globalHandlers.size > 0) {
      await Promise.all(
        Array.from(this.globalHandlers).map(handler =>
          this.safeExecute(handler, error)
        )
      )
    }

    // 自动重试
    if (this.config.autoRetry && error.retryable) {
      await this.handleRetry(error)
    }
  }

  /**
   * 安全执行处理函数
   * 
   * @param handler - 处理函数
   * @param error - 错误对象
   */
  private async safeExecute(
    handler: ErrorHandlerFunction,
    error: AuthError
  ): Promise<void> {
    try {
      await handler(error)
    }
    catch (err) {
      console.error('[ErrorHandler] Handler execution failed:', err)
    }
  }

  /**
   * 处理重试逻辑
   * 
   * @param error - 错误对象
   */
  private async handleRetry(error: AuthError): Promise<void> {
    const key = `${error.code}_${error.message}`
    const count = this.retryCounters.get(key) ?? 0

    if (count < this.config.maxRetries) {
      this.retryCounters.set(key, count + 1)
      console.log(
        `[ErrorHandler] 重试 ${count + 1}/${this.config.maxRetries}`,
        error.code
      )

      // 延迟后触发重试（实际重试逻辑由外部实现）
      await new Promise(resolve => setTimeout(resolve, this.config.retryDelay))
    }
    else {
      // 达到最大重试次数，清除计数器
      this.retryCounters.delete(key)
      console.error('[ErrorHandler] 重试次数已达上限', error.code)
    }
  }

  /**
   * 清除重试计数器
   * 
   * @param code - 错误码（可选，不传则清除所有）
   */
  clearRetryCounters(code?: AuthErrorCode): void {
    if (code) {
      // 清除特定错误码的计数器
      for (const key of this.retryCounters.keys()) {
        if (key.startsWith(code)) {
          this.retryCounters.delete(key)
        }
      }
    }
    else {
      // 清除所有计数器
      this.retryCounters.clear()
    }
  }

  /**
   * 获取重试次数
   * 
   * @param error - 错误对象
   * @returns 当前重试次数
   */
  getRetryCount(error: AuthError): number {
    const key = `${error.code}_${error.message}`
    return this.retryCounters.get(key) ?? 0
  }

  /**
   * 清理所有处理器
   */
  clear(): void {
    this.handlers.clear()
    this.globalHandlers.clear()
    this.retryCounters.clear()
  }

  /**
   * 销毁处理器，释放资源
   */
  destroy(): void {
    this.clear()
  }
}