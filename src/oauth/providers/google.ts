/**
 * Google OAuth Provider
 */

import { OAuthProvider } from './base'
import type { User } from '../../types'

/**
 * Google Provider 类
 *
 * @example
 * ```typescript
 * import { GoogleProvider } from '@ldesign/auth/oauth'
 *
 * const provider = new GoogleProvider()
 * ```
 */
export class GoogleProvider extends OAuthProvider {
  constructor() {
    super({
      name: 'google',
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
      userInfoEndpoint: 'https://www.googleapis.com/oauth2/v2/userinfo',
      defaultScopes: ['openid', 'profile', 'email'],
      supportsPKCE: true,
      supportsRefreshToken: true,
    })
  }

  /**
   * 转换 Google 用户信息
   *
   * @param userInfo - Google API 返回的用户信息
   * @returns 标准用户对象
   */
  transformUser(userInfo: any): User {
    return {
      id: userInfo.id,
      username: userInfo.email,
      email: userInfo.email,
      nickname: userInfo.name,
      avatar: userInfo.picture,
      // 原始数据
      googleProfile: userInfo,
    }
  }
}

