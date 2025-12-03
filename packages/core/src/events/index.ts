/**
 * 事件系统模块导出
 *
 * @module @ldesign/auth-core/events
 * @author LDesign Team
 */

export { EventBus } from './EventBus'
export type { EventListener, EventBusConfig } from './EventBus'

// 导出默认事件总线实例
import { EventBus, type EventBusConfig } from './EventBus'

/**
 * 默认事件总线实例
 * 
 * @example
 * ```ts
 * import { eventBus } from '@ldesign/auth-core/events'
 * 
 * // 注册监听器
 * eventBus.on('login', (data) => {
 *   console.log('用户登录:', data.user)
 * })
 * 
 * // 触发事件
 * await eventBus.emit('login', { user: { id: 1, name: 'John' } })
 * ```
 */
export const eventBus = new EventBus({
  maxListeners: 100,
  enableLog: false,
})

/**
 * 创建事件总线实例的工厂函数
 * 
 * @param config - 配置选项
 * @returns 新的事件总线实例
 * 
 * @example
 * ```ts
 * import { createEventBus } from '@ldesign/auth-core/events'
 * 
 * const bus = createEventBus({
 *   maxListeners: 50,
 *   enableLog: true,
 *   logPrefix: '[MyBus]',
 * })
 * ```
 */
export function createEventBus(config?: EventBusConfig): EventBus {
  return new EventBus(config)
}