/**
 * 路由守卫
 *
 * 提供认证相关的路由守卫功能
 */

import type { AuthManager } from '../core/AuthManager'

/**
 * 路由信息接口（简化版）
 */
export interface RouteInfo {
  /**
   * 路由路径
   */
  path: string

  /**
   * 路由名称
   */
  name?: string

  /**
   * 路由元信息
   */
  meta?: Record<string, any>

  /**
   * 查询参数
   */
  query?: Record<string, any>
}

/**
 * 导航守卫结果
 */
export type NavigationGuardResult = boolean | string | RouteInfo | Error

/**
 * 导航守卫函数
 */
export type NavigationGuard = (
  to: RouteInfo,
  from: RouteInfo,
) => NavigationGuardResult | Promise<NavigationGuardResult>

/**
 * 创建认证守卫
 *
 * 检查用户是否已认证，未认证则重定向到登录页
 *
 * @param authManager - 认证管理器
 * @param loginRoute - 登录页路由，默认 '/login'
 * @returns 导航守卫函数
 *
 * @example
 * ```typescript
 * import { createAuthGuard } from '@ldesign/auth/router'
 * import { createAuthManager } from '@ldesign/auth'
 *
 * const auth = createAuthManager()
 * const authGuard = createAuthGuard(auth, '/login')
 *
 * // Vue Router 示例
 * router.beforeEach(async (to, from) => {
 *   const result = await authGuard(
 *     { path: to.path, name: to.name, meta: to.meta },
 *     { path: from.path, name: from.name, meta: from.meta },
 *   )
 *
 *   if (typeof result === 'string') {
 *     return result // 重定向
 *   }
 *   return result // boolean
 * })
 * ```
 */
export function createAuthGuard(
  authManager: AuthManager,
  loginRoute = '/login',
): NavigationGuard {
  return (to: RouteInfo, _from: RouteInfo) => {
    // 检查路由是否需要认证
    const requiresAuth = to.meta?.requiresAuth !== false

    if (!requiresAuth) {
      return true
    }

    // 检查用户是否已认证
    if (!authManager.isAuthenticated()) {
      // 未认证，重定向到登录页
      return {
        path: loginRoute,
        query: {
          redirect: to.path,
          ...to.query,
        },
      }
    }

    return true
  }
}

/**
 * 创建角色守卫
 *
 * 检查用户是否拥有所需角色
 *
 * @param authManager - 认证管理器
 * @param requiredRoles - 所需角色列表（用户拥有其中任一角色即可通过）
 * @param fallbackRoute - 权限不足时的跳转路由，默认 '/'
 * @returns 导航守卫函数
 *
 * @example
 * ```typescript
 * import { createRoleGuard } from '@ldesign/auth/router'
 *
 * const roleGuard = createRoleGuard(auth, ['admin', 'moderator'])
 *
 * // 在路由配置中使用
 * {
 *   path: '/admin',
 *   component: AdminPage,
 *   beforeEnter: roleGuard,
 * }
 * ```
 */
export function createRoleGuard(
  authManager: AuthManager,
  requiredRoles: string[],
  fallbackRoute = '/',
): NavigationGuard {
  return (_to: RouteInfo, _from: RouteInfo) => {
    const user = authManager.getUser()

    if (!user) {
      return fallbackRoute
    }

    const userRoles = user.roles || []
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role))

    if (!hasRequiredRole) {
      return fallbackRoute
    }

    return true
  }
}

/**
 * 创建权限守卫
 *
 * 检查用户是否拥有所需权限
 *
 * @param authManager - 认证管理器
 * @param requiredPermissions - 所需权限列表（用户需要拥有所有权限才能通过）
 * @param fallbackRoute - 权限不足时的跳转路由，默认 '/'
 * @returns 导航守卫函数
 *
 * @example
 * ```typescript
 * import { createPermissionGuard } from '@ldesign/auth/router'
 *
 * const permissionGuard = createPermissionGuard(
 *   auth,
 *   ['user:read', 'user:write'],
 * )
 * ```
 */
export function createPermissionGuard(
  authManager: AuthManager,
  requiredPermissions: string[],
  fallbackRoute = '/',
): NavigationGuard {
  return (_to: RouteInfo, _from: RouteInfo) => {
    const user = authManager.getUser()

    if (!user) {
      return fallbackRoute
    }

    const userPermissions = user.permissions || []
    const hasAllPermissions = requiredPermissions.every(permission =>
      userPermissions.includes(permission),
    )

    if (!hasAllPermissions) {
      return fallbackRoute
    }

    return true
  }
}

/**
 * 组合多个守卫
 *
 * @param guards - 守卫函数数组
 * @returns 组合后的守卫函数
 *
 * @example
 * ```typescript
 * import { composeGuards, createAuthGuard, createRoleGuard } from '@ldesign/auth/router'
 *
 * const composedGuard = composeGuards([
 *   createAuthGuard(auth),
 *   createRoleGuard(auth, ['admin']),
 * ])
 * ```
 */
export function composeGuards(guards: NavigationGuard[]): NavigationGuard {
  return async (to: RouteInfo, from: RouteInfo) => {
    for (const guard of guards) {
      const result = await guard(to, from)

      // 如果返回 false 或重定向，立即返回
      if (result !== true) {
        return result
      }
    }

    return true
  }
}

