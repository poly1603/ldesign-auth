/**
 * 认证管理器
 *
 * 核心认证管理类，负责登录、登出、用户状态管理和权限验证
 *
 * @module @ldesign/auth-core/auth
 * @author LDesign Team
 */

import type {
  AuthConfig,
  AuthError,
  AuthEventListener,
  AuthEventMap,
  AuthEventType,
  AuthState,
  Credentials,
  PermissionCheckOptions,
  RoleCheckOptions,
  TokenInfo,
  User,
} from '../types'
import { SessionStatus } from '../types'
import { TokenManager } from '../token/TokenManager'
import { SessionManager } from '../session/SessionManager'
import { TokenRefreshQueue } from '../token/TokenRefreshQueue'

/**
 * 登录结果接口
 */
export interface LoginResult {
  /** 是否成功 */
  success: boolean
  /** 用户信息 */
  user?: User
  /** Token 信息 */
  token?: TokenInfo
  /** 错误信息 */
  error?: AuthError
}

/**
 * 登录处理函数类型
 */
export type LoginHandler = (credentials: Credentials) => Promise<LoginResult>

/**
 * 刷新 Token 处理函数类型
 */
export type RefreshTokenHandler = (refreshToken: string) => Promise<TokenInfo | null>

/**
 * 获取用户信息处理函数类型
 */
export type FetchUserHandler = () => Promise<User | null>

/**
 * 默认认证配置
 */
const DEFAULT_CONFIG: AuthConfig = {
  autoRefresh: true,
  refreshThreshold: 300, // 5 分钟
  loginRoute: '/login',
  defaultRoute: '/',
  whiteList: ['/login', '/register', '/forgot-password'],
}

/**
 * 认证管理器类
 *
 * @example
 * ```ts
 * const authManager = new AuthManager({
 *   autoRefresh: true,
 *   refreshThreshold: 300,
 * })
 *
 * // 设置登录处理器
 * authManager.setLoginHandler(async (credentials) => {
 *   const response = await api.login(credentials)
 *   return {
 *     success: true,
 *     user: response.user,
 *     token: response.token,
 *   }
 * })
 *
 * // 登录
 * const result = await authManager.login({
 *   username: 'admin',
 *   password: '123456',
 * })
 *
 * // 检查权限
 * if (authManager.hasPermission('user:create')) {
 *   // 有权限
 * }
 * ```
 */
export class AuthManager {
  /** 认证配置 */
  private config: AuthConfig
  /** Token 管理器 */
  private tokenManager: TokenManager
  /** 会话管理器 */
  private sessionManager: SessionManager
  /** Token 刷新队列 */
  private refreshQueue: TokenRefreshQueue
  /** 当前用户 */
  private currentUser: User | null = null
  /** 加载状态 */
  private loading = false
  /** 错误信息 */
  private error: AuthError | null = null
  /** 事件监听器 */
  private eventListeners = new Map<AuthEventType, Set<AuthEventListener>>()
  /** 登录处理器 */
  private loginHandler: LoginHandler | null = null
  /** 刷新 Token 处理器 */
  private refreshTokenHandler: RefreshTokenHandler | null = null
  /** 获取用户信息处理器 */
  private fetchUserHandler: FetchUserHandler | null = null
  /** Token 刷新定时器 */
  private refreshTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * 创建认证管理器实例
   *
   * @param config - 认证配置
   */
  constructor(config: AuthConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.tokenManager = new TokenManager(config.tokenStorage)
    this.sessionManager = new SessionManager()
    this.refreshQueue = new TokenRefreshQueue()

    // 监听会话过期
    this.sessionManager.onExpired(() => {
      this.emit('session:expired', undefined)
      this.logout()
    })

    // 初始化时检查 Token 状态
    this.initializeAuth()
  }

  /**
   * 初始化认证状态
   */
  private async initializeAuth(): Promise<void> {
    if (this.tokenManager.hasToken()) {
      // 检查 Token 是否过期
      if (this.tokenManager.isTokenExpired()) {
        await this.tryRefreshToken()
      }
      else {
        // 设置自动刷新
        this.scheduleTokenRefresh()
      }
    }
  }

  /**
   * 设置登录处理器
   *
   * @param handler - 登录处理函数
   */
  setLoginHandler(handler: LoginHandler): void {
    this.loginHandler = handler
  }

  /**
   * 设置刷新 Token 处理器
   *
   * @param handler - 刷新 Token 处理函数
   */
  setRefreshTokenHandler(handler: RefreshTokenHandler): void {
    this.refreshTokenHandler = handler
  }

  /**
   * 设置获取用户信息处理器
   *
   * @param handler - 获取用户信息处理函数
   */
  setFetchUserHandler(handler: FetchUserHandler): void {
    this.fetchUserHandler = handler
  }

  /**
   * 用户登录
   *
   * @param credentials - 用户凭证
   * @returns 登录结果
   */
  async login(credentials: Credentials): Promise<LoginResult> {
    if (!this.loginHandler) {
      return {
        success: false,
        error: { code: 'NO_LOGIN_HANDLER', message: '未设置登录处理器' },
      }
    }

    this.loading = true
    this.error = null

    try {
      const result = await this.loginHandler(credentials)

      if (result.success && result.token) {
        // 保存 Token
        this.tokenManager.setToken(result.token)

        // 保存用户信息
        if (result.user) {
          this.currentUser = result.user
        }

        // 创建会话
        this.sessionManager.createSession()

        // 设置自动刷新
        this.scheduleTokenRefresh()

        // 触发登录事件
        this.emit('login', { user: result.user!, token: result.token })

        // 触发配置的回调
        this.config.onLogin?.(result.user!, result.token)
      }
      else {
        this.error = result.error ?? { code: 'LOGIN_FAILED', message: '登录失败' }
        this.emit('error', this.error)
      }

      return result
    }
    catch (err) {
      const error: AuthError = {
        code: 'LOGIN_ERROR',
        message: err instanceof Error ? err.message : '登录过程发生错误',
        details: err,
      }
      this.error = error
      this.emit('error', error)

      return { success: false, error }
    }
    finally {
      this.loading = false
    }
  }

  /**
   * 用户登出
   */
  async logout(): Promise<void> {
    // 清除 Token
    this.tokenManager.clearToken()

    // 销毁会话
    this.sessionManager.destroySession()

    // 清除用户信息
    this.currentUser = null

    // 取消刷新定时器
    this.cancelTokenRefresh()

    // 触发登出事件
    this.emit('logout', undefined)

    // 触发配置的回调
    this.config.onLogout?.()
  }

  /**
   * 尝试刷新 Token
   *
   * @returns 是否刷新成功
   */
  private async tryRefreshToken(): Promise<boolean> {
    const refreshToken = this.tokenManager.getRefreshToken()

    if (!refreshToken || !this.refreshTokenHandler) {
      this.emit('token:expired', undefined)
      this.config.onTokenExpired?.()
      return false
    }

    try {
      // 使用刷新队列防止并发重复请求
      const newToken = await this.refreshQueue.refresh(async () => {
        return await this.refreshTokenHandler!(refreshToken)
      })

      if (newToken) {
        this.tokenManager.setToken(newToken)
        this.scheduleTokenRefresh()
        this.emit('token:refresh', newToken)
        this.config.onTokenRefreshed?.(newToken)
        return true
      }
    }
    catch {
      // 刷新失败
    }

    this.emit('token:expired', undefined)
    this.config.onTokenExpired?.()
    return false
  }

  /**
   * 计划 Token 刷新
   */
  private scheduleTokenRefresh(): void {
    if (!this.config.autoRefresh) return

    this.cancelTokenRefresh()

    const remainingTime = this.tokenManager.getTokenRemainingTime()
    if (remainingTime <= 0) return

    // 在过期前 refreshThreshold 秒刷新
    const threshold = (this.config.refreshThreshold ?? 300) * 1000
    const refreshIn = Math.max(0, remainingTime * 1000 - threshold)

    this.refreshTimer = setTimeout(() => {
      this.tryRefreshToken()
    }, refreshIn)
  }

  /**
   * 取消 Token 刷新
   */
  private cancelTokenRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
  }

  /**
   * 获取当前认证状态
   *
   * @returns 认证状态
   */
  getState(): AuthState {
    return {
      isAuthenticated: this.isAuthenticated(),
      isLoading: this.loading,
      user: this.currentUser,
      token: this.tokenManager.getTokenInfo(),
      session: this.sessionManager.getSession(),
      error: this.error,
    }
  }

  /**
   * 检查是否已认证
   *
   * @returns 是否已认证
   */
  isAuthenticated(): boolean {
    return this.tokenManager.hasToken() && !this.tokenManager.isTokenExpired()
  }

  /**
   * 获取当前用户
   *
   * @returns 当前用户信息
   */
  getUser(): User | null {
    return this.currentUser
  }

  /**
   * 设置当前用户
   *
   * @param user - 用户信息
   */
  setUser(user: User): void {
    this.currentUser = user
    this.emit('user:updated', user)
  }

  /**
   * 获取访问令牌
   *
   * @returns 访问令牌
   */
  getAccessToken(): string | null {
    return this.tokenManager.getAccessToken()
  }

  /**
   * 检查是否拥有指定权限
   *
   * @param permissions - 权限或权限数组
   * @param options - 检查选项
   * @returns 是否拥有权限
   */
  hasPermission(
    permissions: string | string[],
    options: PermissionCheckOptions = {},
  ): boolean {
    const userPermissions = this.currentUser?.permissions ?? []
    const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions]
    const { mode = 'all' } = options

    if (requiredPermissions.length === 0) return true
    if (userPermissions.length === 0) return false

    if (mode === 'all') {
      return requiredPermissions.every(p => userPermissions.includes(p))
    }
    return requiredPermissions.some(p => userPermissions.includes(p))
  }

  /**
   * 检查是否拥有指定角色
   *
   * @param roles - 角色或角色数组
   * @param options - 检查选项
   * @returns 是否拥有角色
   */
  hasRole(roles: string | string[], options: RoleCheckOptions = {}): boolean {
    const userRoles = this.currentUser?.roles ?? []
    const requiredRoles = Array.isArray(roles) ? roles : [roles]
    const { mode = 'all' } = options

    if (requiredRoles.length === 0) return true
    if (userRoles.length === 0) return false

    if (mode === 'all') {
      return requiredRoles.every(r => userRoles.includes(r))
    }
    return requiredRoles.some(r => userRoles.includes(r))
  }

  /**
   * 检查路由是否在白名单中
   *
   * @param path - 路由路径
   * @returns 是否在白名单中
   */
  isWhitelisted(path: string): boolean {
    const whiteList = this.config.whiteList ?? []
    return whiteList.some((pattern) => {
      if (pattern.endsWith('*')) {
        return path.startsWith(pattern.slice(0, -1))
      }
      return path === pattern
    })
  }

  /**
   * 注册事件监听器
   *
   * @param event - 事件类型
   * @param listener - 监听器函数
   * @returns 取消监听的函数
   */
  on<K extends keyof AuthEventMap>(
    event: K,
    listener: AuthEventListener<AuthEventMap[K]>,
  ): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(listener as AuthEventListener)

    return () => {
      this.eventListeners.get(event)?.delete(listener as AuthEventListener)
    }
  }

  /**
   * 触发事件
   *
   * @param event - 事件类型
   * @param data - 事件数据
   */
  private emit<K extends keyof AuthEventMap>(event: K, data: AuthEventMap[K]): void {
    this.eventListeners.get(event)?.forEach(listener => listener(data))
  }

  /**
   * 获取 Token 管理器
   *
   * @returns Token 管理器实例
   */
  getTokenManager(): TokenManager {
    return this.tokenManager
  }

  /**
   * 获取会话管理器
   *
   * @returns 会话管理器实例
   */
  getSessionManager(): SessionManager {
    return this.sessionManager
  }

  /**
   * 销毁管理器，清理资源
   */
  destroy(): void {
    this.cancelTokenRefresh()
    this.sessionManager.destroy()
    this.refreshQueue.destroy()
    this.eventListeners.clear()
  }
}

