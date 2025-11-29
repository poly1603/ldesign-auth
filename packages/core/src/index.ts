/**
 * @ldesign/auth-core
 *
 * LDesign 认证系统核心模块 - 框架无关的认证管理、Token 管理、会话管理
 *
 * @packageDocumentation
 * @module @ldesign/auth-core
 * @author LDesign Team
 */

// ==================== 认证管理 ====================
export {
  AuthManager,
  type FetchUserHandler,
  type LoginHandler,
  type LoginResult,
  type RefreshTokenHandler,
} from './auth'

// ==================== Token 管理 ====================
export {
  TokenManager,
  type ITokenStorage,
} from './token'

// ==================== 会话管理 ====================
export {
  SessionManager,
  type SessionOptions,
} from './session'

// ==================== 类型定义 ====================
export * from './types'

// ==================== 工厂函数 ====================

import type { AuthConfig } from './types'
import { AuthManager } from './auth'

/**
 * 创建认证管理器实例
 *
 * @param config - 认证配置
 * @returns 认证管理器实例
 *
 * @example
 * ```ts
 * import { createAuthManager } from '@ldesign/auth-core'
 *
 * const authManager = createAuthManager({
 *   autoRefresh: true,
 *   refreshThreshold: 300,
 *   loginRoute: '/login',
 * })
 *
 * // 设置处理器
 * authManager.setLoginHandler(async (credentials) => {
 *   const response = await fetch('/api/login', {
 *     method: 'POST',
 *     body: JSON.stringify(credentials),
 *   })
 *   const data = await response.json()
 *   return {
 *     success: data.success,
 *     user: data.user,
 *     token: data.token,
 *   }
 * })
 * ```
 */
export function createAuthManager(config: AuthConfig = {}): AuthManager {
  return new AuthManager(config)
}

