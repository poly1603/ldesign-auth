/**
 * OAuth 模块单元测试
 */

import { describe, expect, it } from 'vitest'
import { generatePKCE, verifyPKCE } from '../../src/oauth/pkce'
import { GitHubProvider, GoogleProvider, FacebookProvider } from '../../src/oauth/providers'

describe('PKCE', () => {
  it('should generate PKCE challenge', async () => {
    const pkce = await generatePKCE('S256')

    expect(pkce.codeVerifier).toBeDefined()
    expect(pkce.codeChallenge).toBeDefined()
    expect(pkce.codeChallengeMethod).toBe('S256')
    expect(pkce.codeVerifier.length).toBeGreaterThanOrEqual(43)
  })

  it('should generate plain PKCE', async () => {
    const pkce = await generatePKCE('plain')

    expect(pkce.codeVerifier).toBe(pkce.codeChallenge)
    expect(pkce.codeChallengeMethod).toBe('plain')
  })

  it('should verify PKCE challenge', async () => {
    const pkce = await generatePKCE('plain')
    const isValid = await verifyPKCE(
      pkce.codeVerifier,
      pkce.codeChallenge,
      'plain',
    )

    expect(isValid).toBe(true)
  })
})

describe('OAuth Providers', () => {
  it('should create GitHub provider', () => {
    const provider = new GitHubProvider()

    expect(provider.getName()).toBe('github')
    expect(provider.getAuthorizationEndpoint()).toContain('github.com')
    expect(provider.supportsPKCE()).toBe(false)
  })

  it('should create Google provider', () => {
    const provider = new GoogleProvider()

    expect(provider.getName()).toBe('google')
    expect(provider.getAuthorizationEndpoint()).toContain('google.com')
    expect(provider.supportsPKCE()).toBe(true)
  })

  it('should create Facebook provider', () => {
    const provider = new FacebookProvider()

    expect(provider.getName()).toBe('facebook')
    expect(provider.getAuthorizationEndpoint()).toContain('facebook.com')
    expect(provider.supportsPKCE()).toBe(true)
  })

  it('should transform GitHub user', () => {
    const provider = new GitHubProvider()
    const githubUser = {
      id: 123,
      login: 'johndoe',
      email: 'john@example.com',
      name: 'John Doe',
      avatar_url: 'https://avatar.url',
    }

    const user = provider.transformUser(githubUser)

    expect(user.id).toBe(123)
    expect(user.username).toBe('johndoe')
    expect(user.email).toBe('john@example.com')
    expect(user.nickname).toBe('John Doe')
    expect(user.avatar).toBe('https://avatar.url')
  })
})

