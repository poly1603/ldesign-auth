/**
 * 优化的事件发射器 - 限制监听器数量，提高性能
 */

type EventListener<T = any> = (data: T) => void | Promise<void>

export class OptimizedEventEmitter {
  private events = new Map<string, Set<EventListener>>()
  private maxListenersPerEvent = 100
  private globalMaxListeners = 1000
  private listenerCount = 0
  private wildcardListeners = new Set<EventListener>()

  constructor(options?: {
    maxListenersPerEvent?: number
    globalMaxListeners?: number
  }) {
    if (options?.maxListenersPerEvent) {
      this.maxListenersPerEvent = options.maxListenersPerEvent
    }
    if (options?.globalMaxListeners) {
      this.globalMaxListeners = options.globalMaxListeners
    }
  }

  /**
   * 添加事件监听器
   */
  on<T = any>(event: string, listener: EventListener<T>): () => void {
    if (this.listenerCount >= this.globalMaxListeners) {
      console.warn(`[EventEmitter] Global listener limit (${this.globalMaxListeners}) reached`)
      return () => { } // 返回空函数
    }

    // 支持通配符监听器
    if (event === '*') {
      this.wildcardListeners.add(listener)
      this.listenerCount++
      return () => this.off('*', listener)
    }

    let listeners = this.events.get(event)
    if (!listeners) {
      listeners = new Set()
      this.events.set(event, listeners)
    }

    if (listeners.size >= this.maxListenersPerEvent) {
      console.warn(`[EventEmitter] Event "${event}" listener limit (${this.maxListenersPerEvent}) reached`)
      return () => { } // 返回空函数
    }

    listeners.add(listener)
    this.listenerCount++

    // 返回取消监听函数
    return () => this.off(event, listener)
  }

  /**
   * 添加一次性监听器
   */
  once<T = any>(event: string, listener: EventListener<T>): () => void {
    const wrapper: EventListener<T> = (data) => {
      this.off(event, wrapper)
      listener(data)
    }
    return this.on(event, wrapper)
  }

  /**
   * 移除事件监听器
   */
  off<T = any>(event: string, listener: EventListener<T>): void {
    if (event === '*') {
      if (this.wildcardListeners.delete(listener)) {
        this.listenerCount--
      }
      return
    }

    const listeners = this.events.get(event)
    if (!listeners) return

    if (listeners.delete(listener)) {
      this.listenerCount--

      // 如果没有监听器了，删除事件
      if (listeners.size === 0) {
        this.events.delete(event)
      }
    }
  }

  /**
   * 触发事件（优化版本）
   */
  emit<T = any>(event: string, data: T): void {
    // 触发特定事件监听器
    const listeners = this.events.get(event)
    if (listeners && listeners.size > 0) {
      // 使用数组避免在迭代时修改集合
      const listenerArray = Array.from(listeners)
      for (const listener of listenerArray) {
        try {
          const result = listener(data)
          // 处理异步监听器
          if (result instanceof Promise) {
            result.catch(error => {
              console.error(`[EventEmitter] Async listener error for event "${event}":`, error)
            })
          }
        } catch (error) {
          console.error(`[EventEmitter] Listener error for event "${event}":`, error)
        }
      }
    }

    // 触发通配符监听器
    if (this.wildcardListeners.size > 0) {
      const wildcardArray = Array.from(this.wildcardListeners)
      for (const listener of wildcardArray) {
        try {
          const result = listener({ event, data })
          if (result instanceof Promise) {
            result.catch(error => {
              console.error(`[EventEmitter] Wildcard listener error:`, error)
            })
          }
        } catch (error) {
          console.error(`[EventEmitter] Wildcard listener error:`, error)
        }
      }
    }
  }

  /**
   * 异步触发事件（等待所有监听器完成）
   */
  async emitAsync<T = any>(event: string, data: T): Promise<void> {
    const promises: Promise<void>[] = []

    // 处理特定事件监听器
    const listeners = this.events.get(event)
    if (listeners && listeners.size > 0) {
      for (const listener of listeners) {
        promises.push(
          Promise.resolve(listener(data)).catch(error => {
            console.error(`[EventEmitter] Async listener error for event "${event}":`, error)
          })
        )
      }
    }

    // 处理通配符监听器
    if (this.wildcardListeners.size > 0) {
      for (const listener of this.wildcardListeners) {
        promises.push(
          Promise.resolve(listener({ event, data })).catch(error => {
            console.error(`[EventEmitter] Wildcard listener error:`, error)
          })
        )
      }
    }

    await Promise.all(promises)
  }

  /**
   * 移除所有监听器
   */
  removeAllListeners(event?: string): void {
    if (event) {
      const listeners = this.events.get(event)
      if (listeners) {
        this.listenerCount -= listeners.size
        this.events.delete(event)
      }
    } else {
      this.events.clear()
      this.wildcardListeners.clear()
      this.listenerCount = 0
    }
  }

  /**
   * 获取事件监听器数量
   */
  listenerCount(event?: string): number {
    if (event) {
      const listeners = this.events.get(event)
      return listeners ? listeners.size : 0
    }
    return this.listenerCount
  }

  /**
   * 获取所有事件名称
   */
  eventNames(): string[] {
    return Array.from(this.events.keys())
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalListeners: number
    eventCount: number
    wildcardListeners: number
    largestEvent: { name: string; count: number } | null
  } {
    let largestEvent: { name: string; count: number } | null = null

    for (const [name, listeners] of this.events.entries()) {
      if (!largestEvent || listeners.size > largestEvent.count) {
        largestEvent = { name, count: listeners.size }
      }
    }

    return {
      totalListeners: this.listenerCount,
      eventCount: this.events.size,
      wildcardListeners: this.wildcardListeners.size,
      largestEvent
    }
  }

  /**
   * 销毁事件发射器
   */
  destroy(): void {
    this.removeAllListeners()
  }
}

