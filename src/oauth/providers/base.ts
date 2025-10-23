/**
 * OAuth Provider 基类
 */

import type { OAuthProviderConfig } from '../types'
import type { User } from '../../types'

/**
 * OAuth Provider 抽象类
 */
export abstract class OAuthProvider {
  /**
   * Provider 配置
   */
  protected config: OAuthProviderConfig

  constructor(config: Partial<OAuthProviderConfig>) {
    this.config = {
      name: config.name || 'unknown',
      authorizationEndpoint: config.authorizationEndpoint || '',
      tokenEndpoint: config.tokenEndpoint || '',
      userInfoEndpoint: config.userInfoEndpoint || '',
      defaultScopes: config.defaultScopes || [],
      supportsPKCE: config.supportsPKCE !== undefined ? config.supportsPKCE : true,
      supportsRefreshToken: config.supportsRefreshToken !== undefined ? config.supportsRefreshToken : true,
    }
  }

  /**
   * 获取 Provider 名称
   */
  getName(): string {
    return this.config.name
  }

  /**
   * 获取授权端点
   */
  getAuthorizationEndpoint(): string {
    return this.config.authorizationEndpoint
  }

  /**
   * 获取 Token 端点
   */
  getTokenEndpoint(): string {
    return this.config.tokenEndpoint
  }

  /**
   * 获取用户信息端点
   */
  getUserInfoEndpoint(): string {
    return this.config.userInfoEndpoint
  }

  /**
   * 获取默认 Scopes
   */
  getDefaultScopes(): string[] {
    return this.config.defaultScopes
  }

  /**
   * 是否支持 PKCE
   */
  supportsPKCE(): boolean {
    return this.config.supportsPKCE || false
  }

  /**
   * 是否支持 Refresh Token
   */
  supportsRefreshToken(): boolean {
    return this.config.supportsRefreshToken || false
  }

  /**
   * 将 Provider 的用户信息转换为标准的 User 对象
   *
   * @param userInfo - Provider 返回的用户信息
   * @returns 标准用户对象
   */
  abstract transformUser(userInfo: any): User
}

