/**
 * 基础认证错误类
 */

import { AuthErrorCode, AuthErrorMessages } from './codes'

/**
 * 认证错误基类
 *
 * @example
 * ```typescript
 * throw new AuthError('认证失败', AuthErrorCode.AUTHENTICATION_FAILED)
 * ```
 */
export class AuthError extends Error {
  /**
   * 错误码
   */
  public readonly code: AuthErrorCode

  /**
   * 原始错误（如果有）
   */
  public readonly cause?: Error

  /**
   * 错误详情（额外信息）
   */
  public readonly details?: Record<string, any>

  /**
   * 错误发生时间
   */
  public readonly timestamp: Date

  constructor(
    message: string,
    code: AuthErrorCode = AuthErrorCode.UNKNOWN_ERROR,
    cause?: Error,
    details?: Record<string, any>,
  ) {
    super(message)

    this.name = 'AuthError'
    this.code = code
    this.cause = cause
    this.details = details
    this.timestamp = new Date()

    // 维护原型链
    Object.setPrototypeOf(this, AuthError.prototype)

    // 捕获堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  /**
   * 从错误码创建 AuthError
   *
   * @param code - 错误码
   * @param cause - 原始错误
   * @param details - 错误详情
   * @returns AuthError 实例
   *
   * @example
   * ```typescript
   * throw AuthError.fromCode(AuthErrorCode.TOKEN_EXPIRED)
   * ```
   */
  static fromCode(
    code: AuthErrorCode,
    cause?: Error,
    details?: Record<string, any>,
  ): AuthError {
    const message = AuthErrorMessages[code] || '未知错误'
    return new AuthError(message, code, cause, details)
  }

  /**
   * 将错误转换为 JSON 格式
   *
   * @returns JSON 对象
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
      cause: this.cause
        ? {
          name: this.cause.name,
          message: this.cause.message,
          stack: this.cause.stack,
        }
        : undefined,
    }
  }

  /**
   * 转换为字符串
   *
   * @returns 错误字符串
   */
  toString(): string {
    let str = `[${this.code}] ${this.name}: ${this.message}`

    if (this.cause) {
      str += `\nCaused by: ${this.cause.message}`
    }

    if (this.details) {
      str += `\nDetails: ${JSON.stringify(this.details)}`
    }

    return str
  }
}


