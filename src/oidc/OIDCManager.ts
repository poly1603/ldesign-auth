/**
 * OpenID Connect 管理器
 */

import type { HttpClient } from '@ldesign/http'
import type { OAuthConfig } from '../types'
import type { IDTokenClaims, OIDCConfiguration, OIDCUserInfo } from './types'
import { OAuthManager } from '../oauth/OAuthManager'
import { JWTParser } from '../jwt/parser'
import { AuthError, AuthErrorCode } from '../errors'

/**
 * OIDC 管理器类
 *
 * 继承自 OAuthManager，添加 OpenID Connect 特性
 */
export class OIDCManager extends OAuthManager {
  private jwtParser: JWTParser
  private configuration?: OIDCConfiguration

  constructor(config: OAuthConfig, httpClient?: HttpClient) {
    super(config, httpClient)
    this.jwtParser = new JWTParser()
  }

  /**
   * Discovery - 自动发现 OIDC 配置
   *
   * @param issuer - 签发者 URL
   * @returns OIDC 配置
   *
   * @example
   * ```typescript
   * const oidc = new OIDCManager(config, httpClient)
   * const configuration = await oidc.discover('https://accounts.google.com')
   * console.log('授权端点:', configuration.authorization_endpoint)
   * ```
   */
  async discover(issuer: string): Promise<OIDCConfiguration> {
    const discoveryUrl = `${issuer}/.well-known/openid-configuration`

    try {
      const config = await fetch(discoveryUrl).then(res => res.json())
      this.configuration = config
      return config
    }
    catch (error) {
      throw AuthError.fromCode(
        AuthErrorCode.OAUTH_PROVIDER_ERROR,
        error as Error,
        { issuer },
      )
    }
  }

  /**
   * 获取 UserInfo
   *
   * @param accessToken - Access Token
   * @returns 用户信息
   *
   * @example
   * ```typescript
   * const userInfo = await oidc.getUserInfo(token.accessToken)
   * console.log('User:', userInfo)
   * ```
   */
  async getUserInfo(accessToken: string): Promise<OIDCUserInfo> {
    const userInfo = await super.getUserInfo(accessToken)
    return userInfo as OIDCUserInfo
  }

  /**
   * 验证 ID Token
   *
   * @param idToken - ID Token
   * @param nonce - Nonce（可选）
   * @returns ID Token Claims
   *
   * @example
   * ```typescript
   * const claims = await oidc.validateIdToken(idToken, nonce)
   * console.log('User ID:', claims.sub)
   * ```
   */
  async validateIdToken(idToken: string, nonce?: string): Promise<IDTokenClaims> {
    try {
      // 解码 ID Token
      const decoded = this.jwtParser.decode(idToken)
      const claims = decoded.payload as IDTokenClaims

      // 验证过期
      if (this.jwtParser.isExpired(decoded)) {
        throw AuthError.fromCode(AuthErrorCode.TOKEN_EXPIRED)
      }

      // 验证 nonce（如果提供）
      if (nonce && claims.nonce !== nonce) {
        throw AuthError.fromCode(
          AuthErrorCode.TOKEN_INVALID,
          undefined,
          { reason: 'Nonce mismatch' },
        )
      }

      // 验证签发者（如果有配置）
      if (this.configuration && claims.iss !== this.configuration.issuer) {
        throw AuthError.fromCode(
          AuthErrorCode.INVALID_ISSUER,
          undefined,
          { expected: this.configuration.issuer, actual: claims.iss },
        )
      }

      return claims
    }
    catch (error) {
      if (error instanceof AuthError) {
        throw error
      }

      throw AuthError.fromCode(
        AuthErrorCode.TOKEN_INVALID,
        error as Error,
      )
    }
  }

  /**
   * 解析 Claims
   *
   * @param idToken - ID Token
   * @returns Claims
   *
   * @example
   * ```typescript
   * const claims = oidc.parseClaims(idToken)
   * console.log('Claims:', claims)
   * ```
   */
  parseClaims(idToken: string): IDTokenClaims {
    const payload = this.jwtParser.getPayload(idToken)
    return payload as IDTokenClaims
  }
}

/**
 * 创建 OIDC 管理器
 *
 * @param config - OAuth 配置
 * @param httpClient - HTTP 客户端
 * @returns OIDC 管理器实例
 *
 * @example
 * ```typescript
 * import { createOIDCManager } from '@ldesign/auth/oidc'
 *
 * const oidc = createOIDCManager({
 *   clientId: 'your-client-id',
 *   authorizationEndpoint: 'https://provider.com/oauth/authorize',
 *   tokenEndpoint: 'https://provider.com/oauth/token',
 *   redirectUri: 'http://localhost:3000/callback',
 * }, httpClient)
 *
 * // Discovery
 * const config = await oidc.discover('https://provider.com')
 *
 * // 获取用户信息
 * const userInfo = await oidc.getUserInfo(accessToken)
 * ```
 */
export function createOIDCManager(
  config: OAuthConfig,
  httpClient?: HttpClient,
): OIDCManager {
  return new OIDCManager(config, httpClient)
}

