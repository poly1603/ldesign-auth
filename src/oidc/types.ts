/**
 * OpenID Connect 类型定义
 */

/**
 * OIDC 配置
 */
export interface OIDCConfiguration {
  /**
   * 签发者
   */
  issuer: string

  /**
   * 授权端点
   */
  authorization_endpoint: string

  /**
   * Token 端点
   */
  token_endpoint: string

  /**
   * 用户信息端点
   */
  userinfo_endpoint: string

  /**
   * JWKS 端点
   */
  jwks_uri: string

  /**
   * 支持的 response types
   */
  response_types_supported: string[]

  /**
   * 支持的 grant types
   */
  grant_types_supported?: string[]

  /**
   * 支持的 scopes
   */
  scopes_supported?: string[]

  /**
   * 支持的 claims
   */
  claims_supported?: string[]
}

/**
 * ID Token Claims
 */
export interface IDTokenClaims {
  /**
   * 签发者
   */
  iss: string

  /**
   * 主题（用户 ID）
   */
  sub: string

  /**
   * 受众（Client ID）
   */
  aud: string | string[]

  /**
   * 过期时间
   */
  exp: number

  /**
   * 签发时间
   */
  iat: number

  /**
   * 认证时间
   */
  auth_time?: number

  /**
   * Nonce
   */
  nonce?: string

  /**
   * 其他声明
   */
  [key: string]: any
}

/**
 * OIDC 用户信息
 */
export interface OIDCUserInfo {
  /**
   * 主题（用户 ID）
   */
  sub: string

  /**
   * 名称
   */
  name?: string

  /**
   * 昵称
   */
  nickname?: string

  /**
   * 邮箱
   */
  email?: string

  /**
   * 邮箱是否已验证
   */
  email_verified?: boolean

  /**
   * 头像 URL
   */
  picture?: string

  /**
   * 其他声明
   */
  [key: string]: any
}

