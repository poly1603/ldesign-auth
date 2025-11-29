/**
 * useUser Composable
 *
 * 提供当前用户信息的响应式访问
 *
 * @module @ldesign/auth-vue/composables
 * @author LDesign Team
 */

import { computed, inject, onUnmounted, shallowRef } from 'vue'
import type { User } from '@ldesign/auth-core'
import { AUTH_MANAGER_KEY } from '../plugin/symbols'

/**
 * useUser 返回值类型
 */
export interface UseUserReturn {
  /** 当前用户 */
  user: ReturnType<typeof shallowRef<User | null>>
  /** 用户 ID */
  userId: ReturnType<typeof computed<string | number | undefined>>
  /** 用户名 */
  username: ReturnType<typeof computed<string | undefined>>
  /** 用户头像 */
  avatar: ReturnType<typeof computed<string | undefined>>
  /** 用户昵称 */
  nickname: ReturnType<typeof computed<string | undefined>>
  /** 用户邮箱 */
  email: ReturnType<typeof computed<string | undefined>>
  /** 用户角色 */
  roles: ReturnType<typeof computed<string[]>>
  /** 用户权限 */
  permissions: ReturnType<typeof computed<string[]>>
  /** 是否为管理员 */
  isAdmin: ReturnType<typeof computed<boolean>>
  /** 更新用户信息 */
  updateUser: (user: User) => void
}

/**
 * 用户信息 Composable
 *
 * @returns 用户信息相关的响应式状态和方法
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useUser } from '@ldesign/auth-vue'
 *
 * const { user, username, avatar, isAdmin } = useUser()
 * </script>
 *
 * <template>
 *   <div class="user-info">
 *     <img :src="avatar" :alt="username" />
 *     <span>{{ username }}</span>
 *     <span v-if="isAdmin" class="badge">管理员</span>
 *   </div>
 * </template>
 * ```
 */
export function useUser(): UseUserReturn {
  const authManager = inject(AUTH_MANAGER_KEY)

  if (!authManager) {
    throw new Error(
      '[useUser] AuthManager 未提供。请确保在应用中使用了 authPlugin。',
    )
  }

  // 响应式用户状态
  const user = shallowRef<User | null>(authManager.getUser())

  // 监听用户更新事件
  const unsubscribe = authManager.on('user:updated', (updatedUser) => {
    user.value = updatedUser
  })

  // 监听登出事件
  const unsubscribeLogout = authManager.on('logout', () => {
    user.value = null
  })

  // 监听登录事件
  const unsubscribeLogin = authManager.on('login', (data) => {
    user.value = data.user
  })

  // 组件卸载时取消订阅
  onUnmounted(() => {
    unsubscribe()
    unsubscribeLogout()
    unsubscribeLogin()
  })

  // 计算属性
  const userId = computed(() => user.value?.id)
  const username = computed(() => user.value?.username)
  const avatar = computed(() => user.value?.avatar)
  const nickname = computed(() => user.value?.nickname)
  const email = computed(() => user.value?.email)
  const roles = computed(() => user.value?.roles ?? [])
  const permissions = computed(() => user.value?.permissions ?? [])
  const isAdmin = computed(() => roles.value.includes('admin'))

  // 更新用户信息
  const updateUser = (newUser: User): void => {
    authManager.setUser(newUser)
  }

  return {
    user,
    userId,
    username,
    avatar,
    nickname,
    email,
    roles,
    permissions,
    isAdmin,
    updateUser,
  }
}

