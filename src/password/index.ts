/**
 * 密码管理模块
 *
 * 提供密码验证、重置、策略管理等功能
 *
 * @example
 * ```typescript
 * import { createPasswordManager } from '@ldesign/auth/password'
 *
 * const manager = createPasswordManager({
 *   minLength: 10,
 *   requireUppercase: true,
 *   requireLowercase: true,
 *   requireNumbers: true,
 *   requireSpecialChars: true,
 * })
 *
 * // 验证密码
 * const result = manager.validatePassword('MyP@ssw0rd123')
 * if (result.valid) {
 *   console.log('密码强度:', result.strengthLevel)
 * } else {
 *   console.error('错误:', result.errors)
 * }
 *
 * // 请求密码重置
 * await manager.requestReset('user@example.com')
 *
 * // 重置密码
 * await manager.resetPassword(token, 'NewP@ssw0rd123')
 * ```
 */

// 导出类型
export type * from './types'

// 导出密码管理器
export { PasswordManager, createPasswordManager } from './PasswordManager'

