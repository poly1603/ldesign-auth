/**
 * 认证错误码枚举
 *
 * @module @ldesign/auth-core/errors
 * @author LDesign Team
 */

/**
 * 认证错误码
 * 
 * 定义所有可能的认证错误类型
 */
export enum AuthErrorCode {
  // ==================== 认证错误 ====================
  /** 无效的凭证（用户名或密码错误） */
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  /** 未认证（需要登录） */
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  /** 认证失败 */
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  /** 登录失败 */
  LOGIN_FAILED = 'LOGIN_FAILED',
  /** 登出失败 */
  LOGOUT_FAILED = 'LOGOUT_FAILED',

  // ==================== Token 错误 ====================
  /** Token 已过期 */
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  /** Token 无效 */
  TOKEN_INVALID = 'TOKEN_INVALID',
  /** Token 刷新失败 */
  TOKEN_REFRESH_FAILED = 'TOKEN_REFRESH_FAILED',
  /** Token 不存在 */
  TOKEN_NOT_FOUND = 'TOKEN_NOT_FOUND',
  /** Token 格式错误 */
  TOKEN_MALFORMED = 'TOKEN_MALFORMED',

  // ==================== 权限错误 ====================
  /** 权限被拒绝 */
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  /** 需要特定角色 */
  ROLE_REQUIRED = 'ROLE_REQUIRED',
  /** 访问被禁止 */
  FORBIDDEN = 'FORBIDDEN',
  /** 权限不足 */
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // ==================== 会话错误 ====================
  /** 会话已过期 */
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  /** 会话无效 */
  SESSION_INVALID = 'SESSION_INVALID',
  /** 会话不存在 */
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  /** 会话超时 */
  SESSION_TIMEOUT = 'SESSION_TIMEOUT',

  // ==================== 配置错误 ====================
  /** 未设置登录处理器 */
  NO_LOGIN_HANDLER = 'NO_LOGIN_HANDLER',
  /** 未设置刷新 Token 处理器 */
  NO_REFRESH_HANDLER = 'NO_REFRESH_HANDLER',
  /** 未设置用户信息处理器 */
  NO_USER_HANDLER = 'NO_USER_HANDLER',
  /** 配置无效 */
  INVALID_CONFIG = 'INVALID_CONFIG',

  // ==================== 网络错误 ====================
  /** 网络错误 */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** 请求超时 */
  TIMEOUT = 'TIMEOUT',
  /** 服务器错误 */
  SERVER_ERROR = 'SERVER_ERROR',
  /** 请求失败 */
  REQUEST_FAILED = 'REQUEST_FAILED',

  // ==================== 用户错误 ====================
  /** 用户不存在 */
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  /** 用户已被禁用 */
  USER_DISABLED = 'USER_DISABLED',
  /** 用户被锁定 */
  USER_LOCKED = 'USER_LOCKED',

  // ==================== 验证错误 ====================
  /** 验证失败 */
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  /** 参数无效 */
  INVALID_PARAMS = 'INVALID_PARAMS',
  /** 验证码错误 */
  INVALID_CAPTCHA = 'INVALID_CAPTCHA',
  /** 验证码过期 */
  CAPTCHA_EXPIRED = 'CAPTCHA_EXPIRED',

  // ==================== 其他错误 ====================
  /** 未知错误 */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  /** 内部错误 */
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  /** 操作失败 */
  OPERATION_FAILED = 'OPERATION_FAILED',
}

/**
 * 错误码分类
 */
export const ErrorCodeCategory = {
  /** 认证相关错误 */
  AUTHENTICATION: [
    AuthErrorCode.INVALID_CREDENTIALS,
    AuthErrorCode.UNAUTHENTICATED,
    AuthErrorCode.AUTHENTICATION_FAILED,
    AuthErrorCode.LOGIN_FAILED,
    AuthErrorCode.LOGOUT_FAILED,
  ],
  /** Token 相关错误 */
  TOKEN: [
    AuthErrorCode.TOKEN_EXPIRED,
    AuthErrorCode.TOKEN_INVALID,
    AuthErrorCode.TOKEN_REFRESH_FAILED,
    AuthErrorCode.TOKEN_NOT_FOUND,
    AuthErrorCode.TOKEN_MALFORMED,
  ],
  /** 权限相关错误 */
  PERMISSION: [
    AuthErrorCode.PERMISSION_DENIED,
    AuthErrorCode.ROLE_REQUIRED,
    AuthErrorCode.FORBIDDEN,
    AuthErrorCode.INSUFFICIENT_PERMISSIONS,
  ],
  /** 会话相关错误 */
  SESSION: [
    AuthErrorCode.SESSION_EXPIRED,
    AuthErrorCode.SESSION_INVALID,
    AuthErrorCode.SESSION_NOT_FOUND,
    AuthErrorCode.SESSION_TIMEOUT,
  ],
  /** 可重试的错误 */
  RETRYABLE: [
    AuthErrorCode.NETWORK_ERROR,
    AuthErrorCode.TIMEOUT,
    AuthErrorCode.SERVER_ERROR,
    AuthErrorCode.TOKEN_REFRESH_FAILED,
  ],
} as const

/**
 * 判断错误码是否可重试
 *
 * @param code - 错误码
 * @returns 是否可重试
 */
export function isRetryableError(code: AuthErrorCode): boolean {
  return (ErrorCodeCategory.RETRYABLE as readonly AuthErrorCode[]).includes(code)
}

/**
 * 获取错误码的分类
 *
 * @param code - 错误码
 * @returns 错误分类名称
 */
export function getErrorCategory(code: AuthErrorCode): string {
  for (const [category, codes] of Object.entries(ErrorCodeCategory)) {
    if ((codes as readonly AuthErrorCode[]).includes(code)) {
      return category
    }
  }
  return 'UNKNOWN'
}