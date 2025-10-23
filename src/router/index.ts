/**
 * 路由守卫模块
 *
 * 提供认证相关的路由守卫功能
 *
 * @example
 * ```typescript
 * import { createAuthGuard, createRoleGuard } from '@ldesign/auth/router'
 * import { createAuthManager } from '@ldesign/auth'
 *
 * const auth = createAuthManager()
 *
 * // 认证守卫
 * const authGuard = createAuthGuard(auth)
 *
 * // 角色守卫
 * const adminGuard = createRoleGuard(auth, ['admin'])
 *
 * // Vue Router 使用示例
 * router.beforeEach((to, from) => {
 *   return authGuard(
 *     { path: to.path, meta: to.meta },
 *     { path: from.path, meta: from.meta },
 *   )
 * })
 * ```
 */

// 导出守卫函数
export {
  createAuthGuard,
  createRoleGuard,
  createPermissionGuard,
  composeGuards,
} from './guards'

// 导出类型
export type {
  RouteInfo,
  NavigationGuard,
  NavigationGuardResult,
} from './guards'

