/**
 * 认证错误码定义
 */

/**
 * 认证错误码枚举
 */
export enum AuthErrorCode {
  // 通用错误 (AUTH_0xx)
  /** 未知错误 */
  UNKNOWN_ERROR = 'AUTH_000',
  /** 无效的配置 */
  INVALID_CONFIG = 'AUTH_001',
  /** 操作被取消 */
  OPERATION_CANCELLED = 'AUTH_002',

  // 认证错误 (AUTH_1xx)
  /** 无效的凭据 */
  INVALID_CREDENTIALS = 'AUTH_100',
  /** 用户未找到 */
  USER_NOT_FOUND = 'AUTH_101',
  /** 密码错误 */
  WRONG_PASSWORD = 'AUTH_102',
  /** 账号已锁定 */
  ACCOUNT_LOCKED = 'AUTH_103',
  /** 账号已禁用 */
  ACCOUNT_DISABLED = 'AUTH_104',
  /** 账号未激活 */
  ACCOUNT_NOT_ACTIVATED = 'AUTH_105',
  /** 认证失败 */
  AUTHENTICATION_FAILED = 'AUTH_106',
  /** 未认证 */
  NOT_AUTHENTICATED = 'AUTH_107',

  // Token 错误 (AUTH_2xx)
  /** Token 已过期 */
  TOKEN_EXPIRED = 'AUTH_200',
  /** Token 无效 */
  TOKEN_INVALID = 'AUTH_201',
  /** Token 刷新失败 */
  REFRESH_FAILED = 'AUTH_202',
  /** 无效的 Token 格式 */
  INVALID_TOKEN_FORMAT = 'AUTH_203',
  /** Token 已被撤销 */
  TOKEN_REVOKED = 'AUTH_204',
  /** 缺少 Token */
  MISSING_TOKEN = 'AUTH_205',
  /** 无效的 Refresh Token */
  INVALID_REFRESH_TOKEN = 'AUTH_206',

  // 网络错误 (AUTH_3xx)
  /** 网络错误 */
  NETWORK_ERROR = 'AUTH_300',
  /** 请求超时 */
  REQUEST_TIMEOUT = 'AUTH_301',
  /** 服务器错误 */
  SERVER_ERROR = 'AUTH_302',
  /** API 不可用 */
  API_UNAVAILABLE = 'AUTH_303',
  /** 连接失败 */
  CONNECTION_FAILED = 'AUTH_304',

  // 验证错误 (AUTH_4xx)
  /** 验证失败 */
  VALIDATION_FAILED = 'AUTH_400',
  /** 缺少必需字段 */
  MISSING_REQUIRED_FIELD = 'AUTH_401',
  /** 无效的参数 */
  INVALID_PARAMETER = 'AUTH_402',
  /** 无效的邮箱格式 */
  INVALID_EMAIL_FORMAT = 'AUTH_403',
  /** 密码强度不足 */
  WEAK_PASSWORD = 'AUTH_404',

  // OAuth 错误 (AUTH_5xx)
  /** OAuth 授权失败 */
  OAUTH_AUTHORIZATION_FAILED = 'AUTH_500',
  /** 无效的授权码 */
  INVALID_AUTHORIZATION_CODE = 'AUTH_501',
  /** OAuth 提供商错误 */
  OAUTH_PROVIDER_ERROR = 'AUTH_502',
  /** 无效的 State 参数 */
  INVALID_STATE = 'AUTH_503',
  /** PKCE 验证失败 */
  PKCE_VERIFICATION_FAILED = 'AUTH_504',
  /** 不支持的 OAuth 提供商 */
  UNSUPPORTED_OAUTH_PROVIDER = 'AUTH_505',

  // MFA 错误 (AUTH_6xx)
  /** MFA 验证失败 */
  MFA_VERIFICATION_FAILED = 'AUTH_600',
  /** 无效的 MFA 代码 */
  INVALID_MFA_CODE = 'AUTH_601',
  /** MFA 未设置 */
  MFA_NOT_SETUP = 'AUTH_602',
  /** MFA 已设置 */
  MFA_ALREADY_SETUP = 'AUTH_603',
  /** 无效的备用码 */
  INVALID_BACKUP_CODE = 'AUTH_604',

  // Session 错误 (AUTH_7xx)
  /** Session 已过期 */
  SESSION_EXPIRED = 'AUTH_700',
  /** Session 无效 */
  SESSION_INVALID = 'AUTH_701',
  /** Session 未找到 */
  SESSION_NOT_FOUND = 'AUTH_702',

  // 权限错误 (AUTH_8xx)
  /** 权限被拒绝 */
  PERMISSION_DENIED = 'AUTH_800',
  /** 角色不足 */
  INSUFFICIENT_ROLE = 'AUTH_801',
  /** 权限不足 */
  INSUFFICIENT_PERMISSION = 'AUTH_802',

  // 存储错误 (AUTH_9xx)
  /** 存储错误 */
  STORAGE_ERROR = 'AUTH_900',
  /** 存储不可用 */
  STORAGE_UNAVAILABLE = 'AUTH_901',
  /** 存储已满 */
  STORAGE_FULL = 'AUTH_902',
}

/**
 * 错误码对应的默认消息
 */
export const AuthErrorMessages: Record<AuthErrorCode, string> = {
  // 通用错误
  [AuthErrorCode.UNKNOWN_ERROR]: '未知错误',
  [AuthErrorCode.INVALID_CONFIG]: '无效的配置',
  [AuthErrorCode.OPERATION_CANCELLED]: '操作已取消',

  // 认证错误
  [AuthErrorCode.INVALID_CREDENTIALS]: '用户名或密码错误',
  [AuthErrorCode.USER_NOT_FOUND]: '用户不存在',
  [AuthErrorCode.WRONG_PASSWORD]: '密码错误',
  [AuthErrorCode.ACCOUNT_LOCKED]: '账号已被锁定，请联系管理员',
  [AuthErrorCode.ACCOUNT_DISABLED]: '账号已被禁用',
  [AuthErrorCode.ACCOUNT_NOT_ACTIVATED]: '账号未激活，请先激活账号',
  [AuthErrorCode.AUTHENTICATION_FAILED]: '认证失败',
  [AuthErrorCode.NOT_AUTHENTICATED]: '未登录，请先登录',

  // Token 错误
  [AuthErrorCode.TOKEN_EXPIRED]: 'Token 已过期，请重新登录',
  [AuthErrorCode.TOKEN_INVALID]: 'Token 无效',
  [AuthErrorCode.REFRESH_FAILED]: 'Token 刷新失败',
  [AuthErrorCode.INVALID_TOKEN_FORMAT]: 'Token 格式无效',
  [AuthErrorCode.TOKEN_REVOKED]: 'Token 已被撤销',
  [AuthErrorCode.MISSING_TOKEN]: '缺少 Token',
  [AuthErrorCode.INVALID_REFRESH_TOKEN]: '无效的 Refresh Token',

  // 网络错误
  [AuthErrorCode.NETWORK_ERROR]: '网络错误，请检查网络连接',
  [AuthErrorCode.REQUEST_TIMEOUT]: '请求超时',
  [AuthErrorCode.SERVER_ERROR]: '服务器错误',
  [AuthErrorCode.API_UNAVAILABLE]: 'API 服务不可用',
  [AuthErrorCode.CONNECTION_FAILED]: '连接失败',

  // 验证错误
  [AuthErrorCode.VALIDATION_FAILED]: '验证失败',
  [AuthErrorCode.MISSING_REQUIRED_FIELD]: '缺少必需字段',
  [AuthErrorCode.INVALID_PARAMETER]: '参数无效',
  [AuthErrorCode.INVALID_EMAIL_FORMAT]: '邮箱格式无效',
  [AuthErrorCode.WEAK_PASSWORD]: '密码强度不足',

  // OAuth 错误
  [AuthErrorCode.OAUTH_AUTHORIZATION_FAILED]: 'OAuth 授权失败',
  [AuthErrorCode.INVALID_AUTHORIZATION_CODE]: '无效的授权码',
  [AuthErrorCode.OAUTH_PROVIDER_ERROR]: 'OAuth 提供商错误',
  [AuthErrorCode.INVALID_STATE]: 'State 参数无效',
  [AuthErrorCode.PKCE_VERIFICATION_FAILED]: 'PKCE 验证失败',
  [AuthErrorCode.UNSUPPORTED_OAUTH_PROVIDER]: '不支持的 OAuth 提供商',

  // MFA 错误
  [AuthErrorCode.MFA_VERIFICATION_FAILED]: 'MFA 验证失败',
  [AuthErrorCode.INVALID_MFA_CODE]: 'MFA 代码无效',
  [AuthErrorCode.MFA_NOT_SETUP]: 'MFA 未设置',
  [AuthErrorCode.MFA_ALREADY_SETUP]: 'MFA 已设置',
  [AuthErrorCode.INVALID_BACKUP_CODE]: '备用码无效',

  // Session 错误
  [AuthErrorCode.SESSION_EXPIRED]: 'Session 已过期',
  [AuthErrorCode.SESSION_INVALID]: 'Session 无效',
  [AuthErrorCode.SESSION_NOT_FOUND]: 'Session 未找到',

  // 权限错误
  [AuthErrorCode.PERMISSION_DENIED]: '权限被拒绝',
  [AuthErrorCode.INSUFFICIENT_ROLE]: '角色权限不足',
  [AuthErrorCode.INSUFFICIENT_PERMISSION]: '权限不足',

  // 存储错误
  [AuthErrorCode.STORAGE_ERROR]: '存储错误',
  [AuthErrorCode.STORAGE_UNAVAILABLE]: '存储不可用',
  [AuthErrorCode.STORAGE_FULL]: '存储空间已满',
}


