/**
 * 密码管理类型定义
 */

/**
 * 密码策略配置
 */
export interface PasswordPolicy {
  /**
   * 最小长度
   * @default 8
   */
  minLength?: number

  /**
   * 最大长度
   * @default 128
   */
  maxLength?: number

  /**
   * 要求大写字母
   * @default true
   */
  requireUppercase?: boolean

  /**
   * 要求小写字母
   * @default true
   */
  requireLowercase?: boolean

  /**
   * 要求数字
   * @default true
   */
  requireNumbers?: boolean

  /**
   * 要求特殊字符
   * @default true
   */
  requireSpecialChars?: boolean

  /**
   * 特殊字符集合
   * @default '!@#$%^&*()_+-=[]{}|;:,.<>?'
   */
  specialChars?: string

  /**
   * 防止常用密码
   * @default true
   */
  preventCommon?: boolean

  /**
   * 防止重复使用最近 N 个密码
   * @default 0 (不限制)
   */
  preventReuse?: number
}

/**
 * 密码验证结果
 */
export interface PasswordValidationResult {
  /**
   * 是否有效
   */
  valid: boolean

  /**
   * 错误消息列表
   */
  errors: string[]

  /**
   * 密码强度（0-100）
   */
  strength: number

  /**
   * 强度级别
   */
  strengthLevel: 'weak' | 'fair' | 'good' | 'strong' | 'very_strong'
}

/**
 * 密码重置配置
 */
export interface PasswordResetConfig {
  /**
   * 重置 Token 有效期（秒）
   * @default 3600 (1小时)
   */
  tokenExpiry?: number

  /**
   * 发送重置邮件端点
   * @default '/api/auth/password/reset/request'
   */
  requestEndpoint?: string

  /**
   * 验证 Token 端点
   * @default '/api/auth/password/reset/verify'
   */
  verifyEndpoint?: string

  /**
   * 重置密码端点
   * @default '/api/auth/password/reset/confirm'
   */
  confirmEndpoint?: string
}

