/**
 * useSession Composable
 *
 * 提供会话管理的响应式状态和方法
 *
 * @module @ldesign/auth-vue/composables
 * @author LDesign Team
 */

import { computed, inject, onUnmounted, ref, shallowRef } from 'vue'
import type { SessionInfo, SessionStatus } from '@ldesign/auth-core'
import { AUTH_MANAGER_KEY } from '../plugin/symbols'

/**
 * useSession 返回值类型
 */
export interface UseSessionReturn {
  /** 当前会话信息 */
  session: ReturnType<typeof shallowRef<SessionInfo | null>>
  /** 会话 ID */
  sessionId: ReturnType<typeof computed<string | undefined>>
  /** 会话状态 */
  status: ReturnType<typeof computed<SessionStatus | undefined>>
  /** 会话是否有效 */
  isValid: ReturnType<typeof computed<boolean>>
  /** 会话是否过期 */
  isExpired: ReturnType<typeof computed<boolean>>
  /** 剩余时间（毫秒） */
  remainingTime: ReturnType<typeof ref<number>>
  /** 创建时间 */
  createdAt: ReturnType<typeof computed<number | undefined>>
  /** 最后活动时间 */
  lastActivityAt: ReturnType<typeof computed<number | undefined>>
  /** 更新活动时间（心跳） */
  touch: () => void
  /** 销毁会话 */
  destroy: () => void
  /** 创建新会话 */
  create: () => SessionInfo
}

/**
 * 会话管理 Composable
 *
 * @returns 会话相关的响应式状态和方法
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useSession } from '@ldesign/auth-vue'
 *
 * const {
 *   session,
 *   isValid,
 *   remainingTime,
 *   touch,
 * } = useSession()
 *
 * // 用户活动时更新会话
 * const handleActivity = () => {
 *   touch()
 * }
 * </script>
 *
 * <template>
 *   <div v-if="isValid">
 *     <p>会话剩余时间: {{ Math.floor(remainingTime / 1000) }}秒</p>
 *   </div>
 *   <div v-else>
 *     <p>会话已过期，请重新登录</p>
 *   </div>
 * </template>
 * ```
 */
export function useSession(): UseSessionReturn {
  const authManager = inject(AUTH_MANAGER_KEY)

  if (!authManager) {
    throw new Error(
      '[useSession] AuthManager 未提供。请确保在应用中使用了 authPlugin。',
    )
  }

  const sessionManager = authManager.getSessionManager()

  // 响应式状态
  const session = shallowRef<SessionInfo | null>(sessionManager.getSession())
  const remainingTime = ref(sessionManager.getRemainingTime())

  // 更新剩余时间的定时器
  let updateTimer: ReturnType<typeof setInterval> | null = null

  // 启动剩余时间更新
  const startRemainingTimeUpdate = () => {
    if (updateTimer) return

    updateTimer = setInterval(() => {
      remainingTime.value = sessionManager.getRemainingTime()

      // 检查会话是否过期
      if (sessionManager.isSessionExpired()) {
        session.value = sessionManager.getSession()
      }
    }, 1000)
  }

  // 停止剩余时间更新
  const stopRemainingTimeUpdate = () => {
    if (updateTimer) {
      clearInterval(updateTimer)
      updateTimer = null
    }
  }

  // 启动更新
  if (session.value) {
    startRemainingTimeUpdate()
  }

  // 监听会话过期
  const unsubscribeExpired = sessionManager.onExpired(() => {
    session.value = sessionManager.getSession()
    stopRemainingTimeUpdate()
  })

  // 监听登出
  const unsubscribeLogout = authManager.on('logout', () => {
    session.value = null
    remainingTime.value = 0
    stopRemainingTimeUpdate()
  })

  // 监听登录
  const unsubscribeLogin = authManager.on('login', () => {
    session.value = sessionManager.getSession()
    remainingTime.value = sessionManager.getRemainingTime()
    startRemainingTimeUpdate()
  })

  // 组件卸载时清理
  onUnmounted(() => {
    stopRemainingTimeUpdate()
    unsubscribeExpired()
    unsubscribeLogout()
    unsubscribeLogin()
  })

  // 计算属性
  const sessionId = computed(() => session.value?.id)
  const status = computed(() => session.value?.status)
  const isValid = computed(() => sessionManager.isSessionValid())
  const isExpired = computed(() => sessionManager.isSessionExpired())
  const createdAt = computed(() => session.value?.createdAt)
  const lastActivityAt = computed(() => session.value?.lastActivityAt)

  // 方法
  const touch = () => {
    sessionManager.touch()
    session.value = sessionManager.getSession()
    remainingTime.value = sessionManager.getRemainingTime()
  }

  const destroy = () => {
    sessionManager.destroySession()
    session.value = null
    remainingTime.value = 0
    stopRemainingTimeUpdate()
  }

  const create = () => {
    const newSession = sessionManager.createSession()
    session.value = newSession
    remainingTime.value = sessionManager.getRemainingTime()
    startRemainingTimeUpdate()
    return newSession
  }

  return {
    session,
    sessionId,
    status,
    isValid,
    isExpired,
    remainingTime,
    createdAt,
    lastActivityAt,
    touch,
    destroy,
    create,
  }
}
