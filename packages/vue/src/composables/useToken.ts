/**
 * useToken Composable
 *
 * 提供 Token 管理的响应式状态和方法
 *
 * @module @ldesign/auth-vue/composables
 * @author LDesign Team
 */

import { computed, inject, onUnmounted, ref, shallowRef } from 'vue'
import type { TokenInfo } from '@ldesign/auth-core'
import { AUTH_MANAGER_KEY } from '../plugin/symbols'

/**
 * useToken 返回值类型
 */
export interface UseTokenReturn {
  /** Token 信息 */
  token: ReturnType<typeof shallowRef<TokenInfo | null>>
  /** 访问令牌 */
  accessToken: ReturnType<typeof computed<string | null>>
  /** 刷新令牌 */
  refreshToken: ReturnType<typeof computed<string | null>>
  /** Token 是否存在 */
  hasToken: ReturnType<typeof computed<boolean>>
  /** Token 是否过期 */
  isExpired: ReturnType<typeof computed<boolean>>
  /** Token 剩余有效时间（秒） */
  remainingTime: ReturnType<typeof ref<number>>
  /** 过期时间戳 */
  expiresAt: ReturnType<typeof computed<number | undefined>>
  /** 设置 Token */
  setToken: (token: TokenInfo) => void
  /** 清除 Token */
  clearToken: () => void
  /** 获取 Authorization 请求头 */
  getAuthHeader: () => Record<string, string>
}

/**
 * Token 管理 Composable
 *
 * @returns Token 相关的响应式状态和方法
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useToken } from '@ldesign/auth-vue'
 *
 * const {
 *   accessToken,
 *   hasToken,
 *   isExpired,
 *   remainingTime,
 *   getAuthHeader,
 * } = useToken()
 *
 * // 发送请求时添加 Token
 * const fetchData = async () => {
 *   const response = await fetch('/api/data', {
 *     headers: getAuthHeader(),
 *   })
 * }
 * </script>
 *
 * <template>
 *   <div v-if="hasToken">
 *     <p>Token 有效，剩余 {{ remainingTime }} 秒</p>
 *     <p v-if="isExpired" class="warning">Token 已过期</p>
 *   </div>
 * </template>
 * ```
 */
export function useToken(): UseTokenReturn {
  const authManager = inject(AUTH_MANAGER_KEY)

  if (!authManager) {
    throw new Error(
      '[useToken] AuthManager 未提供。请确保在应用中使用了 authPlugin。',
    )
  }

  const tokenManager = authManager.getTokenManager()

  // 响应式状态
  const token = shallowRef<TokenInfo | null>(tokenManager.getTokenInfo())
  const remainingTime = ref(tokenManager.getTokenRemainingTime())

  // 更新剩余时间的定时器
  let updateTimer: ReturnType<typeof setInterval> | null = null

  // 启动剩余时间更新
  const startRemainingTimeUpdate = () => {
    if (updateTimer) return

    updateTimer = setInterval(() => {
      remainingTime.value = tokenManager.getTokenRemainingTime()
    }, 1000)
  }

  // 停止剩余时间更新
  const stopRemainingTimeUpdate = () => {
    if (updateTimer) {
      clearInterval(updateTimer)
      updateTimer = null
    }
  }

  // 如果有 Token，启动更新
  if (token.value) {
    startRemainingTimeUpdate()
  }

  // 监听 Token 刷新
  const unsubscribeRefresh = authManager.on('token:refresh', (newToken) => {
    token.value = newToken
    remainingTime.value = tokenManager.getTokenRemainingTime()
    startRemainingTimeUpdate()
  })

  // 监听 Token 过期
  const unsubscribeExpired = authManager.on('token:expired', () => {
    remainingTime.value = 0
    stopRemainingTimeUpdate()
  })

  // 监听登出
  const unsubscribeLogout = authManager.on('logout', () => {
    token.value = null
    remainingTime.value = 0
    stopRemainingTimeUpdate()
  })

  // 监听登录
  const unsubscribeLogin = authManager.on('login', (data) => {
    token.value = data.token
    remainingTime.value = tokenManager.getTokenRemainingTime()
    startRemainingTimeUpdate()
  })

  // 组件卸载时清理
  onUnmounted(() => {
    stopRemainingTimeUpdate()
    unsubscribeRefresh()
    unsubscribeExpired()
    unsubscribeLogout()
    unsubscribeLogin()
  })

  // 计算属性
  const accessToken = computed(() => token.value?.accessToken ?? null)
  const refreshToken = computed(() => token.value?.refreshToken ?? null)
  const hasToken = computed(() => tokenManager.hasToken())
  const isExpired = computed(() => tokenManager.isTokenExpired())
  const expiresAt = computed(() => token.value?.expiresAt)

  // 方法
  const setToken = (newToken: TokenInfo) => {
    tokenManager.setToken(newToken)
    token.value = tokenManager.getTokenInfo()
    remainingTime.value = tokenManager.getTokenRemainingTime()
    startRemainingTimeUpdate()
  }

  const clearToken = () => {
    tokenManager.clearToken()
    token.value = null
    remainingTime.value = 0
    stopRemainingTimeUpdate()
  }

  const getAuthHeader = (): Record<string, string> => {
    const access = tokenManager.getAccessToken()
    if (!access) return {}

    const tokenType = token.value?.tokenType ?? 'Bearer'
    return {
      Authorization: `${tokenType} ${access}`,
    }
  }

  return {
    token,
    accessToken,
    refreshToken,
    hasToken,
    isExpired,
    remainingTime,
    expiresAt,
    setToken,
    clearToken,
    getAuthHeader,
  }
}
