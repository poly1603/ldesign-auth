# 快速开始

本指南将帮助你在 5 分钟内上手 @ldesign/auth。

## 安装

```bash
# 使用 pnpm（推荐）
pnpm add @ldesign/auth @ldesign/http

# 使用 npm
npm install @ldesign/auth @ldesign/http

# 使用 yarn
yarn add @ldesign/auth @ldesign/http
```

## 基础使用

### 1. 创建 HTTP 客户端

首先创建一个 HTTP 客户端，用于与后端 API 通信：

```typescript
import { createHttpClient } from '@ldesign/http'

const httpClient = createHttpClient({
  baseURL: 'https://api.example.com',
  timeout: 10000
})
```

### 2. 创建认证管理器

使用 HTTP 客户端创建认证管理器：

```typescript
import { createAuthManager } from '@ldesign/auth'

const auth = createAuthManager(
  {
    // 开启自动刷新 Token
    autoRefresh: true,
    
    // Token 刷新阈值（秒），在过期前 5 分钟刷新
    refreshThreshold: 300,
    
    // API 端点配置
    endpoints: {
      login: '/api/auth/login',
      logout: '/api/auth/logout',
      refresh: '/api/auth/refresh'
    }
  },
  httpClient
)
```

### 3. 登录

```typescript
async function handleLogin() {
  try {
    await auth.login({
      username: 'user@example.com',
      password: 'password123'
    })
    
    console.log('登录成功！')
    console.log('当前用户:', auth.getUser())
  } 
  catch (error) {
    console.error('登录失败:', error.message)
  }
}
```

### 4. 检查认证状态

```typescript
if (auth.isAuthenticated()) {
  console.log('用户已登录')
  const user = auth.getUser()
  console.log('用户信息:', user)
}
else {
  console.log('用户未登录')
}
```

### 5. 获取 Token

```typescript
const accessToken = auth.getAccessToken()

// 使用 Token 调用 API
const response = await fetch('https://api.example.com/user/profile', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
})
```

### 6. 登出

```typescript
async function handleLogout() {
  await auth.logout()
  console.log('已登出')
}
```

## 监听事件

监听认证相关的事件：

```typescript
const events = auth.getEvents()

// 登录成功
events.on('loginSuccess', (response) => {
  console.log('用户登录:', response.user.username)
})

// 登录失败
events.on('loginFailed', (error) => {
  console.error('登录失败:', error.message)
})

// Token 刷新
events.on('tokenRefreshed', (token) => {
  console.log('Token 已刷新')
})

// Session 超时
events.on('sessionTimeout', () => {
  console.log('Session 超时，请重新登录')
  // 跳转到登录页
  window.location.href = '/login'
})

// 用户登出
events.on('userUnloaded', () => {
  console.log('用户已登出')
})
```

## 订阅状态变化

使用订阅模式监听状态变化：

```typescript
const unsubscribe = auth.subscribe((state) => {
  console.log('认证状态:', {
    isAuthenticated: state.isAuthenticated,
    user: state.user,
    loading: state.loading,
    error: state.error
  })
})

// 取消订阅
unsubscribe()
```

## 完整示例

这是一个完整的登录页面示例：

```typescript
import { createAuthManager } from '@ldesign/auth'
import { createHttpClient } from '@ldesign/http'

// 初始化
const httpClient = createHttpClient({
  baseURL: 'https://api.example.com'
})

const auth = createAuthManager(
  {
    autoRefresh: true,
    refreshThreshold: 300,
    endpoints: {
      login: '/api/auth/login',
      logout: '/api/auth/logout',
      refresh: '/api/auth/refresh'
    }
  },
  httpClient
)

// 事件监听
const events = auth.getEvents()

events.on('loginSuccess', (response) => {
  console.log('✅ 登录成功:', response.user.username)
  // 跳转到首页
  window.location.href = '/'
})

events.on('loginFailed', (error) => {
  console.error('❌ 登录失败:', error.message)
  // 显示错误消息
  showError(error.message)
})

events.on('tokenRefreshed', () => {
  console.log('🔄 Token 已刷新')
})

events.on('sessionTimeout', () => {
  console.log('⏰ Session 超时')
  window.location.href = '/login'
})

// 登录表单处理
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  
  const username = document.getElementById('username').value
  const password = document.getElementById('password').value
  
  try {
    await auth.login({ username, password })
  } 
  catch (error) {
    console.error('登录错误:', error)
  }
})

// 登出按钮
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await auth.logout()
  window.location.href = '/login'
})

// 检查初始状态
if (auth.isAuthenticated()) {
  console.log('用户已登录:', auth.getUser())
}
```

## 使用缓存（可选）

为了提升性能，可以添加缓存支持：

```typescript
import { createCache } from '@ldesign/cache'

const cache = createCache({
  prefix: 'auth',
  ttl: 3600 // 缓存 1 小时
})

const auth = createAuthManager(
  {
    autoRefresh: true,
    endpoints: {
      login: '/api/auth/login',
      logout: '/api/auth/logout',
      refresh: '/api/auth/refresh'
    }
  },
  httpClient,
  cache // 传入缓存实例
)
```

## Session 管理

启用 Session 管理功能：

```typescript
const auth = createAuthManager(
  {
    autoRefresh: true,
    
    // Session 配置
    session: {
      // 30 分钟无活动自动登出
      timeout: 1800000,
      
      // 监控用户活动
      monitorActivity: true,
      
      // 多标签页同步
      enableTabSync: true
    },
    
    endpoints: {
      login: '/api/auth/login',
      logout: '/api/auth/logout',
      refresh: '/api/auth/refresh'
    }
  },
  httpClient
)

// 获取 Session 管理器
const sessionManager = auth.getSessionManager()

// 监听活动
sessionManager.onActivity(() => {
  console.log('用户有活动')
})

// 监听超时
sessionManager.onTimeout(() => {
  console.log('Session 超时')
  auth.logout()
})

// 获取剩余时间
const remainingTime = sessionManager.getRemainingTime()
console.log('剩余时间:', Math.floor(remainingTime / 1000), '秒')
```

## 错误处理

正确处理认证错误：

```typescript
import { isAuthError, AuthErrorCode } from '@ldesign/auth/errors'

try {
  await auth.login({ username, password })
}
catch (error) {
  if (isAuthError(error)) {
    switch (error.code) {
      case AuthErrorCode.INVALID_CREDENTIALS:
        console.error('用户名或密码错误')
        break
        
      case AuthErrorCode.ACCOUNT_LOCKED:
        console.error('账号已被锁定')
        break
        
      case AuthErrorCode.MFA_REQUIRED:
        console.error('需要 MFA 验证')
        // 显示 MFA 输入框
        break
        
      case AuthErrorCode.NETWORK_ERROR:
        console.error('网络错误，请稍后重试')
        break
        
      default:
        console.error('登录失败:', error.message)
    }
  }
  else {
    console.error('未知错误:', error)
  }
}
```

## 下一步

现在你已经掌握了基础用法，可以继续学习：

- [认证管理器详解](/guide/auth-manager) - 深入了解核心功能
- [Token 管理](/guide/token) - Token 的存储、刷新和验证
- [Session 管理](/guide/session) - 会话超时和多标签页同步
- [OAuth 2.0](/guide/oauth) - 社交登录集成
- [Vue 集成](/guide/vue) - 在 Vue 3 项目中使用
- [完整示例](/examples/) - 更多实战示例

## 常见问题

### Q: Token 存储在哪里？

A: 默认存储在 localStorage 中，你可以自定义存储策略：

```typescript
import { createTokenStorage } from '@ldesign/auth/token'

const storage = createTokenStorage({
  type: 'sessionStorage', // 使用 sessionStorage
  encrypt: true           // 加密存储
})
```

### Q: 如何自定义 API 响应格式？

A: 使用 `transform` 选项：

```typescript
const auth = createAuthManager(
  {
    transform: {
      login: (response) => ({
        user: response.data.user,
        token: response.data.token
      })
    }
  },
  httpClient
)
```

### Q: 支持多个认证实例吗？

A: 支持，每个实例相互独立：

```typescript
const adminAuth = createAuthManager(adminConfig, adminHttpClient)
const userAuth = createAuthManager(userConfig, userHttpClient)
```

更多问题请查看 [常见问题](/guide/faq) 或在 [GitHub Issues](https://github.com/ldesign/ldesign/issues) 提问。

