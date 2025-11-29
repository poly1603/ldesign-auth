/**
 * 路由守卫
 *
 * 提供认证相关的路由守卫功能
 *
 * @module @ldesign/auth-vue/plugin
 * @author LDesign Team
 */

import type { Router, RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import type { AuthManager } from '@ldesign/auth-core'
import type { AuthPluginOptions } from './symbols'

/**
 * 路由守卫配置
 */
export interface RouterGuardConfig {
  /** 登录页路由 */
  loginRoute: string
  /** 默认首页路由 */
  defaultRoute: string
  /** 白名单路由 */
  whiteList: string[]
}

/**
 * 默认路由守卫配置
 */
const DEFAULT_CONFIG: RouterGuardConfig = {
  loginRoute: '/login',
  defaultRoute: '/',
  whiteList: ['/login', '/register', '/forgot-password', '/404', '/403'],
}

/**
 * 检查路由是否在白名单中
 *
 * @param path - 路由路径
 * @param whiteList - 白名单列表
 * @returns 是否在白名单中
 */
function isWhitelisted(path: string, whiteList: string[]): boolean {
  return whiteList.some((pattern) => {
    // 支持通配符匹配
    if (pattern.endsWith('*')) {
      return path.startsWith(pattern.slice(0, -1))
    }
    // 精确匹配
    return path === pattern
  })
}

/**
 * 检查路由是否需要认证
 *
 * @param to - 目标路由
 * @returns 是否需要认证
 */
function requiresAuth(to: RouteLocationNormalized): boolean {
  // 如果路由元信息中明确设置了 requiresAuth，则使用该设置
  if (typeof to.meta?.requiresAuth === 'boolean') {
    return to.meta.requiresAuth
  }
  // 默认需要认证
  return true
}

/**
 * 创建认证路由守卫
 *
 * @param authManager - 认证管理器
 * @param options - 插件选项
 * @returns 路由守卫函数
 *
 * @example
 * ```ts
 * import { createAuthGuard } from '@ldesign/auth-vue/plugin'
 *
 * const guard = createAuthGuard(authManager, {
 *   loginRoute: '/login',
 *   defaultRoute: '/dashboard',
 *   whiteList: ['/login', '/register'],
 * })
 *
 * router.beforeEach(guard)
 * ```
 */
export function createAuthGuard(
  authManager: AuthManager,
  options: AuthPluginOptions = {},
): (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    next: NavigationGuardNext,
  ) => void {
  const config: RouterGuardConfig = {
    loginRoute: options.loginRoute ?? DEFAULT_CONFIG.loginRoute,
    defaultRoute: options.defaultRoute ?? DEFAULT_CONFIG.defaultRoute,
    whiteList: options.whiteList ?? DEFAULT_CONFIG.whiteList,
  }

  return (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    next: NavigationGuardNext,
  ) => {
    const isAuthenticated = authManager.isAuthenticated()
    const toPath = to.path

    // 白名单路由直接放行
    if (isWhitelisted(toPath, config.whiteList)) {
      // 如果已登录且访问登录页，重定向到首页
      if (isAuthenticated && toPath === config.loginRoute) {
        next(config.defaultRoute)
        return
      }
      next()
      return
    }

    // 检查路由是否需要认证
    if (!requiresAuth(to)) {
      next()
      return
    }

    // 未认证，重定向到登录页
    if (!isAuthenticated) {
      next({
        path: config.loginRoute,
        query: { redirect: to.fullPath },
      })
      return
    }

    // 已认证，检查权限
    const requiredPermissions = to.meta?.permissions as string[] | undefined
    const requiredRoles = to.meta?.roles as string[] | undefined

    // 检查权限
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasPermission = authManager.hasPermission(requiredPermissions, { mode: 'any' })
      if (!hasPermission) {
        next('/403')
        return
      }
    }

    // 检查角色
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = authManager.hasRole(requiredRoles, { mode: 'any' })
      if (!hasRole) {
        next('/403')
        return
      }
    }

    // 放行
    next()
  }
}

/**
 * 设置路由守卫
 *
 * @param router - Vue Router 实例
 * @param authManager - 认证管理器
 * @param options - 插件选项
 */
export function setupRouterGuard(
  router: Router,
  authManager: AuthManager,
  options: AuthPluginOptions = {},
): void {
  const guard = createAuthGuard(authManager, options)
  router.beforeEach(guard)
}

