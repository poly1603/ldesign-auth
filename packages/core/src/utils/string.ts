/**
 * 字符串工具函数
 *
 * @module @ldesign/auth-core/utils
 * @author LDesign Team
 */

/**
 * 生成简单唯一 ID
 *
 * @param prefix - ID 前缀
 * @returns 唯一 ID
 *
 * @example
 * ```ts
 * generateId() // 'id_1234567890_abc123'
 * generateId('user') // 'user_1234567890_abc123'
 * ```
 */
export function generateId(prefix = 'id'): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `${prefix}_${timestamp}_${random}`
}

/**
 * 生成符合 RFC4122 v4 标准的 UUID
 *
 * @returns UUID 字符串
 *
 * @example
 * ```ts
 * generateUUID() // 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
 * ```
 */
export function generateUUID(): string {
  // 使用 crypto.randomUUID 如果可用
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  // 回退方案：手动生成
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * 计算字符串哈希码
 *
 * 使用 djb2 算法生成简单的数字哈希
 *
 * @param str - 输入字符串
 * @returns 哈希码
 *
 * @example
 * ```ts
 * hashCode('hello') // 99162322
 * hashCode('hello world') // 1794106052
 * ```
 */
export function hashCode(str: string): number {
  let hash = 5381

  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i)
    hash = hash & hash // Convert to 32bit integer
  }

  return Math.abs(hash)
}

/**
 * Base64 编码
 *
 * @param str - 要编码的字符串
 * @returns Base64 编码后的字符串
 *
 * @example
 * ```ts
 * base64Encode('Hello, World!') // 'SGVsbG8sIFdvcmxkIQ=='
 * ```
 */
export function base64Encode(str: string): string {
  if (typeof btoa !== 'undefined') {
    // 浏览器环境
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => {
      return String.fromCharCode(parseInt(p1, 16))
    }))
  }
  // Node.js 环境
  return Buffer.from(str, 'utf8').toString('base64')
}

/**
 * Base64 解码
 *
 * @param str - Base64 编码的字符串
 * @returns 解码后的字符串
 *
 * @example
 * ```ts
 * base64Decode('SGVsbG8sIFdvcmxkIQ==') // 'Hello, World!'
 * ```
 */
export function base64Decode(str: string): string {
  if (typeof atob !== 'undefined') {
    // 浏览器环境
    return decodeURIComponent(
      Array.prototype.map
        .call(atob(str), (c: string) => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        })
        .join(''),
    )
  }
  // Node.js 环境
  return Buffer.from(str, 'base64').toString('utf8')
}

/**
 * Base64 URL 安全编码
 *
 * @param str - 要编码的字符串
 * @returns URL 安全的 Base64 编码字符串
 *
 * @example
 * ```ts
 * base64UrlEncode('Hello+World/Test=') // 'SGVsbG8rV29ybGQvVGVzdD0'
 * ```
 */
export function base64UrlEncode(str: string): string {
  return base64Encode(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Base64 URL 安全解码
 *
 * @param str - URL 安全的 Base64 编码字符串
 * @returns 解码后的字符串
 *
 * @example
 * ```ts
 * base64UrlDecode('SGVsbG8rV29ybGQvVGVzdD0') // 'Hello+World/Test='
 * ```
 */
export function base64UrlDecode(str: string): string {
  // 还原标准 Base64
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')

  // 补齐 padding
  const padding = base64.length % 4
  if (padding) {
    base64 += '='.repeat(4 - padding)
  }

  return base64Decode(base64)
}

/**
 * 安全的 JSON 解析
 *
 * @param str - JSON 字符串
 * @param defaultValue - 解析失败时的默认值
 * @returns 解析后的对象或默认值
 *
 * @example
 * ```ts
 * safeJSONParse('{"a": 1}') // { a: 1 }
 * safeJSONParse('invalid', null) // null
 * safeJSONParse('invalid', { default: true }) // { default: true }
 * ```
 */
export function safeJSONParse<T = unknown>(
  str: string,
  defaultValue?: T,
): T | undefined {
  try {
    return JSON.parse(str) as T
  } catch {
    return defaultValue
  }
}

/**
 * 安全的 JSON 序列化
 *
 * @param value - 要序列化的值
 * @param replacer - 替换函数
 * @param space - 缩进空格数
 * @returns JSON 字符串或空字符串
 *
 * @example
 * ```ts
 * safeJSONStringify({ a: 1 }) // '{"a":1}'
 * safeJSONStringify(undefined) // ''
 * safeJSONStringify(circularObject) // ''
 * ```
 */
export function safeJSONStringify(
  value: unknown,
  replacer?: (key: string, value: unknown) => unknown,
  space?: number,
): string {
  try {
    return JSON.stringify(value, replacer, space)
  } catch {
    return ''
  }
}

/**
 * 掩码敏感字符串
 *
 * @param str - 原始字符串
 * @param visibleStart - 开头可见字符数
 * @param visibleEnd - 结尾可见字符数
 * @param maskChar - 掩码字符
 * @returns 掩码后的字符串
 *
 * @example
 * ```ts
 * maskString('13812345678', 3, 4) // '138****5678'
 * maskString('john@example.com', 2, 8) // 'jo****ple.com'
 * maskString('secret', 0, 0) // '******'
 * ```
 */
export function maskString(
  str: string,
  visibleStart = 3,
  visibleEnd = 4,
  maskChar = '*',
): string {
  if (str.length <= visibleStart + visibleEnd) {
    return maskChar.repeat(str.length)
  }

  const start = str.slice(0, visibleStart)
  const end = str.slice(-visibleEnd)
  const maskLength = str.length - visibleStart - visibleEnd

  return `${start}${maskChar.repeat(Math.max(4, maskLength))}${end}`
}

/**
 * 截断字符串
 *
 * @param str - 原始字符串
 * @param maxLength - 最大长度
 * @param suffix - 截断后缀
 * @returns 截断后的字符串
 *
 * @example
 * ```ts
 * truncate('Hello World', 5) // 'Hello...'
 * truncate('Hello', 10) // 'Hello'
 * truncate('Hello World', 8, '…') // 'Hello Wo…'
 * ```
 */
export function truncate(
  str: string,
  maxLength: number,
  suffix = '...',
): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + suffix
}

/**
 * 驼峰转下划线
 *
 * @param str - 驼峰格式字符串
 * @returns 下划线格式字符串
 *
 * @example
 * ```ts
 * camelToSnake('helloWorld') // 'hello_world'
 * camelToSnake('HelloWorld') // 'hello_world'
 * camelToSnake('helloWorldTest') // 'hello_world_test'
 * ```
 */
export function camelToSnake(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
}

/**
 * 下划线转驼峰
 *
 * @param str - 下划线格式字符串
 * @param upperFirst - 首字母是否大写
 * @returns 驼峰格式字符串
 *
 * @example
 * ```ts
 * snakeToCamel('hello_world') // 'helloWorld'
 * snakeToCamel('hello_world', true) // 'HelloWorld'
 * ```
 */
export function snakeToCamel(str: string, upperFirst = false): string {
  const result = str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
  return upperFirst ? result.charAt(0).toUpperCase() + result.slice(1) : result
}

/**
 * 转换为 kebab-case
 *
 * @param str - 输入字符串
 * @returns kebab-case 格式字符串
 *
 * @example
 * ```ts
 * toKebabCase('helloWorld') // 'hello-world'
 * toKebabCase('HelloWorld') // 'hello-world'
 * toKebabCase('hello_world') // 'hello-world'
 * ```
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '-$1')
    .replace(/_/g, '-')
    .toLowerCase()
    .replace(/^-/, '')
}

/**
 * 检查字符串是否为有效的 Email
 *
 * @param email - 要检查的字符串
 * @returns 是否为有效 Email
 *
 * @example
 * ```ts
 * isValidEmail('test@example.com') // true
 * isValidEmail('invalid-email') // false
 * ```
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * 检查字符串是否为有效的 URL
 *
 * @param url - 要检查的字符串
 * @returns 是否为有效 URL
 *
 * @example
 * ```ts
 * isValidUrl('https://example.com') // true
 * isValidUrl('not-a-url') // false
 * ```
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}
