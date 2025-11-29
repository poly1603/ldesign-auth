/**
 * usePermission Composable
 *
 * 提供权限和角色检查的响应式方法
 *
 * @module @ldesign/auth-vue/composables
 * @author LDesign Team
 */

import { computed, inject, onUnmounted, shallowRef } from 'vue'
import type { User } from '@ldesign/auth-core'
import { AUTH_MANAGER_KEY } from '../plugin/symbols'

/**
 * usePermission 返回值类型
 */
export interface UsePermissionReturn {
  /** 当前用户的所有权限 */
  permissions: ReturnType<typeof computed<string[]>>
  /** 当前用户的所有角色 */
  roles: ReturnType<typeof computed<string[]>>
  /** 检查是否拥有指定权限 */
  hasPermission: (permissions: string | string[], mode?: 'all' | 'any') => boolean
  /** 检查是否拥有指定角色 */
  hasRole: (roles: string | string[], mode?: 'all' | 'any') => boolean
  /** 检查是否为超级管理员 */
  isSuperAdmin: ReturnType<typeof computed<boolean>>
  /** 创建权限检查的计算属性 */
  can: (permissions: string | string[], mode?: 'all' | 'any') => ReturnType<typeof computed<boolean>>
}

/**
 * 权限检查 Composable
 *
 * @returns 权限检查相关的方法和状态
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { usePermission } from '@ldesign/auth-vue'
 *
 * const { hasPermission, hasRole, can, isSuperAdmin } = usePermission()
 *
 * // 响应式权限检查
 * const canCreateUser = can('user:create')
 * const canManageSystem = can(['system:read', 'system:write'], 'all')
 * </script>
 *
 * <template>
 *   <button v-if="canCreateUser" @click="createUser">
 *     创建用户
 *   </button>
 *
 *   <div v-if="isSuperAdmin">
 *     <h2>超级管理员面板</h2>
 *   </div>
 * </template>
 * ```
 */
export function usePermission(): UsePermissionReturn {
  const authManager = inject(AUTH_MANAGER_KEY)

  if (!authManager) {
    throw new Error(
      '[usePermission] AuthManager 未提供。请确保在应用中使用了 authPlugin。',
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
  const permissions = computed(() => user.value?.permissions ?? [])
  const roles = computed(() => user.value?.roles ?? [])
  const isSuperAdmin = computed(() => roles.value.includes('super_admin'))

  /**
   * 检查是否拥有指定权限
   */
  const hasPermission = (
    requiredPermissions: string | string[],
    mode: 'all' | 'any' = 'all',
  ): boolean => {
    return authManager.hasPermission(requiredPermissions, { mode })
  }

  /**
   * 检查是否拥有指定角色
   */
  const hasRole = (requiredRoles: string | string[], mode: 'all' | 'any' = 'all'): boolean => {
    return authManager.hasRole(requiredRoles, { mode })
  }

  /**
   * 创建权限检查的计算属性
   *
   * @param requiredPermissions - 需要的权限
   * @param mode - 检查模式
   * @returns 响应式的权限检查结果
   */
  const can = (
    requiredPermissions: string | string[],
    mode: 'all' | 'any' = 'all',
  ): ReturnType<typeof computed<boolean>> => {
    return computed(() => {
      const userPerms = user.value?.permissions ?? []
      const required = Array.isArray(requiredPermissions)
        ? requiredPermissions
        : [requiredPermissions]

      if (required.length === 0) return true
      if (userPerms.length === 0) return false

      if (mode === 'all') {
        return required.every(p => userPerms.includes(p))
      }
      return required.some(p => userPerms.includes(p))
    })
  }

  return {
    permissions,
    roles,
    hasPermission,
    hasRole,
    isSuperAdmin,
    can,
  }
}

