/**
 * useOAuth Composable
 *
 * Vue 3 OAuth 组合式函数
 */

import { ref, type Ref } from 'vue'
import type { HttpClient } from '@ldesign/http'
import type { OAuthConfig, TokenInfo } from '../../types'
import { OAuthManager } from '../../oauth/OAuthManager'

/**
 * useOAuth 返回值
 */
export interface UseOAuthReturn {
  /**
   * 是否正在授权
   */
  isAuthorizing: Ref<boolean>

  /**
   * 错误信息
   */
  error: Ref<Error | null>

  /**
   * 开始授权
   */
  authorize: () => Promise<void>

  /**
   * 处理回调
   */
  handleCallback: () => Promise<TokenInfo>

  /**
   * OAuth 管理器实例
   */
  oauthManager: OAuthManager
}

/**
 * OAuth 组合式函数
 *
 * @param config - OAuth 配置
 * @param httpClient - HTTP 客户端
 * @returns useOAuth 返回值
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useOAuth } from '@ldesign/auth/vue'
 * import { createHttpClient } from '@ldesign/http'
 *
 * const httpClient = createHttpClient()
 * const { isAuthorizing, error, authorize, handleCallback } = useOAuth(
 *   {
 *     clientId: 'your-client-id',
 *     authorizationEndpoint: 'https://provider.com/oauth/authorize',
 *     tokenEndpoint: 'https://provider.com/oauth/token',
 *     redirectUri: 'http://localhost:3000/callback',
 *     usePKCE: true,
 *   },
 *   httpClient,
 * )
 *
 * // 在登录页面
 * async function loginWithOAuth() {
 *   await authorize()
 * }
 *
 * // 在回调页面
 * onMounted(async () => {
 *   try {
 *     const token = await handleCallback()
 *     console.log('获取到 Token:', token)
 *   } catch (err) {
 *     console.error('OAuth 失败:', err)
 *   }
 * })
 * </script>
 *
 * <template>
 *   <button @click="loginWithOAuth" :disabled="isAuthorizing">
 *     {{ isAuthorizing ? '授权中...' : '使用 OAuth 登录' }}
 *   </button>
 *   <p v-if="error">{{ error.message }}</p>
 * </template>
 * ```
 */
export function useOAuth(
  config: OAuthConfig,
  httpClient?: HttpClient,
): UseOAuthReturn {
  const manager = new OAuthManager(config, httpClient)

  const isAuthorizing = ref(false)
  const error = ref<Error | null>(null)

  // 开始授权
  async function authorize() {
    try {
      isAuthorizing.value = true
      error.value = null

      const authUrl = await manager.authorize()
      window.location.href = authUrl
    }
    catch (err) {
      error.value = err as Error
      throw err
    }
    finally {
      isAuthorizing.value = false
    }
  }

  // 处理回调
  async function handleCallback(): Promise<TokenInfo> {
    try {
      isAuthorizing.value = true
      error.value = null

      const params = new URLSearchParams(window.location.search)
      return await manager.handleCallback(params)
    }
    catch (err) {
      error.value = err as Error
      throw err
    }
    finally {
      isAuthorizing.value = false
    }
  }

  return {
    isAuthorizing,
    error,
    authorize,
    handleCallback,
    oauthManager: manager,
  }
}

