/**
 * 中间件模块导出
 *
 * @module @ldesign/auth-core/middleware
 * @author LDesign Team
 */

export { MiddlewareChain } from './MiddlewareChain'
export type {
  MiddlewareContext,
  MiddlewareFunction,
  NextFunction,
  MiddlewareConfig,
} from './types'

import { MiddlewareChain } from './MiddlewareChain'

/**
 * 创建中间件链的工厂函数
 * 
 * @returns 新的中间件链实例
 * 
 * @example
 * ```ts
 * import { createMiddlewareChain } from '@ldesign/auth-core/middleware'
 * 
 * const chain = createMiddlewareChain()
 * 
 * chain
 *   .use(async (ctx, next) => {
 *     console.log('Before')
 *     await next()
 *     console.log('After')
 *   })
 *   .use(async (ctx, next) => {
 *     if (!ctx.credentials) {
 *       ctx.aborted = true
 *       ctx.abortReason = '缺少凭证'
 *       return
 *     }
 *     await next()
 *   })
 * 
 * await chain.execute(context)
 * ```
 */
export function createMiddlewareChain() {
  return new MiddlewareChain()
}