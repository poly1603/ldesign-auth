/**
 * 日志系统模块导出
 *
 * @module @ldesign/auth-core/logger
 * @author LDesign Team
 */

export { Logger } from './Logger'
export { LogLevel } from './types'
export type { LoggerConfig, LogTransport, LogEntry } from './types'
export {
  ConsoleTransport,
  MemoryTransport,
  RemoteTransport,
  FilterTransport,
} from './transports'
export type { RemoteTransportConfig } from './transports'

// 导出默认日志器实例
import { Logger } from './Logger'
import { LogLevel } from './types'

/**
 * 默认日志器实例
 * 
 * @example
 * ```ts
 * import { logger } from '@ldesign/auth-core/logger'
 * 
 * logger.info('应用启动')
 * logger.debug('调试信息', { userId: 123 })
 * logger.error('发生错误', error)
 * ```
 */
export const logger = new Logger({
  level: LogLevel.INFO,
  prefix: '[Auth]',
  timestamp: true,
  enableConsole: true,
})

/**
 * 创建日志器实例的工厂函数
 * 
 * @param prefix - 日志前缀
 * @param level - 日志级别
 * @returns 新的日志器实例
 * 
 * @example
 * ```ts
 * import { createLogger, LogLevel } from '@ldesign/auth-core/logger'
 * 
 * const authLogger = createLogger('[Auth]', LogLevel.DEBUG)
 * const tokenLogger = createLogger('[Token]')
 * ```
 */
export function createLogger(prefix?: string, level?: LogLevel): Logger {
  return new Logger({
    level: level ?? LogLevel.INFO,
    prefix: prefix ?? '[Auth]',
    timestamp: true,
    enableConsole: true,
  })
}