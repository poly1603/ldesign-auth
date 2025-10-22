import type { User, TokenInfo, AuthConfig, AuthState, LoginCredentials } from '../types'

/**
 * 认证管理器
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

  private refreshTimer?: NodeJS.Timeout
  private listeners: Set<(state: AuthState) => void> = new Set()

  constructor(config: AuthConfig = {}) {
    this.config = {
      tokenKey: config.tokenKey || 'auth-token',
      userKey: config.userKey || 'auth-user',
      refreshThreshold: config.refreshThreshold || 300,
      autoRefresh: config.autoRefresh ?? true,
      loginRoute: config.loginRoute || '/login',
      redirectRoute: config.redirectRoute || '/',
    }

    // 初始化时恢复状态
    this.restoreState()
  }

  /**
   * 登录
   */
  async login(credentials: LoginCredentials): Promise<void> {
    this.updateState({ loading: true, error: null })

    try {
      // 这里需要集成 @ldesign/http 发送登录请求
      // 示例实现
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      })

      if (!response.ok) {
        throw new Error('登录失败')
      }

      const data = await response.json()
      await this.setAuth(data.user, data.token)

      this.updateState({ loading: false })
    }
    catch (error) {
      this.updateState({
        loading: false,
        error: error as Error,
      })
      throw error
    }
  }

  /**
   * 登出
   */
  async logout(): Promise<void> {
    this.clearRefreshTimer()

    // 清除本地存储
    localStorage.removeItem(this.config.tokenKey)
    localStorage.removeItem(this.config.userKey)

    this.updateState({
      isAuthenticated: false,
      user: null,
      token: null,
      error: null,
    })
  }

  /**
   * 设置认证信息
   */
  async setAuth(user: User, token: TokenInfo): Promise<void> {
    // 保存到本地存储
    localStorage.setItem(this.config.userKey, JSON.stringify(user))
    localStorage.setItem(this.config.tokenKey, JSON.stringify(token))

    this.updateState({
      isAuthenticated: true,
      user,
      token,
    })

    // 启动自动刷新
    if (this.config.autoRefresh && token.expiresIn) {
      this.startAutoRefresh(token.expiresIn)
    }
  }

  /**
   * 刷新 Token
   */
  async refreshToken(): Promise<void> {
    if (!this.state.token?.refreshToken) {
      throw new Error('No refresh token available')
    }

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken: this.state.token.refreshToken,
        }),
      })

      if (!response.ok) {
        throw new Error('Token 刷新失败')
      }

      const data = await response.json()
      await this.setAuth(this.state.user!, data.token)
    }
    catch (error) {
      // 刷新失败，清除认证
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
   * 订阅状态变化
   */
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * 恢复状态
   */
  private restoreState(): void {
    try {
      const tokenStr = localStorage.getItem(this.config.tokenKey)
      const userStr = localStorage.getItem(this.config.userKey)

      if (tokenStr && userStr) {
        const token = JSON.parse(tokenStr)
        const user = JSON.parse(userStr)

        // 检查 token 是否过期
        // 这里简化处理，实际需要解析 JWT
        this.updateState({
          isAuthenticated: true,
          user,
          token,
        })
      }
    }
    catch (error) {
      console.error('[AuthManager] Restore state error:', error)
    }
  }

  /**
   * 更新状态
   */
  private updateState(partial: Partial<AuthState>): void {
    this.state = { ...this.state, ...partial }
    this.notifyListeners()
  }

  /**
   * 通知监听器
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
   * 启动自动刷新
   */
  private startAutoRefresh(expiresIn: number): void {
    this.clearRefreshTimer()

    // 在过期前刷新（提前 refreshThreshold 秒）
    const refreshIn = Math.max(
      (expiresIn - this.config.refreshThreshold) * 1000,
      0,
    )

    this.refreshTimer = setTimeout(() => {
      this.refreshToken().catch((error) => {
        console.error('[AuthManager] Auto refresh error:', error)
      })
    }, refreshIn)
  }

  /**
   * 清除刷新定时器
   */
  private clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = undefined
    }
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.clearRefreshTimer()
    this.listeners.clear()
  }
}

/**
 * 创建认证管理器
 */
export function createAuthManager(config?: AuthConfig): AuthManager {
  return new AuthManager(config)
}

