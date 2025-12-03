/**
 * 错误处理模块导出
 *
 * @module @ldesign/auth-core/errors
 * @author LDesign Team
 */

export { AuthError } from './AuthError'
export { AuthErrorCode, ErrorCodeCategory, isRetryableError, getErrorCategory } from './errorCodes'
export { ErrorHandler } from './ErrorHandler'
export type { ErrorHandlerFunction, ErrorHandlerConfig } from './ErrorHandler'