/**
 * Vue 注入符号
 *
 * @module @ldesign/auth-vue/plugin
 */

import type { InjectionKey } from 'vue'
import type { AuthManager } from '@ldesign/auth-core'

/**
 * AuthManager 注入键
 */
export const AUTH_MANAGER_KEY: InjectionKey<AuthManager> = Symbol('auth-manager')

/**
 * 认证配置注入键
 */
export const AUTH_OPTIONS_KEY: InjectionKey<AuthPluginOptions> = Symbol('auth-options')

/**
 * 认证插件配置选项
 */
export interface AuthPluginOptions {
  /** 登录页路由 */
  loginRoute?: string
  /** 登录成功后的默认路由 */
  defaultRoute?: string
  /** 白名单路由（不需要认证） */
  whiteList?: string[]
  /** 是否自动配置路由守卫 */
  setupRouterGuard?: boolean
  /** 登录处理器 */
  onLogin?: (credentials: { username: string; password: string }) => Promise<{
    success: boolean
    user?: Record<string, unknown>
    token?: { accessToken: string; refreshToken?: string; expiresIn?: number }
    error?: { code: string; message: string }
  }>
  /** 刷新 Token 处理器 */
  onRefreshToken?: (refreshToken: string) => Promise<{
    accessToken: string
    refreshToken?: string
    expiresIn?: number
  } | null>
  /** 获取用户信息处理器 */
  onFetchUser?: () => Promise<Record<string, unknown> | null>
}

