/**
 * 工具函数模块导出
 *
 * @module @ldesign/auth-core/utils
 * @author LDesign Team
 */

export {
  debounce,
  throttle,
  sleep,
  retry,
  timeout,
  type RetryOptions,
} from './async'

export {
  deepClone,
  deepMerge,
  pick,
  omit,
  isObject,
  isEmpty,
  get,
  set,
} from './object'

export {
  generateId,
  generateUUID,
  hashCode,
  base64Encode,
  base64Decode,
  safeJSONParse,
  safeJSONStringify,
} from './string'

export {
  isClient,
  isServer,
  isBrowser,
  getGlobal,
  noop,
  identity,
} from './env'
