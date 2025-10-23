/**
 * GitHub OAuth Provider
 */

import { OAuthProvider } from './base'
import type { User } from '../../types'

/**
 * GitHub Provider 类
 *
 * @example
 * ```typescript
 * import { GitHubProvider } from '@ldesign/auth/oauth'
 *
 * const provider = new GitHubProvider({
 *   clientId: 'your-client-id',
 *   clientSecret: 'your-client-secret',
 * })
 * ```
 */
export class GitHubProvider extends OAuthProvider {
  constructor() {
    super({
      name: 'github',
      authorizationEndpoint: 'https://github.com/login/oauth/authorize',
      tokenEndpoint: 'https://github.com/login/oauth/access_token',
      userInfoEndpoint: 'https://api.github.com/user',
      defaultScopes: ['read:user', 'user:email'],
      supportsPKCE: false, // GitHub 不支持 PKCE
      supportsRefreshToken: false, // GitHub 不使用 refresh token
    })
  }

  /**
   * 转换 GitHub 用户信息
   *
   * @param userInfo - GitHub API 返回的用户信息
   * @returns 标准用户对象
   */
  transformUser(userInfo: any): User {
    return {
      id: userInfo.id,
      username: userInfo.login,
      email: userInfo.email,
      nickname: userInfo.name,
      avatar: userInfo.avatar_url,
      // 原始数据
      githubProfile: userInfo,
    }
  }
}

