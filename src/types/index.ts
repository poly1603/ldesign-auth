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
   * 手机号
   */
  phone?: string

  /**
   * 昵称
   */
  nickname?: string

  /**
   * 头像 URL
   */
  avatar?: string

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

  /**
   * Scope
   */
  scope?: string
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

  /**
   * API 基础 URL
   */
  baseURL?: string

  /**
   * API 端点配置
   */
  endpoints?: AuthEndpoints
}

/**
 * API 端点配置
 */
export interface AuthEndpoints {
  /**
   * 登录端点
   * @default '/api/auth/login'
   */
  login?: string

  /**
   * 登出端点
   * @default '/api/auth/logout'
   */
  logout?: string

  /**
   * 刷新 Token 端点
   * @default '/api/auth/refresh'
   */
  refresh?: string

  /**
   * 获取用户信息端点
   * @default '/api/auth/user'
   */
  userInfo?: string

  /**
   * 注册端点
   * @default '/api/auth/register'
   */
  register?: string
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

  /**
   * 其他自定义字段
   */
  [key: string]: any
}

/**
 * 登录响应
 */
export interface LoginResponse {
  /**
   * 用户信息
   */
  user: User

  /**
   * Token 信息
   */
  token: TokenInfo
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
   * Client Secret (仅服务端使用)
   */
  clientSecret?: string

  /**
   * 授权端点
   */
  authorizationEndpoint: string

  /**
   * Token 端点
   */
  tokenEndpoint: string

  /**
   * 用户信息端点
   */
  userInfoEndpoint?: string

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

  /**
   * 是否使用 PKCE
   * @default false
   */
  usePKCE?: boolean
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

/**
 * 认证事件类型
 */
export type AuthEventType =
  | 'userLoaded'
  | 'userUnloaded'
  | 'accessTokenExpiring'
  | 'accessTokenExpired'
  | 'refreshTokenExpired'
  | 'sessionTimeout'
  | 'error'
  | 'loginSuccess'
  | 'loginFailed'
  | 'logoutSuccess'
  | 'tokenRefreshed'

/**
 * 认证事件处理器
 */
export type AuthEventHandler<T = any> = (data: T) => void | Promise<void>

/**
 * 认证事件映射
 */
export interface AuthEventMap {
  userLoaded: User
  userUnloaded: void
  accessTokenExpiring: TokenInfo
  accessTokenExpired: void
  refreshTokenExpired: void
  sessionTimeout: void
  error: Error
  loginSuccess: LoginResponse
  loginFailed: Error
  logoutSuccess: void
  tokenRefreshed: TokenInfo
}
