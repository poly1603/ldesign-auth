/**
 * 认证管理器
 *
 * 整合所有认证功能的核心管理器
 */

import type { HttpClient } from '@ldesign/http'
import type { CacheManager } from '@ldesign/cache'
import type {
  AuthConfig,
  AuthEndpoints,
  AuthState,
  LoginCredentials,
  LoginResponse,
  TokenInfo,
  User,
} from '../types'
import { TokenManager } from '../token/TokenManager'
import { SessionManager } from '../session/SessionManager'
import { AuthEventEmitter } from '../events/EventEmitter'
import { JWTParser } from '../jwt/parser'
import { AuthError, AuthErrorCode, TokenError } from '../errors'
import { AUTH_DEFAULTS, API_ENDPOINTS, ROUTES } from '../constants'
import { DisposableManager } from '../utils/DisposableManager'
import { AuthMetricsCollector, PerformanceTimer } from '../monitoring/AuthMetrics'

/**
 * 认证管理器类
 */
export class AuthManager {
  private config: Required<AuthConfig>
  private state: AuthState = {
    isAuthenticated: false,
    user: null,
    token: null,
    loading: false,
    error: null,
  }

  private httpClient?: HttpClient
  private tokenManager: TokenManager
  private sessionManager: SessionManager
  private events: AuthEventEmitter
  private jwtParser: JWTParser
  private cacheManager?: CacheManager

  private listeners: Set<(state: AuthState) => void> = new Set()
  private disposables: DisposableManager = new DisposableManager()
  private metrics: AuthMetricsCollector = new AuthMetricsCollector()
  private notificationTimer?: NodeJS.Timeout

  constructor(
    config: AuthConfig = {},
    httpClient?: HttpClient,
    cacheManager?: CacheManager,
  ) {
    // 合并配置
    this.config = {
      tokenKey: config.tokenKey || AUTH_DEFAULTS.TOKEN_KEY,
      userKey: config.userKey || AUTH_DEFAULTS.USER_KEY,
      refreshThreshold: config.refreshThreshold || AUTH_DEFAULTS.REFRESH_THRESHOLD,
      autoRefresh: config.autoRefresh !== undefined ? config.autoRefresh : true,
      loginRoute: config.loginRoute || ROUTES.LOGIN,
      redirectRoute: config.redirectRoute || ROUTES.REDIRECT,
      baseURL: config.baseURL || '',
      endpoints: {
        login: config.endpoints?.login || API_ENDPOINTS.LOGIN,
        logout: config.endpoints?.logout || API_ENDPOINTS.LOGOUT,
        refresh: config.endpoints?.refresh || API_ENDPOINTS.REFRESH,
        userInfo: config.endpoints?.userInfo || API_ENDPOINTS.USER_INFO,
        register: config.endpoints?.register || API_ENDPOINTS.REGISTER,
      },
    }

    this.httpClient = httpClient
    this.cacheManager = cacheManager

    // 初始化组件
    this.tokenManager = new TokenManager(
      {
        tokenKey: this.config.tokenKey,
        refreshThreshold: this.config.refreshThreshold,
        autoRefresh: this.config.autoRefresh,
        refreshEndpoint: this.config.endpoints.refresh,
      },
      httpClient,
      cacheManager,
    )

    this.sessionManager = new SessionManager({
      timeout: AUTH_DEFAULTS.SESSION_TIMEOUT,
      monitorActivity: true,
      enableTabSync: true,
    })

    this.events = new AuthEventEmitter()
    this.jwtParser = new JWTParser()

    // 设置事件监听
    this.setupEventListeners()

    // 初始化时恢复状态
    this.restoreState()
  }

  /**
   * 设置事件监听
   * @private
   */
  private setupEventListeners(): void {
    // 监听 Token 刷新
    this.tokenManager.onRefresh((token) => {
      this.updateState({ token })
      this.events.emit('tokenRefreshed', token)
    })

    // 监听 Token 过期
    this.tokenManager.onExpired(() => {
      this.events.emit('accessTokenExpired', undefined)
      this.logout()
    })

    // 监听 Session 超时
    this.sessionManager.onTimeout(() => {
      this.events.emit('sessionTimeout', undefined)
      this.metrics.recordSessionTimeout()
      this.logout()
    })
  }

  /**
   * 登录
   *
   * @param credentials - 登录凭据
   * @returns Promise
   *
   * @example
   * ```typescript
   * const auth = createAuthManager(config, httpClient)
   * await auth.login({
   *   username: 'user@example.com',
   *   password: 'password123',
   * })
   * ```
   */
  async login(credentials: LoginCredentials): Promise<void> {
    // 开始性能计时
    const timer = this.metrics.startTimer()

    this.updateState({ loading: true, error: null })

    try {
      if (!this.httpClient) {
        throw AuthError.fromCode(
          AuthErrorCode.INVALID_CONFIG,
          undefined,
          { reason: 'HttpClient is required' },
        )
      }

      // 发送登录请求
      const response = await this.httpClient.post<LoginResponse>(
        this.config.endpoints.login,
        credentials,
      )

      // 设置认证信息
      await this.setAuth(response.user, response.token)

      // 触发登录成功事件
      this.events.emit('loginSuccess', response)

      this.updateState({ loading: false })

      // 记录登录成功指标
      this.metrics.recordLogin(true, timer.elapsed())
    }
    catch (error) {
      const authError = error instanceof AuthError
        ? error
        : AuthError.fromCode(AuthErrorCode.AUTHENTICATION_FAILED, error as Error)

      this.updateState({
        loading: false,
        error: authError,
      })

      // 触发登录失败事件
      this.events.emit('loginFailed', authError)

      // 记录登录失败指标
      this.metrics.recordLogin(false, timer.elapsed())

      throw authError
    }
  }

  /**
   * 登出
   *
   * @example
   * ```typescript
   * const auth = createAuthManager()
   * await auth.logout()
   * ```
   */
  async logout(): Promise<void> {
    try {
      // 调用登出 API（可选）
      if (this.httpClient && this.state.token) {
        try {
          await this.httpClient.post(this.config.endpoints.logout, {
            token: this.state.token.accessToken,
          })
        }
        catch (error) {
          // 忽略登出 API 错误
          console.warn('[AuthManager] Logout API error:', error)
        }
      }
    }
    finally {
      // 清除 Token（并加入黑名单）
      await this.tokenManager.clear(undefined, true)

      // 清除缓存的用户信息
      if (this.cacheManager) {
        await this.cacheManager.remove(this.config.userKey).catch(() => {
          // 忽略缓存清除错误
        })
      }

      // 停用 Session
      this.sessionManager.deactivate()

      // 更新状态
      this.updateState({
        isAuthenticated: false,
        user: null,
        token: null,
        error: null,
      })

      // 触发用户退出事件
      this.events.emit('userUnloaded', undefined)
      this.events.emit('logoutSuccess', undefined)

      // 记录登出指标
      this.metrics.recordLogout()
    }
  }

  /**
   * 设置认证信息
   *
   * @param user - 用户信息
   * @param token - Token 信息
   *
   * @example
   * ```typescript
   * const auth = createAuthManager()
   * await auth.setAuth(user, token)
   * ```
   */
  async setAuth(user: User, token: TokenInfo): Promise<void> {
    // 存储 Token
    this.tokenManager.store(token)

    // 缓存用户信息
    if (this.cacheManager) {
      const ttl = token.expiresIn ? token.expiresIn * 1000 : undefined
      await this.cacheManager.set(this.config.userKey, user, { ttl }).catch((error) => {
        console.warn('[AuthManager] Cache user failed:', error)
      })
    }

    // 激活 Session
    this.sessionManager.activate()

    // 更新状态
    this.updateState({
      isAuthenticated: true,
      user,
      token,
    })

    // 触发用户加载事件
    this.events.emit('userLoaded', user)
  }

  /**
   * 刷新 Token
   *
   * @example
   * ```typescript
   * const auth = createAuthManager()
   * await auth.refreshToken()
   * ```
   */
  async refreshToken(): Promise<void> {
    const timer = this.metrics.startTimer()

    try {
      const newToken = await this.tokenManager.refresh()

      // 更新状态
      this.updateState({ token: newToken })

      // 触发刷新事件
      this.events.emit('tokenRefreshed', newToken)

      // 记录刷新成功指标
      this.metrics.recordTokenRefresh(true, timer.elapsed())
    }
    catch (error) {
      // 记录刷新失败指标
      this.metrics.recordTokenRefresh(false, timer.elapsed())

      // 刷新失败，清除认证
      await this.logout()
      throw error
    }
  }

  /**
   * 获取当前状态
   *
   * @returns 认证状态
   */
  getState(): AuthState {
    return { ...this.state }
  }

  /**
   * 获取当前用户
   *
   * @returns 用户信息，如果未登录返回 null
   */
  getUser(): User | null {
    return this.state.user
  }

  /**
   * 获取 Access Token
   *
   * @returns Access Token，如果未登录返回 null
   */
  getAccessToken(): string | null {
    return this.state.token?.accessToken || null
  }

  /**
   * 检查是否已认证
   *
   * @returns 是否已认证
   */
  isAuthenticated(): boolean {
    return this.state.isAuthenticated
  }

  /**
   * 获取用户信息（从服务器）
   *
   * @returns 用户信息
   *
   * @example
   * ```typescript
   * const auth = createAuthManager(config, httpClient)
   * const user = await auth.getUserInfo()
   * ```
   */
  async getUserInfo(): Promise<User> {
    if (!this.httpClient) {
      throw AuthError.fromCode(AuthErrorCode.INVALID_CONFIG)
    }

    if (!this.state.isAuthenticated) {
      throw AuthError.fromCode(AuthErrorCode.NOT_AUTHENTICATED)
    }

    try {
      const user = await this.httpClient.get<User>(this.config.endpoints.userInfo)

      // 更新用户信息
      this.updateState({ user })

      // 缓存用户信息
      if (this.cacheManager) {
        await this.cacheManager.set(this.config.userKey, user).catch(() => {
          // 忽略缓存错误
        })
      }

      return user
    }
    catch (error) {
      throw AuthError.fromCode(
        AuthErrorCode.SERVER_ERROR,
        error as Error,
      )
    }
  }

  /**
   * 订阅状态变化
   *
   * @param listener - 状态监听器
   * @returns 取消订阅的函数
   *
   * @example
   * ```typescript
   * const auth = createAuthManager()
   * const unsubscribe = auth.subscribe((state) => {
   *   console.log('Auth state changed:', state)
   * })
   *
   * // 取消订阅
   * unsubscribe()
   * ```
   */
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * 设置 API 端点
   *
   * @param endpoints - API 端点配置
   *
   * @example
   * ```typescript
   * const auth = createAuthManager()
   * auth.setEndpoints({
   *   login: '/api/v2/auth/login',
   *   logout: '/api/v2/auth/logout',
   * })
   * ```
   */
  setEndpoints(endpoints: Partial<AuthEndpoints>): void {
    this.config.endpoints = {
      ...this.config.endpoints,
      ...endpoints,
    }
  }

  /**
   * 设置 HTTP 客户端
   *
   * @param httpClient - HTTP 客户端实例
   *
   * @example
   * ```typescript
   * import { createHttpClient } from '@ldesign/http'
   *
   * const auth = createAuthManager()
   * const httpClient = createHttpClient({ baseURL: 'https://api.example.com' })
   * auth.setHttpClient(httpClient)
   * ```
   */
  setHttpClient(httpClient: HttpClient): void {
    this.httpClient = httpClient
  }

  /**
   * 获取事件发射器
   *
   * 用于监听认证事件
   *
   * @returns 事件发射器实例
   *
   * @example
   * ```typescript
   * const auth = createAuthManager()
   * const events = auth.getEvents()
   *
   * events.on('userLoaded', (user) => {
   *   console.log('User loaded:', user)
   * })
   * ```
   */
  getEvents(): AuthEventEmitter {
    return this.events
  }

  /**
   * 获取 Session 管理器
   *
   * @returns Session 管理器实例
   */
  getSessionManager(): SessionManager {
    return this.sessionManager
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
   * 恢复状态
   *
   * 从存储中恢复认证状态
   *
   * @private
   */
  private async restoreState(): Promise<void> {
    try {
      // 加载 Token
      const token = await this.tokenManager.load()

      if (!token) {
        return
      }

      // 验证 Token
      if (!(await this.tokenManager.validate(token))) {
        // Token 无效，清除
        await this.tokenManager.clear()
        return
      }

      // 加载用户信息
      let user: User | null = null

      // 先从缓存中读取
      if (this.cacheManager) {
        user = await this.cacheManager.get<User>(this.config.userKey)
      }

      // 如果缓存没有，尝试从服务器获取
      if (!user && this.httpClient) {
        try {
          user = await this.getUserInfo()
        }
        catch (error) {
          // 获取用户信息失败，清除认证
          await this.tokenManager.clear()
          return
        }
      }

      if (user) {
        // 恢复认证状态
        this.updateState({
          isAuthenticated: true,
          user,
          token,
        })

        // 激活 Session
        this.sessionManager.activate()

        // 触发用户加载事件
        this.events.emit('userLoaded', user)
      }
    }
    catch (error) {
      console.error('[AuthManager] Restore state error:', error)
      // 恢复失败，清除状态
      await this.tokenManager.clear()
    }
  }

  /**
   * 更新状态（批处理优化）
   *
   * @param partial - 部分状态
   * @private
   */
  private updateState(partial: Partial<AuthState>): void {
    this.state = { ...this.state, ...partial }
    this.scheduleNotification()
  }

  /**
   * 调度状态通知（批处理）
   * 
   * 使用微任务批处理多个状态更新，避免频繁触发监听器
   * @private
   */
  private scheduleNotification(): void {
    if (this.notificationTimer) {
      return
    }

    this.notificationTimer = setTimeout(() => {
      this.notifyListeners()
      this.notificationTimer = undefined
    }, AUTH_DEFAULTS.STATE_UPDATE_BATCH_DELAY)

    // 添加到资源管理器
    this.disposables.add(() => {
      if (this.notificationTimer) {
        clearTimeout(this.notificationTimer)
        this.notificationTimer = undefined
      }
    })
  }

  /**
   * 通知监听器
   *
   * @private
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.state)
      }
      catch (error) {
        console.error('[AuthManager] Listener error:', error)
      }
    })
  }

  /**
   * 销毁管理器
   *
   * 清理所有资源
   */
  destroy(): void {
    // 使用 DisposableManager 统一清理
    this.disposables.dispose()

    this.tokenManager.destroy()
    this.sessionManager.destroy()
    this.events.removeAllListeners()
    this.listeners.clear()
  }

  /**
   * 获取性能指标
   *
   * @returns 性能指标数据
   *
   * @example
   * ```typescript
   * const auth = createAuthManager()
   * const metrics = auth.getMetrics()
   * console.log('登录成功率:', metrics.loginSuccesses / metrics.loginAttempts)
   * ```
   */
  getMetrics() {
    return this.metrics.getMetrics()
  }

  /**
   * 获取指标收集器
   *
   * @returns 指标收集器实例
   */
  getMetricsCollector(): AuthMetricsCollector {
    return this.metrics
  }
}

/**
 * 创建认证管理器
 *
 * @param config - 认证配置
 * @param httpClient - HTTP 客户端（用于 API 请求）
 * @param cacheManager - 缓存管理器（用于缓存）
 * @returns 认证管理器实例
 *
 * @example
 * ```typescript
 * import { createAuthManager } from '@ldesign/auth'
 * import { createHttpClient } from '@ldesign/http'
 * import { createCache } from '@ldesign/cache'
 *
 * const httpClient = createHttpClient({
 *   baseURL: 'https://api.example.com',
 * })
 *
 * const cache = createCache()
 *
 * const auth = createAuthManager(
 *   {
 *     autoRefresh: true,
 *     refreshThreshold: 300,
 *     endpoints: {
 *       login: '/api/auth/login',
 *       logout: '/api/auth/logout',
 *     },
 *   },
 *   httpClient,
 *   cache,
 * )
 *
 * // 登录
 * await auth.login({
 *   username: 'user@example.com',
 *   password: 'password123',
 * })
 *
 * // 获取用户信息
 * const user = auth.getUser()
 * console.log('Current user:', user)
 *
 * // 监听状态变化
 * auth.subscribe((state) => {
 *   console.log('Auth state changed:', state)
 * })
 *
 * // 登出
 * await auth.logout()
 * ```
 */
export function createAuthManager(
  config?: AuthConfig,
  httpClient?: HttpClient,
  cacheManager?: CacheManager,
): AuthManager {
  return new AuthManager(config, httpClient, cacheManager)
}
