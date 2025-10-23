/**
 * 错误处理单元测试
 */

import { describe, expect, it } from 'vitest'
import {
  AuthError,
  AuthErrorCode,
  isAuthError,
  isTokenError,
  TokenError,
} from '../../src/errors'

describe('AuthError', () => {
  it('should create auth error', () => {
    const error = new AuthError('Test error', AuthErrorCode.AUTHENTICATION_FAILED)

    expect(error).toBeInstanceOf(AuthError)
    expect(error.message).toBe('Test error')
    expect(error.code).toBe(AuthErrorCode.AUTHENTICATION_FAILED)
    expect(error.timestamp).toBeInstanceOf(Date)
  })

  it('should create error from code', () => {
    const error = AuthError.fromCode(AuthErrorCode.INVALID_CREDENTIALS)

    expect(error.message).toBe('用户名或密码错误')
    expect(error.code).toBe(AuthErrorCode.INVALID_CREDENTIALS)
  })

  it('should convert to JSON', () => {
    const error = new AuthError('Test', AuthErrorCode.TOKEN_EXPIRED)
    const json = error.toJSON()

    expect(json.name).toBe('AuthError')
    expect(json.message).toBe('Test')
    expect(json.code).toBe(AuthErrorCode.TOKEN_EXPIRED)
    expect(json.timestamp).toBeDefined()
  })

  it('should detect auth error', () => {
    const error = new AuthError('Test', AuthErrorCode.UNKNOWN_ERROR)

    expect(isAuthError(error)).toBe(true)
    expect(isAuthError(new Error('Regular error'))).toBe(false)
  })
})

describe('TokenError', () => {
  it('should create token error', () => {
    const error = new TokenError('Token invalid', AuthErrorCode.TOKEN_INVALID)

    expect(error).toBeInstanceOf(TokenError)
    expect(error).toBeInstanceOf(AuthError)
    expect(error.name).toBe('TokenError')
  })

  it('should create expired error', () => {
    const error = TokenError.expired()

    expect(error.code).toBe(AuthErrorCode.TOKEN_EXPIRED)
  })

  it('should create invalid error', () => {
    const error = TokenError.invalid('Bad format')

    expect(error.code).toBe(AuthErrorCode.TOKEN_INVALID)
    expect(error.details?.reason).toBe('Bad format')
  })

  it('should create refresh failed error', () => {
    const cause = new Error('Network error')
    const error = TokenError.refreshFailed(cause)

    expect(error.code).toBe(AuthErrorCode.REFRESH_FAILED)
    expect(error.cause).toBe(cause)
  })

  it('should detect token error', () => {
    const error = new TokenError('Test', AuthErrorCode.TOKEN_INVALID)

    expect(isTokenError(error)).toBe(true)
    expect(isTokenError(new AuthError('Test', AuthErrorCode.UNKNOWN_ERROR))).toBe(false)
  })
})

