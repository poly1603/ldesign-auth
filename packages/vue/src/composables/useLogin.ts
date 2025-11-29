/**
 * useLogin Composable
 *
 * 提供登录表单相关的响应式状态和方法
 *
 * @module @ldesign/auth-vue/composables
 * @author LDesign Team
 */

import { inject, reactive, ref } from 'vue'
import type { Credentials, AuthError } from '@ldesign/auth-core'
import type { LoginResult } from '@ldesign/auth-core'
import { AUTH_MANAGER_KEY } from '../plugin/symbols'

/**
 * 登录表单数据
 */
export interface LoginFormData {
  /** 用户名 */
  username: string
  /** 密码 */
  password: string
  /** 记住我 */
  rememberMe: boolean
  /** 验证码 */
  captcha?: string
}

/**
 * useLogin 返回值类型
 */
export interface UseLoginReturn {
  /** 表单数据 */
  form: LoginFormData
  /** 是否正在登录 */
  isLoading: ReturnType<typeof ref<boolean>>
  /** 错误信息 */
  error: ReturnType<typeof ref<AuthError | null>>
  /** 登录方法 */
  login: () => Promise<LoginResult>
  /** 重置表单 */
  resetForm: () => void
  /** 清除错误 */
  clearError: () => void
}

/**
 * 登录 Composable
 *
 * @param initialValues - 初始表单值
 * @returns 登录相关的响应式状态和方法
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useLogin } from '@ldesign/auth-vue'
 * import { useRouter } from 'vue-router'
 *
 * const router = useRouter()
 * const { form, isLoading, error, login, clearError } = useLogin()
 *
 * const handleSubmit = async () => {
 *   const result = await login()
 *   if (result.success) {
 *     router.push('/')
 *   }
 * }
 * </script>
 *
 * <template>
 *   <form @submit.prevent="handleSubmit">
 *     <div v-if="error" class="error">{{ error.message }}</div>
 *
 *     <input
 *       v-model="form.username"
 *       placeholder="用户名"
 *       @focus="clearError"
 *     />
 *
 *     <input
 *       v-model="form.password"
 *       type="password"
 *       placeholder="密码"
 *       @focus="clearError"
 *     />
 *
 *     <label>
 *       <input v-model="form.rememberMe" type="checkbox" />
 *       记住我
 *     </label>
 *
 *     <button type="submit" :disabled="isLoading">
 *       {{ isLoading ? '登录中...' : '登录' }}
 *     </button>
 *   </form>
 * </template>
 * ```
 */
export function useLogin(
  initialValues: Partial<LoginFormData> = {},
): UseLoginReturn {
  const authManager = inject(AUTH_MANAGER_KEY)

  if (!authManager) {
    throw new Error(
      '[useLogin] AuthManager 未提供。请确保在应用中使用了 authPlugin。',
    )
  }

  // 默认表单值
  const defaultForm: LoginFormData = {
    username: '',
    password: '',
    rememberMe: false,
    captcha: undefined,
  }

  // 响应式表单数据
  const form = reactive<LoginFormData>({
    ...defaultForm,
    ...initialValues,
  })

  // 加载状态
  const isLoading = ref(false)

  // 错误信息
  const error = ref<AuthError | null>(null)

  /**
   * 执行登录
   */
  const login = async (): Promise<LoginResult> => {
    isLoading.value = true
    error.value = null

    try {
      const credentials: Credentials = {
        username: form.username,
        password: form.password,
        rememberMe: form.rememberMe,
        captcha: form.captcha,
      }

      const result = await authManager.login(credentials)

      if (!result.success && result.error) {
        error.value = result.error
      }

      return result
    }
    catch (err) {
      const authError: AuthError = {
        code: 'LOGIN_ERROR',
        message: err instanceof Error ? err.message : '登录失败',
        details: err,
      }
      error.value = authError
      return { success: false, error: authError }
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * 重置表单
   */
  const resetForm = (): void => {
    Object.assign(form, defaultForm)
    error.value = null
  }

  /**
   * 清除错误
   */
  const clearError = (): void => {
    error.value = null
  }

  return {
    form,
    isLoading,
    error,
    login,
    resetForm,
    clearError,
  }
}

