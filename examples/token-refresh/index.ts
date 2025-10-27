/**
 * Token 自动刷新示例
 * 
 * 演示：
 * - Token 过期前自动刷新
 * - 手动刷新 Token
 * - Token 刷新失败处理
 * - 刷新阈值配置
 */

import { createAuthManager } from '@ldesign/auth'
import { createHttpClient } from '@ldesign/http'
import { createCache } from '@ldesign/cache'

// 创建 HTTP 客户端
const httpClient = createHttpClient({
  baseURL: 'https://api.example.com',
  timeout: 10000,
})

// 创建缓存（可选）
const cache = createCache({
  prefix: 'auth',
  ttl: 3600,
})

// 创建认证管理器，启用自动刷新
const auth = createAuthManager(
  {
    // 启用自动刷新
    autoRefresh: true,

    // 在 Token 过期前 5 分钟（300 秒）刷新
    refreshThreshold: 300,

    // API 端点
    endpoints: {
      login: '/api/auth/login',
      logout: '/api/auth/logout',
      refresh: '/api/auth/refresh',
    },
  },
  httpClient,
  cache,
)

// ========================================
// 监听 Token 刷新事件
// ========================================

const events = auth.getEvents()

events.on('tokenRefreshed', (token) => {
  console.log('✅ Token 已刷新')
  console.log('新 Access Token:', token.accessToken)
  console.log('过期时间:', new Date(Date.now() + token.expiresIn * 1000))

  // 可以在这里更新 UI，显示"Token 已刷新"的提示
  showNotification('Token 已刷新')
})

events.on('tokenRefreshFailed', (error) => {
  console.error('❌ Token 刷新失败:', error.message)

  // Token 刷新失败，通常意味着 Refresh Token 也过期了
  // 需要用户重新登录
  console.log('请重新登录')
  redirectToLogin()
})

// ========================================
// 登录
// ========================================

async function login() {
  try {
    await auth.login({
      username: 'user@example.com',
      password: 'password123',
    })

    console.log('✅ 登录成功')
    const tokenManager = auth.getTokenManager()

    // 显示 Token 信息
    const accessToken = tokenManager.getAccessToken()
    console.log('Access Token:', accessToken)

    // 检查 Token 过期时间
    const ttl = tokenManager.getTimeToLive()
    console.log('Token 剩余时间:', Math.floor(ttl / 1000), '秒')

    // Token 会在过期前 5 分钟自动刷新
    // 无需手动处理
  }
  catch (error) {
    console.error('登录失败:', error)
  }
}

// ========================================
// 手动刷新 Token
// ========================================

async function manualRefresh() {
  try {
    console.log('手动刷新 Token...')
    await auth.refreshToken()
    console.log('✅ Token 刷新成功')
  }
  catch (error) {
    console.error('❌ Token 刷新失败:', error)
  }
}

// ========================================
// 检查 Token 状态
// ========================================

function checkTokenStatus() {
  const tokenManager = auth.getTokenManager()

  const accessToken = tokenManager.getAccessToken()
  if (!accessToken) {
    console.log('没有 Token')
    return
  }

  // 获取剩余时间
  const ttl = tokenManager.getTimeToLive()
  const minutes = Math.floor(ttl / 60000)
  const seconds = Math.floor((ttl % 60000) / 1000)

  console.log(`Token 剩余时间: ${minutes} 分 ${seconds} 秒`)

  // 检查是否即将过期
  if (tokenManager.isExpiring(300)) {
    // 剩余时间少于 5 分钟
    console.log('⚠️ Token 即将过期，将自动刷新')
  }

  // 检查是否已过期
  if (tokenManager.isExpired()) {
    console.log('❌ Token 已过期')
  }
}

// ========================================
// HTTP 拦截器集成
// ========================================

// 请求拦截器：自动添加 Token
httpClient.interceptors.request.use((config) => {
  const accessToken = auth.getAccessToken()

  if (accessToken) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  return config
})

// 响应拦截器：处理 401 错误
httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // 如果是 401 且还没重试过
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        // 尝试刷新 Token
        await auth.refreshToken()

        // 使用新 Token 重试请求
        const newToken = auth.getAccessToken()
        originalRequest.headers.Authorization = `Bearer ${newToken}`

        return httpClient.request(originalRequest)
      }
      catch (refreshError) {
        // 刷新失败，跳转到登录页
        console.error('Token 刷新失败，请重新登录')
        redirectToLogin()
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  },
)

// ========================================
// 使用 Token 调用 API
// ========================================

async function callProtectedAPI() {
  try {
    // Token 会自动添加到请求头
    const response = await httpClient.get('/api/user/profile')

    console.log('API 响应:', response.data)
  }
  catch (error) {
    console.error('API 调用失败:', error)
  }
}

// ========================================
// 高级：自定义刷新逻辑
// ========================================

// 监听 Token 即将过期事件
const tokenManager = auth.getTokenManager()

// 定期检查 Token 状态（每分钟检查一次）
setInterval(() => {
  if (auth.isAuthenticated()) {
    const ttl = tokenManager.getTimeToLive()

    // 如果剩余时间少于 5 分钟，手动触发刷新
    if (ttl < 5 * 60 * 1000 && ttl > 0) {
      console.log('Token 即将过期，触发刷新')
      auth.refreshToken().catch(console.error)
    }
  }
}, 60 * 1000) // 每分钟检查一次

// ========================================
// 辅助函数
// ========================================

function showNotification(message: string) {
  // 显示通知（实际应用中使用 UI 组件）
  console.log('📢', message)
}

function redirectToLogin() {
  // 跳转到登录页
  console.log('🔄 重定向到登录页...')
  // window.location.href = '/login'
}

// ========================================
// 主程序
// ========================================

async function main() {
  console.log('=== Token 自动刷新示例 ===\n')

  // 1. 登录
  console.log('1. 登录...')
  await login()
  console.log('')

  // 2. 检查 Token 状态
  console.log('2. 检查 Token 状态')
  checkTokenStatus()
  console.log('')

  // 3. 调用受保护的 API
  console.log('3. 调用受保护的 API')
  await callProtectedAPI()
  console.log('')

  // 4. 等待一段时间后手动刷新
  console.log('4. 等待 5 秒后手动刷新 Token...')
  await new Promise(resolve => setTimeout(resolve, 5000))
  await manualRefresh()
  console.log('')

  // 5. 再次检查状态
  console.log('5. 刷新后的 Token 状态')
  checkTokenStatus()
  console.log('')

  console.log('✅ 示例完成')
  console.log('\n说明:')
  console.log('- Token 会在过期前 5 分钟自动刷新')
  console.log('- 也可以手动调用 refreshToken() 刷新')
  console.log('- HTTP 拦截器会自动处理 401 错误并重试')
  console.log('- 刷新失败会触发 tokenRefreshFailed 事件')
}

// 运行示例
main().catch(console.error)

