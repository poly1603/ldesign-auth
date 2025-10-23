/**
 * 密码管理器单元测试
 */

import { describe, expect, it } from 'vitest'
import { PasswordManager } from '../../src/password/PasswordManager'

describe('PasswordManager', () => {
  it('should validate strong password', () => {
    const manager = new PasswordManager()
    const result = manager.validatePassword('MyP@ssw0rd123')

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.strength).toBeGreaterThan(60)
  })

  it('should reject weak password', () => {
    const manager = new PasswordManager()
    const result = manager.validatePassword('123456')

    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.strengthLevel).toBe('weak')
  })

  it('should require minimum length', () => {
    const manager = new PasswordManager({ minLength: 10 })
    const result = manager.validatePassword('Short1!')

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('长度'))).toBe(true)
  })

  it('should require uppercase', () => {
    const manager = new PasswordManager({ requireUppercase: true })
    const result = manager.validatePassword('lowercase123!')

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('大写'))).toBe(true)
  })

  it('should require numbers', () => {
    const manager = new PasswordManager({ requireNumbers: true })
    const result = manager.validatePassword('NoNumbers!')

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('数字'))).toBe(true)
  })

  it('should require special characters', () => {
    const manager = new PasswordManager({ requireSpecialChars: true })
    const result = manager.validatePassword('NoSpecial123')

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('特殊字符'))).toBe(true)
  })

  it('should detect common passwords', () => {
    const manager = new PasswordManager({ preventCommon: true })
    const result = manager.validatePassword('password')

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('常见'))).toBe(true)
  })

  it('should calculate password strength', () => {
    const manager = new PasswordManager()

    const weak = manager.validatePassword('abc')
    expect(weak.strengthLevel).toBe('weak')

    const strong = manager.validatePassword('MyV3ry$tr0ng!P@ssw0rd')
    expect(strong.strengthLevel).toMatch(/strong|very_strong/)
  })
})

