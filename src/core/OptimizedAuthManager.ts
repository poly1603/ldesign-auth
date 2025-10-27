/**
 * 优化的认证管理器 - 改进内存管理和性能
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
import { OptimizedTokenManager } from '../token/OptimizedTokenManager'
import { OptimizedSessionManager } from '../session/OptimizedSessionManager'
import { OptimizedEventEmitter } from '../events/OptimizedEventEmitter'
import { OptimizedJWTParser } from '../jwt/OptimizedJWTParser'
import { AuthError, AuthErrorCode } from '../errors'
import { AUTH_DEFAULTS, API_ENDPOINTS, ROUTES, MEMORY_LIMITS, PERFORMANCE_CONFIG } from '../constants'
import { DisposableManager } from '../utils/DisposableManager'
import { AuthMetricsCollector } from '../monitoring/AuthMetrics'
import { MemoryMonitor, getGlobalMemoryMonitor } from '../monitoring/MemoryMonitor'
import { ObjectPool } from '../utils/memory/ObjectPool'

/**
 * 状态更新对象池
 */
const stateUpdatePool = new ObjectPool<Partial<AuthState>>({
  factory: () => ({}),
  reset: (obj) => {
    // 清空对象的所有属性
    for (const key in obj) {
      delete obj[key]
    }
  },
  maxSize: MEMORY_LIMITS.OBJECT_POOL_SIZE
})

export class OptimizedAuthManager {
  private config: Required<AuthConfig>
  private state: AuthState = {
    isAuthenticated: false,
    user: null,
    token: null,
    loading: false,
    error: null,
  }

  private httpClient?: HttpClient
  private tokenManager: OptimizedTokenManager
  private sessionManager: OptimizedSessionManager
  private events: OptimizedEventEmitter
  private jwtParser: OptimizedJWTParser
  private cacheManager?: CacheManager

  private listeners: Set<(state: AuthState) => void> = new Set()
  private disposables: DisposableManager = new DisposableManager()
  private metrics: AuthMetricsCollector = new AuthMetricsCollector()
  private memoryMonitor?: MemoryMonitor
  private pendingStateUpdate = false
  private maxListeners = MEMORY_LIMITS.MAX_GLOBAL_LISTENERS

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

    // 初始化优化的组件
    this.tokenManager = new OptimizedTokenManager(
      {
        tokenKey: this.config.tokenKey,
        refreshThreshold: this.config.refreshThreshold,
        autoRefresh: this.config.autoRefresh,
        refreshEndpoint: this.config.endpoints.refresh,
      },
      httpClient,
      cacheManager,
    )

    this.sessionManager = new OptimizedSessionManager({
      timeout: AUTH_DEFAULTS.SESSION_TIMEOUT,
      monitorActivity: true,
      enableTabSync: true,
    })

    this.events = new OptimizedEventEmitter({
      maxListenersPerEvent: MEMORY_LIMITS.MAX_LISTENERS_PER_EVENT,
      globalMaxListeners: MEMORY_LIMITS.MAX_GLOBAL_LISTENERS,
    })

    this.jwtParser = new OptimizedJWTParser({
      cacheEnabled: PERFORMANCE_CONFIG.ENABLE_TOKEN_PARSE_CACHE,
      cacheSize: MEMORY_LIMITS.TOKEN_PARSE_CACHE_SIZE,
    })

    // 设置内存监控
    if (PERFORMANCE_CONFIG.ENABLE_MEMORY_MONITORING) {
      this.memoryMonitor = getGlobalMemoryMonitor()
      this.setupMemoryMonitoring()
    }

    // 设置事件监听
    this.setupEventListeners()

    // 初始化时恢复状态
    this.restoreState()
  }

  /**
   * 设置内存监控
   */
  private setupMemoryMonitoring(): void {
    if (!this.memoryMonitor) return

    // 注册组件大小计算
    this.memoryMonitor.registerComponent('authListeners', () => this.listeners.size)
    this.memoryMonitor.registerComponent('authEvents', () => this.events.listenerCount())
    this.memoryMonitor.registerComponent('tokenCache', () => this.jwtParser.getCacheStats().decodeCacheSize)
    this.memoryMonitor.registerComponent('tokenBlacklist', () => this.tokenManager.getBlacklist().size())
    this.memoryMonitor.registerComponent('sessionTimers', () => this.sessionManager.getActiveTimersCount())

    // 开始监控
    this.memoryMonitor.startMonitoring(MEMORY_LIMITS.MEMORY_MONITOR_INTERVAL)

    // 定期检查内存泄漏
    const checkInterval = this.disposables.setInterval(() => {
      if (this.memoryMonitor?.detectMemoryLeak(MEMORY_LIMITS.MEMORY_LEAK_THRESHOLD_MB)) {
        console.warn('[AuthManager] Possible memory leak detected', this.memoryMonitor.generateReport())
      }
    }, 5 * 60 * 1000) // 5分钟检查一次
  }

  /**
   * 设置事件监听（优化版）
   */
  private setupEventListeners(): void {
    // Token 刷新
    this.disposables.add(
      this.tokenManager.onRefresh((token) => {
        this.updateState({ token })
        this.events.emit('tokenRefreshed', token)
      })
    )

    // Token 过期
    this.disposables.add(
      this.tokenManager.onExpired(() => {
        this.events.emit('accessTokenExpired', undefined)
        this.logout()
      })
    )

    // Session 超时
    this.disposables.add(
      this.sessionManager.onTimeout(() => {
        this.events.emit('sessionTimeout', undefined)
        this.metrics.recordSessionTimeout()
        this.logout()
      })
    )
  }

  /**
   * 登录（保持原有接口）
   */
  async login(credentials: LoginCredentials): Promise<void> {
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

      const response = await this.httpClient.post<LoginResponse>(
        this.config.endpoints.login,
        credentials,
      )

      await this.setAuth(response.user, response.token)
      this.events.emit('loginSuccess', response)
      this.updateState({ loading: false })
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

      this.events.emit('loginFailed', authError)
      this.metrics.recordLogin(false, timer.elapsed())
      throw authError
    }
  }

  /**
   * 登出（优化版）
   */
  async logout(): Promise<void> {
    try {
      if (this.httpClient && this.state.token) {
        try {
          await this.httpClient.post(this.config.endpoints.logout, {
            token: this.state.token.accessToken,
          })
        }
        catch (error) {
          console.warn('[AuthManager] Logout API error:', error)
        }
      }
    }
    finally {
      await this.tokenManager.clear(undefined, true)

      if (this.cacheManager) {
        await this.cacheManager.remove(this.config.userKey).catch(() => { })
      }

      this.sessionManager.deactivate()

      this.updateState({
        isAuthenticated: false,
        user: null,
        token: null,
        error: null,
      })

      this.events.emit('userUnloaded', undefined)
      this.events.emit('logoutSuccess', undefined)
      this.metrics.recordLogout()
    }
  }

  /**
   * 设置认证信息
   */
  async setAuth(user: User, token: TokenInfo): Promise<void> {
    this.tokenManager.store(token)

    if (this.cacheManager) {
      const ttl = token.expiresIn ? token.expiresIn * 1000 : undefined
      await this.cacheManager.set(this.config.userKey, user, { ttl }).catch((error) => {
        console.warn('[AuthManager] Cache user failed:', error)
      })
    }

    this.sessionManager.activate()

    this.updateState({
      isAuthenticated: true,
      user,
      token,
    })

    this.events.emit('userLoaded', user)
  }

  /**
   * 刷新 Token
   */
  async refreshToken(): Promise<void> {
    const timer = this.metrics.startTimer()

    try {
      const newToken = await this.tokenManager.refresh()
      this.updateState({ token: newToken })
      this.events.emit('tokenRefreshed', newToken)
      this.metrics.recordTokenRefresh(true, timer.elapsed())
    }
    catch (error) {
      this.metrics.recordTokenRefresh(false, timer.elapsed())
      await this.logout()
      throw error
    }
  }

  /**
   * 获取当前状态
   */
  getState(): AuthState {
    return { ...this.state }
  }

  /**
   * 获取当前用户
   */
  getUser(): User | null {
    return this.state.user
  }

  /**
   * 获取 Access Token
   */
  getAccessToken(): string | null {
    return this.state.token?.accessToken || null
  }

  /**
   * 检查是否已认证
   */
  isAuthenticated(): boolean {
    return this.state.isAuthenticated
  }

  /**
   * 获取用户信息
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
      this.updateState({ user })

      if (this.cacheManager) {
        await this.cacheManager.set(this.config.userKey, user).catch(() => { })
      }

      return user
    }
    catch (error) {
      throw AuthError.fromCode(AuthErrorCode.SERVER_ERROR, error as Error)
    }
  }

  /**
   * 订阅状态变化（带监听器限制）
   */
  subscribe(listener: (state: AuthState) => void): () => void {
    if (this.listeners.size >= this.maxListeners) {
      console.warn(`[AuthManager] Listener limit (${this.maxListeners}) reached`)
      return () => { }
    }

    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * 设置 API 端点
   */
  setEndpoints(endpoints: Partial<AuthEndpoints>): void {
    this.config.endpoints = {
      ...this.config.endpoints,
      ...endpoints,
    }
  }

  /**
   * 设置 HTTP 客户端
   */
  setHttpClient(httpClient: HttpClient): void {
    this.httpClient = httpClient
    this.tokenManager.setHttpClient(httpClient)
  }

  /**
   * 获取事件发射器
   */
  getEvents(): OptimizedEventEmitter {
    return this.events
  }

  /**
   * 获取 Session 管理器
   */
  getSessionManager(): OptimizedSessionManager {
    return this.sessionManager
  }

  /**
   * 获取 Token 管理器
   */
  getTokenManager(): OptimizedTokenManager {
    return this.tokenManager
  }

  /**
   * 恢复状态
   */
  private async restoreState(): Promise<void> {
    try {
      const token = await this.tokenManager.load()
      if (!token) return

      if (!(await this.tokenManager.validate(token))) {
        await this.tokenManager.clear()
        return
      }

      let user: User | null = null

      if (this.cacheManager) {
        user = await this.cacheManager.get<User>(this.config.userKey)
      }

      if (!user && this.httpClient) {
        try {
          user = await this.getUserInfo()
        }
        catch (error) {
          await this.tokenManager.clear()
          return
        }
      }

      if (user) {
        this.updateState({
          isAuthenticated: true,
          user,
          token,
        })
        this.sessionManager.activate()
        this.events.emit('userLoaded', user)
      }
    }
    catch (error) {
      console.error('[AuthManager] Restore state error:', error)
      await this.tokenManager.clear()
    }
  }

  /**
   * 更新状态（优化版，使用 queueMicrotask）
   */
  private updateState(partial: Partial<AuthState>): void {
    // 使用对象池获取状态更新对象
    const update = PERFORMANCE_CONFIG.ENABLE_OBJECT_POOL
      ? stateUpdatePool.acquire()
      : {}

    Object.assign(update, partial)
    this.state = { ...this.state, ...update }

    if (PERFORMANCE_CONFIG.ENABLE_OBJECT_POOL) {
      stateUpdatePool.release(update)
    }

    if (!this.pendingStateUpdate) {
      this.pendingStateUpdate = true

      if (PERFORMANCE_CONFIG.USE_MICROTASK_BATCHING && typeof queueMicrotask !== 'undefined') {
        queueMicrotask(() => {
          this.pendingStateUpdate = false
          this.notifyListeners()
        })
      } else {
        // 降级到 setTimeout
        setTimeout(() => {
          this.pendingStateUpdate = false
          this.notifyListeners()
        }, 0)
      }
    }
  }

  /**
   * 通知监听器
   */
  private notifyListeners(): void {
    const stateSnapshot = this.getState()
    this.listeners.forEach((listener) => {
      try {
        listener(stateSnapshot)
      }
      catch (error) {
        console.error('[AuthManager] Listener error:', error)
      }
    })
  }

  /**
   * 获取性能指标
   */
  getMetrics() {
    const baseMetrics = this.metrics.getMetrics()
    const memoryReport = this.memoryMonitor?.generateReport()

    return {
      ...baseMetrics,
      memory: memoryReport,
      listenerCount: this.listeners.size,
      eventListenerCount: this.events.listenerCount(),
      tokenCacheSize: this.jwtParser.getCacheStats().decodeCacheSize,
      blacklistSize: this.tokenManager.getBlacklist().size(),
    }
  }

  /**
   * 销毁管理器
   */
  async destroy(): Promise<void> {
    // 清理内存监控
    if (this.memoryMonitor) {
      this.memoryMonitor.unregisterComponent('authListeners')
      this.memoryMonitor.unregisterComponent('authEvents')
      this.memoryMonitor.unregisterComponent('tokenCache')
      this.memoryMonitor.unregisterComponent('tokenBlacklist')
      this.memoryMonitor.unregisterComponent('sessionTimers')
    }

    // 清理所有资源
    await this.disposables.dispose()

    // 清理组件
    this.tokenManager.destroy()
    this.sessionManager.destroy()
    this.events.destroy()
    this.jwtParser.clearCache()

    // 清理监听器
    this.listeners.clear()
  }
}

/**
 * 创建优化的认证管理器
 */
export function createOptimizedAuthManager(
  config?: AuthConfig,
  httpClient?: HttpClient,
  cacheManager?: CacheManager,
): OptimizedAuthManager {
  return new OptimizedAuthManager(config, httpClient, cacheManager)
}

