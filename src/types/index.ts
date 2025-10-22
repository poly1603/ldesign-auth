/**
 * 用户信息接口
 */
export interface User {
  /**
   * 用户ID
   */
  id: string | number

  /**
   * 用户名
   */
  username?: string

  /**
   * 邮箱
   */
  email?: string

  /**
   * 角色
   */
  roles?: string[]

  /**
   * 权限
   */
  permissions?: string[]

  /**
   * 其他自定义字段
   */
  [key: string]: any
}

/**
 * Token 信息
 */
export interface TokenInfo {
  /**
   * Access Token
   */
  accessToken: string

  /**
   * Refresh Token
   */
  refreshToken?: string

  /**
   * 过期时间（秒）
   */
  expiresIn?: number

  /**
   * Token 类型
   * @default 'Bearer'
   */
  tokenType?: string
}

/**
 * 认证配置
 */
export interface AuthConfig {
  /**
   * Token 存储键名
   * @default 'auth-token'
   */
  tokenKey?: string

  /**
   * 用户信息存储键名
   * @default 'auth-user'
   */
  userKey?: string

  /**
   * Token 刷新阈值（秒）
   * @default 300 (5分钟)
   */
  refreshThreshold?: number

  /**
   * 是否自动刷新 Token
   * @default true
   */
  autoRefresh?: boolean

  /**
   * 登录页路由
   * @default '/login'
   */
  loginRoute?: string

  /**
   * 登录成功后重定向路由
   * @default '/'
   */
  redirectRoute?: string
}

/**
 * 登录凭据
 */
export interface LoginCredentials {
  /**
   * 用户名或邮箱
   */
  username: string

  /**
   * 密码
   */
  password: string

  /**
   * 记住我
   */
  rememberMe?: boolean

  /**
   * MFA 验证码
   */
  mfaCode?: string
}

/**
 * OAuth 配置
 */
export interface OAuthConfig {
  /**
   * Client ID
   */
  clientId: string

  /**
   * 授权端点
   */
  authorizationEndpoint: string

  /**
   * Token 端点
   */
  tokenEndpoint: string

  /**
   * 重定向 URI
   */
  redirectUri: string

  /**
   * Scope
   */
  scope?: string

  /**
   * Response Type
   * @default 'code'
   */
  responseType?: 'code' | 'token'
}

/**
 * 认证状态
 */
export interface AuthState {
  /**
   * 是否已认证
   */
  isAuthenticated: boolean

  /**
   * 当前用户
   */
  user: User | null

  /**
   * Token 信息
   */
  token: TokenInfo | null

  /**
   * 是否正在加载
   */
  loading: boolean

  /**
   * 错误信息
   */
  error: Error | null
}

