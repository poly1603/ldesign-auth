/**
 * OAuth Providers
 */

export { OAuthProvider } from './base'
export { GitHubProvider } from './github'
export { GoogleProvider } from './google'
export { FacebookProvider } from './facebook'

/**
 * Provider 工厂
 *
 * @param name - Provider 名称
 * @returns Provider 实例
 *
 * @example
 * ```typescript
 * import { createProvider } from '@ldesign/auth/oauth'
 *
 * const provider = createProvider('github')
 * ```
 */
export function createProvider(name: string): OAuthProvider {
  switch (name.toLowerCase()) {
    case 'github':
      return new GitHubProvider()
    case 'google':
      return new GoogleProvider()
    case 'facebook':
      return new FacebookProvider()
    default:
      throw new Error(`Unknown provider: ${name}`)
  }
}

