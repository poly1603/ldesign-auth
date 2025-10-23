/**
 * useAuth Composable
 *
 * Vue 3 认证组合式函数
 */

import { computed, onMounted, onUnmounted, ref, type Ref } from 'vue'
import type { AuthManager } from '../../core/AuthManager'
import type { AuthState, LoginCredentials, User } from '../../types'
import { getDefaultAuth } from '../../index'

/**
 * useAuth 返回值
 */
export interface UseAuthReturn {
  /**
   * 是否已认证
   */
  isAuthenticated: Ref<boolean>

  /**
   * 当前用户
   */
  user: Ref<User | null>

  /**
   * 是否正在加载
   */
  loading: Ref<boolean>

  /**
   * 错误信息
   */
  error: Ref<Error | null>

  /**
   * Access Token
   */
  token: Ref<string | null>

  /**
   * 登录
   */
  login: (credentials: LoginCredentials) => Promise<void>

  /**
   * 登出
   */
  logout: () => Promise<void>

  /**
   * 刷新 Token
   */
  refreshToken: () => Promise<void>

  /**
   * 认证管理器实例
   */
  authManager: AuthManager
}

/**
 * 认证组合式函数
 *
 * @param authManager - 认证管理器实例（可选）
 * @returns useAuth 返回值
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useAuth } from '@ldesign/auth/vue'
 *
 * const {
 *   isAuthenticated,
 *   user,
 *   loading,
 *   error,
 *   login,
 *   logout,
 * } = useAuth()
 *
 * async function handleLogin() {
 *   await login({
 *     username: 'user@example.com',
 *     password: 'password123',
 *   })
 * }
 * </script>
 *
 * <template>
 *   <div v-if="isAuthenticated">
 *     <p>欢迎, {{ user?.username }}</p>
 *     <button @click="logout">登出</button>
 *   </div>
 *   <div v-else>
 *     <button @click="handleLogin" :disabled="loading">
 *       {{ loading ? '登录中...' : '登录' }}
 *     </button>
 *     <p v-if="error">{{ error.message }}</p>
 *   </div>
 * </template>
 * ```
 */
export function useAuth(authManager?: AuthManager): UseAuthReturn {
  const manager = authManager || getDefaultAuth()

  // 响应式状态
  const isAuthenticated = ref(false)
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const token = computed(() => manager.getAccessToken())

  // 同步状态
  function syncState(state: AuthState) {
    isAuthenticated.value = state.isAuthenticated
    user.value = state.user
    loading.value = state.loading
    error.value = state.error
  }

  // 登录
  async function login(credentials: LoginCredentials) {
    try {
      await manager.login(credentials)
    }
    catch (err) {
      error.value = err as Error
      throw err
    }
  }

  // 登出
  async function logout() {
    try {
      await manager.logout()
    }
    catch (err) {
      error.value = err as Error
      throw err
    }
  }

  // 刷新 Token
  async function refreshToken() {
    try {
      await manager.refreshToken()
    }
    catch (err) {
      error.value = err as Error
      throw err
    }
  }

  // 订阅状态变化
  let unsubscribe: (() => void) | undefined

  onMounted(() => {
    // 初始化状态
    syncState(manager.getState())

    // 订阅状态变化
    unsubscribe = manager.subscribe((state) => {
      syncState(state)
    })
  })

  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe()
    }
  })

  return {
    isAuthenticated,
    user,
    loading,
    error,
    token,
    login,
    logout,
    refreshToken,
    authManager: manager,
  }
}

