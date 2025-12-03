/**
 * 内置日志传输器
 *
 * @module @ldesign/auth-core/logger
 * @author LDesign Team
 */

import type { LogTransport, LogLevel, LogEntry } from './types'

/**
 * 控制台传输器
 * 
 * 将日志输出到浏览器控制台
 */
export class ConsoleTransport implements LogTransport {
  log(level: LogLevel, message: string, data?: unknown): void {
    const consoleFn = this.getConsoleFunction(level)
    if (data !== undefined) {
      consoleFn(message, data)
    }
    else {
      consoleFn(message)
    }
  }

  private getConsoleFunction(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case 0: return console.debug.bind(console)
      case 1: return console.info.bind(console)
      case 2: return console.warn.bind(console)
      case 3: return console.error.bind(console)
      default: return console.log.bind(console)
    }
  }
}

/**
 * 内存传输器
 * 
 * 将日志存储在内存中，便于测试和调试
 */
export class MemoryTransport implements LogTransport {
  private logs: LogEntry[] = []
  private maxSize: number

  constructor(maxSize = 1000) {
    this.maxSize = maxSize
  }

  log(level: LogLevel, message: string, data?: unknown): void {
    const entry: LogEntry = {
      level,
      levelName: this.getLevelName(level),
      message,
      timestamp: new Date().toISOString(),
      data,
    }

    this.logs.push(entry)

    // 限制日志数量
    if (this.logs.length > this.maxSize) {
      this.logs.shift()
    }
  }

  /**
   * 获取所有日志
   */
  getLogs(): LogEntry[] {
    return [...this.logs]
  }

  /**
   * 获取指定级别的日志
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level)
  }

  /**
   * 清空日志
   */
  clear(): void {
    this.logs = []
  }

  /**
   * 获取日志数量
   */
  size(): number {
    return this.logs.length
  }

  private getLevelName(level: LogLevel): string {
    const names = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'NONE']
    return names[level] || 'UNKNOWN'
  }
}

/**
 * 远程传输器配置
 */
export interface RemoteTransportConfig {
  /** 远程服务器 URL */
  url: string
  /** 批量发送的大小 */
  batchSize?: number
  /** 批量发送的时间间隔（毫秒） */
  batchInterval?: number
  /** 请求头 */
  headers?: Record<string, string>
  /** HTTP 方法 */
  method?: 'POST' | 'PUT'
}

/**
 * 远程传输器
 * 
 * 将日志发送到远程服务器
 */
export class RemoteTransport implements LogTransport {
  private config: Required<RemoteTransportConfig>
  private buffer: LogEntry[] = []
  private timer: ReturnType<typeof setTimeout> | null = null

  constructor(config: RemoteTransportConfig) {
    this.config = {
      batchSize: 10,
      batchInterval: 5000,
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      ...config,
    }
  }

  log(level: LogLevel, message: string, data?: unknown): void {
    const entry: LogEntry = {
      level,
      levelName: this.getLevelName(level),
      message,
      timestamp: new Date().toISOString(),
      data,
    }

    this.buffer.push(entry)

    // 达到批量大小时立即发送
    if (this.buffer.length >= this.config.batchSize) {
      this.flush()
    }
    // 否则等待定时器
    else if (!this.timer) {
      this.timer = setTimeout(() => {
        this.flush()
      }, this.config.batchInterval)
    }
  }

  /**
   * 立即发送所有缓冲的日志
   */
  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }

    if (this.buffer.length === 0) return

    const logs = [...this.buffer]
    this.buffer = []

    try {
      await fetch(this.config.url, {
        method: this.config.method,
        headers: this.config.headers,
        body: JSON.stringify({ logs }),
      })
    }
    catch (error) {
      console.error('[RemoteTransport] Failed to send logs:', error)
      // 发送失败时重新加入缓冲区
      this.buffer.unshift(...logs)
    }
  }

  /**
   * 销毁传输器
   */
  destroy(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.buffer = []
  }

  private getLevelName(level: LogLevel): string {
    const names = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'NONE']
    return names[level] || 'UNKNOWN'
  }
}

/**
 * 过滤传输器
 * 
 * 根据条件过滤日志
 */
export class FilterTransport implements LogTransport {
  private transport: LogTransport
  private filter: (level: LogLevel, message: string, data?: unknown) => boolean

  constructor(
    transport: LogTransport,
    filter: (level: LogLevel, message: string, data?: unknown) => boolean
  ) {
    this.transport = transport
    this.filter = filter
  }

  log(level: LogLevel, message: string, data?: unknown): void {
    if (this.filter(level, message, data)) {
      this.transport.log(level, message, data)
    }
  }
}