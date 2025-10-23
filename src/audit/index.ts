/**
 * 审计日志模块
 *
 * @example
 * ```typescript
 * import { createAuditLogger } from '@ldesign/auth/audit'
 * import { createHttpClient } from '@ldesign/http'
 *
 * const httpClient = createHttpClient()
 * const logger = createAuditLogger({
 *   enableCache: true,
 *   batchSize: 10,
 * }, httpClient)
 *
 * // 记录登录
 * await logger.logLogin('user123', {
 *   timestamp: new Date(),
 *   ip: '192.168.1.1',
 *   device: 'Chrome on Windows',
 *   success: true,
 * })
 *
 * // 记录操作
 * await logger.logAction('user123', 'profile_update', {
 *   fields: ['email', 'phone'],
 * })
 *
 * // 记录敏感操作
 * await logger.logSensitiveOperation('user123', 'password_change')
 *
 * // 查询登录历史
 * const history = await logger.getLoginHistory('user123', {
 *   limit: 10,
 * })
 *
 * // 查询审计日志
 * const logs = await logger.getAuditLog({
 *   userId: 'user123',
 *   action: 'login',
 * })
 * ```
 */

// 导出类型
export type * from './types'

// 导出审计日志记录器
export { AuditLogger, createAuditLogger } from './AuditLogger'
export type { AuditLoggerConfig } from './AuditLogger'

