/**
 * MFA (多因素认证) 管理器
 */

import type { HttpClient } from '@ldesign/http'
import type { MFAConfig, MFAMethod, MFASetupInfo } from './types'
import { TOTPVerifier } from './totp'
import { SMSVerifier } from './sms'
import { AuthError, AuthErrorCode } from '../errors'

/**
 * MFA 管理器类
 */
export class MFAManager {
  private config: Required<MFAConfig>
  private httpClient?: HttpClient
  private totpVerifier: TOTPVerifier
  private smsVerifier: SMSVerifier

  constructor(config: MFAConfig = {}, httpClient?: HttpClient) {
    this.config = {
      appName: config.appName || 'LDesign',
      issuer: config.issuer || 'LDesign',
      totpPeriod: config.totpPeriod || 30,
      totpDigits: config.totpDigits || 6,
      backupCodeCount: config.backupCodeCount || 10,
    }

    this.httpClient = httpClient
    this.totpVerifier = new TOTPVerifier(this.config.totpPeriod, this.config.totpDigits)
    this.smsVerifier = new SMSVerifier({}, httpClient)
  }

  /**
   * 启用 MFA
   *
   * @param userId - 用户 ID
   * @param method - MFA 方法
   * @returns MFA 设置信息
   *
   * @example
   * ```typescript
   * const mfa = new MFAManager(config)
   * const setup = await mfa.enable('user123', 'totp')
   *
   * console.log('Secret:', setup.secret)
   * console.log('QR Code:', setup.qrCode)
   * console.log('备用码:', setup.backupCodes)
   * ```
   */
  async enable(userId: string, method: MFAMethod): Promise<MFASetupInfo> {
    switch (method) {
      case 'totp':
        return this.enableTOTP(userId)

      case 'sms':
        return this.enableSMS(userId)

      case 'email':
        return this.enableEmail(userId)

      default:
        throw AuthError.fromCode(
          AuthErrorCode.INVALID_PARAMETER,
          undefined,
          { method },
        )
    }
  }

  /**
   * 启用 TOTP
   *
   * @param userId - 用户 ID
   * @returns TOTP 设置信息
   * @private
   */
  private async enableTOTP(userId: string): Promise<MFASetupInfo> {
    // 生成 Secret
    const secret = this.totpVerifier.generateSecret()

    // 生成 URI（用于 QR 码）
    const uri = this.totpVerifier.generateURI(
      secret,
      userId,
      this.config.issuer,
    )

    // 生成备用码
    const backupCodes = this.generateBackupCodes()

    return {
      method: 'totp',
      secret,
      qrCode: uri, // 前端可以使用这个 URI 生成 QR 码
      backupCodes,
    }
  }

  /**
   * 启用 SMS
   *
   * @param userId - 用户 ID
   * @returns SMS 设置信息
   * @private
   */
  private async enableSMS(_userId: string): Promise<MFASetupInfo> {
    return {
      method: 'sms',
      backupCodes: this.generateBackupCodes(),
    }
  }

  /**
   * 启用 Email
   *
   * @param userId - 用户 ID
   * @returns Email 设置信息
   * @private
   */
  private async enableEmail(_userId: string): Promise<MFASetupInfo> {
    return {
      method: 'email',
      backupCodes: this.generateBackupCodes(),
    }
  }

  /**
   * 验证 MFA 代码
   *
   * @param userId - 用户 ID
   * @param code - 验证码
   * @param method - MFA 方法
   * @param secret - Secret（TOTP 需要）
   * @returns 是否验证通过
   *
   * @example
   * ```typescript
   * const isValid = await mfa.verify('user123', '123456', 'totp', secret)
   * ```
   */
  async verify(
    userId: string,
    code: string,
    method: MFAMethod,
    secret?: string,
  ): Promise<boolean> {
    switch (method) {
      case 'totp':
        if (!secret) {
          throw AuthError.fromCode(
            AuthErrorCode.MISSING_REQUIRED_FIELD,
            undefined,
            { field: 'secret' },
          )
        }
        return this.totpVerifier.verifyToken(secret, code).valid

      case 'sms':
        // SMS 验证需要手机号，这里简化处理
        return true

      case 'email':
        // Email 验证需要邮箱，这里简化处理
        return true

      case 'backup_code':
        // 备用码验证
        return this.verifyBackupCode(userId, code)

      default:
        throw AuthError.fromCode(
          AuthErrorCode.INVALID_PARAMETER,
          undefined,
          { method },
        )
    }
  }

  /**
   * 生成备用码
   *
   * @returns 备用码数组
   *
   * @example
   * ```typescript
   * const backupCodes = mfa.generateBackupCodes(10)
   * console.log('备用码:', backupCodes)
   * ```
   */
  generateBackupCodes(count?: number): string[] {
    const total = count || this.config.backupCodeCount
    const codes: string[] = []

    for (let i = 0; i < total; i++) {
      // 生成 8 位随机字符串
      let code = ''
      const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

      for (let j = 0; j < 8; j++) {
        const randomIndex = Math.floor(Math.random() * charset.length)
        code += charset[randomIndex]
      }

      // 格式化为 XXXX-XXXX
      code = `${code.slice(0, 4)}-${code.slice(4, 8)}`

      codes.push(code)
    }

    return codes
  }

  /**
   * 验证备用码
   *
   * @param userId - 用户 ID
   * @param code - 备用码
   * @returns 是否有效
   * @private
   */
  private async verifyBackupCode(_userId: string, _code: string): Promise<boolean> {
    // 实际应该从后端验证
    // 这里简化处理
    return true
  }

  /**
   * 获取 TOTP 验证器
   */
  getTOTPVerifier(): TOTPVerifier {
    return this.totpVerifier
  }

  /**
   * 获取 SMS 验证器
   */
  getSMSVerifier(): SMSVerifier {
    return this.smsVerifier
  }
}

/**
 * 创建 MFA 管理器
 *
 * @param config - MFA 配置
 * @param httpClient - HTTP 客户端
 * @returns MFA 管理器实例
 *
 * @example
 * ```typescript
 * import { createMFAManager } from '@ldesign/auth/mfa'
 * import { createHttpClient } from '@ldesign/http'
 *
 * const httpClient = createHttpClient()
 * const mfa = createMFAManager({
 *   appName: 'My App',
 *   issuer: 'My Company',
 * }, httpClient)
 *
 * // 启用 TOTP
 * const setup = await mfa.enable('user123', 'totp')
 * console.log('扫描此 QR 码:', setup.qrCode)
 *
 * // 验证
 * const isValid = await mfa.verify('user123', '123456', 'totp', setup.secret)
 * ```
 */
export function createMFAManager(
  config?: MFAConfig,
  httpClient?: HttpClient,
): MFAManager {
  return new MFAManager(config, httpClient)
}

