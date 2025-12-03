/**
 * 事件总线
 *
 * @module @ldesign/auth-core/events
 * @author LDesign Team
 */

/**
 * 事件监听器类型
 */
export type EventListener<T = any> = (data: T) => void | Promise<void>

/**
 * 事件监听器包装器
 */
interface EventListenerWrapper<T = any> {
  /** 监听器函数 */
  listener: EventListener<T>
  /** 是否只执行一次 */
  once: boolean
  /** 优先级（数字越大优先级越高） */
  priority: number
}

/**
 * 事件总线配置
 */
export interface EventBusConfig {
  /** 最大监听器数量（防止内存泄漏） */
  maxListeners?: number
  /** 是否启用日志 */
  enableLog?: boolean
  /** 日志前缀 */
  logPrefix?: string
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<EventBusConfig> = {
  maxListeners: 100,
  enableLog: false,
  logPrefix: '[EventBus]',
}

/**
 * 事件总线类
 * 
 * 提供发布-订阅模式的事件系统，支持事件的注册、触发和取消
 * 
 * @example
 * ```ts
 * import { EventBus } from '@ldesign/auth-core/events'
 * 
 * const bus = new EventBus()
 * 
 * // 注册事件监听器
 * const unsubscribe = bus.on('login', (data) => {
 *   console.log('用户登录:', data.user)
 * })
 * 
 * // 触发事件
 * await bus.emit('login', { user: { id: 1, name: 'John' } })
 * 
 * // 取消监听
 * unsubscribe()
 * ```
 */
export class EventBus {
  /** 配置选项 */
  private config: Required<EventBusConfig>
  /** 事件监听器映射 */
  private listeners = new Map<string, EventListenerWrapper[]>()
  /** 通配符监听器 */
  private wildcardListeners: EventListenerWrapper[] = []
  /** 是否已销毁 */
  private destroyed = false

  /**
   * 创建事件总线实例
   * 
   * @param config - 配置选项
   */
  constructor(config: EventBusConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * 注册事件监听器
   * 
   * @param event - 事件名称
   * @param listener - 监听器函数
   * @param priority - 优先级（默认 0，数字越大优先级越高）
   * @returns 取消监听的函数
   * 
   * @example
   * ```ts
   * const unsubscribe = bus.on('login', (data) => {
   *   console.log('用户登录')
   * })
   * 
   * // 取消监听
   * unsubscribe()
   * ```
   */
  on<T = any>(
    event: string,
    listener: EventListener<T>,
    priority = 0
  ): () => void {
    this.checkDestroyed()

    const wrapper: EventListenerWrapper<T> = {
      listener,
      once: false,
      priority,
    }

    // 处理通配符监听器
    if (event === '*') {
      this.wildcardListeners.push(wrapper)
      this.sortListeners(this.wildcardListeners)
    }
    else {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, [])
      }

      const eventListeners = this.listeners.get(event)!
      eventListeners.push(wrapper)
      this.sortListeners(eventListeners)

      // 检查监听器数量
      this.checkMaxListeners(event, eventListeners.length)
    }

    this.log(`注册监听器: ${event}`)

    // 返回取消监听的函数
    return () => this.off(event, listener)
  }

  /**
   * 注册一次性事件监听器
   * 
   * @param event - 事件名称
   * @param listener - 监听器函数
   * @param priority - 优先级
   * @returns 取消监听的函数
   * 
   * @example
   * ```ts
   * bus.once('tokenRefresh', (token) => {
   *   console.log('Token 刷新完成')
   * })
   * ```
   */
  once<T = any>(
    event: string,
    listener: EventListener<T>,
    priority = 0
  ): () => void {
    this.checkDestroyed()

    const wrapper: EventListenerWrapper<T> = {
      listener,
      once: true,
      priority,
    }

    if (event === '*') {
      this.wildcardListeners.push(wrapper)
      this.sortListeners(this.wildcardListeners)
    }
    else {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, [])
      }

      const eventListeners = this.listeners.get(event)!
      eventListeners.push(wrapper)
      this.sortListeners(eventListeners)
    }

    this.log(`注册一次性监听器: ${event}`)

    return () => this.off(event, listener)
  }

  /**
   * 取消事件监听器
   * 
   * @param event - 事件名称
   * @param listener - 监听器函数（可选，不传则移除该事件的所有监听器）
   * 
   * @example
   * ```ts
   * // 移除特定监听器
   * bus.off('login', loginHandler)
   * 
   * // 移除该事件的所有监听器
   * bus.off('login')
   * ```
   */
  off<T = any>(event: string, listener?: EventListener<T>): void {
    this.checkDestroyed()

    if (event === '*') {
      if (listener) {
        this.wildcardListeners = this.wildcardListeners.filter(
          w => w.listener !== listener
        )
      }
      else {
        this.wildcardListeners = []
      }
    }
    else {
      const eventListeners = this.listeners.get(event)
      if (!eventListeners) return

      if (listener) {
        const filtered = eventListeners.filter(w => w.listener !== listener)
        if (filtered.length === 0) {
          this.listeners.delete(event)
        }
        else {
          this.listeners.set(event, filtered)
        }
      }
      else {
        this.listeners.delete(event)
      }
    }

    this.log(`取消监听器: ${event}`)
  }

  /**
   * 触发事件
   * 
   * @param event - 事件名称
   * @param data - 事件数据
   * @returns Promise
   * 
   * @example
   * ```ts
   * await bus.emit('login', { user: { id: 1, name: 'John' } })
   * await bus.emit('logout')
   * ```
   */
  async emit<T = any>(event: string, data?: T): Promise<void> {
    this.checkDestroyed()

    this.log(`触发事件: ${event}`, data)

    // 获取事件监听器
    const eventListeners = this.listeners.get(event) ?? []
    const allListeners = [...eventListeners, ...this.wildcardListeners]

    if (allListeners.length === 0) {
      this.log(`无监听器: ${event}`)
      return
    }

    // 按优先级执行监听器
    const promises: Array<void | Promise<void>> = []
    const toRemove: EventListenerWrapper[] = []

    for (const wrapper of allListeners) {
      try {
        const result = wrapper.listener(data)
        if (result instanceof Promise) {
          promises.push(result)
        }

        // 标记一次性监听器待移除
        if (wrapper.once) {
          toRemove.push(wrapper)
        }
      }
      catch (error) {
        console.error(`${this.config.logPrefix} 监听器执行错误:`, error)
      }
    }

    // 等待所有异步监听器完成
    if (promises.length > 0) {
      await Promise.all(promises)
    }

    // 移除一次性监听器
    if (toRemove.length > 0) {
      toRemove.forEach((wrapper) => {
        this.off(event, wrapper.listener)
      })
    }
  }

  /**
   * 同步触发事件（不等待异步监听器）
   * 
   * @param event - 事件名称
   * @param data - 事件数据
   */
  emitSync<T = any>(event: string, data?: T): void {
    this.checkDestroyed()

    this.log(`同步触发事件: ${event}`, data)

    const eventListeners = this.listeners.get(event) ?? []
    const allListeners = [...eventListeners, ...this.wildcardListeners]

    const toRemove: EventListenerWrapper[] = []

    for (const wrapper of allListeners) {
      try {
        wrapper.listener(data)

        if (wrapper.once) {
          toRemove.push(wrapper)
        }
      }
      catch (error) {
        console.error(`${this.config.logPrefix} 监听器执行错误:`, error)
      }
    }

    // 移除一次性监听器
    toRemove.forEach(wrapper => this.off(event, wrapper.listener))
  }

  /**
   * 获取事件的监听器数量
   * 
   * @param event - 事件名称
   * @returns 监听器数量
   */
  listenerCount(event: string): number {
    if (event === '*') {
      return this.wildcardListeners.length
    }
    return this.listeners.get(event)?.length ?? 0
  }

  /**
   * 获取所有事件名称
   * 
   * @returns 事件名称数组
   */
  eventNames(): string[] {
    return Array.from(this.listeners.keys())
  }

  /**
   * 移除所有监听器
   * 
   * @param event - 事件名称（可选，不传则移除所有事件的监听器）
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.off(event)
    }
    else {
      this.listeners.clear()
      this.wildcardListeners = []
      this.log('移除所有监听器')
    }
  }

  /**
   * 按优先级排序监听器
   * 
   * @param listeners - 监听器数组
   */
  private sortListeners(listeners: EventListenerWrapper[]): void {
    listeners.sort((a, b) => b.priority - a.priority)
  }

  /**
   * 检查监听器数量限制
   * 
   * @param event - 事件名称
   * @param count - 当前数量
   */
  private checkMaxListeners(event: string, count: number): void {
    if (count > this.config.maxListeners) {
      console.warn(
        `${this.config.logPrefix} 事件 "${event}" 的监听器数量 (${count}) 超过限制 (${this.config.maxListeners})`
      )
    }
  }

  /**
   * 检查是否已销毁
   */
  private checkDestroyed(): void {
    if (this.destroyed) {
      throw new Error(`${this.config.logPrefix} EventBus 已销毁`)
    }
  }

  /**
   * 输出日志
   * 
   * @param message - 日志消息
   * @param data - 附加数据
   */
  private log(message: string, data?: any): void {
    if (this.config.enableLog) {
      if (data !== undefined) {
        console.log(`${this.config.logPrefix} ${message}`, data)
      }
      else {
        console.log(`${this.config.logPrefix} ${message}`)
      }
    }
  }

  /**
   * 销毁事件总线，清理所有资源
   */
  destroy(): void {
    this.removeAllListeners()
    this.destroyed = true
    this.log('EventBus 已销毁')
  }
}