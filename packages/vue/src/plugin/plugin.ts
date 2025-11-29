/**
 * Vue 认证插件
 *
 * 提供 Vue 3 的认证集成
 *
 * @module @ldesign/auth-vue/plugin
 * @author LDesign Team
 */

import type { App } from 'vue'
import type { Router } from 'vue-router'
import { createAuthManager, type AuthConfig, type User, type TokenInfo } from '@ldesign/auth-core'
import { AUTH_MANAGER_KEY, AUTH_OPTIONS_KEY, type AuthPluginOptions } from './symbols'
import { setupRouterGuard } from './guard'

/**
 * 创建认证插件
 *
 * @param options - 插件配置选项
 * @returns Vue 插件
 *
 * @example
 * ```ts
 * import { createApp } from 'vue'
 * import { createRouter } from 'vue-router'
 * import { createAuthPlugin } from '@ldesign/auth-vue'
 *
 * const app = createApp(App)
 * const router = createRouter({ ... })
 *
 * const authPlugin = createAuthPlugin({
 *   loginRoute: '/login',
 *   defaultRoute: '/dashboard',
 *   whiteList: ['/login', '/register'],
 *   setupRouterGuard: true,
 *   onLogin: async (credentials) => {
 *     const response = await api.login(credentials)
 *     return {
 *       success: response.success,
 *       user: response.user,
 *       token: response.token,
 *     }
 *   },
 * })
 *
 * app.use(router)
 * app.use(authPlugin, { router })
 * app.mount('#app')
 * ```
 */
export function createAuthPlugin(options: AuthPluginOptions = {}) {
  // 创建认证管理器配置
  const authConfig: AuthConfig = {
    autoRefresh: true,
    refreshThreshold: 300,
    loginRoute: options.loginRoute ?? '/login',
    defaultRoute: options.defaultRoute ?? '/',
    whiteList: options.whiteList ?? ['/login', '/register'],
  }

  // 创建认证管理器
  const authManager = createAuthManager(authConfig)

  // 设置处理器
  if (options.onLogin) {
    authManager.setLoginHandler(async (credentials) => {
      const result = await options.onLogin!(credentials)
      return {
        success: result.success,
        user: result.user as User | undefined,
        token: result.token as TokenInfo | undefined,
        error: result.error,
      }
    })
  }

  if (options.onRefreshToken) {
    authManager.setRefreshTokenHandler(async (refreshToken) => {
      const result = await options.onRefreshToken!(refreshToken)
      return result as TokenInfo | null
    })
  }

  if (options.onFetchUser) {
    authManager.setFetchUserHandler(async () => {
      const result = await options.onFetchUser!()
      return result as User | null
    })
  }

  return {
    install(app: App, installOptions?: { router?: Router }) {
      // 提供认证管理器
      app.provide(AUTH_MANAGER_KEY, authManager)
      app.provide(AUTH_OPTIONS_KEY, options)

      // 全局属性
      app.config.globalProperties.$auth = authManager

      // 设置路由守卫
      if (options.setupRouterGuard !== false && installOptions?.router) {
        setupRouterGuard(installOptions.router, authManager, options)
      }
    },
    /**
     * 获取认证管理器实例
     */
    getAuthManager: () => authManager,
  }
}

/**
 * 认证插件类型
 */
export type AuthPlugin = ReturnType<typeof createAuthPlugin>

