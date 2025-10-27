/**
 * 防抖和节流工具函数
 */

/**
 * 防抖函数
 *
 * 在事件被触发后延迟执行，如果在延迟期间再次触发则重新计时
 *
 * @param fn - 要防抖的函数
 * @param delay - 延迟时间（毫秒）
 * @param immediate - 是否立即执行（第一次触发时）
 * @returns 防抖后的函数
 *
 * @example
 * ```typescript
 * const handler = debounce(() => {
 *   console.log('Debounced!')
 * }, 1000)
 *
 * // 多次调用，只执行最后一次
 * handler()
 * handler()
 * handler() // 只有这次会执行
 * ```
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
  immediate = false,
): (...args: Parameters<T>) => void {
  let timer: NodeJS.Timeout | null = null
  let isFirstCall = true

  return function (this: any, ...args: Parameters<T>) {
    const context = this

    // 立即执行模式
    if (immediate && isFirstCall) {
      fn.apply(context, args)
      isFirstCall = false
    }

    // 清除之前的定时器
    if (timer) {
      clearTimeout(timer)
    }

    // 设置新的定时器
    timer = setTimeout(() => {
      if (!immediate || !isFirstCall) {
        fn.apply(context, args)
      }
      timer = null
      isFirstCall = true
    }, delay)
  }
}

/**
 * 节流函数
 *
 * 限制函数在指定时间内只能执行一次
 *
 * @param fn - 要节流的函数
 * @param delay - 时间间隔（毫秒）
 * @param options - 配置选项
 * @returns 节流后的函数
 *
 * @example
 * ```typescript
 * const handler = throttle(() => {
 *   console.log('Throttled!')
 * }, 1000)
 *
 * // 多次调用，每秒最多执行一次
 * handler()
 * handler()
 * handler()
 * ```
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
  options: {
    leading?: boolean
    trailing?: boolean
  } = {},
): (...args: Parameters<T>) => void {
  const { leading = true, trailing = true } = options

  let timer: NodeJS.Timeout | null = null
  let lastArgs: Parameters<T> | null = null
  let lastContext: any = null
  let lastCallTime = 0

  const invokeFunction = () => {
    if (lastArgs) {
      fn.apply(lastContext, lastArgs)
      lastArgs = null
      lastContext = null
      lastCallTime = Date.now()
    }
  }

  return function (this: any, ...args: Parameters<T>) {
    const context = this
    const now = Date.now()
    const timeSinceLastCall = now - lastCallTime

    lastArgs = args
    lastContext = context

    // 第一次调用且允许 leading
    if (lastCallTime === 0 && leading) {
      invokeFunction()
      return
    }

    // 清除之前的定时器
    if (timer) {
      clearTimeout(timer)
      timer = null
    }

    // 如果距离上次调用已经超过延迟时间
    if (timeSinceLastCall >= delay) {
      invokeFunction()
    }
    // 否则设置定时器（trailing）
    else if (trailing) {
      timer = setTimeout(() => {
        invokeFunction()
        timer = null
      }, delay - timeSinceLastCall)
    }
  }
}

/**
 * 可取消的防抖函数
 *
 * @param fn - 要防抖的函数
 * @param delay - 延迟时间（毫秒）
 * @returns 包含防抖函数和取消函数的对象
 *
 * @example
 * ```typescript
 * const { debounced, cancel } = createCancellableDebounce(() => {
 *   console.log('Debounced!')
 * }, 1000)
 *
 * debounced()
 * cancel() // 取消执行
 * ```
 */
export function createCancellableDebounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
): {
  debounced: (...args: Parameters<T>) => void
  cancel: () => void
  flush: () => void
} {
  let timer: NodeJS.Timeout | null = null
  let lastArgs: Parameters<T> | null = null
  let lastContext: any = null

  const cancel = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
      lastArgs = null
      lastContext = null
    }
  }

  const flush = () => {
    if (timer && lastArgs) {
      cancel()
      fn.apply(lastContext, lastArgs)
    }
  }

  const debounced = function (this: any, ...args: Parameters<T>) {
    lastArgs = args
    lastContext = this

    if (timer) {
      clearTimeout(timer)
    }

    timer = setTimeout(() => {
      fn.apply(lastContext, lastArgs!)
      timer = null
      lastArgs = null
      lastContext = null
    }, delay)
  }

  return {
    debounced,
    cancel,
    flush,
  }
}

