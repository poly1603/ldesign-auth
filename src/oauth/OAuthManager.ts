/**
 * OAuth 2.0 管理器
 *
 * 实现 OAuth 2.0 授权流程
 */

import type { HttpClient } from '@ldesign/http'
import type {
  OAuthAuthorizationResponse,
  OAuthConfig,
  OAuthTokenResponse,
  PKCEChallenge,
} from './types'
import type { TokenInfo } from '../types'
import { generatePKCE } from './pkce'
import { AuthError, AuthErrorCode } from '../errors'

/**
 * OAuth 管理器类
 */
export class OAuthManager {
  private config: Required<OAuthConfig>
  private httpClient?: HttpClient
  private pkceChallenge?: PKCEChallenge
  private pendingState?: string

  constructor(config: OAuthConfig, httpClient?: HttpClient) {
    this.config = {
      clientId: config.clientId,
      clientSecret: config.clientSecret || '',
      authorizationEndpoint: config.authorizationEndpoint,
      tokenEndpoint: config.tokenEndpoint,
      userInfoEndpoint: config.userInfoEndpoint || '',
      redirectUri: config.redirectUri,
      scope: config.scope || 'openid profile email',
      responseType: config.responseType || 'code',
      usePKCE: config.usePKCE !== undefined ? config.usePKCE : false,
      state: config.state || this.generateState(),
      extraParams: config.extraParams || {},
    }

    this.httpClient = httpClient
  }

  /**
   * 开始授权流程（Authorization Code Flow）
   *
   * @returns 授权 URL
   *
   * @example
   * ```typescript
   * const oauth = new OAuthManager(config)
   * const authUrl = await oauth.authorize()
   * window.location.href = authUrl // 重定向到授权页面
   * ```
   */
  async authorize(): Promise<string> {
    // 生成 state
    this.pendingState = this.generateState()

    // 如果启用 PKCE，生成 challenge
    if (this.config.usePKCE) {
      this.pkceChallenge = await generatePKCE('S256')
    }

    // 构建授权 URL
    const authUrl = this.buildAuthUrl()

    return authUrl
  }

  /**
   * 处理授权回调
   *
   * @param params - URL 参数或授权响应
   * @returns Token 信息
   *
   * @example
   * ```typescript
   * // 从 URL 获取参数
   * const params = new URLSearchParams(window.location.search)
   * const code = params.get('code')
   * const state = params.get('state')
   *
   * const token = await oauth.handleCallback({ code, state })
   * ```
   */
  async handleCallback(
    params: OAuthAuthorizationResponse | URLSearchParams,
  ): Promise<TokenInfo> {
    let code: string
    let state: string

    if (params instanceof URLSearchParams) {
      code = params.get('code') || ''
      state = params.get('state') || ''
    }
    else {
      code = params.code
      state = params.state
    }

    // 验证 state
    if (this.pendingState && state !== this.pendingState) {
      throw AuthError.fromCode(AuthErrorCode.INVALID_STATE)
    }

    // 交换 code 获取 token
    const tokenResponse = await this.exchangeCode(code)

    // 转换为 TokenInfo
    return {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresIn: tokenResponse.expires_in,
      tokenType: tokenResponse.token_type,
      scope: tokenResponse.scope,
    }
  }

  /**
   * 使用授权码交换 Token
   *
   * @param code - 授权码
   * @returns Token 响应
   * @private
   */
  private async exchangeCode(code: string): Promise<OAuthTokenResponse> {
    if (!this.httpClient) {
      throw AuthError.fromCode(
        AuthErrorCode.INVALID_CONFIG,
        undefined,
        { reason: 'HttpClient is required' },
      )
    }

    const body: Record<string, string> = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.redirectUri,
      client_id: this.config.clientId,
    }

    // 添加 client_secret（如果有）
    if (this.config.clientSecret) {
      body.client_secret = this.config.clientSecret
    }

    // 添加 PKCE code_verifier（如果有）
    if (this.pkceChallenge) {
      body.code_verifier = this.pkceChallenge.codeVerifier
    }

    try {
      const response = await this.httpClient.post<OAuthTokenResponse>(
        this.config.tokenEndpoint,
        body,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      )

      return response
    }
    catch (error) {
      throw AuthError.fromCode(
        AuthErrorCode.OAUTH_AUTHORIZATION_FAILED,
        error as Error,
      )
    }
  }

  /**
   * 刷新 Token
   *
   * @param refreshToken - Refresh Token
   * @returns 新的 Token 信息
   *
   * @example
   * ```typescript
   * const newToken = await oauth.refreshToken('refresh_token_here')
   * ```
   */
  async refreshToken(refreshToken: string): Promise<TokenInfo> {
    if (!this.httpClient) {
      throw AuthError.fromCode(AuthErrorCode.INVALID_CONFIG)
    }

    const body: Record<string, string> = {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.config.clientId,
    }

    if (this.config.clientSecret) {
      body.client_secret = this.config.clientSecret
    }

    try {
      const response = await this.httpClient.post<OAuthTokenResponse>(
        this.config.tokenEndpoint,
        body,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      )

      return {
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        expiresIn: response.expires_in,
        tokenType: response.token_type,
        scope: response.scope,
      }
    }
    catch (error) {
      throw AuthError.fromCode(
        AuthErrorCode.REFRESH_FAILED,
        error as Error,
      )
    }
  }

  /**
   * 构建授权 URL
   *
   * @returns 授权 URL
   * @private
   */
  private buildAuthUrl(): string {
    const params: Record<string, string> = {
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: this.config.responseType,
      scope: this.config.scope,
      state: this.pendingState || this.config.state,
      ...this.config.extraParams,
    }

    // 添加 PKCE challenge
    if (this.pkceChallenge) {
      params.code_challenge = this.pkceChallenge.codeChallenge
      params.code_challenge_method = this.pkceChallenge.codeChallengeMethod
    }

    const query = new URLSearchParams(params).toString()
    return `${this.config.authorizationEndpoint}?${query}`
  }

  /**
   * 生成随机 state
   *
   * @returns State 字符串
   * @private
   */
  private generateState(): string {
    const length = 32
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const randomValues = new Uint8Array(length)

    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(randomValues)
    }
    else {
      for (let i = 0; i < length; i++) {
        randomValues[i] = Math.floor(Math.random() * 256)
      }
    }

    let result = ''
    for (let i = 0; i < length; i++) {
      result += charset[randomValues[i] % charset.length]
    }

    return result
  }

  /**
   * 获取用户信息
   *
   * @param accessToken - Access Token
   * @returns 用户信息
   *
   * @example
   * ```typescript
   * const userInfo = await oauth.getUserInfo(token.accessToken)
   * ```
   */
  async getUserInfo(accessToken: string): Promise<any> {
    if (!this.config.userInfoEndpoint) {
      throw AuthError.fromCode(
        AuthErrorCode.INVALID_CONFIG,
        undefined,
        { reason: 'UserInfo endpoint not configured' },
      )
    }

    if (!this.httpClient) {
      throw AuthError.fromCode(AuthErrorCode.INVALID_CONFIG)
    }

    try {
      const response = await this.httpClient.get(
        this.config.userInfoEndpoint,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        },
      )

      return response
    }
    catch (error) {
      throw AuthError.fromCode(
        AuthErrorCode.OAUTH_PROVIDER_ERROR,
        error as Error,
      )
    }
  }
}

/**
 * 创建 OAuth 管理器
 *
 * @param config - OAuth 配置
 * @param httpClient - HTTP 客户端
 * @returns OAuth 管理器实例
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
 * const token = await oauth.handleCallback(new URLSearchParams(window.location.search))
 * ```
 */
export function createOAuthManager(
  config: OAuthConfig,
  httpClient?: HttpClient,
): OAuthManager {
  return new OAuthManager(config, httpClient)
}

