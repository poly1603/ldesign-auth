/**
 * 异步工具函数
 *
 * @module @ldesign/auth-core/utils
 * @author LDesign Team
 */

/**
 * 重试选项
 */
export interface RetryOptions {
  /** 最大重试次数 */
  maxRetries?: number
  /** 重试延迟（毫秒） */
  delay?: number
  /** 延迟倍数（指数退避） */
  backoffMultiplier?: number
  /** 最大延迟时间（毫秒） */
  maxDelay?: number
  /** 是否应该重试的判断函数 */
  shouldRetry?: (error: Error, attempt: number) => boolean
  /** 重试前的回调 */
  onRetry?: (error: Error, attempt: number) => void
}

/**
 * 防抖函数
 *
 * 在指定延迟后执行函数，如果在延迟期间再次调用则重新计时
 *
 * @param fn - 要执行的函数
 * @param delay - 延迟时间（毫秒）
 * @returns 防抖后的函数
 *
 * @example
 * ```ts
 * const debouncedSearch = debounce((query: string) => {
 *   console.log('Searching:', query)
 * }, 300)
 *
 * debouncedSearch('hello') // 不立即执行
 * debouncedSearch('hello world') // 重新计时
 * // 300ms 后执行一次，参数为 'hello world'
 * ```
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
): {
  (...args: Parameters<T>): void
  cancel: () => void
  flush: () => void
} {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let lastArgs: Parameters<T> | null = null

  const debounced = (...args: Parameters<T>): void => {
    lastArgs = args

    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
      lastArgs = null
    }, delay)
  }

  debounced.cancel = (): void => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
      lastArgs = null
    }
  }

  debounced.flush = (): void => {
    if (timeoutId !== null && lastArgs !== null) {
      clearTimeout(timeoutId)
      fn(...lastArgs)
      timeoutId = null
      lastArgs = null
    }
  }

  return debounced
}

/**
 * 节流函数
 *
 * 在指定时间内只执行一次函数
 *
 * @param fn - 要执行的函数
 * @param limit - 时间限制（毫秒）
 * @param options - 配置选项
 * @returns 节流后的函数
 *
 * @example
 * ```ts
 * const throttledScroll = throttle(() => {
 *   console.log('Scrolling...')
 * }, 100)
 *
 * window.addEventListener('scroll', throttledScroll)
 * ```
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number,
  options: { leading?: boolean; trailing?: boolean } = {},
): {
  (...args: Parameters<T>): void
  cancel: () => void
} {
  const { leading = true, trailing = true } = options

  let lastCallTime: number | null = null
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let lastArgs: Parameters<T> | null = null

  const throttled = (...args: Parameters<T>): void => {
    const now = Date.now()
    lastArgs = args

    // 首次调用或已过限制时间
    if (lastCallTime === null && !leading) {
      lastCallTime = now
    }

    const remaining = limit - (now - (lastCallTime ?? 0))

    if (remaining <= 0 || remaining > limit) {
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      lastCallTime = now
      fn(...args)
    } else if (timeoutId === null && trailing) {
      timeoutId = setTimeout(() => {
        lastCallTime = leading ? Date.now() : null
        timeoutId = null
        if (lastArgs !== null) {
          fn(...lastArgs)
        }
      }, remaining)
    }
  }

  throttled.cancel = (): void => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    lastCallTime = null
    lastArgs = null
  }

  return throttled
}

/**
 * 延迟执行
 *
 * @param ms - 延迟时间（毫秒）
 * @returns Promise
 *
 * @example
 * ```ts
 * await sleep(1000) // 等待 1 秒
 * console.log('1 second passed')
 * ```
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 带重试的异步函数执行
 *
 * @param fn - 要执行的异步函数
 * @param options - 重试选项
 * @returns Promise
 *
 * @example
 * ```ts
 * const result = await retry(
 *   async () => {
 *     const response = await fetch('/api/data')
 *     if (!response.ok) throw new Error('Failed')
 *     return response.json()
 *   },
 *   {
 *     maxRetries: 3,
 *     delay: 1000,
 *     backoffMultiplier: 2,
 *     onRetry: (error, attempt) => {
 *       console.log(`Retry ${attempt}: ${error.message}`)
 *     }
 *   }
 * )
 * ```
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = 3,
    delay = 1000,
    backoffMultiplier = 1,
    maxDelay = 30000,
    shouldRetry = () => true,
    onRetry,
  } = options

  let lastError: Error = new Error('Retry failed')
  let currentDelay = delay

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // 已达到最大重试次数
      if (attempt >= maxRetries) {
        break
      }

      // 检查是否应该重试
      if (!shouldRetry(lastError, attempt + 1)) {
        break
      }

      // 触发重试回调
      onRetry?.(lastError, attempt + 1)

      // 等待后重试
      await sleep(currentDelay)

      // 计算下次延迟（指数退避）
      currentDelay = Math.min(currentDelay * backoffMultiplier, maxDelay)
    }
  }

  throw lastError
}

/**
 * 为 Promise 添加超时限制
 *
 * @param promise - 原始 Promise
 * @param ms - 超时时间（毫秒）
 * @param errorMessage - 超时错误消息
 * @returns Promise
 *
 * @example
 * ```ts
 * try {
 *   const result = await timeout(
 *     fetch('/api/slow-endpoint'),
 *     5000,
 *     'Request timed out'
 *   )
 * } catch (error) {
 *   console.error(error.message) // 'Request timed out'
 * }
 * ```
 */
export function timeout<T>(
  promise: Promise<T>,
  ms: number,
  errorMessage = 'Operation timed out',
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(errorMessage))
    }, ms)

    promise
      .then((result) => {
        clearTimeout(timeoutId)
        resolve(result)
      })
      .catch((error) => {
        clearTimeout(timeoutId)
        reject(error)
      })
  })
}

/**
 * 创建可取消的 Promise
 *
 * @param executor - Promise 执行器
 * @returns 可取消的 Promise 和取消函数
 *
 * @example
 * ```ts
 * const { promise, cancel } = cancellable<string>((resolve, reject, onCancel) => {
 *   const timeoutId = setTimeout(() => resolve('done'), 5000)
 *   onCancel(() => clearTimeout(timeoutId))
 * })
 *
 * // 取消操作
 * cancel('User cancelled')
 * ```
 */
export function cancellable<T>(
  executor: (
    resolve: (value: T) => void,
    reject: (reason: any) => void,
    onCancel: (callback: () => void) => void,
  ) => void,
): {
  promise: Promise<T>
  cancel: (reason?: string) => void
} {
  let cancelCallback: (() => void) | null = null
  let rejectFn: ((reason: any) => void) | null = null

  const promise = new Promise<T>((resolve, reject) => {
    rejectFn = reject
    executor(
      resolve,
      reject,
      (callback) => {
        cancelCallback = callback
      },
    )
  })

  const cancel = (reason = 'Cancelled'): void => {
    cancelCallback?.()
    rejectFn?.(new Error(reason))
  }

  return { promise, cancel }
}

/**
 * 并发控制器
 *
 * 限制同时执行的 Promise 数量
 *
 * @param tasks - 任务数组（返回 Promise 的函数）
 * @param concurrency - 最大并发数
 * @returns Promise 数组的结果
 *
 * @example
 * ```ts
 * const urls = ['/api/1', '/api/2', '/api/3', '/api/4', '/api/5']
 * const tasks = urls.map(url => () => fetch(url))
 *
 * const results = await parallel(tasks, 2) // 最多同时 2 个请求
 * ```
 */
export async function parallel<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number,
): Promise<T[]> {
  const results: T[] = []
  const executing: Promise<void>[] = []

  for (const [index, task] of tasks.entries()) {
    const p = Promise.resolve().then(async () => {
      results[index] = await task()
    })

    executing.push(p)

    if (executing.length >= concurrency) {
      await Promise.race(executing)
      // 移除已完成的任务
      const completed = executing.findIndex(
        e => e === (p as unknown as Promise<void>)
      )
      if (completed > -1) {
        executing.splice(completed, 1)
      }
    }
  }

  await Promise.all(executing)
  return results
}
