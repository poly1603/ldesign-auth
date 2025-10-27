/**
 * 内联工具函数 - 减少外部依赖
 */

/**
 * 简单的防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  let lastArgs: Parameters<T> | null = null

  return function debounced(...args: Parameters<T>) {
    lastArgs = args

    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(() => {
      if (lastArgs) {
        func(...lastArgs)
        lastArgs = null
      }
      timeout = null
    }, wait)
  }
}

/**
 * 简单的节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false
  let lastArgs: Parameters<T> | null = null

  return function throttled(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true

      setTimeout(() => {
        inThrottle = false
        if (lastArgs) {
          func(...lastArgs)
          lastArgs = null
        }
      }, limit)
    } else {
      lastArgs = args
    }
  }
}

/**
 * 深拷贝对象（简单版本）
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as any
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as any
  }

  if (obj instanceof Object) {
    const clonedObj: any = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key])
      }
    }
    return clonedObj
  }

  return obj
}

/**
 * 合并对象（浅合并）
 */
export function merge<T extends object>(...objects: Partial<T>[]): T {
  return Object.assign({}, ...objects) as T
}

/**
 * 生成随机字符串
 */
export function randomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(length)
    crypto.getRandomValues(array)
    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length]
    }
  } else {
    // 降级方案
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
  }

  return result
}

/**
 * 延迟函数
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 重试函数（简化版）
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number
    delay?: number
    backoff?: number
  } = {}
): Promise<T> {
  const { maxAttempts = 3, delay: delayMs = 1000, backoff = 2 } = options

  let lastError: Error | undefined

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      if (attempt < maxAttempts) {
        const waitTime = delayMs * Math.pow(backoff, attempt - 1)
        await delay(waitTime)
      }
    }
  }

  throw lastError
}

/**
 * 判断是否是浏览器环境
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

/**
 * 判断是否支持某个 API
 */
export function isApiSupported(api: string): boolean {
  if (!isBrowser()) return false

  const parts = api.split('.')
  let obj: any = window

  for (const part of parts) {
    if (!(part in obj)) {
      return false
    }
    obj = obj[part]
  }

  return true
}

/**
 * 安全的 JSON 解析
 */
export function safeJsonParse<T>(str: string, defaultValue?: T): T | undefined {
  try {
    return JSON.parse(str)
  } catch {
    return defaultValue
  }
}

/**
 * 格式化时间差
 */
export function formatTimeDiff(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days}天${hours % 24}小时`
  }
  if (hours > 0) {
    return `${hours}小时${minutes % 60}分钟`
  }
  if (minutes > 0) {
    return `${minutes}分钟${seconds % 60}秒`
  }
  return `${seconds}秒`
}

/**
 * 创建一个只执行一次的函数
 */
export function once<T extends (...args: any[]) => any>(
  fn: T
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  let called = false
  let result: ReturnType<T> | undefined

  return function onceWrapper(...args: Parameters<T>) {
    if (!called) {
      called = true
      result = fn(...args)
    }
    return result
  }
}
