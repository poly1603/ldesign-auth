/**
 * 认证管理器注册表
 *
 * 管理多个认证管理器实例，解决单例模式的问题
 */

import type { AuthManager } from './AuthManager'

/**
 * 认证管理器注册表
 *
 * @example
 * ```typescript
 * import { AuthRegistry, createAuthManager } from '@ldesign/auth'
 *
 * // 注册默认实例
 * const auth = createAuthManager()
 * AuthRegistry.register('default', auth)
 *
 * // 注册多个实例
 * const adminAuth = createAuthManager({ ... })
 * AuthRegistry.register('admin', adminAuth)
 *
 * // 获取实例
 * const auth = AuthRegistry.get('default')
 *
 * // 移除实例
 * AuthRegistry.remove('default')
 *
 * // 清空所有实例（测试时有用）
 * AuthRegistry.clear()
 * ```
 */
export class AuthRegistry {
  private static instances = new Map<string, AuthManager>()
  private static defaultName = 'default'

  /**
   * 注册认证管理器实例
   *
   * @param name - 实例名称
   * @param manager - 认证管理器实例
   *
   * @example
   * ```typescript
   * const auth = createAuthManager()
   * AuthRegistry.register('default', auth)
   * ```
   */
  static register(name: string, manager: AuthManager): void {
    if (this.instances.has(name)) {
      console.warn(`[AuthRegistry] Instance "${name}" already exists, replacing...`)
      // 销毁旧实例
      const old = this.instances.get(name)
      old?.destroy()
    }

    this.instances.set(name, manager)
  }

  /**
   * 获取认证管理器实例
   *
   * @param name - 实例名称，默认 'default'
   * @returns 认证管理器实例，如果不存在返回 undefined
   *
   * @example
   * ```typescript
   * const auth = AuthRegistry.get('default')
   * if (auth) {
   *   await auth.login({ ... })
   * }
   * ```
   */
  static get(name = this.defaultName): AuthManager | undefined {
    return this.instances.get(name)
  }

  /**
   * 获取或抛出错误
   *
   * @param name - 实例名称
   * @returns 认证管理器实例
   * @throws 如果实例不存在
   *
   * @example
   * ```typescript
   * const auth = AuthRegistry.getOrThrow('default')
   * await auth.login({ ... })
   * ```
   */
  static getOrThrow(name = this.defaultName): AuthManager {
    const instance = this.instances.get(name)
    if (!instance) {
      throw new Error(`[AuthRegistry] Instance "${name}" not found`)
    }
    return instance
  }

  /**
   * 检查实例是否存在
   *
   * @param name - 实例名称
   * @returns 是否存在
   */
  static has(name: string): boolean {
    return this.instances.has(name)
  }

  /**
   * 移除认证管理器实例
   *
   * @param name - 实例名称
   *
   * @example
   * ```typescript
   * AuthRegistry.remove('default')
   * ```
   */
  static remove(name: string): void {
    const instance = this.instances.get(name)
    if (instance) {
      instance.destroy()
      this.instances.delete(name)
    }
  }

  /**
   * 清空所有实例
   *
   * 主要用于测试环境，清理所有实例
   *
   * @example
   * ```typescript
   * // 测试后清理
   * afterEach(() => {
   *   AuthRegistry.clear()
   * })
   * ```
   */
  static clear(): void {
    this.instances.forEach((instance) => {
      instance.destroy()
    })
    this.instances.clear()
  }

  /**
   * 获取所有已注册的实例名称
   *
   * @returns 实例名称数组
   */
  static getNames(): string[] {
    return Array.from(this.instances.keys())
  }

  /**
   * 获取实例数量
   *
   * @returns 实例数量
   */
  static size(): number {
    return this.instances.size
  }

  /**
   * 设置默认实例名称
   *
   * @param name - 默认实例名称
   */
  static setDefaultName(name: string): void {
    this.defaultName = name
  }

  /**
   * 获取默认实例名称
   *
   * @returns 默认实例名称
   */
  static getDefaultName(): string {
    return this.defaultName
  }
}

