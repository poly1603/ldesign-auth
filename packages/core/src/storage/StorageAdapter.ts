/**
 * 存储适配器接口
 *
 * @module @ldesign/auth-core/storage
 * @author LDesign Team
 */

/**
 * 存储选项
 */
export interface StorageOptions {
  /** 过期时间（毫秒） */
  expires?: number
  /** Cookie 路径 */
  path?: string
  /** Cookie 域名 */
  domain?: string
  /** 是否安全 */
  secure?: boolean
  /** SameSite 属性 */
  sameSite?: 'strict' | 'lax' | 'none'
}

/**
 * 存储适配器接口
 * 
 * 统一的存储访问接口，支持多种存储方式
 */
export interface StorageAdapter {
  /**
   * 获取值
   * 
   * @param key - 键名
   * @returns 值或 null
   */
  get(key: string): string | null

  /**
   * 设置值
   * 
   * @param key - 键名
   * @param value - 值
   * @param options - 选项
   */
  set(key: string, value: string, options?: StorageOptions): void

  /**
   * 删除值
   * 
   * @param key - 键名
   */
  remove(key: string): void

  /**
   * 清空所有值
   */
  clear(): void

  /**
   * 获取所有键名
   * 
   * @returns 键名数组
   */
  keys(): string[]

  /**
   * 检查键是否存在
   * 
   * @param key - 键名
   * @returns 是否存在
   */
  has(key: string): boolean
}

/**
 * LocalStorage 适配器
 */
export class LocalStorageAdapter implements StorageAdapter {
  private prefix: string

  constructor(prefix = '') {
    this.prefix = prefix
  }

  get(key: string): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(this.getKey(key))
  }

  set(key: string, value: string): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(this.getKey(key), value)
  }

  remove(key: string): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(this.getKey(key))
  }

  clear(): void {
    if (typeof window === 'undefined') return
    const keys = this.keys()
    keys.forEach(key => localStorage.removeItem(key))
  }

  keys(): string[] {
    if (typeof window === 'undefined') return []
    return Object.keys(localStorage).filter(key => key.startsWith(this.prefix))
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`
  }
}

/**
 * SessionStorage 适配器
 */
export class SessionStorageAdapter implements StorageAdapter {
  private prefix: string

  constructor(prefix = '') {
    this.prefix = prefix
  }

  get(key: string): string | null {
    if (typeof window === 'undefined') return null
    return sessionStorage.getItem(this.getKey(key))
  }

  set(key: string, value: string): void {
    if (typeof window === 'undefined') return
    sessionStorage.setItem(this.getKey(key), value)
  }

  remove(key: string): void {
    if (typeof window === 'undefined') return
    sessionStorage.removeItem(this.getKey(key))
  }

  clear(): void {
    if (typeof window === 'undefined') return
    const keys = this.keys()
    keys.forEach(key => sessionStorage.removeItem(key))
  }

  keys(): string[] {
    if (typeof window === 'undefined') return []
    return Object.keys(sessionStorage).filter(key => key.startsWith(this.prefix))
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`
  }
}

/**
 * Memory 存储适配器
 */
export class MemoryStorageAdapter implements StorageAdapter {
  private store = new Map<string, string>()
  private prefix: string

  constructor(prefix = '') {
    this.prefix = prefix
  }

  get(key: string): string | null {
    return this.store.get(this.getKey(key)) ?? null
  }

  set(key: string, value: string): void {
    this.store.set(this.getKey(key), value)
  }

  remove(key: string): void {
    this.store.delete(this.getKey(key))
  }

  clear(): void {
    const keys = Array.from(this.store.keys()).filter(key =>
      key.startsWith(this.prefix)
    )
    keys.forEach(key => this.store.delete(key))
  }

  keys(): string[] {
    return Array.from(this.store.keys()).filter(key => key.startsWith(this.prefix))
  }

  has(key: string): boolean {
    return this.store.has(this.getKey(key))
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`
  }
}

/**
 * Cookie 存储适配器
 */
export class CookieStorageAdapter implements StorageAdapter {
  private prefix: string
  private defaultOptions: StorageOptions

  constructor(prefix = '', defaultOptions: StorageOptions = {}) {
    this.prefix = prefix
    this.defaultOptions = {
      path: '/',
      secure: true,
      sameSite: 'lax',
      ...defaultOptions,
    }
  }

  get(key: string): string | null {
    if (typeof document === 'undefined') return null

    const fullKey = this.getKey(key)
    const cookies = document.cookie.split('; ')
    const cookie = cookies.find(c => c.startsWith(`${fullKey}=`))

    return cookie ? decodeURIComponent(cookie.split('=')[1]) : null
  }

  set(key: string, value: string, options?: StorageOptions): void {
    if (typeof document === 'undefined') return

    const fullKey = this.getKey(key)
    const opts = { ...this.defaultOptions, ...options }

    let cookie = `${fullKey}=${encodeURIComponent(value)}`

    if (opts.expires) {
      const expires = new Date(Date.now() + opts.expires)
      cookie += `; expires=${expires.toUTCString()}`
    }

    if (opts.path) {
      cookie += `; path=${opts.path}`
    }

    if (opts.domain) {
      cookie += `; domain=${opts.domain}`
    }

    if (opts.secure) {
      cookie += '; secure'
    }

    if (opts.sameSite) {
      cookie += `; samesite=${opts.sameSite}`
    }

    document.cookie = cookie
  }

  remove(key: string): void {
    if (typeof document === 'undefined') return

    const fullKey = this.getKey(key)
    document.cookie = `${fullKey}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${this.defaultOptions.path}`
  }

  clear(): void {
    if (typeof document === 'undefined') return

    const keys = this.keys()
    keys.forEach(key => this.remove(key.replace(this.prefix, '')))
  }

  keys(): string[] {
    if (typeof document === 'undefined') return []

    return document.cookie
      .split('; ')
      .map(c => c.split('=')[0])
      .filter(key => key.startsWith(this.prefix))
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`
  }
}