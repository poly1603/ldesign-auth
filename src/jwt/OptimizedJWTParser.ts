/**
 * 优化的 JWT 解析器 - 带缓存和性能优化
 */

import { LRUCache } from '../utils/memory/LRUCache'
import { MEMORY_LIMITS, PERFORMANCE_CONFIG } from '../constants'

interface JWTHeader {
  alg: string
  typ: string
  [key: string]: any
}

interface JWTPayload {
  iss?: string
  sub?: string
  aud?: string | string[]
  exp?: number
  nbf?: number
  iat?: number
  jti?: string
  [key: string]: any
}

interface DecodedJWT {
  header: JWTHeader
  payload: JWTPayload
  signature: string
}

export class OptimizedJWTParser {
  private decodeCache: LRUCache<string, DecodedJWT>
  private validationCache: LRUCache<string, boolean>
  private cacheEnabled: boolean

  constructor(options?: {
    cacheSize?: number
    cacheEnabled?: boolean
  }) {
    this.cacheEnabled = options?.cacheEnabled ?? PERFORMANCE_CONFIG.ENABLE_TOKEN_PARSE_CACHE
    const cacheSize = options?.cacheSize ?? MEMORY_LIMITS.TOKEN_PARSE_CACHE_SIZE

    this.decodeCache = new LRUCache<string, DecodedJWT>(cacheSize)
    this.validationCache = new LRUCache<string, boolean>(cacheSize)
  }

  /**
   * 解码 JWT（带缓存）
   */
  decode(token: string): DecodedJWT {
    if (this.cacheEnabled) {
      const cached = this.decodeCache.get(token)
      if (cached) {
        return cached
      }
    }

    const parts = token.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format')
    }

    try {
      const header = JSON.parse(this.base64UrlDecode(parts[0]))
      const payload = JSON.parse(this.base64UrlDecode(parts[1]))
      const signature = parts[2]

      const decoded: DecodedJWT = { header, payload, signature }

      if (this.cacheEnabled) {
        this.decodeCache.set(token, decoded)
      }

      return decoded
    } catch (error) {
      throw new Error('Failed to decode JWT')
    }
  }

  /**
   * 获取 Payload（带缓存）
   */
  getPayload(token: string): JWTPayload {
    const decoded = this.decode(token)
    return decoded.payload
  }

  /**
   * 获取 Header（带缓存）
   */
  getHeader(token: string): JWTHeader {
    const decoded = this.decode(token)
    return decoded.header
  }

  /**
   * 检查是否过期
   */
  isExpired(decodedOrToken: DecodedJWT | string): boolean {
    const decoded = typeof decodedOrToken === 'string'
      ? this.decode(decodedOrToken)
      : decodedOrToken

    if (!decoded.payload.exp) {
      return false
    }

    const now = Math.floor(Date.now() / 1000)
    return decoded.payload.exp < now
  }

  /**
   * 获取剩余有效时间（秒）
   */
  getTimeToLive(token: string): number {
    const decoded = this.decode(token)

    if (!decoded.payload.exp) {
      return Infinity
    }

    const now = Math.floor(Date.now() / 1000)
    const ttl = decoded.payload.exp - now

    return Math.max(0, ttl)
  }

  /**
   * 验证 JWT 格式（带缓存）
   */
  validate(token: string): boolean {
    if (this.cacheEnabled) {
      const cached = this.validationCache.get(token)
      if (cached !== undefined) {
        return cached
      }
    }

    try {
      const decoded = this.decode(token)

      // 检查必要字段
      if (!decoded.header.alg || !decoded.header.typ) {
        this.validationCache.set(token, false)
        return false
      }

      // 检查是否过期
      if (this.isExpired(decoded)) {
        this.validationCache.set(token, false)
        return false
      }

      // 检查 nbf (not before)
      if (decoded.payload.nbf) {
        const now = Math.floor(Date.now() / 1000)
        if (decoded.payload.nbf > now) {
          this.validationCache.set(token, false)
          return false
        }
      }

      if (this.cacheEnabled) {
        this.validationCache.set(token, true)
      }
      return true
    } catch {
      if (this.cacheEnabled) {
        this.validationCache.set(token, false)
      }
      return false
    }
  }

  /**
   * Base64 URL 解码
   */
  private base64UrlDecode(str: string): string {
    // 替换 URL 安全字符
    str = str.replace(/-/g, '+').replace(/_/g, '/')

    // 添加填充
    const pad = str.length % 4
    if (pad) {
      if (pad === 1) {
        throw new Error('Invalid base64 string')
      }
      str += new Array(5 - pad).join('=')
    }

    // 解码
    if (typeof window !== 'undefined' && window.atob) {
      return decodeURIComponent(
        window.atob(str)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
    } else {
      // Node.js 环境
      return Buffer.from(str, 'base64').toString('utf8')
    }
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.decodeCache.clear()
    this.validationCache.clear()
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): {
    decodeCacheSize: number
    validationCacheSize: number
    cacheEnabled: boolean
  } {
    return {
      decodeCacheSize: this.decodeCache.size(),
      validationCacheSize: this.validationCache.size(),
      cacheEnabled: this.cacheEnabled
    }
  }

  /**
   * 启用/禁用缓存
   */
  setCacheEnabled(enabled: boolean): void {
    this.cacheEnabled = enabled
    if (!enabled) {
      this.clearCache()
    }
  }
}

