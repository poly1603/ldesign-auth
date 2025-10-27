/**
 * @ldesign/auth - 认证授权系统
 *
 * 提供完整的身份认证解决方案，包括：
 * - JWT 认证
 * - Token 管理（自动刷新）
 * - Session 管理
 * - 事件系统
 * - OAuth 2.0 (即将推出)
 * - MFA/2FA (即将推出)
 * - SSO (即将推出)
 *
 * @packageDocumentation
 *
 * @example
 * ```typescript
 * import { createAuthManager } from '@ldesign/auth'
 * import { createHttpClient } from '@ldesign/http'
 *
 * const httpClient = createHttpClient({
 *   baseURL: 'https://api.example.com',
 * })
 *
 * const auth = createAuthManager(
 *   {
 *     autoRefresh: true,
 *     refreshThreshold: 300,
 *   },
 *   httpClient,
 * )
 *
 * // 登录
 * await auth.login({
 *   username: 'user@example.com',
 *   password: 'password123',
 * })
 *
 * // 获取用户信息
 * const user = auth.getUser()
 *
 * // 监听事件
 * auth.getEvents().on('userLoaded', (user) => {
 *   console.log('User loaded:', user)
 * })
 *
 * // 登出
 * await auth.logout()
 * ```
 */

// ============================================================================
// 核心导出
// ============================================================================

// 导出类型
export type * from './types'

// 导出核心 AuthManager
export { AuthManager, createAuthManager } from './core/AuthManager'

// 导出 AuthRegistry
export { AuthRegistry } from './core/AuthRegistry'

// ============================================================================
// 模块导出
// ============================================================================

// JWT 模块 - 从 '@ldesign/auth/jwt' 导入
// export * from './jwt'

// Token 管理模块 - 从 '@ldesign/auth/token' 导入
// export * from './token'

// Session 管理模块 - 从 '@ldesign/auth/session' 导入
// export * from './session'

// 事件系统模块 - 从 '@ldesign/auth/events' 导入
// export * from './events'

// 错误处理模块 - 从 '@ldesign/auth/errors' 导入
// export * from './errors'

// ============================================================================
// 默认实例（延迟初始化）
// ============================================================================

import { AuthRegistry } from './core/AuthRegistry'

/**
 * 获取默认认证管理器实例（使用 AuthRegistry）
 *
 * @param httpClient - HTTP 客户端（可选，仅在首次调用时生效）
 * @param cacheManager - 缓存管理器（可选，仅在首次调用时生效）
 * @returns 默认认证管理器实例
 *
 * @example
 * ```typescript
 * import { getDefaultAuth } from '@ldesign/auth'
 * import { createHttpClient } from '@ldesign/http'
 *
 * const httpClient = createHttpClient({ baseURL: 'https://api.example.com' })
 * const auth = getDefaultAuth(httpClient)
 *
 * await auth.login({ username: 'user', password: 'pass' })
 * ```
 */
export function getDefaultAuth(httpClient?: any, cacheManager?: any): AuthManager {
  // 使用 AuthRegistry 管理默认实例
  let instance = AuthRegistry.get('default')

  if (!instance) {
    instance = createAuthManager({}, httpClient, cacheManager)
    AuthRegistry.register('default', instance)
  }

  return instance
}

/**
 * 便捷的默认实例访问
 *
 * @example
 * ```typescript
 * import { auth } from '@ldesign/auth'
 *
 * // 设置 HTTP 客户端后使用
 * await auth.login({ username: 'user', password: 'pass' })
 * ```
 */
export const auth = {
  /**
   * 获取默认实例
   */
  get instance() {
    return getDefaultAuth()
  },

  /**
   * 登录
   */
  login: (credentials: any) => getDefaultAuth().login(credentials),

  /**
   * 登出
   */
  logout: () => getDefaultAuth().logout(),

  /**
   * 获取用户
   */
  getUser: () => getDefaultAuth().getUser(),

  /**
   * 获取 Token
   */
  getAccessToken: () => getDefaultAuth().getAccessToken(),

  /**
   * 检查认证状态
   */
  isAuthenticated: () => getDefaultAuth().isAuthenticated(),

  /**
   * 订阅状态变化
   */
  subscribe: (listener: any) => getDefaultAuth().subscribe(listener),

  /**
   * 获取事件发射器
   */
  getEvents: () => getDefaultAuth().getEvents(),
}


