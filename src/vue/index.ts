/**
 * Vue 3 集成模块
 *
 * @example
 * ```typescript
 * import { createApp } from 'vue'
 * import { AuthPlugin, useAuth } from '@ldesign/auth/vue'
 * import { createHttpClient } from '@ldesign/http'
 *
 * const httpClient = createHttpClient()
 * const app = createApp(App)
 *
 * // 使用插件
 * app.use(AuthPlugin, {
 *   httpClient,
 *   autoRefresh: true,
 * })
 *
 * app.mount('#app')
 * ```
 *
 * 在组件中使用：
 *
 * ```vue
 * <script setup lang="ts">
 * import { useAuth } from '@ldesign/auth/vue'
 *
 * const { isAuthenticated, user, login, logout } = useAuth()
 * </script>
 *
 * <template>
 *   <div v-if="isAuthenticated">
 *     <p>欢迎, {{ user?.username }}</p>
 *     <button @click="logout">登出</button>
 *   </div>
 * </template>
 * ```
 */

// 导出 Composables
export * from './composables'

// 导出 Plugin
export { AuthPlugin, AUTH_KEY } from './plugin'
export type { AuthPluginOptions } from './plugin'

// 默认导出插件
export { default } from './plugin'

