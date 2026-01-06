/**
 * 安全存储
 *
 * @module @ldesign/auth-core/security
 * @author LDesign Team
 */

/**
 * 安全存储配置
 */
export interface SecureStorageConfig {
  /** 存储前缀 */
  prefix?: string
  /** 存储类型 */
  storage?: 'localStorage' | 'sessionStorage' | 'memory'
  /** 是否加密（需要浏览器支持 SubtleCrypto） */
  encrypt?: boolean
  /** 加密密钥（如果启用加密） */
  encryptionKey?: string
  /** 数据过期时间（毫秒） */
  ttl?: number
}

/**
 * 存储数据包装
 */
interface StorageWrapper<T> {
  /** 实际数据 */
  data: T
  /** 存储时间 */
  timestamp: number
  /** 过期时间 */
  expiresAt?: number
  /** 版本号 */
  version: number
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<SecureStorageConfig> = {
  prefix: 'secure_',
  storage: 'localStorage',
  encrypt: false,
  encryptionKey: '',
  ttl: 0, // 0 表示不过期
}

/**
 * 当前版本
 */
const STORAGE_VERSION = 1

/**
 * 内存存储
 */
const memoryStore = new Map<string, string>()

/**
 * 安全存储类
 *
 * 提供带有过期时间、加密支持的安全存储功能
 *
 * @example
 * ```ts
 * const storage = new SecureStorage({
 *   prefix: 'myapp_',
 *   ttl: 3600000, // 1 小时
 * })
 *
 * // 存储数据
 * storage.set('user', { id: 1, name: 'John' })
 *
 * // 获取数据
 * const user = storage.get<User>('user')
 *
 * // 删除数据
 * storage.remove('user')
 * ```
 */
export class SecureStorage {
  /** 配置选项 */
  private config: Required<SecureStorageConfig>

  /**
   * 创建安全存储实例
   *
   * @param config - 配置选项
   */
  constructor(config: SecureStorageConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * 存储数据
   *
   * @param key - 键名
   * @param value - 值
   * @param ttl - 可选的自定义 TTL（覆盖默认配置）
   *
   * @example
   * ```ts
   * storage.set('token', 'xxx')
   * storage.set('user', { id: 1 }, 3600000) // 1 小时后过期
   * ```
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const fullKey = this.getKey(key)
    const now = Date.now()
    const effectiveTtl = ttl ?? this.config.ttl

    const wrapper: StorageWrapper<T> = {
      data: value,
      timestamp: now,
      expiresAt: effectiveTtl > 0 ? now + effectiveTtl : undefined,
      version: STORAGE_VERSION,
    }

    let serialized = JSON.stringify(wrapper)

    // 加密数据
    if (this.config.encrypt && this.config.encryptionKey) {
      try {
        serialized = await this.encrypt(serialized)
      } catch (error) {
        console.error('[SecureStorage] Encryption failed:', error)
        // 加密失败时不存储
        return
      }
    }

    this.getStorage().setItem(fullKey, serialized)
  }

  /**
   * 获取数据
   *
   * @param key - 键名
   * @returns 数据或 null
   *
   * @example
   * ```ts
   * const user = storage.get<User>('user')
   * if (user) {
   *   console.log(user.name)
   * }
   * ```
   */
  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.getKey(key)
    let serialized = this.getStorage().getItem(fullKey)

    if (!serialized) {
      return null
    }

    // 解密数据
    if (this.config.encrypt && this.config.encryptionKey) {
      try {
        serialized = await this.decrypt(serialized)
      } catch (error) {
        console.error('[SecureStorage] Decryption failed:', error)
        // 解密失败时删除数据
        this.remove(key)
        return null
      }
    }

    try {
      const wrapper = JSON.parse(serialized) as StorageWrapper<T>

      // 检查版本
      if (wrapper.version !== STORAGE_VERSION) {
        this.remove(key)
        return null
      }

      // 检查过期
      if (wrapper.expiresAt && Date.now() > wrapper.expiresAt) {
        this.remove(key)
        return null
      }

      return wrapper.data
    } catch {
      // 解析失败，删除损坏的数据
      this.remove(key)
      return null
    }
  }

  /**
   * 同步获取数据（不支持加密）
   *
   * @param key - 键名
   * @returns 数据或 null
   */
  getSync<T>(key: string): T | null {
    if (this.config.encrypt) {
      console.warn('[SecureStorage] getSync does not support encryption, use get() instead')
      return null
    }

    const fullKey = this.getKey(key)
    const serialized = this.getStorage().getItem(fullKey)

    if (!serialized) {
      return null
    }

    try {
      const wrapper = JSON.parse(serialized) as StorageWrapper<T>

      if (wrapper.version !== STORAGE_VERSION) {
        this.remove(key)
        return null
      }

      if (wrapper.expiresAt && Date.now() > wrapper.expiresAt) {
        this.remove(key)
        return null
      }

      return wrapper.data
    } catch {
      this.remove(key)
      return null
    }
  }

  /**
   * 同步设置数据（不支持加密）
   *
   * @param key - 键名
   * @param value - 值
   * @param ttl - 可选的自定义 TTL
   */
  setSync<T>(key: string, value: T, ttl?: number): void {
    if (this.config.encrypt) {
      console.warn('[SecureStorage] setSync does not support encryption, use set() instead')
      return
    }

    const fullKey = this.getKey(key)
    const now = Date.now()
    const effectiveTtl = ttl ?? this.config.ttl

    const wrapper: StorageWrapper<T> = {
      data: value,
      timestamp: now,
      expiresAt: effectiveTtl > 0 ? now + effectiveTtl : undefined,
      version: STORAGE_VERSION,
    }

    this.getStorage().setItem(fullKey, JSON.stringify(wrapper))
  }

  /**
   * 删除数据
   *
   * @param key - 键名
   *
   * @example
   * ```ts
   * storage.remove('user')
   * ```
   */
  remove(key: string): void {
    const fullKey = this.getKey(key)
    this.getStorage().removeItem(fullKey)
  }

  /**
   * 检查键是否存在
   *
   * @param key - 键名
   * @returns 是否存在
   */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key)
    return value !== null
  }

  /**
   * 同步检查键是否存在
   *
   * @param key - 键名
   * @returns 是否存在
   */
  hasSync(key: string): boolean {
    if (this.config.encrypt) {
      console.warn('[SecureStorage] hasSync does not support encryption')
      return false
    }
    return this.getSync(key) !== null
  }

  /**
   * 清除所有数据
   *
   * @example
   * ```ts
   * storage.clear()
   * ```
   */
  clear(): void {
    const storage = this.getStorage()
    const keysToRemove: string[] = []

    // 收集需要删除的键
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (key && key.startsWith(this.config.prefix)) {
        keysToRemove.push(key)
      }
    }

    // 删除
    keysToRemove.forEach(key => storage.removeItem(key))
  }

  /**
   * 获取所有键名
   *
   * @returns 键名数组（不包含前缀）
   */
  keys(): string[] {
    const storage = this.getStorage()
    const result: string[] = []

    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (key && key.startsWith(this.config.prefix)) {
        result.push(key.slice(this.config.prefix.length))
      }
    }

    return result
  }

  /**
   * 清理过期数据
   *
   * @returns 清理的键数量
   */
  async cleanup(): Promise<number> {
    const allKeys = this.keys()
    let cleaned = 0

    for (const key of allKeys) {
      const value = await this.get(key)
      if (value === null) {
        // get 方法会自动删除过期数据
        cleaned++
      }
    }

    return cleaned
  }

  /**
   * 获取存储接口
   */
  private getStorage(): Storage {
    if (this.config.storage === 'memory') {
      return {
        length: memoryStore.size,
        key: (index: number) => Array.from(memoryStore.keys())[index] ?? null,
        getItem: (key: string) => memoryStore.get(key) ?? null,
        setItem: (key: string, value: string) => memoryStore.set(key, value),
        removeItem: (key: string) => memoryStore.delete(key),
        clear: () => memoryStore.clear(),
      }
    }

    if (typeof window === 'undefined') {
      // SSR 环境使用内存存储
      return {
        length: memoryStore.size,
        key: (index: number) => Array.from(memoryStore.keys())[index] ?? null,
        getItem: (key: string) => memoryStore.get(key) ?? null,
        setItem: (key: string, value: string) => memoryStore.set(key, value),
        removeItem: (key: string) => memoryStore.delete(key),
        clear: () => memoryStore.clear(),
      }
    }

    return this.config.storage === 'sessionStorage'
      ? sessionStorage
      : localStorage
  }

  /**
   * 获取完整键名
   */
  private getKey(key: string): string {
    return `${this.config.prefix}${key}`
  }

  /**
   * 加密数据
   */
  private async encrypt(data: string): Promise<string> {
    if (!this.supportsEncryption()) {
      throw new Error('Browser does not support SubtleCrypto')
    }

    const encoder = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.config.encryptionKey),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey'],
    )

    const salt = crypto.getRandomValues(new Uint8Array(16))
    const iv = crypto.getRandomValues(new Uint8Array(12))

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt'],
    )

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(data),
    )

    // 组合 salt + iv + encrypted
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength)
    combined.set(salt, 0)
    combined.set(iv, salt.length)
    combined.set(new Uint8Array(encrypted), salt.length + iv.length)

    // Base64 编码
    return btoa(String.fromCharCode(...combined))
  }

  /**
   * 解密数据
   */
  private async decrypt(data: string): Promise<string> {
    if (!this.supportsEncryption()) {
      throw new Error('Browser does not support SubtleCrypto')
    }

    // Base64 解码
    const combined = Uint8Array.from(atob(data), c => c.charCodeAt(0))

    const salt = combined.slice(0, 16)
    const iv = combined.slice(16, 28)
    const encrypted = combined.slice(28)

    const encoder = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.config.encryptionKey),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey'],
    )

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
    )

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted,
    )

    return new TextDecoder().decode(decrypted)
  }

  /**
   * 检查是否支持加密
   */
  private supportsEncryption(): boolean {
    return (
      typeof crypto !== 'undefined' &&
      typeof crypto.subtle !== 'undefined' &&
      typeof crypto.subtle.encrypt !== 'undefined'
    )
  }
}
