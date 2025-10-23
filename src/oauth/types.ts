/**
 * OAuth 2.0 类型定义
 */

/**
 * OAuth 流程类型
 */
export type OAuthFlowType = 'authorization_code' | 'implicit' | 'password' | 'client_credentials'

/**
 * OAuth 配置
 */
export interface OAuthConfig {
  /**
   * Client ID
   */
  clientId: string

  /**
   * Client Secret（仅服务端使用）
   */
  clientSecret?: string

  /**
   * 授权端点
   */
  authorizationEndpoint: string

  /**
   * Token 端点
   */
  tokenEndpoint: string

  /**
   * 用户信息端点
   */
  userInfoEndpoint?: string

  /**
   * 重定向 URI
   */
  redirectUri: string

  /**
   * Scope
   */
  scope?: string

  /**
   * Response Type
   * @default 'code'
   */
  responseType?: 'code' | 'token'

  /**
   * 是否使用 PKCE
   * @default false
   */
  usePKCE?: boolean

  /**
   * State 参数（可选，自动生成）
   */
  state?: string

  /**
   * 额外参数
   */
  extraParams?: Record<string, string>
}

/**
 * OAuth Token 响应
 */
export interface OAuthTokenResponse {
  /**
   * Access Token
   */
  access_token: string

  /**
   * Token 类型
   */
  token_type: string

  /**
   * 过期时间（秒）
   */
  expires_in?: number

  /**
   * Refresh Token
   */
  refresh_token?: string

  /**
   * Scope
   */
  scope?: string

  /**
   * ID Token (OIDC)
   */
  id_token?: string
}

/**
 * OAuth 授权响应
 */
export interface OAuthAuthorizationResponse {
  /**
   * 授权码
   */
  code: string

  /**
   * State 参数
   */
  state: string

  /**
   * 额外参数
   */
  [key: string]: any
}

/**
 * PKCE Challenge
 */
export interface PKCEChallenge {
  /**
   * Code Verifier
   */
  codeVerifier: string

  /**
   * Code Challenge
   */
  codeChallenge: string

  /**
   * Challenge 方法
   */
  codeChallengeMethod: 'S256' | 'plain'
}

/**
 * OAuth Provider 配置
 */
export interface OAuthProviderConfig {
  /**
   * Provider 名称
   */
  name: string

  /**
   * 授权端点
   */
  authorizationEndpoint: string

  /**
   * Token 端点
   */
  tokenEndpoint: string

  /**
   * 用户信息端点
   */
  userInfoEndpoint: string

  /**
   * 默认 Scope
   */
  defaultScopes: string[]

  /**
   * 是否支持 PKCE
   */
  supportsPKCE?: boolean

  /**
   * 是否支持 refresh token
   */
  supportsRefreshToken?: boolean
}

