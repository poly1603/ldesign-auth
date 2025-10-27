/**
 * Token 管理器
 *
 * 负责 Token 的存储、刷新、验证等核心功能
 */

import type { HttpClient } from '@ldesign/http'
import type { CacheManager } from '@ldesign/cache'
import type { TokenInfo } from '../types'
import type { ITokenStorage, StorageType, TokenConfig, TokenExpiredCallback, TokenRefreshCallback } from './types'
import { JWTParser } from '../jwt/parser'
import { TokenError, AuthErrorCode } from '../errors'
import { StorageAdapterFactory } from './storage'
import { AUTH_DEFAULTS } from '../constants'
import { DisposableManager } from '../utils/DisposableManager'
import { retryWithBackoff, isRetryableNetworkError } from '../utils/retry'
import type { ITokenBlacklist } from './TokenBlacklist'
import { createTokenBlacklist } from './TokenBlacklist'

/**
 * Token 管理器类
 */
export class TokenManager {
  private config: Required<TokenConfig>
  private parser: JWTParser
  private storage: ITokenStorage
  private refreshTimer?: NodeJS.Timeout
  private httpClient?: HttpClient
  private cacheManager?: CacheManager
  private refreshPromise?: Promise<TokenInfo>
  private refreshCallbacks: Set<TokenRefreshCallback> = new Set()
  private expiredCallbacks: Set<TokenExpiredCallback> = new Set()
  private disposables: DisposableManager = new DisposableManager()
  private blacklist: ITokenBlacklist

  constructor(
    config: TokenConfig = {},
    httpClient?: HttpClient,
    cacheManager?: CacheManager,
  ) {
    this.config = {
      tokenKey: config.tokenKey || AUTH_DEFAULTS.TOKEN_KEY,
      refreshTokenKey: config.refreshTokenKey || AUTH_DEFAULTS.REFRESH_TOKEN_KEY,
      defaultStorage: config.defaultStorage || 'localStorage',
      refreshEndpoint: config.refreshEndpoint || '/api/auth/refresh',
      refreshThreshold: config.refreshThreshold || AUTH_DEFAULTS.REFRESH_THRESHOLD,
      autoRefresh: config.autoRefresh !== undefined ? config.autoRefresh : true,
      maxRetries: config.maxRetries || AUTH_DEFAULTS.MAX_RETRIES,
      retryDelay: config.retryDelay || AUTH_DEFAULTS.RETRY_DELAY,
    }

    this.parser = new JWTParser()
    this.storage = StorageAdapterFactory.getAdapter(this.config.defaultStorage)
    this.httpClient = httpClient
    this.cacheManager = cacheManager

    // 初始化 Token 黑名单
    this.blacklist = createTokenBlacklist('memory')
  }

  /**
   * 存储 Token
   *
   * @param token - Token 信息
   * @param storageType - 存储类型（可选）
   *
   * @example
   * ```typescript
   * const tokenManager = new TokenManager()
   * tokenManager.store({
   *   accessToken: 'eyJhbGc...',
   *   refreshToken: 'refresh...',
   *   expiresIn: 3600,
   * })
   * ```
   */
  store(token: TokenInfo, storageType?: StorageType): void {
    const storage = storageType
      ? StorageAdapterFactory.getAdapter(storageType)
      : this.storage

    try {
      // 存储 access token
      storage.save(this.config.tokenKey, token.accessToken)

      // 存储 refresh token
      if (token.refreshToken) {
        storage.save(this.config.refreshTokenKey, token.refreshToken)
      }

      // 缓存到内存（使用 @ldesign/cache）
      if (this.cacheManager) {
        const ttl = token.expiresIn ? token.expiresIn * 1000 : undefined
        this.cacheManager.set(this.config.tokenKey, token, { ttl }).catch((error) => {
          console.warn('[TokenManager] Cache store failed:', error)
        })
      }

      // 启动自动刷新
      if (this.config.autoRefresh && token.expiresIn) {
        this.startAutoRefresh(token.expiresIn)
      }
    }
    catch (error) {
      throw new TokenError(
        'Failed to store token',
        AuthErrorCode.STORAGE_ERROR,
        error as Error,
      )
    }
  }

  /**
   * 加载 Token
   *
   * @param storageType - 存储类型（可选）
   * @returns Token 信息，如果不存在返回 null
   *
   * @example
   * ```typescript
   * const tokenManager = new TokenManager()
   * const token = tokenManager.load()
   * if (token) {
   *   console.log('Token loaded:', token.accessToken)
   * }
   * ```
   */
  async load(storageType?: StorageType): Promise<TokenInfo | null> {
    const storage = storageType
      ? StorageAdapterFactory.getAdapter(storageType)
      : this.storage

    try {
      // 先从缓存中读取
      if (this.cacheManager) {
        const cached = await this.cacheManager.get<TokenInfo>(this.config.tokenKey)
        if (cached) {
          return cached
        }
      }

      // 从存储中读取
      const accessToken = storage.load(this.config.tokenKey)
      if (!accessToken) {
        return null
      }

      const refreshToken = storage.load(this.config.refreshTokenKey)

      const token: TokenInfo = {
        accessToken,
        refreshToken: refreshToken || undefined,
      }

      // 解析 Token 获取过期时间
      try {
        const decoded = this.parser.decode(accessToken)
        if (decoded.payload.exp) {
          const now = Math.floor(Date.now() / 1000)
          token.expiresIn = Math.max(0, decoded.payload.exp - now)
        }
      }
      catch {
        // 解析失败，忽略
      }

      // 缓存到内存
      if (this.cacheManager && token.expiresIn) {
        this.cacheManager.set(
          this.config.tokenKey,
          token,
          { ttl: token.expiresIn * 1000 },
        ).catch((error) => {
          console.warn('[TokenManager] Cache store failed:', error)
        })
      }

      return token
    }
    catch (error) {
      throw new TokenError(
        'Failed to load token',
        AuthErrorCode.STORAGE_ERROR,
        error as Error,
      )
    }
  }

  /**
   * 验证 Token 有效性
   *
   * @param token - Token 字符串或 Token 信息对象
   * @returns 是否有效
   *
   * @example
   * ```typescript
   * const tokenManager = new TokenManager()
   * if (tokenManager.validate('eyJhbGc...')) {
   *   console.log('Token 有效')
   * }
   * ```
   */
  async validate(token: string | TokenInfo): Promise<boolean> {
    try {
      const tokenString = typeof token === 'string' ? token : token.accessToken

      // 检查格式
      if (!tokenString || typeof tokenString !== 'string') {
        return false
      }

      // 检查黑名单
      if (await this.blacklist.has(tokenString)) {
        return false
      }

      // 解析并检查过期
      const decoded = this.parser.decode(tokenString)

      if (this.parser.isExpired(decoded)) {
        return false
      }

      return true
    }
    catch {
      return false
    }
  }

  /**
   * 解码 Token
   *
   * @param token - Token 字符串
   * @returns 解码后的 Payload
   *
   * @example
   * ```typescript
   * const tokenManager = new TokenManager()
   * const payload = tokenManager.decode('eyJhbGc...')
   * console.log('User ID:', payload.sub)
   * ```
   */
  decode(token: string): any {
    try {
      return this.parser.getPayload(token)
    }
    catch (error) {
      throw new TokenError(
        'Failed to decode token',
        AuthErrorCode.INVALID_TOKEN_FORMAT,
        error as Error,
      )
    }
  }

  /**
   * 刷新 Token
   *
   * @param refreshToken - Refresh Token（可选，默认从存储中读取）
   * @returns 新的 Token 信息
   *
   * @example
   * ```typescript
   * const tokenManager = new TokenManager(config, httpClient)
   * const newToken = await tokenManager.refresh()
   * ```
   */
  async refresh(refreshToken?: string): Promise<TokenInfo> {
    // 如果已有刷新请求在进行，返回同一个 Promise（防止重复刷新）
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    this.refreshPromise = this._doRefresh(refreshToken)

    try {
      const token = await this.refreshPromise
      return token
    }
    finally {
      this.refreshPromise = undefined
    }
  }

  /**
   * 执行实际的刷新操作
   * @private
   */
  private async _doRefresh(refreshToken?: string): Promise<TokenInfo> {
    if (!this.httpClient) {
      throw new TokenError(
        'HttpClient is required for token refresh',
        AuthErrorCode.INVALID_CONFIG,
      )
    }

    // 获取 refresh token
    let token = refreshToken
    if (!token) {
      token = this.storage.load(this.config.refreshTokenKey)
    }

    if (!token) {
      throw TokenError.fromCode(AuthErrorCode.INVALID_REFRESH_TOKEN)
    }

    // 使用指数退避策略重试
    try {
      const response = await retryWithBackoff(
        async () => {
          return await this.httpClient!.post<{ token: TokenInfo }>(
            this.config.refreshEndpoint,
            { refreshToken: token },
          )
        },
        {
          maxRetries: this.config.maxRetries,
          initialDelay: this.config.retryDelay,
          shouldRetry: isRetryableNetworkError,
          onRetry: (error, attempt, delay) => {
            console.debug(`[TokenManager] Retrying refresh (${attempt}/${this.config.maxRetries}) after ${delay}ms`, error.message)
          },
        },
      )

      const newToken = response.token

      // 存储新 Token
      this.store(newToken)

      // 触发刷新回调
      this.refreshCallbacks.forEach((callback) => {
        try {
          callback(newToken)
        }
        catch (error) {
          console.error('[TokenManager] Refresh callback error:', error)
        }
      })

      return newToken
    }
    catch (error) {
      throw TokenError.refreshFailed(error as Error)
    }
  }

  /**
   * 清除 Token
   *
   * @param storageType - 存储类型（可选）
   * @param addToBlacklist - 是否添加到黑名单（默认 true）
   *
   * @example
   * ```typescript
   * const tokenManager = new TokenManager()
   * await tokenManager.clear() // 清除并加入黑名单
   * ```
   */
  async clear(storageType?: StorageType, addToBlacklist = true): Promise<void> {
    const storage = storageType
      ? StorageAdapterFactory.getAdapter(storageType)
      : this.storage

    try {
      // 如果需要，将当前 Token 加入黑名单
      if (addToBlacklist) {
        const accessToken = storage.load(this.config.tokenKey)
        if (accessToken) {
          try {
            const decoded = this.parser.decode(accessToken)
            const expiresAt = decoded.payload.exp ? decoded.payload.exp * 1000 : Date.now() + 3600000
            await this.blacklist.add(accessToken, expiresAt)
          }
          catch (error) {
            console.warn('[TokenManager] Failed to add token to blacklist:', error)
          }
        }
      }

      // 清除存储
      storage.remove(this.config.tokenKey)
      storage.remove(this.config.refreshTokenKey)

      // 清除缓存
      if (this.cacheManager) {
        await this.cacheManager.remove(this.config.tokenKey).catch((error) => {
          console.warn('[TokenManager] Cache clear failed:', error)
        })
      }

      // 停止自动刷新
      this.stopAutoRefresh()
    }
    catch (error) {
      throw new TokenError(
        'Failed to clear token',
        AuthErrorCode.STORAGE_ERROR,
        error as Error,
      )
    }
  }

  /**
   * 启动自动刷新（使用预刷新机制）
   *
   * @param expiresIn - 过期时间（秒）
   * @private
   */
  private startAutoRefresh(expiresIn: number): void {
    this.stopAutoRefresh()

    // 计算刷新时间（在过期前 refreshThreshold 秒刷新）
    const refreshIn = Math.max(
      (expiresIn - this.config.refreshThreshold) * 1000,
      0,
    )

    // 使用预刷新机制：提前 20% 的时间开始刷新
    const preemptiveRefreshIn = refreshIn * AUTH_DEFAULTS.PREEMPTIVE_REFRESH_RATIO

    this.refreshTimer = setTimeout(() => {
      this.refresh().catch((error) => {
        console.error('[TokenManager] Auto refresh failed:', error)

        // 触发过期回调
        this.expiredCallbacks.forEach((callback) => {
          try {
            callback()
          }
          catch (err) {
            console.error('[TokenManager] Expired callback error:', err)
          }
        })
      })
    }, preemptiveRefreshIn)

    // 添加到资源管理器
    this.disposables.add(() => {
      this.stopAutoRefresh()
    })
  }

  /**
   * 停止自动刷新
   * @private
   */
  private stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = undefined
    }
  }

  /**
   * 监听 Token 刷新事件
   *
   * @param callback - 刷新回调
   * @returns 取消监听的函数
   *
   * @example
   * ```typescript
   * const tokenManager = new TokenManager()
   * const unsubscribe = tokenManager.onRefresh((newToken) => {
   *   console.log('Token refreshed:', newToken)
   * })
   * ```
   */
  onRefresh(callback: TokenRefreshCallback): () => void {
    this.refreshCallbacks.add(callback)
    return () => {
      this.refreshCallbacks.delete(callback)
    }
  }

  /**
   * 监听 Token 过期事件
   *
   * @param callback - 过期回调
   * @returns 取消监听的函数
   *
   * @example
   * ```typescript
   * const tokenManager = new TokenManager()
   * const unsubscribe = tokenManager.onExpired(() => {
   *   console.log('Token expired')
   * })
   * ```
   */
  onExpired(callback: TokenExpiredCallback): () => void {
    this.expiredCallbacks.add(callback)
    return () => {
      this.expiredCallbacks.delete(callback)
    }
  }

  /**
   * 获取 Token 剩余有效时间（秒）
   *
   * @param token - Token 字符串或从存储中读取
   * @returns 剩余秒数，如果已过期返回 0，如果没有过期时间返回 Infinity
   *
   * @example
   * ```typescript
   * const tokenManager = new TokenManager()
   * const ttl = await tokenManager.getTimeToLive()
   * console.log(`Token 剩余 ${ttl} 秒`)
   * ```
   */
  async getTimeToLive(token?: string): Promise<number> {
    try {
      let tokenString = token
      if (!tokenString) {
        const tokenInfo = await this.load()
        tokenString = tokenInfo?.accessToken
      }

      if (!tokenString) {
        return 0
      }

      return this.parser.getTimeToLive(tokenString)
    }
    catch {
      return 0
    }
  }

  /**
   * 销毁管理器
   *
   * 清理所有资源和定时器
   */
  destroy(): void {
    // 使用 DisposableManager 统一清理
    this.disposables.dispose()

    this.stopAutoRefresh()
    this.refreshCallbacks.clear()
    this.expiredCallbacks.clear()
    this.refreshPromise = undefined
  }

  /**
   * 获取 Token 黑名单
   *
   * @returns Token 黑名单实例
   */
  getBlacklist(): ITokenBlacklist {
    return this.blacklist
  }

  /**
   * 检查 Token 是否在黑名单中
   *
   * @param token - Token 字符串
   * @returns 是否在黑名单中
   */
  async isBlacklisted(token: string): Promise<boolean> {
    return this.blacklist.has(token)
  }

  /**
   * 将 Token 添加到黑名单
   *
   * @param token - Token 字符串
   * @param expiresAt - 过期时间（可选，默认从 Token 中解析）
   */
  async addToBlacklist(token: string, expiresAt?: number): Promise<void> {
    let expiry = expiresAt

    if (!expiry) {
      try {
        const decoded = this.parser.decode(token)
        expiry = decoded.payload.exp ? decoded.payload.exp * 1000 : Date.now() + 3600000
      }
      catch {
        expiry = Date.now() + 3600000 // 默认 1 小时
      }
    }

    await this.blacklist.add(token, expiry)
  }
}

/**
 * 创建 Token 管理器
 *
 * @param config - Token 配置
 * @param httpClient - HTTP 客户端（用于刷新）
 * @param cacheManager - 缓存管理器（用于缓存）
 * @returns Token 管理器实例
 *
 * @example
 * ```typescript
 * import { createTokenManager } from '@ldesign/auth/token'
 * import { createHttpClient } from '@ldesign/http'
 * import { createCache } from '@ldesign/cache'
 *
 * const httpClient = createHttpClient()
 * const cache = createCache()
 *
 * const tokenManager = createTokenManager(
 *   { autoRefresh: true, refreshThreshold: 300 },
 *   httpClient,
 *   cache,
 * )
 * ```
 */
export function createTokenManager(
  config?: TokenConfig,
  httpClient?: HttpClient,
  cacheManager?: CacheManager,
): TokenManager {
  return new TokenManager(config, httpClient, cacheManager)
}


