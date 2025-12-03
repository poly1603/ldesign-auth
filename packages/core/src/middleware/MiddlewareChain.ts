/**
 * 中间件链
 *
 * @module @ldesign/auth-core/middleware
 * @author LDesign Team
 */

import type { MiddlewareContext, MiddlewareFunction, NextFunction, MiddlewareConfig } from './types'

/**
 * 中间件包装器
 */
interface MiddlewareWrapper {
  /** 中间件函数 */
  fn: MiddlewareFunction
  /** 配置 */
  config: Required<MiddlewareConfig>
}

/**
 * 中间件链类
 * 
 * 管理和执行中间件链，类似 Koa 的洋葱模型
 * 
 * @example
 * ```ts
 * const chain = new MiddlewareChain()
 * 
 * // 添加中间件
 * chain.use(async (ctx, next) => {
 *   console.log('Before')
 *   await next()
 *   console.log('After')
 * })
 * 
 * // 执行中间件链
 * await chain.execute({ user: null })
 * ```
 */
export class MiddlewareChain {
  /** 中间件列表 */
  private middlewares: MiddlewareWrapper[] = []

  /**
   * 添加中间件
   * 
   * @param middleware - 中间件函数
   * @param config - 中间件配置
   * @returns 当前实例（支持链式调用）
   * 
   * @example
   * ```ts
   * chain
   *   .use(middleware1, { name: 'Logger', priority: 10 })
   *   .use(middleware2, { name: 'Validator', priority: 20 })
   * ```
   */
  use(middleware: MiddlewareFunction, config: MiddlewareConfig = {}): this {
    const wrapper: MiddlewareWrapper = {
      fn: middleware,
      config: {
        name: config.name ?? `middleware_${this.middlewares.length}`,
        enabled: config.enabled ?? true,
        priority: config.priority ?? 0,
      },
    }

    this.middlewares.push(wrapper)
    this.sortMiddlewares()

    return this
  }

  /**
   * 执行中间件链
   * 
   * @param context - 中间件上下文
   * @returns Promise
   * 
   * @example
   * ```ts
   * const context = {
   *   credentials: { username: 'admin', password: '123456' },
   *   metadata: {},
   * }
   * 
   * await chain.execute(context)
   * 
   * // 检查结果
   * if (context.aborted) {
   *   console.log('中间件链已中止:', context.abortReason)
   * }
   * ```
   */
  async execute(context: MiddlewareContext): Promise<void> {
    // 过滤已启用的中间件
    const enabledMiddlewares = this.middlewares.filter(m => m.config.enabled)

    if (enabledMiddlewares.length === 0) {
      return
    }

    let index = 0

    // 创建 next 函数
    const createNext = (): NextFunction => {
      return async () => {
        // 检查是否已中止
        if (context.aborted) {
          return
        }

        // 检查是否还有中间件
        if (index >= enabledMiddlewares.length) {
          return
        }

        const middleware = enabledMiddlewares[index++]

        try {
          // 执行中间件
          await middleware.fn(context, createNext())
        }
        catch (error) {
          // 捕获错误并标记为中止
          context.aborted = true
          context.abortReason = error instanceof Error ? error.message : String(error)
          throw error
        }
      }
    }

    // 开始执行
    await createNext()()
  }

  /**
   * 移除中间件
   * 
   * @param nameOrFn - 中间件名称或函数
   * @returns 是否成功移除
   */
  remove(nameOrFn: string | MiddlewareFunction): boolean {
    const initialLength = this.middlewares.length

    this.middlewares = this.middlewares.filter((wrapper) => {
      if (typeof nameOrFn === 'string') {
        return wrapper.config.name !== nameOrFn
      }
      return wrapper.fn !== nameOrFn
    })

    return this.middlewares.length < initialLength
  }

  /**
   * 清空所有中间件
   */
  clear(): void {
    this.middlewares = []
  }

  /**
   * 启用/禁用中间件
   * 
   * @param name - 中间件名称
   * @param enabled - 是否启用
   * @returns 是否成功
   */
  setEnabled(name: string, enabled: boolean): boolean {
    const middleware = this.middlewares.find(m => m.config.name === name)
    if (middleware) {
      middleware.config.enabled = enabled
      return true
    }
    return false
  }

  /**
   * 获取中间件数量
   * 
   * @returns 中间件数量
   */
  size(): number {
    return this.middlewares.length
  }

  /**
   * 获取已启用的中间件数量
   * 
   * @returns 已启用的中间件数量
   */
  enabledSize(): number {
    return this.middlewares.filter(m => m.config.enabled).length
  }

  /**
   * 获取所有中间件名称
   * 
   * @returns 中间件名称数组
   */
  getNames(): string[] {
    return this.middlewares.map(m => m.config.name)
  }

  /**
   * 按优先级排序中间件
   */
  private sortMiddlewares(): void {
    this.middlewares.sort((a, b) => b.config.priority - a.config.priority)
  }
}