/**
 * 日志系统类型定义
 *
 * @module @ldesign/auth-core/logger
 * @author LDesign Team
 */

/**
 * 日志级别枚举
 */
export enum LogLevel {
  /** 调试级别 - 最详细的日志信息 */
  DEBUG = 0,
  /** 信息级别 - 一般信息性消息 */
  INFO = 1,
  /** 警告级别 - 警告信息，但不影响功能 */
  WARN = 2,
  /** 错误级别 - 错误信息，可能影响功能 */
  ERROR = 3,
  /** 不输出任何日志 */
  NONE = 4,
}

/**
 * 日志配置接口
 */
export interface LoggerConfig {
  /** 日志级别，低于此级别的日志不会输出 */
  level?: LogLevel
  /** 日志前缀 */
  prefix?: string
  /** 是否包含时间戳 */
  timestamp?: boolean
  /** 是否启用控制台输出 */
  enableConsole?: boolean
  /** 自定义日志传输器列表 */
  transports?: LogTransport[]
}

/**
 * 日志传输器接口
 * 
 * 用于将日志输出到不同的目标（文件、远程服务器等）
 */
export interface LogTransport {
  /**
   * 记录日志
   * 
   * @param level - 日志级别
   * @param message - 日志消息
   * @param data - 附加数据
   */
  log(level: LogLevel, message: string, data?: unknown): void
}

/**
 * 日志条目接口
 */
export interface LogEntry {
  /** 日志级别 */
  level: LogLevel
  /** 日志级别名称 */
  levelName: string
  /** 日志消息 */
  message: string
  /** 时间戳 */
  timestamp: string
  /** 附加数据 */
  data?: unknown
  /** 日志前缀 */
  prefix?: string
}