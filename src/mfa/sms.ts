/**
 * SMS 验证码实现
 */

import type { HttpClient } from '@ldesign/http'
import { AuthError, AuthErrorCode } from '../errors'

/**
 * SMS 验证器配置
 */
export interface SMSVerifierConfig {
  /**
   * 发送验证码端点
   * @default '/api/auth/mfa/sms/send'
   */
  sendEndpoint?: string

  /**
   * 验证验证码端点
   * @default '/api/auth/mfa/sms/verify'
   */
  verifyEndpoint?: string

  /**
   * 验证码长度
   * @default 6
   */
  codeLength?: number

  /**
   * 验证码有效期（秒）
   * @default 300 (5分钟)
   */
  expiry?: number
}

/**
 * SMS 验证器类
 */
export class SMSVerifier {
  private config: Required<SMSVerifierConfig>
  private httpClient?: HttpClient
  private pendingCodes: Map<string, { code: string, expiresAt: number }> = new Map()

  constructor(config: SMSVerifierConfig = {}, httpClient?: HttpClient) {
    this.config = {
      sendEndpoint: config.sendEndpoint || '/api/auth/mfa/sms/send',
      verifyEndpoint: config.verifyEndpoint || '/api/auth/mfa/sms/verify',
      codeLength: config.codeLength || 6,
      expiry: config.expiry || 300,
    }

    this.httpClient = httpClient
  }

  /**
   * 发送验证码
   *
   * @param phoneNumber - 手机号
   * @returns Promise
   *
   * @example
   * ```typescript
   * const verifier = new SMSVerifier(config, httpClient)
   * await verifier.sendCode('+86 138 1234 5678')
   * ```
   */
  async sendCode(phoneNumber: string): Promise<void> {
    if (!this.httpClient) {
      throw AuthError.fromCode(AuthErrorCode.INVALID_CONFIG)
    }

    // 生成验证码
    const code = this.generateCode()

    try {
      // 发送到后端
      await this.httpClient.post(this.config.sendEndpoint, {
        phoneNumber,
        code,
      })

      // 保存验证码（用于验证）
      this.pendingCodes.set(phoneNumber, {
        code,
        expiresAt: Date.now() + this.config.expiry * 1000,
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
   * 验证验证码
   *
   * @param phoneNumber - 手机号
   * @param code - 验证码
   * @returns 是否验证通过
   *
   * @example
   * ```typescript
   * const isValid = await verifier.verifyCode('+86 138 1234 5678', '123456')
   * ```
   */
  async verifyCode(phoneNumber: string, code: string): Promise<boolean> {
    // 本地验证（开发模式）
    const pending = this.pendingCodes.get(phoneNumber)
    if (pending) {
      // 检查过期
      if (Date.now() > pending.expiresAt) {
        this.pendingCodes.delete(phoneNumber)
        return false
      }

      // 验证码匹配
      if (pending.code === code) {
        this.pendingCodes.delete(phoneNumber)
        return true
      }

      return false
    }

    // 服务端验证
    if (!this.httpClient) {
      throw AuthError.fromCode(AuthErrorCode.INVALID_CONFIG)
    }

    try {
      await this.httpClient.post(this.config.verifyEndpoint, {
        phoneNumber,
        code,
      })
      return true
    }
    catch {
      return false
    }
  }

  /**
   * 生成随机验证码
   *
   * @returns 验证码
   * @private
   */
  private generateCode(): string {
    const max = 10 ** this.config.codeLength
    const code = Math.floor(Math.random() * max)
    return code.toString().padStart(this.config.codeLength, '0')
  }
}

/**
 * 创建 SMS 验证器
 *
 * @param config - 配置
 * @param httpClient - HTTP 客户端
 * @returns SMS 验证器实例
 *
 * @example
 * ```typescript
 * import { createSMSVerifier } from '@ldesign/auth/mfa'
 * import { createHttpClient } from '@ldesign/http'
 *
 * const httpClient = createHttpClient()
 * const verifier = createSMSVerifier({ codeLength: 6 }, httpClient)
 *
 * await verifier.sendCode('+86 138 1234 5678')
 * const isValid = await verifier.verifyCode('+86 138 1234 5678', '123456')
 * ```
 */
export function createSMSVerifier(
  config?: SMSVerifierConfig,
  httpClient?: HttpClient,
): SMSVerifier {
  return new SMSVerifier(config, httpClient)
}

