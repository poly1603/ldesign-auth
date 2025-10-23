/**
 * OpenID Connect 模块
 *
 * @example
 * ```typescript
 * import { createOIDCManager } from '@ldesign/auth/oidc'
 * import { createHttpClient } from '@ldesign/http'
 *
 * const httpClient = createHttpClient()
 * const oidc = createOIDCManager({
 *   clientId: 'your-client-id',
 *   authorizationEndpoint: 'https://provider.com/oauth/authorize',
 *   tokenEndpoint: 'https://provider.com/oauth/token',
 *   redirectUri: 'http://localhost:3000/callback',
 * }, httpClient)
 *
 * // 自动发现配置
 * const config = await oidc.discover('https://accounts.google.com')
 * console.log('OIDC Configuration:', config)
 *
 * // 开始授权
 * const authUrl = await oidc.authorize()
 * window.location.href = authUrl
 *
 * // 处理回调
 * const params = new URLSearchParams(window.location.search)
 * const token = await oidc.handleCallback(params)
 *
 * // 验证 ID Token
 * if (token.idToken) {
 *   const claims = await oidc.validateIdToken(token.idToken)
 *   console.log('User ID:', claims.sub)
 * }
 *
 * // 获取用户信息
 * const userInfo = await oidc.getUserInfo(token.accessToken)
 * ```
 */

// 导出类型
export type * from './types'

// 导出 OIDC 管理器
export { OIDCManager, createOIDCManager } from './OIDCManager'

