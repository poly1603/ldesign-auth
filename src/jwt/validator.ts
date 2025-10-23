/**
 * JWT 验证器
 *
 * 提供 JWT Token 的完整验证功能，包括结构验证、过期验证、声明验证等
 */

import type { DecodedJWT, JWTVerifyOptions, JWTVerifyResult } from './types'
import { JWTParser } from './parser'

/**
 * JWT 验证器类
 */
export class JWTValidator {
  private parser: JWTParser

  constructor() {
    this.parser = new JWTParser()
  }

  /**
   * 验证 JWT Token
   *
   * @param token - JWT Token 字符串
   * @param options - 验证选项
   * @returns 验证结果
   *
   * @example
   * ```typescript
   * const validator = new JWTValidator()
   * const result = validator.verify('eyJhbGc...', {
   *   verifyExpiry: true,
   *   issuer: 'https://auth.example.com',
   * })
   *
   * if (result.valid) {
   *   console.log('Token 有效')
   * } else {
   *   console.error('Token 无效:', result.error)
   * }
   * ```
   */
  verify(token: string, options: JWTVerifyOptions = {}): JWTVerifyResult {
    try {
      // 1. 解码 Token
      const decoded = this.parser.decode(token)

      // 2. 验证结构
      const structureError = this.validateStructure(decoded)
      if (structureError) {
        return {
          valid: false,
          error: structureError,
          errorCode: 'INVALID_STRUCTURE',
        }
      }

      // 3. 验证过期时间
      if (options.verifyExpiry !== false) {
        const expiryError = this.validateExpiry(decoded, options.clockTolerance)
        if (expiryError) {
          return {
            valid: false,
            error: expiryError,
            errorCode: 'TOKEN_EXPIRED',
          }
        }
      }

      // 4. 验证签发时间（nbf）
      const nbfError = this.validateNotBefore(decoded, options.clockTolerance)
      if (nbfError) {
        return {
          valid: false,
          error: nbfError,
          errorCode: 'TOKEN_NOT_YET_VALID',
        }
      }

      // 5. 验证签发者（issuer）
      if (options.issuer) {
        const issuerError = this.validateIssuer(decoded, options.issuer)
        if (issuerError) {
          return {
            valid: false,
            error: issuerError,
            errorCode: 'INVALID_ISSUER',
          }
        }
      }

      // 6. 验证受众（audience）
      if (options.audience) {
        const audienceError = this.validateAudience(decoded, options.audience)
        if (audienceError) {
          return {
            valid: false,
            error: audienceError,
            errorCode: 'INVALID_AUDIENCE',
          }
        }
      }

      // 7. 验证主题（subject）
      if (options.subject) {
        const subjectError = this.validateSubject(decoded, options.subject)
        if (subjectError) {
          return {
            valid: false,
            error: subjectError,
            errorCode: 'INVALID_SUBJECT',
          }
        }
      }

      // 8. 验证算法
      if (options.algorithms && options.algorithms.length > 0) {
        const algorithmError = this.validateAlgorithm(decoded, options.algorithms)
        if (algorithmError) {
          return {
            valid: false,
            error: algorithmError,
            errorCode: 'INVALID_ALGORITHM',
          }
        }
      }

      // 所有验证通过
      return {
        valid: true,
        decoded,
      }
    }
    catch (error) {
      return {
        valid: false,
        error: (error as Error).message,
        errorCode: 'DECODE_ERROR',
      }
    }
  }

  /**
   * 验证 JWT 结构
   *
   * @param decoded - 已解码的 JWT
   * @returns 错误信息，如果验证通过返回 null
   */
  validateStructure(decoded: DecodedJWT): string | null {
    // 验证 Header
    if (!decoded.header || typeof decoded.header !== 'object') {
      return 'Invalid token: missing or invalid header'
    }

    if (!decoded.header.alg) {
      return 'Invalid token: missing algorithm in header'
    }

    if (!decoded.header.typ || decoded.header.typ.toLowerCase() !== 'jwt') {
      return 'Invalid token: invalid or missing type in header'
    }

    // 验证 Payload
    if (!decoded.payload || typeof decoded.payload !== 'object') {
      return 'Invalid token: missing or invalid payload'
    }

    // 验证签名
    if (!decoded.signature) {
      return 'Invalid token: missing signature'
    }

    return null
  }

  /**
   * 验证过期时间
   *
   * @param decoded - 已解码的 JWT
   * @param clockTolerance - 时间容差（秒）
   * @returns 错误信息，如果验证通过返回 null
   */
  validateExpiry(decoded: DecodedJWT, clockTolerance = 0): string | null {
    const { exp } = decoded.payload

    if (!exp) {
      // 没有过期时间，认为有效
      return null
    }

    if (typeof exp !== 'number') {
      return 'Invalid token: exp claim must be a number'
    }

    const now = Math.floor(Date.now() / 1000)

    if (exp + clockTolerance < now) {
      return `Token has expired (exp: ${exp}, now: ${now})`
    }

    return null
  }

  /**
   * 验证生效时间（nbf - not before）
   *
   * @param decoded - 已解码的 JWT
   * @param clockTolerance - 时间容差（秒）
   * @returns 错误信息，如果验证通过返回 null
   */
  validateNotBefore(decoded: DecodedJWT, clockTolerance = 0): string | null {
    const { nbf } = decoded.payload

    if (!nbf) {
      // 没有 nbf 声明，认为有效
      return null
    }

    if (typeof nbf !== 'number') {
      return 'Invalid token: nbf claim must be a number'
    }

    const now = Math.floor(Date.now() / 1000)

    if (nbf - clockTolerance > now) {
      return `Token is not yet valid (nbf: ${nbf}, now: ${now})`
    }

    return null
  }

  /**
   * 验证签发者
   *
   * @param decoded - 已解码的 JWT
   * @param expectedIssuer - 期望的签发者
   * @returns 错误信息，如果验证通过返回 null
   */
  validateIssuer(decoded: DecodedJWT, expectedIssuer: string): string | null {
    const { iss } = decoded.payload

    if (!iss) {
      return 'Invalid token: missing issuer claim'
    }

    if (iss !== expectedIssuer) {
      return `Invalid issuer (expected: ${expectedIssuer}, got: ${iss})`
    }

    return null
  }

  /**
   * 验证受众
   *
   * @param decoded - 已解码的 JWT
   * @param expectedAudience - 期望的受众（可以是字符串或数组）
   * @returns 错误信息，如果验证通过返回 null
   */
  validateAudience(decoded: DecodedJWT, expectedAudience: string | string[]): string | null {
    const { aud } = decoded.payload

    if (!aud) {
      return 'Invalid token: missing audience claim'
    }

    const audiences = Array.isArray(aud) ? aud : [aud]
    const expected = Array.isArray(expectedAudience) ? expectedAudience : [expectedAudience]

    const hasMatch = expected.some(exp => audiences.includes(exp))

    if (!hasMatch) {
      return `Invalid audience (expected: ${expected.join(', ')}, got: ${audiences.join(', ')})`
    }

    return null
  }

  /**
   * 验证主题
   *
   * @param decoded - 已解码的 JWT
   * @param expectedSubject - 期望的主题
   * @returns 错误信息，如果验证通过返回 null
   */
  validateSubject(decoded: DecodedJWT, expectedSubject: string): string | null {
    const { sub } = decoded.payload

    if (!sub) {
      return 'Invalid token: missing subject claim'
    }

    if (sub !== expectedSubject) {
      return `Invalid subject (expected: ${expectedSubject}, got: ${sub})`
    }

    return null
  }

  /**
   * 验证算法
   *
   * @param decoded - 已解码的 JWT
   * @param allowedAlgorithms - 允许的算法列表
   * @returns 错误信息，如果验证通过返回 null
   */
  validateAlgorithm(decoded: DecodedJWT, allowedAlgorithms: string[]): string | null {
    const { alg } = decoded.header

    if (!allowedAlgorithms.includes(alg)) {
      return `Invalid algorithm (expected one of: ${allowedAlgorithms.join(', ')}, got: ${alg})`
    }

    return null
  }

  /**
   * 快速验证 Token 是否有效（仅验证结构和过期）
   *
   * @param token - JWT Token 字符串
   * @returns 是否有效
   *
   * @example
   * ```typescript
   * const validator = new JWTValidator()
   * if (validator.isValid('eyJhbGc...')) {
   *   console.log('Token 基本有效')
   * }
   * ```
   */
  isValid(token: string): boolean {
    const result = this.verify(token, { verifyExpiry: true })
    return result.valid
  }
}

/**
 * 创建 JWT 验证器实例
 *
 * @returns JWT 验证器实例
 *
 * @example
 * ```typescript
 * import { createJWTValidator } from '@ldesign/auth/jwt'
 *
 * const validator = createJWTValidator()
 * const result = validator.verify('eyJhbGc...')
 * ```
 */
export function createJWTValidator(): JWTValidator {
  return new JWTValidator()
}

/**
 * 全局 JWT 验证器实例
 */
export const jwtValidator = createJWTValidator()


