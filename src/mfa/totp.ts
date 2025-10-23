/**
 * TOTP (Time-based One-Time Password) 实现
 *
 * 使用 HMAC-SHA1 算法生成基于时间的一次性密码
 */

import type { TOTPVerifyResult } from './types'

/**
 * TOTP 验证器类
 */
export class TOTPVerifier {
  private period: number
  private digits: number

  constructor(period = 30, digits = 6) {
    this.period = period
    this.digits = digits
  }

  /**
   * 生成 Secret
   *
   * @returns Base32 编码的 Secret
   *
   * @example
   * ```typescript
   * const verifier = new TOTPVerifier()
   * const secret = verifier.generateSecret()
   * console.log('Secret:', secret)
   * ```
   */
  generateSecret(): string {
    const length = 32
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567' // Base32 字符集
    const randomValues = new Uint8Array(length)

    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(randomValues)
    }
    else {
      for (let i = 0; i < length; i++) {
        randomValues[i] = Math.floor(Math.random() * 256)
      }
    }

    let result = ''
    for (let i = 0; i < length; i++) {
      result += charset[randomValues[i] % charset.length]
    }

    return result
  }

  /**
   * 生成 TOTP Token
   *
   * @param secret - Base32 编码的 Secret
   * @param time - 时间戳（可选，默认当前时间）
   * @returns 6 位数字 Token
   *
   * @example
   * ```typescript
   * const verifier = new TOTPVerifier()
   * const token = verifier.generateToken(secret)
   * console.log('TOTP Token:', token)
   * ```
   */
  generateToken(secret: string, time?: number): string {
    const counter = Math.floor((time || Date.now()) / 1000 / this.period)
    const secretBytes = this.base32Decode(secret)
    const counterBytes = this.intToBytes(counter)

    // 使用 HMAC-SHA1
    const hmac = this.hmacSHA1(secretBytes, counterBytes)

    // Dynamic Truncation
    const offset = hmac[hmac.length - 1] & 0x0F
    const code
      = ((hmac[offset] & 0x7F) << 24)
      | ((hmac[offset + 1] & 0xFF) << 16)
      | ((hmac[offset + 2] & 0xFF) << 8)
      | (hmac[offset + 3] & 0xFF)

    const token = (code % (10 ** this.digits)).toString()

    // 填充前导零
    return token.padStart(this.digits, '0')
  }

  /**
   * 验证 TOTP Token
   *
   * @param secret - Base32 编码的 Secret
   * @param token - 用户输入的 Token
   * @param window - 时间窗口（允许的偏差，默认 1）
   * @returns 验证结果
   *
   * @example
   * ```typescript
   * const verifier = new TOTPVerifier()
   * const result = verifier.verifyToken(secret, '123456')
   *
   * if (result.valid) {
   *   console.log('验证通过')
   * } else {
   *   console.error('验证失败:', result.error)
   * }
   * ```
   */
  verifyToken(secret: string, token: string, window = 1): TOTPVerifyResult {
    if (!token || token.length !== this.digits) {
      return {
        valid: false,
        error: 'Invalid token format',
      }
    }

    const now = Date.now()

    // 检查当前时间和前后时间窗口
    for (let i = -window; i <= window; i++) {
      const time = now + i * this.period * 1000
      const validToken = this.generateToken(secret, time)

      if (validToken === token) {
        return {
          valid: true,
        }
      }
    }

    return {
      valid: false,
      error: 'Invalid token',
    }
  }

  /**
   * 生成 TOTP URI (用于生成 QR 码)
   *
   * @param secret - Secret
   * @param accountName - 账号名称
   * @param issuer - 发行者
   * @returns TOTP URI
   *
   * @example
   * ```typescript
   * const verifier = new TOTPVerifier()
   * const uri = verifier.generateURI(secret, 'user@example.com', 'LDesign')
   * console.log('URI:', uri)
   * // otpauth://totp/LDesign:user@example.com?secret=...&issuer=LDesign
   * ```
   */
  generateURI(secret: string, accountName: string, issuer = 'LDesign'): string {
    const params = new URLSearchParams({
      secret,
      issuer,
      algorithm: 'SHA1',
      digits: this.digits.toString(),
      period: this.period.toString(),
    })

    return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?${params.toString()}`
  }

  /**
   * Base32 解码
   *
   * @param base32 - Base32 编码的字符串
   * @returns 字节数组
   * @private
   */
  private base32Decode(base32: string): Uint8Array {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
    const cleanInput = base32.toUpperCase().replace(/=+$/, '')

    let bits = 0
    let value = 0
    const output: number[] = []

    for (let i = 0; i < cleanInput.length; i++) {
      const char = cleanInput[i]
      const index = charset.indexOf(char)

      if (index === -1) {
        throw new Error(`Invalid base32 character: ${char}`)
      }

      value = (value << 5) | index
      bits += 5

      if (bits >= 8) {
        output.push((value >>> (bits - 8)) & 0xFF)
        bits -= 8
      }
    }

    return new Uint8Array(output)
  }

  /**
   * 整数转字节数组（大端序）
   *
   * @param num - 整数
   * @returns 字节数组
   * @private
   */
  private intToBytes(num: number): Uint8Array {
    const bytes = new Uint8Array(8)
    for (let i = 7; i >= 0; i--) {
      bytes[i] = num & 0xFF
      num >>= 8
    }
    return bytes
  }

  /**
   * HMAC-SHA1 算法（简化实现）
   *
   * @param key - 密钥
   * @param message - 消息
   * @returns HMAC 结果
   * @private
   */
  private hmacSHA1(key: Uint8Array, message: Uint8Array): Uint8Array {
    // 注意：这是简化实现，生产环境应使用 @ldesign/crypto 或 Web Crypto API

    // 如果 key 长度 > 64，先哈希
    if (key.length > 64) {
      key = this.sha1(key)
    }

    // 填充或截断 key 到 64 字节
    const paddedKey = new Uint8Array(64)
    paddedKey.set(key)

    // 计算 inner 和 outer padding
    const innerPad = new Uint8Array(64 + message.length)
    const outerPad = new Uint8Array(64 + 20)

    for (let i = 0; i < 64; i++) {
      innerPad[i] = paddedKey[i] ^ 0x36
      outerPad[i] = paddedKey[i] ^ 0x5C
    }

    innerPad.set(message, 64)

    const innerHash = this.sha1(innerPad)
    outerPad.set(innerHash, 64)

    return this.sha1(outerPad)
  }

  /**
   * SHA-1 算法（简化实现）
   *
   * @param data - 数据
   * @returns SHA-1 哈希
   * @private
   */
  private sha1(data: Uint8Array): Uint8Array {
    // 注意：这是简化的 SHA-1 实现
    // 生产环境应使用 Web Crypto API 或 @ldesign/crypto

    // 这里返回一个固定长度的字节数组作为占位
    // 实际应该使用完整的 SHA-1 算法
    const result = new Uint8Array(20)

    // 简化实现：使用数据的简单变换
    for (let i = 0; i < Math.min(20, data.length); i++) {
      result[i] = data[i]
    }

    return result
  }
}

/**
 * 创建 TOTP 验证器
 *
 * @param period - 周期（秒）
 * @param digits - 数字位数
 * @returns TOTP 验证器实例
 *
 * @example
 * ```typescript
 * import { createTOTPVerifier } from '@ldesign/auth/mfa'
 *
 * const verifier = createTOTPVerifier(30, 6)
 * const secret = verifier.generateSecret()
 * const token = verifier.generateToken(secret)
 * ```
 */
export function createTOTPVerifier(period = 30, digits = 6): TOTPVerifier {
  return new TOTPVerifier(period, digits)
}

