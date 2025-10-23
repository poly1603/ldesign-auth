/**
 * 基础认证示例
 */

import { createAuthManager } from '@ldesign/auth'
import { createHttpClient } from '@ldesign/http'
import { createCache } from '@ldesign/cache'

// 创建 HTTP 客户端
const httpClient = createHttpClient({
  baseURL: 'https://api.example.com',
})

// 创建缓存管理器
const cache = createCache()

// 创建认证管理器
const auth = createAuthManager(
  {
    autoRefresh: true,
    refreshThreshold: 300,
    endpoints: {
      login: '/api/auth/login',
      logout: '/api/auth/logout',
      refresh: '/api/auth/refresh',
    },
  },
  httpClient,
  cache,
)

// 监听认证事件
const events = auth.getEvents()

events.on('loginSuccess', (response) => {
  console.log('✅ 登录成功!')
  console.log('用户:', response.user.username)
  console.log('Token:', response.token.accessToken)
})

events.on('loginFailed', (error) => {
  console.error('❌ 登录失败:', error.message)
})

events.on('tokenRefreshed', (token) => {
  console.log('🔄 Token 已刷新')
  console.log('新 Token:', token.accessToken)
})

events.on('sessionTimeout', () => {
  console.log('⏰ Session 超时，请重新登录')
})

// 订阅状态变化
auth.subscribe((state) => {
  console.log('📊 认证状态变化:')
  console.log('- 是否认证:', state.isAuthenticated)
  console.log('- 当前用户:', state.user?.username)
  console.log('- 加载状态:', state.loading)
})

// 登录
async function login() {
  try {
    await auth.login({
      username: 'user@example.com',
      password: 'password123',
    })

    console.log('当前用户:', auth.getUser())
    console.log('Access Token:', auth.getAccessToken())
  }
  catch (error) {
    console.error('登录错误:', error)
  }
}

// 登出
async function logout() {
  await auth.logout()
  console.log('已登出')
}

// Session 管理
const sessionManager = auth.getSessionManager()

sessionManager.onActivity(() => {
  console.log('👆 用户有活动')
})

sessionManager.onTimeout(() => {
  console.log('⏰ Session 超时')
  logout()
})

console.log('Session 剩余时间:', Math.floor(sessionManager.getRemainingTime() / 1000), '秒')

// 执行登录
login()

