/**
 * JWT 模块
 *
 * 提供 JWT Token 的解析、验证和管理功能
 *
 * @example
 * ```typescript
 * import { jwtParser, jwtValidator } from '@ldesign/auth/jwt'
 *
 * // 解析 Token
 * const decoded = jwtParser.decode('eyJhbGc...')
 * console.log(decoded.payload.sub)
 *
 * // 验证 Token
 * const result = jwtValidator.verify('eyJhbGc...', {
 *   verifyExpiry: true,
 *   issuer: 'https://auth.example.com',
 * })
 *
 * if (result.valid) {
 *   console.log('Token 有效')
 * }
 * ```
 */

// 导出类型
export type * from './types'

// 导出解析器
export { JWTParser, createJWTParser, jwtParser } from './parser'

// 导出验证器
export { JWTValidator, createJWTValidator, jwtValidator } from './validator'


