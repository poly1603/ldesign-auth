/**
 * 审计日志记录器
 */

import type { HttpClient } from '@ldesign/http'
import type { CacheManager } from '@ldesign/cache'
import type {
  AuditFilters,
  AuditRecord,
  HistoryOptions,
  LoginInfo,
  LoginRecord,
  SensitiveOperation,
} from './types'
import { AuthError, AuthErrorCode } from '../errors'

/**
 * 审计日志配置
 */
export interface AuditLoggerConfig {
  /**
   * 登录历史端点
   * @default '/api/auth/audit/login-history'
   */
  loginHistoryEndpoint?: string

  /**
   * 审计日志端点
   * @default '/api/auth/audit/logs'
   */
  auditLogEndpoint?: string

  /**
   * 是否启用本地缓存
   * @default true
   */
  enableCache?: boolean

  /**
   * 本地缓存最大数量
   * @default 100
   */
  maxCacheSize?: number

  /**
   * 批量写入大小
   * @default 10
   */
  batchSize?: number

  /**
   * 批量写入间隔（毫秒）
   * @default 5000
   */
  batchInterval?: number
}

/**
 * 审计日志记录器类
 */
export class AuditLogger {
  private config: Required<AuditLoggerConfig>
  private httpClient?: HttpClient
  private cacheManager?: CacheManager
  private localCache: AuditRecord[] = []
  private batchTimer?: NodeJS.Timeout

  constructor(
    config: AuditLoggerConfig = {},
    httpClient?: HttpClient,
    cacheManager?: CacheManager,
  ) {
    this.config = {
      loginHistoryEndpoint: config.loginHistoryEndpoint || '/api/auth/audit/login-history',
      auditLogEndpoint: config.auditLogEndpoint || '/api/auth/audit/logs',
      enableCache: config.enableCache !== undefined ? config.enableCache : true,
      maxCacheSize: config.maxCacheSize || 100,
      batchSize: config.batchSize || 10,
      batchInterval: config.batchInterval || 5000,
    }

    this.httpClient = httpClient
    this.cacheManager = cacheManager

    // 启动批量写入定时器
    if (this.config.enableCache) {
      this.startBatchTimer()
    }
  }

  /**
   * 记录登录历史
   *
   * @param userId - 用户 ID
   * @param info - 登录信息
   * @returns Promise
   *
   * @example
   * ```typescript
   * await auditLogger.logLogin('user123', {
   *   timestamp: new Date(),
   *   ip: '192.168.1.1',
   *   device: 'Chrome on Windows',
   *   success: true,
   * })
   * ```
   */
  async logLogin(userId: string, info: LoginInfo): Promise<void> {
    const record: AuditRecord = {
      id: this.generateId(),
      userId,
      action: 'login',
      timestamp: info.timestamp,
      ip: info.ip,
      details: {
        device: info.device,
        browser: info.browser,
        os: info.os,
        location: info.location,
      },
      success: info.success,
      error: info.failureReason,
    }

    await this.log(record)
  }

  /**
   * 获取登录历史
   *
   * @param userId - 用户 ID
   * @param options - 查询选项
   * @returns 登录记录列表
   *
   * @example
   * ```typescript
   * const history = await auditLogger.getLoginHistory('user123', {
   *   limit: 10,
   *   offset: 0,
   * })
   * ```
   */
  async getLoginHistory(
    userId: string,
    options?: HistoryOptions,
  ): Promise<LoginRecord[]> {
    if (!this.httpClient) {
      throw AuthError.fromCode(AuthErrorCode.INVALID_CONFIG)
    }

    try {
      const params: Record<string, any> = { userId }
      if (options?.limit)
        params.limit = options.limit
      if (options?.offset)
        params.offset = options.offset
      if (options?.startTime)
        params.startTime = options.startTime.toISOString()
      if (options?.endTime)
        params.endTime = options.endTime.toISOString()

      const response = await this.httpClient.get<{ records: LoginRecord[] }>(
        this.config.loginHistoryEndpoint,
        { params },
      )

      return response.records
    }
    catch (error) {
      throw AuthError.fromCode(
        AuthErrorCode.SERVER_ERROR,
        error as Error,
      )
    }
  }

  /**
   * 记录操作
   *
   * @param userId - 用户 ID
   * @param action - 操作类型
   * @param details - 详情
   *
   * @example
   * ```typescript
   * await auditLogger.logAction('user123', 'profile_update', {
   *   fields: ['email', 'phone'],
   * })
   * ```
   */
  async logAction(
    userId: string,
    action: string,
    details: Record<string, any>,
  ): Promise<void> {
    const record: AuditRecord = {
      id: this.generateId(),
      userId,
      action,
      timestamp: new Date(),
      ip: this.getCurrentIP(),
      details,
      success: true,
    }

    await this.log(record)
  }

  /**
   * 记录敏感操作
   *
   * @param userId - 用户 ID
   * @param operation - 敏感操作类型
   * @param details - 详情
   *
   * @example
   * ```typescript
   * await auditLogger.logSensitiveOperation('user123', 'password_change', {
   *   reason: 'user_initiated',
   * })
   * ```
   */
  async logSensitiveOperation(
    userId: string,
    operation: SensitiveOperation,
    details?: Record<string, any>,
  ): Promise<void> {
    const record: AuditRecord = {
      id: this.generateId(),
      userId,
      action: `sensitive:${operation}`,
      timestamp: new Date(),
      ip: this.getCurrentIP(),
      details: details || {},
      success: true,
    }

    await this.log(record)
  }

  /**
   * 获取审计日志
   *
   * @param filters - 过滤器
   * @returns 审计记录列表
   *
   * @example
   * ```typescript
   * const logs = await auditLogger.getAuditLog({
   *   userId: 'user123',
   *   action: 'login',
   *   limit: 50,
   * })
   * ```
   */
  async getAuditLog(filters?: AuditFilters): Promise<AuditRecord[]> {
    if (!this.httpClient) {
      throw AuthError.fromCode(AuthErrorCode.INVALID_CONFIG)
    }

    try {
      const response = await this.httpClient.get<{ records: AuditRecord[] }>(
        this.config.auditLogEndpoint,
        { params: filters as any },
      )

      return response.records
    }
    catch (error) {
      throw AuthError.fromCode(
        AuthErrorCode.SERVER_ERROR,
        error as Error,
      )
    }
  }

  /**
   * 记录日志（内部）
   *
   * @param record - 审计记录
   * @private
   */
  private async log(record: AuditRecord): Promise<void> {
    // 添加到本地缓存
    if (this.config.enableCache) {
      this.localCache.push(record)

      // 限制缓存大小
      if (this.localCache.length > this.config.maxCacheSize) {
        this.localCache.shift()
      }

      // 达到批量大小，立即写入
      if (this.localCache.length >= this.config.batchSize) {
        await this.flushCache()
      }
    }
    else {
      // 直接写入
      await this.writeSingle(record)
    }
  }

  /**
   * 刷新缓存（批量写入）
   *
   * @private
   */
  private async flushCache(): Promise<void> {
    if (this.localCache.length === 0) {
      return
    }

    const records = [...this.localCache]
    this.localCache = []

    if (!this.httpClient) {
      return
    }

    try {
      await this.httpClient.post(this.config.auditLogEndpoint, { records })
    }
    catch (error) {
      console.error('[AuditLogger] Flush cache failed:', error)
      // 失败时重新放回缓存
      this.localCache.unshift(...records)
    }
  }

  /**
   * 写入单条记录
   *
   * @param record - 审计记录
   * @private
   */
  private async writeSingle(record: AuditRecord): Promise<void> {
    if (!this.httpClient) {
      return
    }

    try {
      await this.httpClient.post(this.config.auditLogEndpoint, record)
    }
    catch (error) {
      console.error('[AuditLogger] Write audit log failed:', error)
    }
  }

  /**
   * 启动批量写入定时器
   *
   * @private
   */
  private startBatchTimer(): void {
    this.batchTimer = setInterval(() => {
      this.flushCache().catch((error) => {
        console.error('[AuditLogger] Auto flush failed:', error)
      })
    }, this.config.batchInterval)
  }

  /**
   * 生成记录 ID
   *
   * @returns 记录 ID
   * @private
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
  }

  /**
   * 获取当前 IP（简化实现）
   *
   * @returns IP 地址
   * @private
   */
  private getCurrentIP(): string {
    // 实际应该从请求头或 API 获取
    return 'unknown'
  }

  /**
   * 销毁审计日志记录器
   */
  async destroy(): Promise<void> {
    if (this.batchTimer) {
      clearInterval(this.batchTimer)
      this.batchTimer = undefined
    }

    // 刷新剩余缓存
    await this.flushCache()
  }
}

/**
 * 创建审计日志记录器
 *
 * @param config - 配置
 * @param httpClient - HTTP 客户端
 * @param cacheManager - 缓存管理器
 * @returns 审计日志记录器实例
 *
 * @example
 * ```typescript
 * import { createAuditLogger } from '@ldesign/auth/audit'
 *
 * const logger = createAuditLogger({
 *   enableCache: true,
 *   batchSize: 10,
 * }, httpClient, cache)
 *
 * // 记录登录
 * await logger.logLogin('user123', {
 *   timestamp: new Date(),
 *   ip: '192.168.1.1',
 *   device: 'Chrome on Windows',
 *   success: true,
 * })
 *
 * // 查询历史
 * const history = await logger.getLoginHistory('user123')
 * ```
 */
export function createAuditLogger(
  config?: AuditLoggerConfig,
  httpClient?: HttpClient,
  cacheManager?: CacheManager,
): AuditLogger {
  return new AuditLogger(config, httpClient, cacheManager)
}

