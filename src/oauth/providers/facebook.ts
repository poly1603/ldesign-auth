/**
 * Facebook OAuth Provider
 */

import { OAuthProvider } from './base'
import type { User } from '../../types'

/**
 * Facebook Provider 类
 *
 * @example
 * ```typescript
 * import { FacebookProvider } from '@ldesign/auth/oauth'
 *
 * const provider = new FacebookProvider()
 * ```
 */
export class FacebookProvider extends OAuthProvider {
  constructor() {
    super({
      name: 'facebook',
      authorizationEndpoint: 'https://www.facebook.com/v18.0/dialog/oauth',
      tokenEndpoint: 'https://graph.facebook.com/v18.0/oauth/access_token',
      userInfoEndpoint: 'https://graph.facebook.com/me?fields=id,name,email,picture',
      defaultScopes: ['email', 'public_profile'],
      supportsPKCE: true,
      supportsRefreshToken: true,
    })
  }

  /**
   * 转换 Facebook 用户信息
   *
   * @param userInfo - Facebook API 返回的用户信息
   * @returns 标准用户对象
   */
  transformUser(userInfo: any): User {
    return {
      id: userInfo.id,
      username: userInfo.name,
      email: userInfo.email,
      nickname: userInfo.name,
      avatar: userInfo.picture?.data?.url,
      // 原始数据
      facebookProfile: userInfo,
    }
  }
}

