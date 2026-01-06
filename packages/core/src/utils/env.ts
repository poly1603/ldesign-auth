/**
 * 环境工具函数
 *
 * @module @ldesign/auth-core/utils
 * @author LDesign Team
 */

/**
 * 检查是否在客户端环境
 *
 * @returns 是否在客户端
 *
 * @example
 * ```ts
 * if (isClient()) {
 *   // 只在浏览器中执行
 *   window.addEventListener('resize', handler)
 * }
 * ```
 */
export function isClient(): boolean {
  return typeof window !== 'undefined'
}

/**
 * 检查是否在服务端环境
 *
 * @returns 是否在服务端
 *
 * @example
 * ```ts
 * if (isServer()) {
 *   // 只在服务端执行
 *   console.log('Running on server')
 * }
 * ```
 */
export function isServer(): boolean {
  return typeof window === 'undefined'
}

/**
 * 检查是否在浏览器环境（有完整的 DOM API）
 *
 * @returns 是否在浏览器环境
 *
 * @example
 * ```ts
 * if (isBrowser()) {
 *   document.getElementById('app')
 * }
 * ```
 */
export function isBrowser(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined' &&
    typeof navigator !== 'undefined'
  )
}

/**
 * 获取全局对象（兼容多环境）
 *
 * @returns 全局对象
 *
 * @example
 * ```ts
 * const global = getGlobal()
 * global.myGlobalVariable = 'value'
 * ```
 */
export function getGlobal(): typeof globalThis {
  if (typeof globalThis !== 'undefined') return globalThis
  if (typeof self !== 'undefined') return self
  if (typeof window !== 'undefined') return window
  if (typeof global !== 'undefined') return global
  throw new Error('Unable to locate global object')
}

/**
 * 空函数（用于默认回调）
 *
 * @example
 * ```ts
 * const callback = options.onSuccess ?? noop
 * callback()
 * ```
 */
export function noop(): void {
  // 空函数
}

/**
 * 恒等函数（返回输入值本身）
 *
 * @param value - 输入值
 * @returns 输入值本身
 *
 * @example
 * ```ts
 * const transform = options.transform ?? identity
 * const result = transform(data)
 * ```
 */
export function identity<T>(value: T): T {
  return value
}

/**
 * 检查是否为开发环境
 *
 * @returns 是否为开发环境
 *
 * @example
 * ```ts
 * if (isDevelopment()) {
 *   console.debug('Debug info:', data)
 * }
 * ```
 */
export function isDevelopment(): boolean {
  try {
    return process.env.NODE_ENV === 'development'
  } catch {
    return false
  }
}

/**
 * 检查是否为生产环境
 *
 * @returns 是否为生产环境
 *
 * @example
 * ```ts
 * if (isProduction()) {
 *   // 生产环境特定逻辑
 * }
 * ```
 */
export function isProduction(): boolean {
  try {
    return process.env.NODE_ENV === 'production'
  } catch {
    return true
  }
}

/**
 * 检查是否支持 localStorage
 *
 * @returns 是否支持 localStorage
 *
 * @example
 * ```ts
 * if (supportsLocalStorage()) {
 *   localStorage.setItem('key', 'value')
 * }
 * ```
 */
export function supportsLocalStorage(): boolean {
  try {
    const testKey = '__test__'
    localStorage.setItem(testKey, testKey)
    localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

/**
 * 检查是否支持 sessionStorage
 *
 * @returns 是否支持 sessionStorage
 *
 * @example
 * ```ts
 * if (supportsSessionStorage()) {
 *   sessionStorage.setItem('key', 'value')
 * }
 * ```
 */
export function supportsSessionStorage(): boolean {
  try {
    const testKey = '__test__'
    sessionStorage.setItem(testKey, testKey)
    sessionStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

/**
 * 检查是否支持 Cookie
 *
 * @returns 是否支持 Cookie
 *
 * @example
 * ```ts
 * if (supportsCookie()) {
 *   document.cookie = 'key=value'
 * }
 * ```
 */
export function supportsCookie(): boolean {
  if (!isBrowser()) return false

  try {
    document.cookie = '__test__=1'
    const supported = document.cookie.indexOf('__test__') !== -1
    document.cookie = '__test__=; expires=Thu, 01 Jan 1970 00:00:00 UTC'
    return supported
  } catch {
    return false
  }
}

/**
 * 检查是否支持 Web Crypto API
 *
 * @returns 是否支持 Web Crypto API
 *
 * @example
 * ```ts
 * if (supportsWebCrypto()) {
 *   crypto.subtle.digest('SHA-256', data)
 * }
 * ```
 */
export function supportsWebCrypto(): boolean {
  return (
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined'
  )
}

/**
 * 检查是否支持 WebAuthn
 *
 * @returns 是否支持 WebAuthn
 *
 * @example
 * ```ts
 * if (supportsWebAuthn()) {
 *   navigator.credentials.create(options)
 * }
 * ```
 */
export function supportsWebAuthn(): boolean {
  return (
    isBrowser() &&
    typeof window.PublicKeyCredential !== 'undefined'
  )
}

/**
 * 获取当前页面 URL
 *
 * @returns 当前 URL 或空字符串
 *
 * @example
 * ```ts
 * const currentUrl = getCurrentUrl()
 * console.log('Current page:', currentUrl)
 * ```
 */
export function getCurrentUrl(): string {
  if (!isBrowser()) return ''
  return window.location.href
}

/**
 * 获取当前域名
 *
 * @returns 当前域名或空字符串
 *
 * @example
 * ```ts
 * const domain = getCurrentDomain()
 * // 'example.com'
 * ```
 */
export function getCurrentDomain(): string {
  if (!isBrowser()) return ''
  return window.location.hostname
}

/**
 * 获取当前协议
 *
 * @returns 当前协议（http: 或 https:）
 *
 * @example
 * ```ts
 * const protocol = getCurrentProtocol()
 * // 'https:'
 * ```
 */
export function getCurrentProtocol(): string {
  if (!isBrowser()) return ''
  return window.location.protocol
}

/**
 * 检查当前是否为 HTTPS
 *
 * @returns 是否为 HTTPS 连接
 *
 * @example
 * ```ts
 * if (isHttps()) {
 *   // 安全连接，可以使用敏感 API
 * }
 * ```
 */
export function isHttps(): boolean {
  if (!isBrowser()) return false
  return window.location.protocol === 'https:'
}
