/**
 * 安全工具模块导出
 *
 * @module @ldesign/auth-core/security
 * @author LDesign Team
 */

export {
  checkPasswordStrength,
  validatePassword,
  generateSecurePassword,
  type PasswordStrength,
  type PasswordValidationResult,
  type PasswordConfig,
} from './password'

export {
  escapeHtml,
  sanitizeInput,
  validateInput,
  type SanitizeOptions,
} from './xss'

export {
  CsrfManager,
  type CsrfConfig,
} from './csrf'

export {
  RateLimiter,
  type RateLimiterConfig,
} from './rateLimiter'

export {
  SecureStorage,
  type SecureStorageConfig,
} from './secureStorage'
