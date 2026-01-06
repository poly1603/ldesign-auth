/**
 * CSRF Token 管理器
 *
 * @module @ldesign/auth-core/security
 * @author LDesign Team
 */

import { generateUUID } from '../utils/string'

/**
 * CSRF 配置
 */
export interface CsrfConfig {
  /** Token 存储键名 */
  tokenKey?: string
  /** Token 请求头名称 */
  headerName?: string
  /** Token 有效期（毫秒） */
  tokenTTL?: number
  /** 是否自动刷新 Token */
  autoRefresh?: boolean
  /** 使用 Cookie 存储 */
  useCookie?: boolean
  /** Cookie 选项 */
  cookieOptions?: {
    path?: string
    domain?: string
    secure?: boolean
    sameSite?: 'strict' | 'lax' | 'none'
  }
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<CsrfConfig> = {
  tokenKey: 'csrf_token',
  headerName: 'X-CSRF-Token',
  tokenTTL: 24 * 60 * 60 * 1000, // 24 小时
  autoRefresh: true,
  useCookie: false,
  cookieOptions: {
    path: '/',
    secure: true,
    sameSite: 'strict',
  },
}

/**
 * Token 信息
 */
interface TokenData {
  /** Token 值 */
  token: string
  /** 创建时间 */
  createdAt: number
  /** 过期时间 */
  expiresAt: number
}

/**
 * CSRF Token 管理器
 *
 * 提供 CSRF Token 的生成、验证和自动刷新功能
 *
 * @example
 * ```ts
 * const csrfManager = new CsrfManager({
 *   tokenKey: 'csrf_token',
 *   headerName: 'X-CSRF-Token',
 *   tokenTTL: 3600000, // 1 小时
 * })
 *
 * // 获取 Token（用于表单或请求头）
 * const token = csrfManager.getToken()
 *
 * // 验证 Token
 * if (csrfManager.validateToken(incomingToken)) {
 *   // Token 有效
 * }
 *
 * // 添加到请求头
 * fetch('/api/data', {
 *   headers: csrfManager.getHeaders(),
 * })
 * ```
 */
export class CsrfManager {
  /** 配置选项 */
  private config: Required<CsrfConfig>
  /** 当前 Token 数据 */
  private tokenData: TokenData | null = null
  /** 刷新定时器 */
  private refreshTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * 创建 CSRF 管理器实例
   *
   * @param config - 配置选项
   */
  constructor(config: CsrfConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.loadToken()
  }

  /**
   * 获取 CSRF Token
   *
   * @param forceNew - 是否强制生成新 Token
   * @returns CSRF Token
   *
   * @example
   * ```ts
   * const token = csrfManager.getToken()
   * ```
   */
  getToken(forceNew = false): string {
    // 检查是否需要生成新 Token
    if (forceNew || !this.tokenData || this.isTokenExpired()) {
      this.generateToken()
    }

    return this.tokenData!.token
  }

  /**
   * 验证 CSRF Token
   *
   * @param token - 要验证的 Token
   * @returns 是否有效
   *
   * @example
   * ```ts
   * if (csrfManager.validateToken(requestToken)) {
   *   // 请求合法
   * } else {
   *   // CSRF 攻击尝试
   * }
   * ```
   */
  validateToken(token: string): boolean {
    if (!token || !this.tokenData) {
      return false
    }

    // 检查是否过期
    if (this.isTokenExpired()) {
      return false
    }

    // 使用时间安全的比较
    return this.timingSafeEqual(token, this.tokenData.token)
  }

  /**
   * 生成新 Token
   *
   * @returns 新生成的 Token
   */
  generateToken(): string {
    const now = Date.now()
    const token = this.createSecureToken()

    this.tokenData = {
      token,
      createdAt: now,
      expiresAt: now + this.config.tokenTTL,
    }

    // 保存 Token
    this.saveToken()

    // 设置自动刷新
    if (this.config.autoRefresh) {
      this.scheduleRefresh()
    }

    return token
  }

  /**
   * 获取包含 CSRF Token 的请求头
   *
   * @returns 请求头对象
   *
   * @example
   * ```ts
   * fetch('/api/data', {
   *   headers: {
   *     ...csrfManager.getHeaders(),
   *     'Content-Type': 'application/json',
   *   },
   * })
   * ```
   */
  getHeaders(): Record<string, string> {
    return {
      [this.config.headerName]: this.getToken(),
    }
  }

  /**
   * 获取用于表单的隐藏字段 HTML
   *
   * @returns HTML 字符串
   *
   * @example
   * ```ts
   * const hiddenField = csrfManager.getFormField()
   * // '<input type="hidden" name="csrf_token" value="..." />'
   * ```
   */
  getFormField(): string {
    const token = this.getToken()
    return `<input type="hidden" name="${this.config.tokenKey}" value="${token}" />`
  }

  /**
   * 刷新 Token
   *
   * @returns 新的 Token
   */
  refresh(): string {
    return this.generateToken()
  }

  /**
   * 销毁管理器，清理资源
   */
  destroy(): void {
    this.cancelRefresh()
    this.tokenData = null
    this.removeToken()
  }

  /**
   * 检查 Token 是否过期
   */
  private isTokenExpired(): boolean {
    if (!this.tokenData) return true
    return Date.now() >= this.tokenData.expiresAt
  }

  /**
   * 创建安全的随机 Token
   */
  private createSecureToken(): string {
    // 优先使用 crypto.randomUUID
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID()
    }

    // 使用 crypto.getRandomValues
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint8Array(32)
      crypto.getRandomValues(array)
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
    }

    // 回退到 UUID 生成
    return generateUUID()
  }

  /**
   * 时间安全的字符串比较
   *
   * 防止基于时间的攻击
   */
  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false
    }

    let result = 0
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }

    return result === 0
  }

  /**
   * 保存 Token 到存储
   */
  private saveToken(): void {
    if (!this.tokenData || typeof window === 'undefined') return

    const data = JSON.stringify(this.tokenData)

    if (this.config.useCookie) {
      this.setCookie(this.config.tokenKey, data)
    } else {
      try {
        sessionStorage.setItem(this.config.tokenKey, data)
      } catch {
        // 存储失败，静默处理
      }
    }
  }

  /**
   * 从存储加载 Token
   */
  private loadToken(): void {
    if (typeof window === 'undefined') return

    try {
      let data: string | null = null

      if (this.config.useCookie) {
        data = this.getCookie(this.config.tokenKey)
      } else {
        data = sessionStorage.getItem(this.config.tokenKey)
      }

      if (data) {
        this.tokenData = JSON.parse(data) as TokenData

        // 检查是否过期
        if (this.isTokenExpired()) {
          this.tokenData = null
          this.removeToken()
        } else if (this.config.autoRefresh) {
          this.scheduleRefresh()
        }
      }
    } catch {
      this.tokenData = null
    }
  }

  /**
   * 从存储移除 Token
   */
  private removeToken(): void {
    if (typeof window === 'undefined') return

    if (this.config.useCookie) {
      this.deleteCookie(this.config.tokenKey)
    } else {
      try {
        sessionStorage.removeItem(this.config.tokenKey)
      } catch {
        // 移除失败，静默处理
      }
    }
  }

  /**
   * 设置 Cookie
   */
  private setCookie(name: string, value: string): void {
    if (typeof document === 'undefined') return

    const { path, domain, secure, sameSite } = this.config.cookieOptions
    let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`

    if (path) cookie += `; path=${path}`
    if (domain) cookie += `; domain=${domain}`
    if (secure) cookie += '; secure'
    if (sameSite) cookie += `; samesite=${sameSite}`

    document.cookie = cookie
  }

  /**
   * 获取 Cookie
   */
  private getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null

    const nameEq = `${encodeURIComponent(name)}=`
    const cookies = document.cookie.split(';')

    for (const cookie of cookies) {
      const c = cookie.trim()
      if (c.startsWith(nameEq)) {
        return decodeURIComponent(c.substring(nameEq.length))
      }
    }

    return null
  }

  /**
   * 删除 Cookie
   */
  private deleteCookie(name: string): void {
    if (typeof document === 'undefined') return

    const { path, domain } = this.config.cookieOptions
    let cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 UTC`

    if (path) cookie += `; path=${path}`
    if (domain) cookie += `; domain=${domain}`

    document.cookie = cookie
  }

  /**
   * 计划 Token 刷新
   */
  private scheduleRefresh(): void {
    if (!this.tokenData) return

    this.cancelRefresh()

    // 在过期前 10% 的时间刷新
    const refreshTime = this.tokenData.expiresAt - Date.now()
    const refreshIn = Math.max(0, refreshTime * 0.9)

    this.refreshTimer = setTimeout(() => {
      this.generateToken()
    }, refreshIn)
  }

  /**
   * 取消计划的刷新
   */
  private cancelRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
  }
}
