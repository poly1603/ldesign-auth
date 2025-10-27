/**
 * 优化的 Token 管理器 - 改进内存管理和性能
 */

import type { HttpClient } from '@ldesign/http'
import type { CacheManager } from '@ldesign/cache'
import type { TokenInfo } from '../types'
import type { ITokenStorage, StorageType, TokenConfig, TokenExpiredCallback, TokenRefreshCallback } from './types'
import { OptimizedJWTParser } from '../jwt/OptimizedJWTParser'
import { TokenError, AuthErrorCode } from '../errors'
import { StorageAdapterFactory } from './storage'
import { AUTH_DEFAULTS, MEMORY_LIMITS } from '../constants'
import { DisposableManager } from '../utils/DisposableManager'
import { retryWithBackoff, isRetryableNetworkError } from '../utils/retry'
import { OptimizedTokenBlacklist } from './OptimizedTokenBlacklist'

export class OptimizedTokenManager {
  private config: Required<TokenConfig>
  private parser: OptimizedJWTParser
  private storage: ITokenStorage
  private httpClient?: HttpClient
  private cacheManager?: CacheManager
  private refreshPromise?: Promise<TokenInfo>
  private refreshCallbacks: Set<TokenRefreshCallback>
  private expiredCallbacks: Set<TokenExpiredCallback>
  private disposables: DisposableManager = new DisposableManager()
  private blacklist: OptimizedTokenBlacklist

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

    this.parser = new OptimizedJWTParser({
      cacheEnabled: true,
      cacheSize: MEMORY_LIMITS.TOKEN_PARSE_CACHE_SIZE,
    })

    this.storage = StorageAdapterFactory.getAdapter(this.config.defaultStorage)
    this.httpClient = httpClient
    this.cacheManager = cacheManager

    // 使用优化的黑名单
    this.blacklist = new OptimizedTokenBlacklist({
      maxSize: MEMORY_LIMITS.TOKEN_BLACKLIST_MAX_SIZE,
      autoCleanup: true,
    })

    // 限制回调数量
    this.refreshCallbacks = new Set()
    this.expiredCallbacks = new Set()
  }

  /**
   * 存储 Token
   */
  store(token: TokenInfo, storageType?: StorageType): void {
    const storage = storageType
      ? StorageAdapterFactory.getAdapter(storageType)
      : this.storage

    try {
      storage.save(this.config.tokenKey, token.accessToken)

      if (token.refreshToken) {
        storage.save(this.config.refreshTokenKey, token.refreshToken)
      }

      if (this.cacheManager) {
        const ttl = token.expiresIn ? token.expiresIn * 1000 : undefined
        this.cacheManager.set(this.config.tokenKey, token, { ttl }).catch((error) => {
          console.warn('[TokenManager] Cache store failed:', error)
        })
      }

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
   */
  async load(storageType?: StorageType): Promise<TokenInfo | null> {
    const storage = storageType
      ? StorageAdapterFactory.getAdapter(storageType)
      : this.storage

    try {
      if (this.cacheManager) {
        const cached = await this.cacheManager.get<TokenInfo>(this.config.tokenKey)
        if (cached) {
          return cached
        }
      }

      const accessToken = storage.load(this.config.tokenKey)
      if (!accessToken) {
        return null
      }

      const refreshToken = storage.load(this.config.refreshTokenKey)

      const token: TokenInfo = {
        accessToken,
        refreshToken: refreshToken || undefined,
      }

      // 使用优化的解析器
      try {
        const ttl = this.parser.getTimeToLive(accessToken)
        if (ttl > 0) {
          token.expiresIn = ttl
        }
      }
      catch {
        // 解析失败，忽略
      }

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
   */
  async validate(token: string | TokenInfo): Promise<boolean> {
    try {
      const tokenString = typeof token === 'string' ? token : token.accessToken

      if (!tokenString || typeof tokenString !== 'string') {
        return false
      }

      // 检查黑名单
      if (await this.blacklist.has(tokenString)) {
        return false
      }

      // 使用优化的解析器验证
      return this.parser.validate(tokenString)
    }
    catch {
      return false
    }
  }

  /**
   * 解码 Token
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
   */
  async refresh(refreshToken?: string): Promise<TokenInfo> {
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
   */
  private async _doRefresh(refreshToken?: string): Promise<TokenInfo> {
    if (!this.httpClient) {
      throw new TokenError(
        'HttpClient is required for token refresh',
        AuthErrorCode.INVALID_CONFIG,
      )
    }

    let token = refreshToken
    if (!token) {
      token = this.storage.load(this.config.refreshTokenKey)
    }

    if (!token) {
      throw TokenError.fromCode(AuthErrorCode.INVALID_REFRESH_TOKEN)
    }

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
      this.store(newToken)

      // 限制回调数量，避免内存泄漏
      if (this.refreshCallbacks.size < MEMORY_LIMITS.MAX_LISTENERS_PER_EVENT) {
        this.refreshCallbacks.forEach((callback) => {
          try {
            callback(newToken)
          }
          catch (error) {
            console.error('[TokenManager] Refresh callback error:', error)
          }
        })
      }

      return newToken
    }
    catch (error) {
      throw TokenError.refreshFailed(error as Error)
    }
  }

  /**
   * 清除 Token
   */
  async clear(storageType?: StorageType, addToBlacklist = true): Promise<void> {
    const storage = storageType
      ? StorageAdapterFactory.getAdapter(storageType)
      : this.storage

    try {
      if (addToBlacklist) {
        const accessToken = storage.load(this.config.tokenKey)
        if (accessToken) {
          try {
            const ttl = this.parser.getTimeToLive(accessToken)
            const expiresAt = Date.now() + (ttl > 0 ? ttl * 1000 : 3600000)
            await this.blacklist.add(accessToken, expiresAt)
          }
          catch (error) {
            console.warn('[TokenManager] Failed to add token to blacklist:', error)
          }
        }
      }

      storage.remove(this.config.tokenKey)
      storage.remove(this.config.refreshTokenKey)

      if (this.cacheManager) {
        await this.cacheManager.remove(this.config.tokenKey).catch((error) => {
          console.warn('[TokenManager] Cache clear failed:', error)
        })
      }

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
   * 启动自动刷新
   */
  private startAutoRefresh(expiresIn: number): void {
    this.stopAutoRefresh()

    const refreshIn = Math.max(
      (expiresIn - this.config.refreshThreshold) * 1000,
      0,
    )

    const preemptiveRefreshIn = refreshIn * AUTH_DEFAULTS.PREEMPTIVE_REFRESH_RATIO

    const timer = this.disposables.setTimeout(() => {
      this.refresh().catch((error) => {
        console.error('[TokenManager] Auto refresh failed:', error)

        if (this.expiredCallbacks.size < MEMORY_LIMITS.MAX_LISTENERS_PER_EVENT) {
          this.expiredCallbacks.forEach((callback) => {
            try {
              callback()
            }
            catch (err) {
              console.error('[TokenManager] Expired callback error:', err)
            }
          })
        }
      })
    }, preemptiveRefreshIn)
  }

  /**
   * 停止自动刷新
   */
  private stopAutoRefresh(): void {
    // DisposableManager 会自动处理定时器清理
  }

  /**
   * 监听 Token 刷新事件
   */
  onRefresh(callback: TokenRefreshCallback): () => void {
    if (this.refreshCallbacks.size >= MEMORY_LIMITS.MAX_LISTENERS_PER_EVENT) {
      console.warn(`[TokenManager] Refresh callback limit (${MEMORY_LIMITS.MAX_LISTENERS_PER_EVENT}) reached`)
      return () => { }
    }

    this.refreshCallbacks.add(callback)
    return () => {
      this.refreshCallbacks.delete(callback)
    }
  }

  /**
   * 监听 Token 过期事件
   */
  onExpired(callback: TokenExpiredCallback): () => void {
    if (this.expiredCallbacks.size >= MEMORY_LIMITS.MAX_LISTENERS_PER_EVENT) {
      console.warn(`[TokenManager] Expired callback limit (${MEMORY_LIMITS.MAX_LISTENERS_PER_EVENT}) reached`)
      return () => { }
    }

    this.expiredCallbacks.add(callback)
    return () => {
      this.expiredCallbacks.delete(callback)
    }
  }

  /**
   * 获取 Token 剩余有效时间
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
   * 获取黑名单
   */
  getBlacklist(): OptimizedTokenBlacklist {
    return this.blacklist
  }

  /**
   * 设置 HTTP 客户端
   */
  setHttpClient(httpClient: HttpClient): void {
    this.httpClient = httpClient
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.disposables.dispose()
    this.blacklist.destroy()
    this.parser.clearCache()
    this.refreshCallbacks.clear()
    this.expiredCallbacks.clear()
    this.refreshPromise = undefined
  }
}

/**
 * 创建优化的 Token 管理器
 */
export function createOptimizedTokenManager(
  config?: TokenConfig,
  httpClient?: HttpClient,
  cacheManager?: CacheManager,
): OptimizedTokenManager {
  return new OptimizedTokenManager(config, httpClient, cacheManager)
}

