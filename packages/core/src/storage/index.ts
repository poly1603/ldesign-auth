/**
 * 存储模块导出
 *
 * @module @ldesign/auth-core/storage
 * @author LDesign Team
 */

export type { StorageAdapter, StorageOptions } from './StorageAdapter'
export {
  LocalStorageAdapter,
  SessionStorageAdapter,
  MemoryStorageAdapter,
  CookieStorageAdapter,
} from './StorageAdapter'

/**
 * 创建存储适配器的工厂函数
 * 
 * @param type - 存储类型
 * @param prefix - 键名前缀
 * @returns 存储适配器实例
 * 
 * @example
 * ```ts
 * import { createStorageAdapter } from '@ldesign/auth-core/storage'
 * 
 * const storage = createStorageAdapter('localStorage', 'myapp_')
 * storage.set('token', 'xxx')
 * const token = storage.get('token')
 * ```
 */
export function createStorageAdapter(
  type: 'localStorage' | 'sessionStorage' | 'memory' | 'cookie' = 'localStorage',
  prefix = ''
) {
  switch (type) {
    case 'localStorage':
      return new LocalStorageAdapter(prefix)
    case 'sessionStorage':
      return new SessionStorageAdapter(prefix)
    case 'memory':
      return new MemoryStorageAdapter(prefix)
    case 'cookie':
      return new CookieStorageAdapter(prefix)
    default:
      return new LocalStorageAdapter(prefix)
  }
}

// 重新导入以供使用
import {
  LocalStorageAdapter,
  SessionStorageAdapter,
  MemoryStorageAdapter,
  CookieStorageAdapter,
} from './StorageAdapter'