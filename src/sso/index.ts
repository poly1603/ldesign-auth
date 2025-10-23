/**
 * SSO (单点登录) 模块
 *
 * 提供 SAML 2.0 等 SSO 协议支持
 *
 * @example
 * ```typescript
 * import { createSAMLManager } from '@ldesign/auth/sso'
 *
 * const saml = createSAMLManager({
 *   entityId: 'https://myapp.com',
 *   ssoEndpoint: 'https://idp.example.com/sso',
 *   acsEndpoint: 'https://myapp.com/saml/acs',
 * })
 *
 * // 生成认证请求
 * const request = saml.generateAuthRequest()
 *
 * // 解析响应
 * const assertion = saml.parseResponse(samlResponse)
 * ```
 */

// 导出 SAML 管理器
export { SAMLManager, createSAMLManager } from './SAMLManager'
export type { SAMLConfig, SAMLAssertion } from './SAMLManager'

