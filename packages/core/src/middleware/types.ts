/**
 * 中间件类型定义
 *
 * @module @ldesign/auth-core/middleware
 * @author LDesign Team
 */

import type { Credentials, User, TokenInfo } from '../types'

/**
 * 中间件上下文
 * 
 * 包含认证流程中的所有相关数据
 */
export interface MiddlewareContext {
  /** 用户凭证 */
  credentials?: Credentials
  /** 用户信息 */
  user?: User | null
  /** Token 信息 */
  token?: TokenInfo | null
  /** 请求路径 */
  path?: string
  /** 请求方法 */
  method?: string
  /** 自定义元数据 */
  metadata?: Record<string, any>
  /** 是否已中止 */
  aborted?: boolean
  /** 中止原因 */
  abortReason?: string
}

/**
 * 下一个中间件函数类型
 */
export type NextFunction = () => Promise<void>

/**
 * 中间件函数类型
 * 
 * @param context - 中间件上下文
 * @param next - 调用下一个中间件
 */
export type MiddlewareFunction = (
  context: MiddlewareContext,
  next: NextFunction
) => Promise<void> | void

/**
 * 中间件配置
 */
export interface MiddlewareConfig {
  /** 中间件名称 */
  name?: string
  /** 是否启用 */
  enabled?: boolean
  /** 优先级（数字越大优先级越高） */
  priority?: number
}