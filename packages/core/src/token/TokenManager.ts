/**
 * Token 管理器
 *
 * 负责 Token 的存储、获取、刷新和验证
 *
 * @module @ldesign/auth-core/token
 * @author LDesign Team
 */

import type { TokenInfo, TokenStorageOptions } from '../types'

/**
 * Token 存储接口
 */
export interface ITokenStorage {
  /** 获取值 */
  get(key: string): string | null
  /** 设置值 */
  set(key: string, value: string): void
  /** 删除值 */
  remove(key: string): void
  /** 清空所有 */
  clear(): void
}

/**
 * 内存存储实现
 */
class MemoryStorage implements ITokenStorage {
  private store = new Map<string, string>()

  get(key: string): string | null {
    return this.store.get(key) ?? null
  }

  set(key: string, value: string): void {
    this.store.set(key, value)
  }

  remove(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }
}

/**
 * 默认 Token 存储选项
 */
const DEFAULT_OPTIONS: Required<TokenStorageOptions> = {
  prefix: 'ldesign_auth_',
  accessTokenKey: 'access_token',
  refreshTokenKey: 'refresh_token',
  storage: 'localStorage',
  cookieOptions: {
    path: '/',
    secure: true,
    sameSite: 'lax',
  },
}

/**
 * Token 管理器类
 *
 * @example
 * ```ts
 * const tokenManager = new TokenManager({
 *   storage: 'localStorage',
 *   prefix: 'my_app_',
 * })
 *
 * // 保存 Token
 * tokenManager.setToken({
 *   accessToken: 'xxx',
 *   refreshToken: 'yyy',
 *   expiresIn: 3600,
 * })
 *
 * // 获取 Token
 * const token = tokenManager.getAccessToken()
 *
 * // 检查是否过期
 * if (tokenManager.isTokenExpired()) {
 *   // 刷新 Token
 * }
 * ```
 */
export class TokenManager {
  /** 存储选项 */
  private options: Required<TokenStorageOptions>
  /** 存储实例 */
  private storage: ITokenStorage
  /** Token 信息缓存 */
  private tokenInfo: TokenInfo | null = null
  /** 缓存是否有效（脏标记） */
  private cacheValid = false

  /**
   * 创建 Token 管理器实例
   *
   * @param options - 存储选项
   */
  constructor(options: TokenStorageOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
    this.storage = this.createStorage()
    this.loadFromStorage()
  }

  /**
   * 创建存储实例
   */
  private createStorage(): ITokenStorage {
    const { storage } = this.options

    // 服务端渲染环境使用内存存储
    if (typeof window === 'undefined') {
      return new MemoryStorage()
    }

    switch (storage) {
      case 'localStorage':
        return {
          get: (key: string) => localStorage.getItem(key),
          set: (key: string, value: string) => localStorage.setItem(key, value),
          remove: (key: string) => localStorage.removeItem(key),
          clear: () => {
            const { prefix } = this.options
            Object.keys(localStorage)
              .filter(key => key.startsWith(prefix))
              .forEach(key => localStorage.removeItem(key))
          },
        }
      case 'sessionStorage':
        return {
          get: (key: string) => sessionStorage.getItem(key),
          set: (key: string, value: string) => sessionStorage.setItem(key, value),
          remove: (key: string) => sessionStorage.removeItem(key),
          clear: () => {
            const { prefix } = this.options
            Object.keys(sessionStorage)
              .filter(key => key.startsWith(prefix))
              .forEach(key => sessionStorage.removeItem(key))
          },
        }
      case 'memory':
      default:
        return new MemoryStorage()
    }
  }

  /**
   * 获取完整的存储键名
   */
  private getKey(key: string): string {
    return `${this.options.prefix}${key}`
  }

  /**
   * 从存储中加载 Token 信息
   */
  private loadFromStorage(): void {
    const accessToken = this.storage.get(this.getKey(this.options.accessTokenKey))
    const refreshToken = this.storage.get(this.getKey(this.options.refreshTokenKey))
    const expiresAtStr = this.storage.get(this.getKey('expires_at'))

    if (accessToken) {
      this.tokenInfo = {
        accessToken,
        refreshToken: refreshToken ?? undefined,
        expiresAt: expiresAtStr ? Number.parseInt(expiresAtStr, 10) : undefined,
      }
      this.cacheValid = true
    }
    else {
      this.tokenInfo = null
      this.cacheValid = false
    }
  }

  /**
   * 设置 Token 信息
   *
   * @param token - Token 信息
   */
  setToken(token: TokenInfo): void {
    // 计算过期时间戳
    const expiresAt = token.expiresAt ?? (token.expiresIn
      ? Date.now() + token.expiresIn * 1000
      : undefined)

    // 更新缓存
    this.tokenInfo = {
      ...token,
      expiresAt,
    }
    this.cacheValid = true

    // 异步保存到存储（非阻塞）
    queueMicrotask(() => {
      this.saveToStorage(token, expiresAt)
    })
  }

  /**
   * 保存 Token 到存储
   *
   * @param token - Token 信息
   * @param expiresAt - 过期时间戳
   */
  private saveToStorage(token: TokenInfo, expiresAt?: number): void {
    try {
      this.storage.set(this.getKey(this.options.accessTokenKey), token.accessToken)

      if (token.refreshToken) {
        this.storage.set(this.getKey(this.options.refreshTokenKey), token.refreshToken)
      }

      if (expiresAt) {
        this.storage.set(this.getKey('expires_at'), String(expiresAt))
      }
    }
    catch (error) {
      // 存储失败时静默处理，不影响内存缓存
      console.error('[TokenManager] Failed to save token to storage:', error)
    }
  }

  /**
   * 获取访问令牌
   *
   * @returns 访问令牌，如果不存在则返回 null
   */
  getAccessToken(): string | null {
    // 懒加载：缓存失效时从存储加载
    if (!this.cacheValid) {
      this.loadFromStorage()
    }
    return this.tokenInfo?.accessToken ?? null
  }

  /**
   * 获取刷新令牌
   *
   * @returns 刷新令牌，如果不存在则返回 null
   */
  getRefreshToken(): string | null {
    // 懒加载：缓存失效时从存储加载
    if (!this.cacheValid) {
      this.loadFromStorage()
    }
    return this.tokenInfo?.refreshToken ?? null
  }

  /**
   * 获取完整的 Token 信息
   *
   * @returns Token 信息，如果不存在则返回 null
   */
  getTokenInfo(): TokenInfo | null {
    // 懒加载：缓存失效时从存储加载
    if (!this.cacheValid) {
      this.loadFromStorage()
    }
    return this.tokenInfo
  }

  /**
   * 检查 Token 是否存在
   *
   * @returns 是否存在有效的访问令牌
   */
  hasToken(): boolean {
    // 懒加载：缓存失效时从存储加载
    if (!this.cacheValid) {
      this.loadFromStorage()
    }
    return !!this.tokenInfo?.accessToken
  }

  /**
   * 检查 Token 是否已过期
   *
   * @param thresholdSeconds - 提前判断过期的阈值（秒），默认 0
   * @returns 是否已过期
   */
  isTokenExpired(thresholdSeconds = 0): boolean {
    if (!this.tokenInfo?.expiresAt) {
      return false // 没有过期时间，认为不过期
    }

    const now = Date.now()
    const threshold = thresholdSeconds * 1000
    return now + threshold >= this.tokenInfo.expiresAt
  }

  /**
   * 获取 Token 剩余有效时间（秒）
   *
   * @returns 剩余有效时间，如果已过期返回 0，如果没有过期时间返回 -1
   */
  getTokenRemainingTime(): number {
    if (!this.tokenInfo?.expiresAt) {
      return -1
    }

    const remaining = this.tokenInfo.expiresAt - Date.now()
    return Math.max(0, Math.floor(remaining / 1000))
  }

  /**
   * 清除 Token 信息
   */
  clearToken(): void {
    // 清除缓存
    this.tokenInfo = null
    this.cacheValid = false

    // 清除存储
    this.storage.remove(this.getKey(this.options.accessTokenKey))
    this.storage.remove(this.getKey(this.options.refreshTokenKey))
    this.storage.remove(this.getKey('expires_at'))
  }

  /**
   * 清除所有存储的数据
   */
  clearAll(): void {
    // 清除缓存
    this.tokenInfo = null
    this.cacheValid = false

    // 清除存储
    this.storage.clear()
  }

  /**
   * 解析 JWT Token 的 payload（不验证签名）
   *
   * @param token - JWT Token 字符串
   * @returns 解析后的 payload，解析失败返回 null
   */
  static parseJwtPayload<T = Record<string, unknown>>(token: string): T | null {
    try {
      const parts = token.split('.')
      if (parts.length !== 3) {
        return null
      }

      const payload = parts[1]
      // Base64Url 解码
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
          .join(''),
      )

      return JSON.parse(jsonPayload) as T
    }
    catch {
      return null
    }
  }

  /**
   * 从 JWT Token 中获取过期时间
   *
   * @param token - JWT Token 字符串
   * @returns 过期时间戳（毫秒），如果无法解析返回 null
   */
  static getJwtExpiresAt(token: string): number | null {
    const payload = TokenManager.parseJwtPayload<{ exp?: number }>(token)
    if (payload?.exp) {
      return payload.exp * 1000 // 转换为毫秒
    }
    return null
  }
}

