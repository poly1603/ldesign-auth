/**
 * 密码管理器
 *
 * 提供密码验证、重置、策略管理等功能
 */

import type { HttpClient } from '@ldesign/http'
import type {
  PasswordPolicy,
  PasswordResetConfig,
  PasswordValidationResult,
} from './types'
import { AuthError, AuthErrorCode, ValidationError } from '../errors'

/**
 * 常用弱密码列表（部分）
 */
const COMMON_PASSWORDS = new Set([
  '123456',
  'password',
  '12345678',
  'qwerty',
  '123456789',
  '12345',
  '1234',
  '111111',
  '1234567',
  'dragon',
  '123123',
  'baseball',
  'iloveyou',
  'trustno1',
  '1234567890',
  'superman',
  'qwertyuiop',
  'admin',
  'welcome',
  'monkey',
])

/**
 * 密码管理器类
 */
export class PasswordManager {
  private policy: Required<PasswordPolicy>
  private resetConfig: Required<PasswordResetConfig>
  private httpClient?: HttpClient
  private passwordHistory: Map<string, string[]> = new Map()

  constructor(
    policy: PasswordPolicy = {},
    resetConfig: PasswordResetConfig = {},
    httpClient?: HttpClient,
  ) {
    this.policy = {
      minLength: policy.minLength || 8,
      maxLength: policy.maxLength || 128,
      requireUppercase: policy.requireUppercase !== undefined ? policy.requireUppercase : true,
      requireLowercase: policy.requireLowercase !== undefined ? policy.requireLowercase : true,
      requireNumbers: policy.requireNumbers !== undefined ? policy.requireNumbers : true,
      requireSpecialChars: policy.requireSpecialChars !== undefined ? policy.requireSpecialChars : true,
      specialChars: policy.specialChars || '!@#$%^&*()_+-=[]{}|;:,.<>?',
      preventCommon: policy.preventCommon !== undefined ? policy.preventCommon : true,
      preventReuse: policy.preventReuse || 0,
    }

    this.resetConfig = {
      tokenExpiry: resetConfig.tokenExpiry || 3600,
      requestEndpoint: resetConfig.requestEndpoint || '/api/auth/password/reset/request',
      verifyEndpoint: resetConfig.verifyEndpoint || '/api/auth/password/reset/verify',
      confirmEndpoint: resetConfig.confirmEndpoint || '/api/auth/password/reset/confirm',
    }

    this.httpClient = httpClient
  }

  /**
   * 验证密码
   *
   * @param password - 密码
   * @param userId - 用户 ID（用于检查重复使用）
   * @returns 验证结果
   *
   * @example
   * ```typescript
   * const manager = new PasswordManager()
   * const result = manager.validatePassword('MyP@ssw0rd123')
   *
   * if (result.valid) {
   *   console.log('密码有效，强度:', result.strengthLevel)
   * } else {
   *   console.error('密码无效:', result.errors)
   * }
   * ```
   */
  validatePassword(password: string, userId?: string): PasswordValidationResult {
    const errors: string[] = []

    // 1. 检查长度
    if (password.length < this.policy.minLength) {
      errors.push(`密码长度不能少于 ${this.policy.minLength} 个字符`)
    }

    if (password.length > this.policy.maxLength) {
      errors.push(`密码长度不能超过 ${this.policy.maxLength} 个字符`)
    }

    // 2. 检查大写字母
    if (this.policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('密码必须包含大写字母')
    }

    // 3. 检查小写字母
    if (this.policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('密码必须包含小写字母')
    }

    // 4. 检查数字
    if (this.policy.requireNumbers && !/\d/.test(password)) {
      errors.push('密码必须包含数字')
    }

    // 5. 检查特殊字符
    if (this.policy.requireSpecialChars) {
      const specialCharsRegex = new RegExp(`[${this.escapeRegex(this.policy.specialChars)}]`)
      if (!specialCharsRegex.test(password)) {
        errors.push(`密码必须包含特殊字符 (${this.policy.specialChars})`)
      }
    }

    // 6. 检查常用密码
    if (this.policy.preventCommon) {
      const lowerPassword = password.toLowerCase()
      if (COMMON_PASSWORDS.has(lowerPassword)) {
        errors.push('密码过于常见，请使用更复杂的密码')
      }
    }

    // 7. 检查重复使用
    if (userId && this.policy.preventReuse > 0) {
      const history = this.passwordHistory.get(userId) || []
      // 注意：实际应用中应该使用哈希比较
      if (history.includes(password)) {
        errors.push(`密码不能与最近 ${this.policy.preventReuse} 个密码相同`)
      }
    }

    // 计算密码强度
    const strength = this.calculateStrength(password)
    const strengthLevel = this.getStrengthLevel(strength)

    return {
      valid: errors.length === 0,
      errors,
      strength,
      strengthLevel,
    }
  }

  /**
   * 计算密码强度（0-100）
   *
   * @param password - 密码
   * @returns 强度分数
   * @private
   */
  private calculateStrength(password: string): number {
    let score = 0

    // 长度得分（最多 30 分）
    score += Math.min(password.length * 2, 30)

    // 大写字母（10 分）
    if (/[A-Z]/.test(password))
      score += 10

    // 小写字母（10 分）
    if (/[a-z]/.test(password))
      score += 10

    // 数字（10 分）
    if (/\d/.test(password))
      score += 10

    // 特殊字符（10 分）
    if (/[^A-Za-z0-9]/.test(password))
      score += 10

    // 多样性得分（最多 20 分）
    const uniqueChars = new Set(password).size
    score += Math.min(uniqueChars * 2, 20)

    // 减分：连续字符
    if (/(.)\1{2,}/.test(password))
      score -= 10

    // 减分：常见模式
    if (/123|abc|password/i.test(password))
      score -= 10

    return Math.max(0, Math.min(100, score))
  }

  /**
   * 获取强度级别
   *
   * @param strength - 强度分数
   * @returns 强度级别
   * @private
   */
  private getStrengthLevel(strength: number): 'weak' | 'fair' | 'good' | 'strong' | 'very_strong' {
    if (strength < 20)
      return 'weak'
    if (strength < 40)
      return 'fair'
    if (strength < 60)
      return 'good'
    if (strength < 80)
      return 'strong'
    return 'very_strong'
  }

  /**
   * 请求密码重置
   *
   * @param email - 用户邮箱
   * @returns Promise
   *
   * @example
   * ```typescript
   * await manager.requestReset('user@example.com')
   * console.log('重置邮件已发送')
   * ```
   */
  async requestReset(email: string): Promise<void> {
    if (!this.httpClient) {
      throw AuthError.fromCode(AuthErrorCode.INVALID_CONFIG)
    }

    try {
      await this.httpClient.post(this.resetConfig.requestEndpoint, { email })
    }
    catch (error) {
      throw AuthError.fromCode(
        AuthErrorCode.SERVER_ERROR,
        error as Error,
      )
    }
  }

  /**
   * 验证重置 Token
   *
   * @param token - 重置 Token
   * @returns 是否有效
   *
   * @example
   * ```typescript
   * const isValid = await manager.verifyResetToken(token)
   * ```
   */
  async verifyResetToken(token: string): Promise<boolean> {
    if (!this.httpClient) {
      throw AuthError.fromCode(AuthErrorCode.INVALID_CONFIG)
    }

    try {
      await this.httpClient.post(this.resetConfig.verifyEndpoint, { token })
      return true
    }
    catch {
      return false
    }
  }

  /**
   * 重置密码
   *
   * @param token - 重置 Token
   * @param newPassword - 新密码
   * @returns Promise
   *
   * @example
   * ```typescript
   * await manager.resetPassword(token, 'NewP@ssw0rd123')
   * console.log('密码已重置')
   * ```
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // 验证新密码
    const validation = this.validatePassword(newPassword)
    if (!validation.valid) {
      throw ValidationError.singleField(
        'password',
        validation.errors.join('; '),
        newPassword,
      )
    }

    if (!this.httpClient) {
      throw AuthError.fromCode(AuthErrorCode.INVALID_CONFIG)
    }

    try {
      await this.httpClient.post(this.resetConfig.confirmEndpoint, {
        token,
        password: newPassword,
      })
    }
    catch (error) {
      throw AuthError.fromCode(
        AuthErrorCode.SERVER_ERROR,
        error as Error,
      )
    }
  }

  /**
   * 更改密码
   *
   * @param userId - 用户 ID
   * @param oldPassword - 旧密码
   * @param newPassword - 新密码
   *
   * @example
   * ```typescript
   * await manager.changePassword('user123', 'OldP@ss', 'NewP@ss123')
   * ```
   */
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    // 验证新密码
    const validation = this.validatePassword(newPassword, userId)
    if (!validation.valid) {
      throw ValidationError.singleField(
        'password',
        validation.errors.join('; '),
        newPassword,
      )
    }

    // 更新密码历史
    if (this.policy.preventReuse > 0) {
      const history = this.passwordHistory.get(userId) || []
      history.unshift(oldPassword)
      if (history.length > this.policy.preventReuse) {
        history.pop()
      }
      this.passwordHistory.set(userId, history)
    }

    // 实际更改密码的逻辑应该由后端处理
    // 这里只是验证
  }

  /**
   * 转义正则表达式特殊字符
   *
   * @param str - 字符串
   * @returns 转义后的字符串
   * @private
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
}

/**
 * 创建密码管理器
 *
 * @param policy - 密码策略
 * @param resetConfig - 重置配置
 * @param httpClient - HTTP 客户端
 * @returns 密码管理器实例
 *
 * @example
 * ```typescript
 * import { createPasswordManager } from '@ldesign/auth/password'
 * import { createHttpClient } from '@ldesign/http'
 *
 * const httpClient = createHttpClient()
 * const manager = createPasswordManager(
 *   {
 *     minLength: 10,
 *     requireSpecialChars: true,
 *   },
 *   {},
 *   httpClient,
 * )
 *
 * const result = manager.validatePassword('MyP@ssw0rd123')
 * ```
 */
export function createPasswordManager(
  policy?: PasswordPolicy,
  resetConfig?: PasswordResetConfig,
  httpClient?: HttpClient,
): PasswordManager {
  return new PasswordManager(policy, resetConfig, httpClient)
}

