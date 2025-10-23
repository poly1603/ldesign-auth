/**
 * MFA (多因素认证) 类型定义
 */

/**
 * MFA 方法
 */
export type MFAMethod = 'totp' | 'sms' | 'email' | 'backup_code'

/**
 * MFA 配置
 */
export interface MFAConfig {
  /**
   * 应用名称（用于 TOTP）
   * @default 'LDesign'
   */
  appName?: string

  /**
   * 发行者（用于 TOTP）
   */
  issuer?: string

  /**
   * TOTP 周期（秒）
   * @default 30
   */
  totpPeriod?: number

  /**
   * TOTP 数字位数
   * @default 6
   */
  totpDigits?: number

  /**
   * 备用码数量
   * @default 10
   */
  backupCodeCount?: number
}

/**
 * MFA 设置信息
 */
export interface MFASetupInfo {
  /**
   * 方法
   */
  method: MFAMethod

  /**
   * Secret (TOTP)
   */
  secret?: string

  /**
   * QR 码 (TOTP)
   */
  qrCode?: string

  /**
   * 备用码
   */
  backupCodes?: string[]

  /**
   * 手机号 (SMS)
   */
  phoneNumber?: string

  /**
   * 邮箱 (Email)
   */
  email?: string
}

/**
 * TOTP 验证结果
 */
export interface TOTPVerifyResult {
  /**
   * 是否有效
   */
  valid: boolean

  /**
   * 错误消息
   */
  error?: string
}

