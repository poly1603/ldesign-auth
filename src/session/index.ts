/**
 * Session 管理模块
 *
 * 提供 Session 超时管理、活动监控和多标签页同步功能
 *
 * @example
 * ```typescript
 * import { createSessionManager } from '@ldesign/auth/session'
 *
 * const sessionManager = createSessionManager({
 *   timeout: 30 * 60 * 1000, // 30分钟超时
 *   monitorActivity: true, // 监控用户活动
 *   enableTabSync: true, // 多标签页同步
 * })
 *
 * // 激活 Session
 * sessionManager.activate()
 *
 * // 监听超时
 * sessionManager.onTimeout(() => {
 *   console.log('Session 已超时，请重新登录')
 *   // 触发登出逻辑
 * })
 *
 * // 监听活动
 * sessionManager.onActivity(() => {
 *   console.log('用户有活动，Session 已延长')
 * })
 *
 * // 手动延长 Session
 * sessionManager.extendSession()
 *
 * // 获取剩余时间
 * const remaining = sessionManager.getRemainingTime()
 * console.log(`Session 剩余 ${Math.floor(remaining / 1000)} 秒`)
 * ```
 */

// 导出类型
export type * from './types'

// 导出 Session 管理器
export { SessionManager, createSessionManager } from './SessionManager'


