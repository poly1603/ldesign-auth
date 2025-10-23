/**
 * 认证事件发射器
 *
 * 提供认证相关的事件监听和触发功能
 */

import type { AuthEventHandler, AuthEventMap, AuthEventType } from '../types'

/**
 * 认证事件发射器类
 */
export class AuthEventEmitter {
  private listeners: Map<AuthEventType, Set<AuthEventHandler>> = new Map()

  /**
   * 监听事件
   *
   * @param event - 事件类型
   * @param handler - 事件处理器
   * @returns 取消监听的函数
   *
   * @example
   * ```typescript
   * const emitter = new AuthEventEmitter()
   * const unsubscribe = emitter.on('userLoaded', (user) => {
   *   console.log('User loaded:', user)
   * })
   *
   * // 取消监听
   * unsubscribe()
   * ```
   */
  on<K extends keyof AuthEventMap>(
    event: K,
    handler: AuthEventHandler<AuthEventMap[K]>,
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }

    this.listeners.get(event)!.add(handler as AuthEventHandler)

    // 返回取消监听函数
    return () => {
      this.off(event, handler)
    }
  }

  /**
   * 监听事件（一次性）
   *
   * @param event - 事件类型
   * @param handler - 事件处理器
   * @returns 取消监听的函数
   *
   * @example
   * ```typescript
   * const emitter = new AuthEventEmitter()
   * emitter.once('loginSuccess', (response) => {
   *   console.log('Login success:', response)
   *   // 只会触发一次
   * })
   * ```
   */
  once<K extends keyof AuthEventMap>(
    event: K,
    handler: AuthEventHandler<AuthEventMap[K]>,
  ): () => void {
    const wrappedHandler: AuthEventHandler<AuthEventMap[K]> = (data) => {
      handler(data)
      this.off(event, wrappedHandler)
    }

    return this.on(event, wrappedHandler)
  }

  /**
   * 取消监听
   *
   * @param event - 事件类型
   * @param handler - 事件处理器（可选，不提供则取消所有监听）
   *
   * @example
   * ```typescript
   * const emitter = new AuthEventEmitter()
   * const handler = (user) => console.log(user)
   *
   * emitter.on('userLoaded', handler)
   * emitter.off('userLoaded', handler)
   * ```
   */
  off<K extends keyof AuthEventMap>(
    event: K,
    handler?: AuthEventHandler<AuthEventMap[K]>,
  ): void {
    if (!this.listeners.has(event)) {
      return
    }

    if (handler) {
      this.listeners.get(event)!.delete(handler as AuthEventHandler)
    }
    else {
      this.listeners.delete(event)
    }
  }

  /**
   * 触发事件
   *
   * @param event - 事件类型
   * @param data - 事件数据
   *
   * @example
   * ```typescript
   * const emitter = new AuthEventEmitter()
   * emitter.emit('userLoaded', { id: 1, username: 'john' })
   * ```
   */
  async emit<K extends keyof AuthEventMap>(
    event: K,
    data: AuthEventMap[K],
  ): Promise<void> {
    const handlers = this.listeners.get(event)

    if (!handlers || handlers.size === 0) {
      return
    }

    // 创建副本，避免在执行过程中修改列表
    const handlersCopy = Array.from(handlers)

    // 并行执行所有处理器
    await Promise.all(
      handlersCopy.map(async (handler) => {
        try {
          await handler(data)
        }
        catch (error) {
          console.error(`[AuthEventEmitter] Error in ${event} handler:`, error)
        }
      }),
    )
  }

  /**
   * 触发事件（同步）
   *
   * @param event - 事件类型
   * @param data - 事件数据
   *
   * @example
   * ```typescript
   * const emitter = new AuthEventEmitter()
   * emitter.emitSync('error', new Error('Auth failed'))
   * ```
   */
  emitSync<K extends keyof AuthEventMap>(
    event: K,
    data: AuthEventMap[K],
  ): void {
    const handlers = this.listeners.get(event)

    if (!handlers || handlers.size === 0) {
      return
    }

    // 创建副本
    const handlersCopy = Array.from(handlers)

    // 同步执行所有处理器
    for (const handler of handlersCopy) {
      try {
        handler(data)
      }
      catch (error) {
        console.error(`[AuthEventEmitter] Error in ${event} handler:`, error)
      }
    }
  }

  /**
   * 获取事件的监听器数量
   *
   * @param event - 事件类型（可选，不提供则返回所有事件的总数）
   * @returns 监听器数量
   */
  listenerCount(event?: AuthEventType): number {
    if (event) {
      return this.listeners.get(event)?.size || 0
    }

    let count = 0
    for (const handlers of this.listeners.values()) {
      count += handlers.size
    }
    return count
  }

  /**
   * 移除所有监听器
   *
   * @param event - 事件类型（可选，不提供则移除所有事件的监听器）
   *
   * @example
   * ```typescript
   * const emitter = new AuthEventEmitter()
   * emitter.removeAllListeners() // 移除所有监听器
   * emitter.removeAllListeners('userLoaded') // 只移除特定事件的监听器
   * ```
   */
  removeAllListeners(event?: AuthEventType): void {
    if (event) {
      this.listeners.delete(event)
    }
    else {
      this.listeners.clear()
    }
  }

  /**
   * 获取所有事件类型
   *
   * @returns 事件类型数组
   */
  eventNames(): AuthEventType[] {
    return Array.from(this.listeners.keys())
  }

  /**
   * 检查是否有监听器
   *
   * @param event - 事件类型（可选）
   * @returns 是否有监听器
   */
  hasListeners(event?: AuthEventType): boolean {
    if (event) {
      return this.listenerCount(event) > 0
    }
    return this.listeners.size > 0
  }
}

/**
 * 创建认证事件发射器
 *
 * @returns 事件发射器实例
 *
 * @example
 * ```typescript
 * import { createAuthEventEmitter } from '@ldesign/auth/events'
 *
 * const events = createAuthEventEmitter()
 *
 * // 监听用户加载事件
 * events.on('userLoaded', (user) => {
 *   console.log('User loaded:', user.username)
 * })
 *
 * // 触发事件
 * events.emit('userLoaded', { id: 1, username: 'john' })
 * ```
 */
export function createAuthEventEmitter(): AuthEventEmitter {
  return new AuthEventEmitter()
}


