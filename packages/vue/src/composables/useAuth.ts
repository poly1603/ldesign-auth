/**
 * useAuth Composable
 *
 * 提供认证相关的响应式状态和方法
 *
 * @module @ldesign/auth-vue/composables
 * @author LDesign Team
 */

import { computed, onUnmounted, readonly, ref, shallowRef } from 'vue'
import type {
  AuthError,
  AuthState,
  Credentials,
  TokenInfo,
  User,
} from '@ldesign/auth-core'
import { inject } from 'vue'
import type { LoginResult } from '@ldesign/auth-core'
import { AUTH_MANAGER_KEY } from '../plugin/symbols'

/**
 * useAuth 返回值类型
 */
export interface UseAuthReturn {
  /** 是否已认证 */
  isAuthenticated: Readonly<ReturnType<typeof ref<boolean>>>
  /** 是否正在加载 */
  isLoading: Readonly<ReturnType<typeof ref<boolean>>>
  /** 当前用户 */
  user: Readonly<ReturnType<typeof shallowRef<User | null>>>
  /** Token 信息 */
  token: Readonly<ReturnType<typeof shallowRef<TokenInfo | null>>>
  /** 错误信息 */
  error: Readonly<ReturnType<typeof shallowRef<AuthError | null>>>
  /** 登录 */
  login: (credentials: Credentials) => Promise<LoginResult>
  /** 登出 */
  logout: () => Promise<void>
  /** 刷新用户信息 */
  refreshUser: () => Promise<void>
  /** 检查是否拥有权限 */
  hasPermission: (permissions: string | string[], mode?: 'all' | 'any') => boolean
  /** 检查是否拥有角色 */
  hasRole: (roles: string | string[], mode?: 'all' | 'any') => boolean
  /** 获取访问令牌 */
  getAccessToken: () => string | null
}

/**
 * 认证 Composable
 *
 * @returns 认证相关的响应式状态和方法
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useAuth } from '@ldesign/auth-vue'
 *
 * const {
 *   isAuthenticated,
 *   isLoading,
 *   user,
 *   login,
 *   logout,
 *   hasPermission,
 * } = useAuth()
 *
 * const handleLogin = async () => {
 *   const result = await login({
 *     username: 'admin',
 *     password: '123456',
 *   })
 *
 *   if (result.success) {
 *     console.log('登录成功')
 *   }
 * }
 * </script>
 *
 * <template>
 *   <div v-if="isAuthenticated">
 *     <p>欢迎, {{ user?.username }}</p>
 *     <button @click="logout">登出</button>
 *   </div>
 *   <div v-else>
 *     <button @click="handleLogin" :disabled="isLoading">
 *       {{ isLoading ? '登录中...' : '登录' }}
 *     </button>
 *   </div>
 * </template>
 * ```
 */
export function useAuth(): UseAuthReturn {
  const authManager = inject(AUTH_MANAGER_KEY)

  if (!authManager) {
    throw new Error(
      '[useAuth] AuthManager 未提供。请确保在应用中使用了 authPlugin。',
    )
  }

  // 响应式状态 - 基础类型使用 ref，对象类型使用 shallowRef
  const isAuthenticated = ref(authManager.isAuthenticated())
  const isLoading = ref(false)
  const user = shallowRef<User | null>(authManager.getUser())
  const token = shallowRef<TokenInfo | null>(authManager.getTokenManager().getTokenInfo())
  const error = shallowRef<AuthError | null>(null)

  // 使用 computed 缓存派生状态，避免重复计算
  const permissions = computed(() => user.value?.permissions ?? [])
  const roles = computed(() => user.value?.roles ?? [])
  const username = computed(() => user.value?.username ?? '')
  const userId = computed(() => user.value?.id)
  const userEmail = computed(() => user.value?.email)

  // 更新状态的辅助函数 - 批量更新以减少渲染次数
  const updateState = (state: Partial<AuthState>) => {
    if (state.isAuthenticated !== undefined) {
      isAuthenticated.value = state.isAuthenticated
    }
    if (state.isLoading !== undefined) {
      isLoading.value = state.isLoading
    }
    if (state.user !== undefined) {
      user.value = state.user
    }
    if (state.token !== undefined) {
      token.value = state.token
    }
    if (state.error !== undefined) {
      error.value = state.error
    }
  }

  // 监听认证事件
  const unsubscribes: Array<() => void> = []

  // 使用批量更新优化事件处理
  unsubscribes.push(
    authManager.on('login', (data) => {
      updateState({
        isAuthenticated: true,
        user: data.user,
        token: data.token,
        error: null,
      })
    }),
  )

  unsubscribes.push(
    authManager.on('logout', () => {
      updateState({
        isAuthenticated: false,
        user: null,
        token: null,
      })
    }),
  )

  unsubscribes.push(
    authManager.on('user:updated', (updatedUser) => {
      updateState({ user: updatedUser })
    }),
  )

  unsubscribes.push(
    authManager.on('token:refresh', (newToken) => {
      updateState({ token: newToken })
    }),
  )

  unsubscribes.push(
    authManager.on('error', (authError) => {
      updateState({ error: authError })
    }),
  )

  // 组件卸载时取消订阅
  onUnmounted(() => {
    unsubscribes.forEach(unsub => unsub())
  })

  // 登录
  const login = async (credentials: Credentials): Promise<LoginResult> => {
    updateState({ isLoading: true, error: null })

    try {
      const result = await authManager.login(credentials)
      return result
    }
    finally {
      updateState({ isLoading: false })
    }
  }

  // 登出
  const logout = async (): Promise<void> => {
    await authManager.logout()
  }

  // 刷新用户信息
  const refreshUser = async (): Promise<void> => {
    // 这里需要通过 fetchUserHandler 获取最新用户信息
    // 实际实现依赖于 AuthManager 的配置
  }

  // 检查权限
  const hasPermission = (
    permissions: string | string[],
    mode: 'all' | 'any' = 'all',
  ): boolean => {
    return authManager.hasPermission(permissions, { mode })
  }

  // 检查角色
  const hasRole = (roles: string | string[], mode: 'all' | 'any' = 'all'): boolean => {
    return authManager.hasRole(roles, { mode })
  }

  // 获取访问令牌
  const getAccessToken = (): string | null => {
    return authManager.getAccessToken()
  }

  return {
    // 响应式状态
    isAuthenticated: readonly(isAuthenticated),
    isLoading: readonly(isLoading),
    user: readonly(user),
    token: readonly(token),
    error: readonly(error),
    // 派生状态（computed）
    permissions: readonly(permissions),
    roles: readonly(roles),
    username: readonly(username),
    userId: readonly(userId),
    userEmail: readonly(userEmail),
    // 方法
    login,
    logout,
    refreshUser,
    hasPermission,
    hasRole,
    getAccessToken,
  }
}

