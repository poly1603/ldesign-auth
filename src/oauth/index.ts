/**
 * OAuth 2.0 模块
 *
 * 提供完整的 OAuth 2.0 授权流程支持
 *
 * @example
 * ```typescript
 * import { createOAuthManager } from '@ldesign/auth/oauth'
 * import { createHttpClient } from '@ldesign/http'
 *
 * const httpClient = createHttpClient()
 * const oauth = createOAuthManager({
 *   clientId: 'your-client-id',
 *   authorizationEndpoint: 'https://provider.com/oauth/authorize',
 *   tokenEndpoint: 'https://provider.com/oauth/token',
 *   redirectUri: 'http://localhost:3000/callback',
 *   usePKCE: true,
 * }, httpClient)
 *
 * // 开始授权
 * const authUrl = await oauth.authorize()
 * window.location.href = authUrl
 *
 * // 处理回调
 * const params = new URLSearchParams(window.location.search)
 * const token = await oauth.handleCallback(params)
 *
 * // 获取用户信息
 * const userInfo = await oauth.getUserInfo(token.accessToken)
 * ```
 */

// 导出类型
export type * from './types'

// 导出 PKCE 工具
export { generatePKCE, verifyPKCE } from './pkce'

// 导出 OAuth 管理器
export { OAuthManager, createOAuthManager } from './OAuthManager'

// 导出 Providers
export * from './providers'

