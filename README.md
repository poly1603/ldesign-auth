# @ldesign/auth

<div align="center">

**🔐 LDesign 认证授权系统**

完整的身份认证解决方案 - JWT、Token 管理、Session、事件系统

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](./CHANGELOG.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

[特性](#-特性) • [安装](#-安装) • [快速开始](#-快速开始) • [文档](#-文档) • [示例](#-示例)

</div>

---

## ✨ 特性

### 核心功能（v0.1.0 已完成）

- ✅ **JWT 认证** - 完整的 JWT 解析、验证和管理
- ✅ **Token 管理** - Access Token + Refresh Token 双 Token 机制
- ✅ **自动刷新** - Token 过期前自动刷新
- ✅ **Session 管理** - 超时检测、活动监控、多标签页同步
- ✅ **事件系统** - 丰富的认证事件（登录、登出、Token 刷新等）
- ✅ **错误处理** - 完整的错误类型和错误码
- ✅ **状态持久化** - localStorage/sessionStorage/Cookie/Memory
- ✅ **TypeScript** - 完整的类型定义和类型安全
- ✅ **集成支持** - @ldesign/http、@ldesign/cache 深度集成

### 即将推出

- 🚧 **OAuth 2.0** - GitHub、Google、Facebook 等社交登录
- 🚧 **MFA/2FA** - 多因素认证（TOTP、SMS、Email）
- 🚧 **SSO** - SAML 2.0 单点登录
- 🚧 **WebAuthn** - 生物识别登录
- 🚧 **密码管理** - 密码重置、验证、策略
- 🚧 **设备管理** - 设备追踪和管理
- 🚧 **安全审计** - 登录历史和审计日志
- 🚧 **Vue 集成** - Vue 3 Composables 和 Plugin

## 📦 安装

```bash
pnpm add @ldesign/auth @ldesign/http @ldesign/cache
```

## 🚀 快速开始

### 基础使用

```typescript
import { createAuthManager } from '@ldesign/auth'
import { createHttpClient } from '@ldesign/http'
import { createCache } from '@ldesign/cache'

// 创建 HTTP 客户端
const httpClient = createHttpClient({
  baseURL: 'https://api.example.com',
})

// 创建缓存管理器（可选）
const cache = createCache()

// 创建认证管理器
const auth = createAuthManager(
  {
    autoRefresh: true,           // 启用自动刷新
    refreshThreshold: 300,       // Token 过期前 5 分钟刷新
    endpoints: {
      login: '/api/auth/login',
      logout: '/api/auth/logout',
      refresh: '/api/auth/refresh',
    },
  },
  httpClient,
  cache,
)

// 登录
try {
  await auth.login({
    username: 'user@example.com',
    password: 'password123',
  })
  
  console.log('登录成功！')
  console.log('用户信息:', auth.getUser())
} catch (error) {
  console.error('登录失败:', error.message)
}

// 获取用户信息
const user = auth.getUser()
console.log('当前用户:', user)

// 获取 Access Token
const token = auth.getAccessToken()
console.log('Access Token:', token)

// 检查认证状态
if (auth.isAuthenticated()) {
  console.log('用户已登录')
} else {
  console.log('用户未登录')
}

// 登出
await auth.logout()
```

### 监听认证事件

```typescript
const events = auth.getEvents()

// 监听用户加载
events.on('userLoaded', (user) => {
  console.log('用户已加载:', user)
})

// 监听登录成功
events.on('loginSuccess', (response) => {
  console.log('登录成功:', response.user)
})

// 监听登录失败
events.on('loginFailed', (error) => {
  console.error('登录失败:', error)
})

// 监听 Token 刷新
events.on('tokenRefreshed', (token) => {
  console.log('Token 已刷新')
})

// 监听 Token 过期
events.on('accessTokenExpired', () => {
  console.log('Token 已过期，请重新登录')
})

// 监听 Session 超时
events.on('sessionTimeout', () => {
  console.log('Session 已超时')
})
```

### 订阅状态变化

```typescript
// 订阅认证状态变化
const unsubscribe = auth.subscribe((state) => {
  console.log('认证状态已变化:')
  console.log('- 是否已认证:', state.isAuthenticated)
  console.log('- 当前用户:', state.user)
  console.log('- Token 信息:', state.token)
  console.log('- 加载状态:', state.loading)
  console.log('- 错误信息:', state.error)
})

// 取消订阅
unsubscribe()
```

### Session 管理

```typescript
const sessionManager = auth.getSessionManager()

// 获取 Session 状态
const sessionState = sessionManager.getState()
console.log('Session 状态:', sessionState.active)
console.log('最后活动时间:', sessionState.lastActivity)
console.log('过期时间:', sessionState.expiresAt)

// 获取剩余时间
const remaining = sessionManager.getRemainingTime()
console.log(`Session 剩余 ${Math.floor(remaining / 1000)} 秒`)

// 手动延长 Session
sessionManager.extendSession()

// 监听 Session 超时
sessionManager.onTimeout(() => {
  console.log('Session 已超时，请重新登录')
  auth.logout()
})
```

## 📚 文档

### 核心 API

#### AuthManager

- `login(credentials)` - 登录
- `logout()` - 登出
- `refreshToken()` - 刷新 Token
- `getUser()` - 获取当前用户
- `getAccessToken()` - 获取 Access Token
- `isAuthenticated()` - 检查认证状态
- `subscribe(listener)` - 订阅状态变化
- `getEvents()` - 获取事件发射器
- `getSessionManager()` - 获取 Session 管理器
- `getTokenManager()` - 获取 Token 管理器

#### 事件类型

- `userLoaded` - 用户已加载
- `userUnloaded` - 用户已退出
- `loginSuccess` - 登录成功
- `loginFailed` - 登录失败
- `logoutSuccess` - 登出成功
- `tokenRefreshed` - Token 已刷新
- `accessTokenExpiring` - Token 即将过期
- `accessTokenExpired` - Token 已过期
- `sessionTimeout` - Session 已超时
- `error` - 错误事件

### 模块化使用

```typescript
// JWT 模块
import { jwtParser, jwtValidator } from '@ldesign/auth/jwt'

const decoded = jwtParser.decode('eyJhbGc...')
const isExpired = jwtParser.isExpired(decoded)

// Token 管理模块
import { createTokenManager } from '@ldesign/auth/token'

const tokenManager = createTokenManager(config, httpClient, cache)

// Session 管理模块
import { createSessionManager } from '@ldesign/auth/session'

const sessionManager = createSessionManager({ timeout: 30 * 60 * 1000 })

// 错误处理模块
import { AuthError, TokenError, AuthErrorCode } from '@ldesign/auth/errors'

throw AuthError.fromCode(AuthErrorCode.INVALID_CREDENTIALS)
```

## 🔧 配置

### AuthConfig

```typescript
interface AuthConfig {
  // Token 存储键名
  tokenKey?: string               // 默认: 'auth-token'
  
  // 用户信息存储键名
  userKey?: string                // 默认: 'auth-user'
  
  // Token 刷新阈值（秒）
  refreshThreshold?: number       // 默认: 300 (5分钟)
  
  // 是否自动刷新 Token
  autoRefresh?: boolean          // 默认: true
  
  // 登录页路由
  loginRoute?: string            // 默认: '/login'
  
  // 登录成功后重定向路由
  redirectRoute?: string         // 默认: '/'
  
  // API 基础 URL
  baseURL?: string
  
  // API 端点配置
  endpoints?: {
    login?: string               // 默认: '/api/auth/login'
    logout?: string              // 默认: '/api/auth/logout'
    refresh?: string             // 默认: '/api/auth/refresh'
    userInfo?: string            // 默认: '/api/auth/user'
    register?: string            // 默认: '/api/auth/register'
  }
}
```

## 💡 示例

更多示例请查看 `examples/` 目录。

## 🤝 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](../../CONTRIBUTING.md) 了解详情。

## 📄 许可证

[MIT](./LICENSE) © LDesign Team

---

<div align="center">

**Made with ❤️ by LDesign Team**

</div>


