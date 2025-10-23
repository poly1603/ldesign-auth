/**
 * 审计日志类型定义
 */

/**
 * 登录信息
 */
export interface LoginInfo {
  /**
   * 时间戳
   */
  timestamp: Date

  /**
   * IP 地址
   */
  ip: string

  /**
   * 设备信息
   */
  device: string

  /**
   * 浏览器
   */
  browser?: string

  /**
   * 操作系统
   */
  os?: string

  /**
   * 地理位置（可选）
   */
  location?: GeoLocation

  /**
   * 登录是否成功
   */
  success: boolean

  /**
   * 失败原因
   */
  failureReason?: string
}

/**
 * 地理位置
 */
export interface GeoLocation {
  /**
   * 国家
   */
  country?: string

  /**
   * 城市
   */
  city?: string

  /**
   * 纬度
   */
  latitude?: number

  /**
   * 经度
   */
  longitude?: number
}

/**
 * 登录记录
 */
export interface LoginRecord extends LoginInfo {
  /**
   * 记录 ID
   */
  id: string

  /**
   * 用户 ID
   */
  userId: string
}

/**
 * 审计记录
 */
export interface AuditRecord {
  /**
   * 记录 ID
   */
  id: string

  /**
   * 用户 ID
   */
  userId: string

  /**
   * 操作类型
   */
  action: string

  /**
   * 时间戳
   */
  timestamp: Date

  /**
   * IP 地址
   */
  ip: string

  /**
   * 详情
   */
  details: Record<string, any>

  /**
   * 是否成功
   */
  success: boolean

  /**
   * 错误信息
   */
  error?: string
}

/**
 * 敏感操作类型
 */
export type SensitiveOperation =
  | 'password_change'
  | 'email_change'
  | 'mfa_enable'
  | 'mfa_disable'
  | 'account_delete'
  | 'permission_change'

/**
 * 审计过滤器
 */
export interface AuditFilters {
  /**
   * 用户 ID
   */
  userId?: string

  /**
   * 操作类型
   */
  action?: string

  /**
   * 开始时间
   */
  startTime?: Date

  /**
   * 结束时间
   */
  endTime?: Date

  /**
   * 是否成功
   */
  success?: boolean

  /**
   * 限制数量
   */
  limit?: number

  /**
   * 偏移量
   */
  offset?: number
}

/**
 * 历史查询选项
 */
export interface HistoryOptions {
  /**
   * 限制数量
   */
  limit?: number

  /**
   * 偏移量
   */
  offset?: number

  /**
   * 开始时间
   */
  startTime?: Date

  /**
   * 结束时间
   */
  endTime?: Date
}

