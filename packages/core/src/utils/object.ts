/**
 * 对象工具函数
 *
 * @module @ldesign/auth-core/utils
 * @author LDesign Team
 */

/**
 * 检查值是否为普通对象
 *
 * @param value - 要检查的值
 * @returns 是否为普通对象
 *
 * @example
 * ```ts
 * isObject({}) // true
 * isObject([]) // false
 * isObject(null) // false
 * isObject(new Date()) // false
 * ```
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    Object.prototype.toString.call(value) === '[object Object]'
  )
}

/**
 * 检查值是否为空
 *
 * @param value - 要检查的值
 * @returns 是否为空
 *
 * @example
 * ```ts
 * isEmpty(null) // true
 * isEmpty(undefined) // true
 * isEmpty('') // true
 * isEmpty([]) // true
 * isEmpty({}) // true
 * isEmpty({ a: 1 }) // false
 * ```
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.length === 0
  if (Array.isArray(value)) return value.length === 0
  if (isObject(value)) return Object.keys(value).length === 0
  return false
}

/**
 * 深拷贝对象
 *
 * @param value - 要拷贝的值
 * @returns 深拷贝后的值
 *
 * @example
 * ```ts
 * const original = { a: 1, b: { c: 2 } }
 * const cloned = deepClone(original)
 * cloned.b.c = 3
 * console.log(original.b.c) // 2 (原对象未被修改)
 * ```
 */
export function deepClone<T>(value: T): T {
  // 处理基础类型和 null
  if (value === null || typeof value !== 'object') {
    return value
  }

  // 处理 Date
  if (value instanceof Date) {
    return new Date(value.getTime()) as T
  }

  // 处理 RegExp
  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags) as T
  }

  // 处理 Map
  if (value instanceof Map) {
    const clonedMap = new Map()
    value.forEach((v, k) => {
      clonedMap.set(deepClone(k), deepClone(v))
    })
    return clonedMap as T
  }

  // 处理 Set
  if (value instanceof Set) {
    const clonedSet = new Set()
    value.forEach((v) => {
      clonedSet.add(deepClone(v))
    })
    return clonedSet as T
  }

  // 处理数组
  if (Array.isArray(value)) {
    return value.map(item => deepClone(item)) as T
  }

  // 处理普通对象
  const cloned: Record<string, unknown> = {}
  for (const key of Object.keys(value as object)) {
    cloned[key] = deepClone((value as Record<string, unknown>)[key])
  }
  return cloned as T
}

/**
 * 深合并对象
 *
 * @param target - 目标对象
 * @param sources - 源对象列表
 * @returns 合并后的对象
 *
 * @example
 * ```ts
 * const result = deepMerge(
 *   { a: 1, b: { c: 2 } },
 *   { b: { d: 3 }, e: 4 }
 * )
 * // { a: 1, b: { c: 2, d: 3 }, e: 4 }
 * ```
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  ...sources: Array<Partial<T>>
): T {
  const result = deepClone(target)

  for (const source of sources) {
    if (!isObject(source)) continue

    for (const key of Object.keys(source)) {
      const sourceValue = source[key]
      const targetValue = result[key as keyof T]

      if (isObject(sourceValue) && isObject(targetValue)) {
        (result as Record<string, unknown>)[key] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>,
        )
      } else if (sourceValue !== undefined) {
        (result as Record<string, unknown>)[key] = deepClone(sourceValue)
      }
    }
  }

  return result
}

/**
 * 从对象中选取指定属性
 *
 * @param obj - 源对象
 * @param keys - 要选取的属性名
 * @returns 只包含指定属性的新对象
 *
 * @example
 * ```ts
 * const user = { id: 1, name: 'John', password: 'secret' }
 * const safeUser = pick(user, ['id', 'name'])
 * // { id: 1, name: 'John' }
 * ```
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>

  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key]
    }
  }

  return result
}

/**
 * 从对象中排除指定属性
 *
 * @param obj - 源对象
 * @param keys - 要排除的属性名
 * @returns 不包含指定属性的新对象
 *
 * @example
 * ```ts
 * const user = { id: 1, name: 'John', password: 'secret' }
 * const safeUser = omit(user, ['password'])
 * // { id: 1, name: 'John' }
 * ```
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  const result = { ...obj }

  for (const key of keys) {
    delete result[key]
  }

  return result as Omit<T, K>
}

/**
 * 获取对象嵌套属性值
 *
 * @param obj - 源对象
 * @param path - 属性路径（支持点号和数组下标）
 * @param defaultValue - 默认值
 * @returns 属性值
 *
 * @example
 * ```ts
 * const obj = { a: { b: { c: 1 } }, arr: [1, 2, 3] }
 * get(obj, 'a.b.c') // 1
 * get(obj, 'a.b.d', 'default') // 'default'
 * get(obj, 'arr[1]') // 2
 * get(obj, 'arr.1') // 2
 * ```
 */
export function get<T = unknown>(
  obj: Record<string, unknown>,
  path: string,
  defaultValue?: T,
): T | undefined {
  const keys = path
    .replace(/\[(\d+)]/g, '.$1')
    .split('.')
    .filter(Boolean)

  let result: unknown = obj

  for (const key of keys) {
    if (result === null || result === undefined) {
      return defaultValue
    }
    result = (result as Record<string, unknown>)[key]
  }

  return (result === undefined ? defaultValue : result) as T
}

/**
 * 设置对象嵌套属性值
 *
 * @param obj - 目标对象
 * @param path - 属性路径
 * @param value - 要设置的值
 * @returns 修改后的对象
 *
 * @example
 * ```ts
 * const obj = { a: { b: 1 } }
 * set(obj, 'a.c.d', 2)
 * // { a: { b: 1, c: { d: 2 } } }
 * ```
 */
export function set<T extends Record<string, unknown>>(
  obj: T,
  path: string,
  value: unknown,
): T {
  const keys = path
    .replace(/\[(\d+)]/g, '.$1')
    .split('.')
    .filter(Boolean)

  let current: Record<string, unknown> = obj

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    const nextKey = keys[i + 1]
    const isNextKeyNumeric = /^\d+$/.test(nextKey)

    if (!(key in current) || current[key] === null || current[key] === undefined) {
      current[key] = isNextKeyNumeric ? [] : {}
    }

    current = current[key] as Record<string, unknown>
  }

  current[keys[keys.length - 1]] = value

  return obj
}

/**
 * 比较两个值是否深度相等
 *
 * @param a - 第一个值
 * @param b - 第二个值
 * @returns 是否相等
 *
 * @example
 * ```ts
 * isEqual({ a: 1 }, { a: 1 }) // true
 * isEqual([1, 2], [1, 2]) // true
 * isEqual({ a: { b: 1 } }, { a: { b: 2 } }) // false
 * ```
 */
export function isEqual(a: unknown, b: unknown): boolean {
  // 严格相等
  if (a === b) return true

  // 类型不同
  if (typeof a !== typeof b) return false

  // null 检查
  if (a === null || b === null) return a === b

  // 日期比较
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime()
  }

  // 正则比较
  if (a instanceof RegExp && b instanceof RegExp) {
    return a.source === b.source && a.flags === b.flags
  }

  // 数组比较
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((item, index) => isEqual(item, b[index]))
  }

  // 对象比较
  if (isObject(a) && isObject(b)) {
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)

    if (keysA.length !== keysB.length) return false

    return keysA.every(key => isEqual(a[key], b[key]))
  }

  return false
}

/**
 * 将对象扁平化为一维对象
 *
 * @param obj - 源对象
 * @param prefix - 键名前缀
 * @param delimiter - 分隔符
 * @returns 扁平化后的对象
 *
 * @example
 * ```ts
 * flatten({ a: { b: 1, c: { d: 2 } } })
 * // { 'a.b': 1, 'a.c.d': 2 }
 * ```
 */
export function flatten(
  obj: Record<string, unknown>,
  prefix = '',
  delimiter = '.',
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const key of Object.keys(obj)) {
    const newKey = prefix ? `${prefix}${delimiter}${key}` : key
    const value = obj[key]

    if (isObject(value)) {
      Object.assign(result, flatten(value, newKey, delimiter))
    } else {
      result[newKey] = value
    }
  }

  return result
}

/**
 * 将扁平化对象还原为嵌套对象
 *
 * @param obj - 扁平化对象
 * @param delimiter - 分隔符
 * @returns 嵌套对象
 *
 * @example
 * ```ts
 * unflatten({ 'a.b': 1, 'a.c.d': 2 })
 * // { a: { b: 1, c: { d: 2 } } }
 * ```
 */
export function unflatten(
  obj: Record<string, unknown>,
  delimiter = '.',
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const key of Object.keys(obj)) {
    set(result, key.replace(new RegExp(`\\${delimiter}`, 'g'), '.'), obj[key])
  }

  return result
}
