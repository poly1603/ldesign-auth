/**
 * @ldesign/auth - 认证授权系统
 * 
 * @packageDocumentation
 */

// 导出类型
export type * from './types'

// 导出核心
export { AuthManager, createAuthManager } from './core/AuthManager'

// 创建默认实例
export const auth = createAuthManager()

