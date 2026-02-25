/**
 * @ldesign/auth Engine 插件
 */
import type { AuthEnginePluginOptions } from './types'
import { AuthManager } from '../auth/AuthManager'

export const authStateKeys = {
  MANAGER: 'auth:manager' as const,
  USER: 'auth:user' as const,
  TOKEN: 'auth:token' as const,
  AUTHENTICATED: 'auth:authenticated' as const,
} as const

export const authEventKeys = {
  INSTALLED: 'auth:installed' as const,
  UNINSTALLED: 'auth:uninstalled' as const,
  LOGIN: 'auth:login' as const,
  LOGOUT: 'auth:logout' as const,
  TOKEN_REFRESHED: 'auth:tokenRefreshed' as const,
} as const

export function createAuthEnginePlugin(options: AuthEnginePluginOptions = {}) {
  let manager: AuthManager | null = null
  return {
    name: 'auth',
    version: '1.0.0',
    dependencies: options.dependencies ?? [],

    async install(context: any) {
      const engine = context.engine || context
      manager = new AuthManager(options as any)
      engine.state?.set(authStateKeys.MANAGER, manager)
      engine.events?.emit(authEventKeys.INSTALLED, { name: 'auth' })
      engine.logger?.info('[Auth Plugin] installed')
    },

    async uninstall(context: any) {
      const engine = context.engine || context
      manager = null
      engine.state?.delete(authStateKeys.MANAGER)
      engine.state?.delete(authStateKeys.USER)
      engine.state?.delete(authStateKeys.TOKEN)
      engine.events?.emit(authEventKeys.UNINSTALLED, {})
      engine.logger?.info('[Auth Plugin] uninstalled')
    },
  }
}
