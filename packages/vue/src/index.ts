/**
 * @ldesign/auth-vue
 *
 * LDesign 认证系统 Vue 3 适配器 - 提供 Composables、组件和插件
 *
 * @packageDocumentation
 * @module @ldesign/auth-vue
 * @author LDesign Team
 */

// ==================== 插件 ====================
export {
  createAuthPlugin,
  type AuthPlugin,
  createAuthGuard,
  setupRouterGuard,
  type RouterGuardConfig,
  AUTH_MANAGER_KEY,
  AUTH_OPTIONS_KEY,
  type AuthPluginOptions,
} from './plugin'

// ==================== Composables ====================
export {
  useAuth,
  type UseAuthReturn,
  useUser,
  type UseUserReturn,
  usePermission,
  type UsePermissionReturn,
  useLogin,
  type LoginFormData,
  type UseLoginReturn,
} from './composables'

// ==================== 重新导出 Core 类型 ====================
export type {
  User,
  Credentials,
  TokenInfo,
  AuthConfig,
  AuthState,
  AuthError,
  SessionInfo,
  SessionStatus,
  PermissionCheckOptions,
  RoleCheckOptions,
} from '@ldesign/auth-core'

