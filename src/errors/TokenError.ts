/**
 * Token 相关错误类
 */

import { AuthError } from './AuthError'
import { AuthErrorCode } from './codes'

/**
 * Token 错误类
 *
 * @example
 * ```typescript
 * throw new TokenError('Token 已过期', AuthErrorCode.TOKEN_EXPIRED)
 * ```
 */
export class TokenError extends AuthError {
  constructor(
    message: string,
    code: AuthErrorCode = AuthErrorCode.TOKEN_INVALID,
    cause?: Error,
    details?: Record<string, any>,
  ) {
    super(message, code, cause, details)
    this.name = 'TokenError'
    Object.setPrototypeOf(this, TokenError.prototype)
  }

  /**
   * 创建 Token 过期错误
   *
   * @param expiresAt - 过期时间（可选）
   * @returns TokenError 实例
   */
  static expired(expiresAt?: Date): TokenError {
    const details = expiresAt ? { expiresAt: expiresAt.toISOString() } : undefined
    return TokenError.fromCode(AuthErrorCode.TOKEN_EXPIRED, undefined, details)
  }

  /**
   * 创建 Token 无效错误
   *
   * @param reason - 无效原因
   * @returns TokenError 实例
   */
  static invalid(reason?: string): TokenError {
    const details = reason ? { reason } : undefined
    return TokenError.fromCode(AuthErrorCode.TOKEN_INVALID, undefined, details)
  }

  /**
   * 创建 Token 刷新失败错误
   *
   * @param cause - 原始错误
   * @returns TokenError 实例
   */
  static refreshFailed(cause?: Error): TokenError {
    return TokenError.fromCode(AuthErrorCode.REFRESH_FAILED, cause)
  }

  /**
   * 从错误码创建 TokenError
   *
   * @param code - 错误码
   * @param cause - 原始错误
   * @param details - 错误详情
   * @returns TokenError 实例
   */
  static fromCode(
    code: AuthErrorCode,
    cause?: Error,
    details?: Record<string, any>,
  ): TokenError {
    const error = AuthError.fromCode(code, cause, details)
    return new TokenError(error.message, code, cause, details)
  }
}


