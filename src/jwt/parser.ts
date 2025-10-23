/**
 * JWT 解析器
 *
 * 提供 JWT Token 的解码、解析和基础验证功能
 */

import type { DecodedJWT, JWTHeader, JWTPayload } from './types'

/**
 * JWT 解析器类
 */
export class JWTParser {
  /**
   * 解码 JWT Token
   *
   * @param token - JWT Token 字符串
   * @returns 解码后的 JWT
   * @throws 如果 Token 格式无效
   *
   * @example
   * ```typescript
   * const parser = new JWTParser()
   * const decoded = parser.decode('eyJhbGc...')
   * console.log(decoded.payload.sub) // 用户 ID
   * ```
   */
  decode(token: string): DecodedJWT {
    // 验证 Token 格式
    if (!token || typeof token !== 'string') {
      throw new Error('Invalid token: token must be a non-empty string')
    }

    const parts = token.split('.')

    if (parts.length !== 3) {
      throw new Error('Invalid token: token must have 3 parts separated by dots')
    }

    const [headerPart, payloadPart, signaturePart] = parts

    try {
      // 解码 Header
      const header = this.decodeBase64Url<JWTHeader>(headerPart)

      // 解码 Payload
      const payload = this.decodeBase64Url<JWTPayload>(payloadPart)

      return {
        header,
        payload,
        signature: signaturePart,
        raw: token,
      }
    }
    catch (error) {
      throw new Error(`Failed to decode token: ${(error as Error).message}`)
    }
  }

  /**
   * 获取 JWT Payload（不验证）
   *
   * @param token - JWT Token 字符串
   * @returns Payload 对象
   *
   * @example
   * ```typescript
   * const parser = new JWTParser()
   * const payload = parser.getPayload('eyJhbGc...')
   * ```
   */
  getPayload(token: string): JWTPayload {
    const decoded = this.decode(token)
    return decoded.payload
  }

  /**
   * 获取 JWT Header（不验证）
   *
   * @param token - JWT Token 字符串
   * @returns Header 对象
   *
   * @example
   * ```typescript
   * const parser = new JWTParser()
   * const header = parser.getHeader('eyJhbGc...')
   * console.log(header.alg) // 算法类型
   * ```
   */
  getHeader(token: string): JWTHeader {
    const decoded = this.decode(token)
    return decoded.header
  }

  /**
   * 检查 Token 是否过期
   *
   * @param token - JWT Token 字符串或已解码的 JWT
   * @param clockTolerance - 时间容差（秒），默认 0
   * @returns 是否过期
   *
   * @example
   * ```typescript
   * const parser = new JWTParser()
   * if (parser.isExpired('eyJhbGc...')) {
   *   console.log('Token 已过期')
   * }
   * ```
   */
  isExpired(token: string | DecodedJWT, clockTolerance = 0): boolean {
    const payload = typeof token === 'string' ? this.getPayload(token) : token.payload

    if (!payload.exp) {
      // 没有过期时间，认为永不过期
      return false
    }

    const now = Math.floor(Date.now() / 1000)
    return payload.exp + clockTolerance < now
  }

  /**
   * 获取 Token 剩余有效时间（秒）
   *
   * @param token - JWT Token 字符串或已解码的 JWT
   * @returns 剩余秒数，如果已过期返回 0，如果没有过期时间返回 Infinity
   *
   * @example
   * ```typescript
   * const parser = new JWTParser()
   * const ttl = parser.getTimeToLive('eyJhbGc...')
   * console.log(`Token 剩余 ${ttl} 秒`)
   * ```
   */
  getTimeToLive(token: string | DecodedJWT): number {
    const payload = typeof token === 'string' ? this.getPayload(token) : token.payload

    if (!payload.exp) {
      return Number.POSITIVE_INFINITY
    }

    const now = Math.floor(Date.now() / 1000)
    const ttl = payload.exp - now

    return Math.max(0, ttl)
  }

  /**
   * 检查 Token 是否即将过期
   *
   * @param token - JWT Token 字符串或已解码的 JWT
   * @param threshold - 阈值（秒），默认 300（5分钟）
   * @returns 是否即将过期
   *
   * @example
   * ```typescript
   * const parser = new JWTParser()
   * if (parser.isExpiring('eyJhbGc...', 600)) {
   *   console.log('Token 将在 10 分钟内过期')
   * }
   * ```
   */
  isExpiring(token: string | DecodedJWT, threshold = 300): boolean {
    const ttl = this.getTimeToLive(token)
    return ttl !== Number.POSITIVE_INFINITY && ttl <= threshold
  }

  /**
   * Base64URL 解码
   *
   * @param base64Url - Base64URL 编码的字符串
   * @returns 解码后的对象
   * @private
   */
  private decodeBase64Url<T>(base64Url: string): T {
    // Base64URL 转 Base64
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')

    // 添加填充
    const pad = base64.length % 4
    if (pad) {
      if (pad === 1) {
        throw new Error('Invalid base64url string')
      }
      base64 += '='.repeat(4 - pad)
    }

    try {
      // 解码 Base64
      const jsonString = this.base64Decode(base64)

      // 解析 JSON
      return JSON.parse(jsonString) as T
    }
    catch (error) {
      throw new Error(`Failed to decode base64url: ${(error as Error).message}`)
    }
  }

  /**
   * Base64 解码（兼容浏览器和 Node.js）
   *
   * @param base64 - Base64 编码的字符串
   * @returns 解码后的字符串
   * @private
   */
  private base64Decode(base64: string): string {
    // 浏览器环境
    if (typeof atob !== 'undefined') {
      return decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
          .join(''),
      )
    }

    // Node.js 环境
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(base64, 'base64').toString('utf-8')
    }

    throw new Error('No base64 decoder available')
  }
}

/**
 * 创建 JWT 解析器实例
 *
 * @returns JWT 解析器实例
 *
 * @example
 * ```typescript
 * import { createJWTParser } from '@ldesign/auth/jwt'
 *
 * const parser = createJWTParser()
 * const decoded = parser.decode('eyJhbGc...')
 * ```
 */
export function createJWTParser(): JWTParser {
  return new JWTParser()
}

/**
 * 全局 JWT 解析器实例
 */
export const jwtParser = createJWTParser()


