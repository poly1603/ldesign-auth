/**
 * 插件模块导出
 *
 * @module @ldesign/auth-vue/plugin
 */

export { createAuthPlugin, type AuthPlugin } from './plugin'
export { createAuthGuard, setupRouterGuard, type RouterGuardConfig } from './guard'
export { AUTH_MANAGER_KEY, AUTH_OPTIONS_KEY, type AuthPluginOptions } from './symbols'

