/**
 * Token 存储适配器
 *
 * 提供多种存储方式的实现：localStorage、sessionStorage、Cookie、Memory
 */

import type { ITokenStorage, StorageType } from './types'
import { AuthError, AuthErrorCode } from '../errors'

/**
 * LocalStorage 存储适配器
 */
export class LocalStorageAdapter implements ITokenStorage {
  save(key: string, value: string): void {
    try {
      localStorage.setItem(key, value)
    }
    catch (error) {
      throw AuthError.fromCode(AuthErrorCode.STORAGE_ERROR, error as Error)
    }
  }

  load(key: string): string | null {
    try {
      return localStorage.getItem(key)
    }
    catch (error) {
      throw AuthError.fromCode(AuthErrorCode.STORAGE_ERROR, error as Error)
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(key)
    }
    catch (error) {
      throw AuthError.fromCode(AuthErrorCode.STORAGE_ERROR, error as Error)
    }
  }

  clear(): void {
    try {
      // 只清除 auth 相关的键
      const keys = Object.keys(localStorage)
      keys.forEach((key) => {
        if (key.startsWith('auth-')) {
          localStorage.removeItem(key)
        }
      })
    }
    catch (error) {
      throw AuthError.fromCode(AuthErrorCode.STORAGE_ERROR, error as Error)
    }
  }

  isAvailable(): boolean {
    try {
      const testKey = '__storage_test__'
      localStorage.setItem(testKey, 'test')
      localStorage.removeItem(testKey)
      return true
    }
    catch {
      return false
    }
  }
}

/**
 * SessionStorage 存储适配器
 */
export class SessionStorageAdapter implements ITokenStorage {
  save(key: string, value: string): void {
    try {
      sessionStorage.setItem(key, value)
    }
    catch (error) {
      throw AuthError.fromCode(AuthErrorCode.STORAGE_ERROR, error as Error)
    }
  }

  load(key: string): string | null {
    try {
      return sessionStorage.getItem(key)
    }
    catch (error) {
      throw AuthError.fromCode(AuthErrorCode.STORAGE_ERROR, error as Error)
    }
  }

  remove(key: string): void {
    try {
      sessionStorage.removeItem(key)
    }
    catch (error) {
      throw AuthError.fromCode(AuthErrorCode.STORAGE_ERROR, error as Error)
    }
  }

  clear(): void {
    try {
      const keys = Object.keys(sessionStorage)
      keys.forEach((key) => {
        if (key.startsWith('auth-')) {
          sessionStorage.removeItem(key)
        }
      })
    }
    catch (error) {
      throw AuthError.fromCode(AuthErrorCode.STORAGE_ERROR, error as Error)
    }
  }

  isAvailable(): boolean {
    try {
      const testKey = '__storage_test__'
      sessionStorage.setItem(testKey, 'test')
      sessionStorage.removeItem(testKey)
      return true
    }
    catch {
      return false
    }
  }
}

/**
 * Cookie 存储适配器
 */
export class CookieStorageAdapter implements ITokenStorage {
  private readonly domain?: string
  private readonly path: string = '/'
  private readonly secure: boolean = true
  private readonly sameSite: 'Strict' | 'Lax' | 'None' = 'Lax'

  constructor(options?: {
    domain?: string
    path?: string
    secure?: boolean
    sameSite?: 'Strict' | 'Lax' | 'None'
  }) {
    if (options) {
      this.domain = options.domain
      this.path = options.path || '/'
      this.secure = options.secure !== undefined ? options.secure : true
      this.sameSite = options.sameSite || 'Lax'
    }
  }

  save(key: string, value: string, maxAge?: number): void {
    try {
      let cookie = `${encodeURIComponent(key)}=${encodeURIComponent(value)}`

      if (maxAge) {
        cookie += `; Max-Age=${maxAge}`
      }

      cookie += `; Path=${this.path}`

      if (this.domain) {
        cookie += `; Domain=${this.domain}`
      }

      if (this.secure) {
        cookie += '; Secure'
      }

      cookie += `; SameSite=${this.sameSite}`

      document.cookie = cookie
    }
    catch (error) {
      throw AuthError.fromCode(AuthErrorCode.STORAGE_ERROR, error as Error)
    }
  }

  load(key: string): string | null {
    try {
      const cookies = document.cookie.split(';')
      const encodedKey = encodeURIComponent(key)

      for (const cookie of cookies) {
        const [cookieKey, cookieValue] = cookie.trim().split('=')
        if (cookieKey === encodedKey) {
          return decodeURIComponent(cookieValue)
        }
      }

      return null
    }
    catch (error) {
      throw AuthError.fromCode(AuthErrorCode.STORAGE_ERROR, error as Error)
    }
  }

  remove(key: string): void {
    try {
      // 设置过期时间为过去
      this.save(key, '', -1)
    }
    catch (error) {
      throw AuthError.fromCode(AuthErrorCode.STORAGE_ERROR, error as Error)
    }
  }

  clear(): void {
    try {
      const cookies = document.cookie.split(';')
      for (const cookie of cookies) {
        const [key] = cookie.trim().split('=')
        const decodedKey = decodeURIComponent(key)
        if (decodedKey.startsWith('auth-')) {
          this.remove(decodedKey)
        }
      }
    }
    catch (error) {
      throw AuthError.fromCode(AuthErrorCode.STORAGE_ERROR, error as Error)
    }
  }

  isAvailable(): boolean {
    try {
      return typeof document !== 'undefined' && typeof document.cookie !== 'undefined'
    }
    catch {
      return false
    }
  }
}

/**
 * 内存存储适配器（不持久化）
 */
export class MemoryStorageAdapter implements ITokenStorage {
  private storage: Map<string, string> = new Map()

  save(key: string, value: string): void {
    this.storage.set(key, value)
  }

  load(key: string): string | null {
    return this.storage.get(key) || null
  }

  remove(key: string): void {
    this.storage.delete(key)
  }

  clear(): void {
    const keys = Array.from(this.storage.keys())
    keys.forEach((key) => {
      if (key.startsWith('auth-')) {
        this.storage.delete(key)
      }
    })
  }

  isAvailable(): boolean {
    return true
  }
}

/**
 * 存储适配器工厂
 */
export class StorageAdapterFactory {
  private static adapters: Map<StorageType, ITokenStorage> = new Map()

  /**
   * 获取存储适配器
   *
   * @param type - 存储类型
   * @returns 存储适配器实例
   */
  static getAdapter(type: StorageType): ITokenStorage {
    // 从缓存中获取
    if (this.adapters.has(type)) {
      return this.adapters.get(type)!
    }

    // 创建新的适配器
    let adapter: ITokenStorage

    switch (type) {
      case 'localStorage':
        adapter = new LocalStorageAdapter()
        break
      case 'sessionStorage':
        adapter = new SessionStorageAdapter()
        break
      case 'cookie':
        adapter = new CookieStorageAdapter()
        break
      case 'memory':
        adapter = new MemoryStorageAdapter()
        break
      default:
        throw AuthError.fromCode(
          AuthErrorCode.INVALID_CONFIG,
          undefined,
          { storageType: type },
        )
    }

    // 检查可用性
    if (!adapter.isAvailable()) {
      throw AuthError.fromCode(
        AuthErrorCode.STORAGE_UNAVAILABLE,
        undefined,
        { storageType: type },
      )
    }

    // 缓存适配器
    this.adapters.set(type, adapter)

    return adapter
  }

  /**
   * 清除适配器缓存
   */
  static clearCache(): void {
    this.adapters.clear()
  }
}


