/**
 * 日志器
 *
 * @module @ldesign/auth-core/logger
 * @author LDesign Team
 */

import type { LogLevel, LoggerConfig, LogTransport } from './types'

/**
 * 默认日志配置
 */
const DEFAULT_CONFIG: Required<Omit<LoggerConfig, 'transports'>> = {
  level: 1, // INFO
  prefix: '[Auth]',
  timestamp: true,
  enableConsole: true,
}

/**
 * 日志器类
 * 
 * 提供统一的日志记录接口，支持多种日志级别和传输器
 * 
 * @example
 * ```ts
 * import { Logger, LogLevel } from '@ldesign/auth-core/logger'
 * 
 * const logger = new Logger({
 *   level: LogLevel.DEBUG,
 *   prefix: '[MyApp]',
 *   timestamp: true,
 * })
 * 
 * logger.debug('调试信息', { userId: 123 })
 * logger.info('用户登录成功')
 * logger.warn('Token 即将过期')
 * logger.error('登录失败', error)
 * ```
 */
export class Logger {
  /** 配置选项 */
  private config: Required<Omit<LoggerConfig, 'transports'>>
  /** 自定义传输器列表 */
  private transports: LogTransport[] = []

  /**
   * 创建日志器实例
   * 
   * @param config - 日志配置
   */
  constructor(config: LoggerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.transports = config.transports ?? []
  }

  /**
   * 记录调试日志
   * 
   * @param message - 日志消息
   * @param data - 附加数据
   */
  debug(message: string, data?: unknown): void {
    this.log(0, message, data) // DEBUG = 0
  }

  /**
   * 记录信息日志
   * 
   * @param message - 日志消息
   * @param data - 附加数据
   */
  info(message: string, data?: unknown): void {
    this.log(1, message, data) // INFO = 1
  }

  /**
   * 记录警告日志
   * 
   * @param message - 日志消息
   * @param data - 附加数据
   */
  warn(message: string, data?: unknown): void {
    this.log(2, message, data) // WARN = 2
  }

  /**
   * 记录错误日志
   * 
   * @param message - 日志消息
   * @param data - 附加数据
   */
  error(message: string, data?: unknown): void {
    this.log(3, message, data) // ERROR = 3
  }

  /**
   * 核心日志方法
   * 
   * @param level - 日志级别
   * @param message - 日志消息
   * @param data - 附加数据
   */
  private log(level: LogLevel, message: string, data?: unknown): void {
    // 检查日志级别
    if (level < this.config.level) return

    // 构建完整消息
    const timestamp = this.config.timestamp ? this.getTimestamp() : ''
    const levelName = this.getLevelName(level)
    const prefix = this.config.prefix
    const fullMessage = `${timestamp} ${prefix} [${levelName}] ${message}`

    // 输出到自定义传输器
    if (this.transports.length > 0) {
      this.transports.forEach((transport) => {
        try {
          transport.log(level, fullMessage, data)
        }
        catch (error) {
          console.error('[Logger] Transport error:', error)
        }
      })
    }

    // 输出到控制台
    if (this.config.enableConsole) {
      this.logToConsole(level, fullMessage, data)
    }
  }

  /**
   * 输出到控制台
   * 
   * @param level - 日志级别
   * @param message - 日志消息
   * @param data - 附加数据
   */
  private logToConsole(level: LogLevel, message: string, data?: unknown): void {
    const consoleFn = this.getConsoleFunction(level)

    if (data !== undefined) {
      consoleFn(message, data)
    }
    else {
      consoleFn(message)
    }
  }

  /**
   * 获取控制台函数
   * 
   * @param level - 日志级别
   * @returns 控制台函数
   */
  private getConsoleFunction(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case 0: // DEBUG
        return console.debug.bind(console)
      case 1: // INFO
        return console.info.bind(console)
      case 2: // WARN
        return console.warn.bind(console)
      case 3: // ERROR
        return console.error.bind(console)
      default:
        return console.log.bind(console)
    }
  }

  /**
   * 获取日志级别名称
   * 
   * @param level - 日志级别
   * @returns 级别名称
   */
  private getLevelName(level: LogLevel): string {
    const names = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'NONE']
    return names[level] || 'UNKNOWN'
  }

  /**
   * 获取时间戳
   * 
   * @returns ISO 格式的时间戳
   */
  private getTimestamp(): string {
    return new Date().toISOString()
  }

  /**
   * 添加传输器
   * 
   * @param transport - 日志传输器
   */
  addTransport(transport: LogTransport): void {
    this.transports.push(transport)
  }

  /**
   * 移除传输器
   * 
   * @param transport - 日志传输器
   */
  removeTransport(transport: LogTransport): void {
    const index = this.transports.indexOf(transport)
    if (index > -1) {
      this.transports.splice(index, 1)
    }
  }

  /**
   * 清除所有传输器
   */
  clearTransports(): void {
    this.transports = []
  }

  /**
   * 设置日志级别
   * 
   * @param level - 新的日志级别
   */
  setLevel(level: LogLevel): void {
    this.config.level = level
  }

  /**
   * 获取当前日志级别
   * 
   * @returns 当前日志级别
   */
  getLevel(): LogLevel {
    return this.config.level
  }

  /**
   * 启用/禁用控制台输出
   * 
   * @param enabled - 是否启用
   */
  setConsoleEnabled(enabled: boolean): void {
    this.config.enableConsole = enabled
  }

  /**
   * 创建子日志器
   * 
   * @param prefix - 子日志器前缀
   * @returns 新的日志器实例
   * 
   * @example
   * ```ts
   * const authLogger = logger.child('[Auth]')
   * const tokenLogger = logger.child('[Token]')
   * 
   * authLogger.info('用户登录') // [Auth] 用户登录
   * tokenLogger.info('刷新 Token') // [Token] 刷新 Token
   * ```
   */
  child(prefix: string): Logger {
    return new Logger({
      ...this.config,
      prefix: `${this.config.prefix}${prefix}`,
      transports: this.transports,
    })
  }
}