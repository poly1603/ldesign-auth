/**
 * Token 管理模块
 *
 * 提供 Token 的存储、刷新、验证等功能
 *
 * @example
 * ```typescript
 * import { createTokenManager } from '@ldesign/auth/token'
 * import { createHttpClient } from '@ldesign/http'
 *
 * const httpClient = createHttpClient({ baseURL: 'https://api.example.com' })
 * const tokenManager = createTokenManager(
 *   { autoRefresh: true },
 *   httpClient,
 * )
 *
 * // 存储 Token
 * tokenManager.store({
 *   accessToken: 'eyJhbGc...',
 *   refreshToken: 'refresh...',
 *   expiresIn: 3600,
 * })
 *
 * // 加载 Token
 * const token = await tokenManager.load()
 *
 * // 刷新 Token
 * const newToken = await tokenManager.refresh()
 * ```
 */

// 导出类型
export type * from './types'

// 导出存储适配器
export {
  LocalStorageAdapter,
  SessionStorageAdapter,
  CookieStorageAdapter,
  MemoryStorageAdapter,
  StorageAdapterFactory,
} from './storage'

// 导出 Token 管理器
export { TokenManager, createTokenManager } from './TokenManager'


