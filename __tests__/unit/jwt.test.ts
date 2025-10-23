/**
 * JWT 模块单元测试
 */

import { describe, expect, it } from 'vitest'
import { JWTParser, JWTValidator } from '../../src/jwt'

describe('JWTParser', () => {
  const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTl9.signature'

  it('should decode JWT token', () => {
    const parser = new JWTParser()
    const decoded = parser.decode(validToken)

    expect(decoded.header).toHaveProperty('alg', 'HS256')
    expect(decoded.header).toHaveProperty('typ', 'JWT')
    expect(decoded.payload).toHaveProperty('sub', '1234567890')
    expect(decoded.payload).toHaveProperty('name', 'John Doe')
  })

  it('should get payload', () => {
    const parser = new JWTParser()
    const payload = parser.getPayload(validToken)

    expect(payload.sub).toBe('1234567890')
    expect(payload.name).toBe('John Doe')
  })

  it('should get header', () => {
    const parser = new JWTParser()
    const header = parser.getHeader(validToken)

    expect(header.alg).toBe('HS256')
    expect(header.typ).toBe('JWT')
  })

  it('should check if token is expired', () => {
    const parser = new JWTParser()
    const expired = parser.isExpired(validToken)

    // Token 有一个很远的过期时间，不应该过期
    expect(expired).toBe(false)
  })

  it('should get time to live', () => {
    const parser = new JWTParser()
    const ttl = parser.getTimeToLive(validToken)

    expect(ttl).toBeGreaterThan(0)
  })

  it('should throw error for invalid token', () => {
    const parser = new JWTParser()

    expect(() => parser.decode('invalid')).toThrow()
    expect(() => parser.decode('')).toThrow()
    expect(() => parser.decode('a.b')).toThrow()
  })
})

describe('JWTValidator', () => {
  const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTksImlzcyI6Imh0dHBzOi8vYXV0aC5leGFtcGxlLmNvbSJ9.signature'

  it('should verify valid token', () => {
    const validator = new JWTValidator()
    const result = validator.verify(validToken)

    expect(result.valid).toBe(true)
    expect(result.decoded).toBeDefined()
  })

  it('should validate structure', () => {
    const validator = new JWTValidator()
    const parser = new JWTParser()
    const decoded = parser.decode(validToken)

    const error = validator.validateStructure(decoded)
    expect(error).toBeNull()
  })

  it('should validate expiry', () => {
    const validator = new JWTValidator()
    const parser = new JWTParser()
    const decoded = parser.decode(validToken)

    const error = validator.validateExpiry(decoded)
    expect(error).toBeNull()
  })

  it('should validate issuer', () => {
    const validator = new JWTValidator()
    const parser = new JWTParser()
    const decoded = parser.decode(validToken)

    const error = validator.validateIssuer(decoded, 'https://auth.example.com')
    expect(error).toBeNull()
  })

  it('should detect invalid issuer', () => {
    const validator = new JWTValidator()
    const parser = new JWTParser()
    const decoded = parser.decode(validToken)

    const error = validator.validateIssuer(decoded, 'https://other.com')
    expect(error).not.toBeNull()
  })

  it('should validate with options', () => {
    const validator = new JWTValidator()
    const result = validator.verify(validToken, {
      verifyExpiry: true,
      issuer: 'https://auth.example.com',
    })

    expect(result.valid).toBe(true)
  })
})

