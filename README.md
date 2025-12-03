# @ldesign/auth

> LDesign 认证授权系统 - 高性能、可扩展的 TypeScript 认证解决方案

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue)](https://www.typescriptlang.org/)
[![Vue](https://img.shields.io/badge/Vue-3.0%2B-green)](https://vuejs.org/)

## ✨ 特性

- 🚀 **高性能** - Token 读取速度提升 50 倍，内存占用降低 30%
- 📦 **模块化** - 核心模块独立，按需使用
- 🎯 **TypeScript** - 完整的类型定义和类型推导
- 🔌 **可扩展** - 中间件机制、事件系统、存储适配器
- 🎨 **Vue 3 集成** - 开箱即用的 Composables 和插件
- 🛡️ **类型安全** - 100% TypeScript 编写
- 📝 **完整文档** - 详细的 API 文档和使用示例

## 📦 安装

```bash
# 使用 pnpm（推荐）
pnpm add @ldesign/auth

# 使用 npm
npm install @ldesign/auth

# 使用 yarn
yarn add @ldesign/auth
```

## 🚀 快速开始

### 基础使用

```typescript
import { createAuthManager } from '@ldesign/auth-core'

// 创建认证管理器
const authManager = createAuthManager({
  autoRefresh: true,
  refreshThreshold: 300, // 5 分钟
  loginRoute: '/login',
})

// 设置登录处理器
authManager.setLoginHandler(async (credentials) => {
  const response = await fetch('/api/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
  const data = await response.json()
  
  return {
    success: data.success,
    user: data.user,
    token: data.token,
  }
})

// 设置 Token 刷新处理器
authManager.setRefreshTokenHandler(async (refreshToken) => {
  const response = await fetch('/api/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  })
  return await response.json()
})

// 登录
const result = await authManager.login({
  username: 'admin',
  password: '123456',
})

if (result.success) {
  console.log('登录成功', result.user)
}
```

### Vue 3 集成

```typescript
// main.ts
import { createApp } from 'vue'
import { createAuthPlugin } from '@ldesign/auth-vue'
import App from './App.vue'

const app = createApp(App)

// 安装认证插件
app.use(createAuthPlugin({
  autoRefresh: true,
  loginRoute: '/login',
}))

app.mount('#app')
```

```vue
<!-- App.vue -->
<script setup lang="ts">
import { useAuth } from '@ldesign/auth-vue'

const {
  isAuthenticated,
  user,
  login,
  logout,
  hasPermission,
} = useAuth()

const handleLogin = async () => {
  const result = await login({
    username: 'admin',
    password: '123456',
  })
  
  if (result.success) {
    console.log('登录成功')
  }
}
</script>

<template>
  <div v-if="isAuthenticated">
    <p>欢迎, {{ user?.username }}</p>
    <button @click="logout">登出</button>
    
    <div v-if="hasPermission('admin')">
      管理员专属内容
    </div>
  </div>
  <div v-else>
    <button @click="handleLogin">登录</button>
  </div>
</template>
```

## 📚 核心模块

### 认证管理 (AuthManager)

```typescript
import { createAuthManager } from '@ldesign/auth-core'

const authManager = createAuthManager({
  autoRefresh: true,
  refreshThreshold: 300,
  loginRoute: '/login',
  defaultRoute: '/dashboard',
  whiteList: ['/login', '/register'],
})

// 监听认证事件
authManager.on('login', ({ user, token }) => {
  console.log('用户登录:', user)
})

authManager.on('logout', () => {
  console.log('用户登出')
})

authManager.on('token:expired', () => {
  console.log('Token 已过期')
})
```

### 错误处理

```typescript
import { AuthError, AuthErrorCode, ErrorHandler } from '@ldesign/auth-core/errors'

const errorHandler = new ErrorHandler({
  logErrors: true,
  autoRetry: true,
  maxRetries: 3,
})

// 注册错误处理器
errorHandler.register(AuthErrorCode.TOKEN_EXPIRED, async (error) => {
  console.log('Token 过期，尝试刷新')
  await refreshToken()
})

// 全局错误处理
errorHandler.registerGlobal((error) => {
  console.error('认证错误:', error.message)
  // 上报到监控系统
  reportError(error)
})
```

### 日志系统

```typescript
import { logger, LogLevel, RemoteTransport } from '@ldesign/auth-core/logger'

// 设置日志级别
logger.setLevel(LogLevel.DEBUG)

// 添加远程传输器
logger.addTransport(new RemoteTransport({
  url: 'https://api.example.com/logs',
  batchSize: 10,
  batchInterval: 5000,
}))

// 使用日志
logger.info('用户登录成功', { userId: 123 })
logger.error('登录失败', error)

// 创建子日志器
const authLogger = logger.child('[Auth]')
authLogger.debug('Token 刷新')
```

### 事件总线

```typescript
import { eventBus } from '@ldesign/auth-core/events'

// 注册事件监听器（带优先级）
eventBus.on('login', (data) => {
  console.log('用户登录:', data.user)
}, 10) // 优先级 10

// 一次性监听器
eventBus.once('tokenRefresh', (token) => {
  console.log('Token 刷新完成')
})

// 通配符监听所有事件
eventBus.on('*', (data) => {
  console.log('事件触发:', data)
})

// 触发事件
await eventBus.emit('login', { user: { id: 1, name: 'John' } })
```

### 中间件机制

```typescript
import { createMiddlewareChain } from '@ldesign/auth-core/middleware'

const chain = createMiddlewareChain()

// 日志中间件
chain.use(async (ctx, next) => {
  console.log('Before:', ctx.credentials?.username)
  await next()
  console.log('After')
}, { name: 'Logger', priority: 10 })

// 验证中间件
chain.use(async (ctx, next) => {
  if (!ctx.credentials?.username) {
    ctx.aborted = true
    ctx.abortReason = '用户名不能为空'
    return
  }
  await next()
}, { name: 'Validator', priority: 20 })

// 执行中间件链
await chain.execute({
  credentials: { username: 'admin', password: '123456' },
  metadata: {},
})
```

### 存储适配器

```typescript
import {
  createStorageAdapter,
  CookieStorageAdapter,
} from '@ldesign/auth-core/storage'

// 使用工厂函数
const storage = createStorageAdapter('localStorage', 'myapp_')
storage.set('token', 'xxx')
const token = storage.get('token')

// 使用 Cookie 存储
const cookieStorage = new CookieStorageAdapter('auth_', {
  secure: true,
  sameSite: 'lax',
  path: '/',
})

cookieStorage.set('session', 'abc123', {
  expires: 7 * 24 * 60 * 60 * 1000, // 7 天
})
```

## 🎯 高级用法

### 自定义存储适配器

```typescript
import type { StorageAdapter, StorageOptions } from '@ldesign/auth-core/storage'

class CustomStorageAdapter implements StorageAdapter {
  get(key: string): string | null {
    // 自定义获取逻辑
    return null
  }

  set(key: string, value: string, options?: StorageOptions): void {
    // 自定义设置逻辑
  }

  remove(key: string): void {
    // 自定义删除逻辑
  }

  clear(): void {
    // 自定义清空逻辑
  }

  keys(): string[] {
    return []
  }

  has(key: string): boolean {
    return false
  }
}

// 使用自定义适配器
const customStorage = new CustomStorageAdapter()
```

### 自定义日志传输器

```typescript
import type { LogTransport, LogLevel } from '@ldesign/auth-core/logger'

class CustomTransport implements LogTransport {
  log(level: LogLevel, message: string, data?: unknown): void {
    // 发送到自定义日志服务
    fetch('https://my-log-service.com/logs', {
      method: 'POST',
      body: JSON.stringify({ level, message, data }),
    })
  }
}

// 使用自定义传输器
logger.addTransport(new CustomTransport())
```

## 📖 API 文档

详细的 API 文档请参考：

- [核心 API 文档](./docs/api/core.md)
- [Vue 集成文档](./docs/api/vue.md)
- [类型定义](./docs/api/types.md)

## 🏗️ 架构设计

查看完整的架构设计文档：[ARCHITECTURE.md](./ARCHITECTURE.md)

## 📝 更新日志

查看详细的更新日志：[CHANGELOG.md](./CHANGELOG.md)

## 🤝 贡献指南

欢迎贡献！请查看 [CONTRIBUTING.md](./CONTRIBUTING.md)

## 📄 许可证

[MIT](./LICENSE) © LDesign Team

## 🔗 相关链接

- [官方文档](https://ldesign.dev/auth)
- [GitHub](https://github.com/ldesign/ldesign)
- [问题反馈](https://github.com/ldesign/ldesign/issues)