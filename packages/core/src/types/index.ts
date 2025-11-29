/**
 * 认证系统核心类型定义
 *
 * @module @ldesign/auth-core/types
 * @author LDesign Team
 */

// ==================== 用户相关类型 ====================

/**
 * 用户信息接口
 */
export interface User {
  /** 用户 ID */
  id: string | number
  /** 用户名 */
  username: string
  /** 邮箱 */
  email?: string
  /** 头像 */
  avatar?: string
  /** 昵称 */
  nickname?: string
  /** 角色列表 */
  roles?: string[]
  /** 权限列表 */
  permissions?: string[]
  /** 扩展字段 */
  [key: string]: unknown
}

/**
 * 用户凭证接口
 */
export interface Credentials {
  /** 用户名或邮箱 */
  username: string
  /** 密码 */
  password: string
  /** 记住我 */
  rememberMe?: boolean
  /** 验证码 */
  captcha?: string
}

// ==================== Token 相关类型 ====================

/**
 * Token 信息接口
 */
export interface TokenInfo {
  /** 访问令牌 */
  accessToken: string
  /** 刷新令牌 */
  refreshToken?: string
  /** 令牌类型 */
  tokenType?: string
  /** 过期时间（秒） */
  expiresIn?: number
  /** 过期时间戳（毫秒） */
  expiresAt?: number
  /** 作用域 */
  scope?: string
}

/**
 * Token 存储选项
 */
export interface TokenStorageOptions {
  /** 存储键名前缀 */
  prefix?: string
  /** 访问令牌键名 */
  accessTokenKey?: string
  /** 刷新令牌键名 */
  refreshTokenKey?: string
  /** 存储类型 */
  storage?: 'localStorage' | 'sessionStorage' | 'memory' | 'cookie'
  /** Cookie 选项 */
  cookieOptions?: CookieOptions
}

/**
 * Cookie 选项
 */
export interface CookieOptions {
  /** 路径 */
  path?: string
  /** 域名 */
  domain?: string
  /** 过期时间 */
  expires?: Date | number
  /** 安全标志 */
  secure?: boolean
  /** SameSite 属性 */
  sameSite?: 'strict' | 'lax' | 'none'
  /** HttpOnly 标志 */
  httpOnly?: boolean
}

// ==================== 会话相关类型 ====================

/**
 * 会话状态枚举
 */
export enum SessionStatus {
  /** 活跃 */
  ACTIVE = 'active',
  /** 已过期 */
  EXPIRED = 'expired',
  /** 已注销 */
  LOGGED_OUT = 'logged_out',
  /** 未认证 */
  UNAUTHENTICATED = 'unauthenticated',
}

/**
 * 会话信息接口
 */
export interface SessionInfo {
  /** 会话 ID */
  id?: string
  /** 会话状态 */
  status: SessionStatus
  /** 创建时间 */
  createdAt?: number
  /** 最后活动时间 */
  lastActivityAt?: number
  /** 过期时间 */
  expiresAt?: number
  /** 设备信息 */
  deviceInfo?: DeviceInfo
}

/**
 * 设备信息接口
 */
export interface DeviceInfo {
  /** 设备 ID */
  deviceId?: string
  /** 设备类型 */
  deviceType?: 'desktop' | 'mobile' | 'tablet'
  /** 浏览器 */
  browser?: string
  /** 操作系统 */
  os?: string
  /** IP 地址 */
  ip?: string
}

// ==================== 认证配置类型 ====================

/**
 * 认证配置接口
 */
export interface AuthConfig {
  /** Token 存储选项 */
  tokenStorage?: TokenStorageOptions
  /** 自动刷新 Token */
  autoRefresh?: boolean
  /** Token 刷新阈值（秒），在过期前多少秒刷新 */
  refreshThreshold?: number
  /** 登录页路由 */
  loginRoute?: string
  /** 登录成功后的默认路由 */
  defaultRoute?: string
  /** 白名单路由（不需要认证） */
  whiteList?: string[]
  /** API 配置 */
  api?: AuthApiConfig
  /** 事件回调 */
  onLogin?: (user: User, token: TokenInfo) => void
  /** 登出回调 */
  onLogout?: () => void
  /** Token 过期回调 */
  onTokenExpired?: () => void
  /** Token 刷新回调 */
  onTokenRefreshed?: (token: TokenInfo) => void
}

/**
 * 认证 API 配置
 */
export interface AuthApiConfig {
  /** 登录接口 */
  login?: string
  /** 登出接口 */
  logout?: string
  /** 获取用户信息接口 */
  userInfo?: string
  /** 刷新 Token 接口 */
  refreshToken?: string
  /** 注册接口 */
  register?: string
}

// ==================== 认证状态类型 ====================

/**
 * 认证状态接口
 */
export interface AuthState {
  /** 是否已认证 */
  isAuthenticated: boolean
  /** 是否正在加载 */
  isLoading: boolean
  /** 当前用户 */
  user: User | null
  /** Token 信息 */
  token: TokenInfo | null
  /** 会话信息 */
  session: SessionInfo | null
  /** 错误信息 */
  error: AuthError | null
}

/**
 * 认证错误接口
 */
export interface AuthError {
  /** 错误码 */
  code: string
  /** 错误消息 */
  message: string
  /** 错误详情 */
  details?: unknown
}

// ==================== 权限相关类型 ====================

/**
 * 权限检查选项
 */
export interface PermissionCheckOptions {
  /** 检查模式：all - 需要全部权限，any - 需要任一权限 */
  mode?: 'all' | 'any'
}

/**
 * 角色检查选项
 */
export interface RoleCheckOptions {
  /** 检查模式：all - 需要全部角色，any - 需要任一角色 */
  mode?: 'all' | 'any'
}

// ==================== 事件类型 ====================

/**
 * 认证事件类型
 */
export type AuthEventType =
  | 'login'
  | 'logout'
  | 'token:refresh'
  | 'token:expired'
  | 'session:expired'
  | 'user:updated'
  | 'error'

/**
 * 认证事件监听器
 */
export type AuthEventListener<T = unknown> = (data: T) => void

/**
 * 认证事件映射
 */
export interface AuthEventMap {
  login: { user: User; token: TokenInfo }
  logout: void
  'token:refresh': TokenInfo
  'token:expired': void
  'session:expired': void
  'user:updated': User
  error: AuthError
}

