/**
 * 认证错误类
 *
 * @module @ldesign/auth-core/errors
 * @author LDesign Team
 */

import type { AuthErrorCode } from './errorCodes'

/**
 * 认证错误类
 * 
 * 扩展原生 Error 类，添加错误码、详情和重试标志
 * 
 * @example
 * ```ts
 * throw new AuthError(
 *   AuthErrorCode.TOKEN_EXPIRED,
 *   'Token 已过期',
 *   { expiresAt: Date.now() },
 *   true // 可重试
 * )
 * ```
 */
export class AuthError extends Error {
  /**
   * 创建认证错误实例
   * 
   * @param code - 错误码
   * @param message - 错误消息
   * @param details - 错误详情
   * @param retryable - 是否可重试
   */
  constructor(
    public code: AuthErrorCode,
    message: string,
    public details?: unknown,
    public retryable = false,
  ) {
    super(message)
    this.name = 'AuthError'

    // 保持正确的堆栈跟踪（仅在 V8 引擎中可用）
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthError)
    }
  }

  /**
   * 转换为 JSON 对象
   * 
   * @returns JSON 表示
   */
  toJSON(): {
    name: string
    code: AuthErrorCode
    message: string
    details?: unknown
    retryable: boolean
    stack?: string
  } {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      retryable: this.retryable,
      stack: this.stack,
    }
  }

  /**
   * 转换为字符串
   * 
   * @returns 字符串表示
   */
  toString(): string {
    return `${this.name} [${this.code}]: ${this.message}`
  }

  /**
   * 判断是否为认证错误
   * 
   * @param error - 错误对象
   * @returns 是否为 AuthError 实例
   */
  static isAuthError(error: unknown): error is AuthError {
    return error instanceof AuthError
  }

  /**
   * 从普通错误创建认证错误
   * 
   * @param error - 原始错误
   * @param code - 错误码
   * @param retryable - 是否可重试
   * @returns AuthError 实例
   */
  static fromError(
    error: Error,
    code: AuthErrorCode,
    retryable = false,
  ): AuthError {
    const authError = new AuthError(
      code,
      error.message,
      { originalError: error },
      retryable,
    )
    authError.stack = error.stack
    return authError
  }
}