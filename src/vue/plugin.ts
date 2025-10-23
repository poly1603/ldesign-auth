/**
 * Vue 3 Plugin
 *
 * @ldesign/auth 的 Vue 3 插件
 */

import type { App, InjectionKey, Plugin } from 'vue'
import type { HttpClient } from '@ldesign/http'
import type { CacheManager } from '@ldesign/cache'
import type { AuthConfig } from '../types'
import { AuthManager, createAuthManager } from '../core/AuthManager'

/**
 * Auth 注入 Key
 */
export const AUTH_KEY: InjectionKey<AuthManager> = Symbol('auth')

/**
 * Auth Plugin 选项
 */
export interface AuthPluginOptions extends AuthConfig {
  /**
   * HTTP 客户端
   */
  httpClient?: HttpClient

  /**
   * 缓存管理器
   */
  cacheManager?: CacheManager
}

/**
 * Auth Plugin
 *
 * @example
 * ```typescript
 * import { createApp } from 'vue'
 * import { AuthPlugin } from '@ldesign/auth/vue'
 * import { createHttpClient } from '@ldesign/http'
 * import App from './App.vue'
 *
 * const app = createApp(App)
 * const httpClient = createHttpClient({ baseURL: 'https://api.example.com' })
 *
 * app.use(AuthPlugin, {
 *   httpClient,
 *   autoRefresh: true,
 *   refreshThreshold: 300,
 * })
 *
 * app.mount('#app')
 * ```
 */
export const AuthPlugin: Plugin = {
  install(app: App, options: AuthPluginOptions = {}) {
    const { httpClient, cacheManager, ...authConfig } = options

    // 创建认证管理器
    const authManager = createAuthManager(
      authConfig,
      httpClient,
      cacheManager,
    )

    // 提供 AuthManager
    app.provide(AUTH_KEY, authManager)

    // 挂载到 globalProperties（可选）
    app.config.globalProperties.$auth = authManager
  },
}

/**
 * 默认导出插件
 */
export default AuthPlugin

/**
 * 扩展 ComponentCustomProperties
 */
declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $auth: AuthManager
  }
}

