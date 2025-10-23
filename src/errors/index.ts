/**
 * 错误处理模块
 *
 * 提供完整的错误类型和错误码定义
 *
 * @example
 * ```typescript
 * import { AuthError, TokenError, AuthErrorCode } from '@ldesign/auth/errors'
 *
 * // 抛出认证错误
 * throw AuthError.fromCode(AuthErrorCode.INVALID_CREDENTIALS)
 *
 * // 抛出 Token 错误
 * throw TokenError.expired()
 *
 * // 捕获错误
 * try {
 *   await auth.login(credentials)
 * } catch (error) {
 *   if (error instanceof AuthError) {
 *     console.error(`[${error.code}] ${error.message}`)
 *   }
 * }
 * ```
 */

// 导出错误码
export { AuthErrorCode, AuthErrorMessages } from './codes'

// 导出错误类
export { AuthError } from './AuthError'
export { TokenError } from './TokenError'
export { NetworkError } from './NetworkError'
export { ValidationError } from './ValidationError'
export type { ValidationErrorField } from './ValidationError'

/**
 * 判断是否为 AuthError
 *
 * @param error - 错误对象
 * @returns 是否为 AuthError
 */
export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError
}

/**
 * 判断是否为 TokenError
 *
 * @param error - 错误对象
 * @returns 是否为 TokenError
 */
export function isTokenError(error: unknown): error is TokenError {
  return error instanceof TokenError
}

/**
 * 判断是否为 NetworkError
 *
 * @param error - 错误对象
 * @returns 是否为 NetworkError
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError
}

/**
 * 判断是否为 ValidationError
 *
 * @param error - 错误对象
 * @returns 是否为 ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError
}


