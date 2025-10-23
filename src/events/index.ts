/**
 * 事件系统模块
 *
 * 提供认证相关的事件监听和触发功能
 *
 * @example
 * ```typescript
 * import { createAuthEventEmitter } from '@ldesign/auth/events'
 *
 * const events = createAuthEventEmitter()
 *
 * // 监听登录成功
 * events.on('loginSuccess', (response) => {
 *   console.log('Login success:', response.user.username)
 * })
 *
 * // 监听 Token 即将过期
 * events.on('accessTokenExpiring', (token) => {
 *   console.log('Token expiring, refresh needed')
 * })
 *
 * // 监听错误
 * events.on('error', (error) => {
 *   console.error('Auth error:', error.message)
 * })
 * ```
 */

// 导出事件发射器
export { AuthEventEmitter, createAuthEventEmitter } from './EventEmitter'


