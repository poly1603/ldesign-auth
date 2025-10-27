---
layout: home

hero:
  name: "@ldesign/auth"
  text: 认证授权系统
  tagline: 完整的身份认证解决方案 - JWT、OAuth 2.0、SSO、MFA
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: API 文档
      link: /api/auth-manager
    - theme: alt
      text: GitHub
      link: https://github.com/ldesign/ldesign

features:
  - icon: 🔐
    title: JWT 认证
    details: 完整的 JWT Token 管理，支持自动刷新、过期检测、黑名单机制
  
  - icon: 🌐
    title: OAuth 2.0
    details: 支持多种社交登录，内置 GitHub、Google、Facebook Provider
  
  - icon: 🔒
    title: 多因素认证
    details: 支持 TOTP、SMS、邮件等多种 MFA 方式，提升账户安全性
  
  - icon: 🎯
    title: Session 管理
    details: 智能会话管理，超时检测、活动监控、多标签页同步
  
  - icon: 🛡️
    title: 账户安全
    details: 登录失败锁定、风险评估、审计日志、设备管理
  
  - icon: 🚀
    title: 框架集成
    details: 完美集成 Vue 3，提供 Composables、Plugin、路由守卫
  
  - icon: 📝
    title: TypeScript
    details: 完整的 TypeScript 类型定义，提供最佳开发体验
  
  - icon: ⚡
    title: 高性能
    details: 优化的事件系统、缓存机制，确保最佳性能
  
  - icon: 🔌
    title: 模块化设计
    details: 灵活的模块化架构，按需引入所需功能
---

## 快速开始

安装依赖：

```bash
pnpm add @ldesign/auth @ldesign/http @ldesign/cache
```

创建认证管理器：

```typescript
import { createAuthManager } from '@ldesign/auth'
import { createHttpClient } from '@ldesign/http'

const httpClient = createHttpClient({
  baseURL: 'https://api.example.com'
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
  httpClient
)

// 登录
await auth.login({
  username: 'user@example.com',
  password: 'password123'
})

console.log('当前用户:', auth.getUser())
```

## 特性亮点

### 🎯 智能 Token 管理

- **自动刷新**: Token 过期前自动刷新
- **过期检测**: 实时监测 Token 状态
- **安全存储**: 支持多种存储策略
- **黑名单机制**: 撤销无效 Token

### 🌐 丰富的 OAuth 支持

内置多个主流 OAuth Provider：

- GitHub
- Google
- Facebook
- 自定义 Provider

支持 PKCE、State 验证等安全特性。

### 🔒 企业级安全

- **多因素认证**: TOTP、SMS、邮件验证
- **账户保护**: 登录失败锁定、异常检测
- **审计日志**: 完整的操作记录
- **设备管理**: 设备识别和管理
- **风险评估**: 智能风险评分

### 🚀 Vue 3 深度集成

```vue
<script setup>
import { useAuth } from '@ldesign/auth/vue'

const { isAuthenticated, user, login, logout } = useAuth()
</script>

<template>
  <div v-if="isAuthenticated">
    欢迎, {{ user.username }}
    <button @click="logout">登出</button>
  </div>
</template>
```

## 为什么选择 @ldesign/auth？

### ✅ 功能完整

涵盖现代应用所需的所有认证功能，从基础的 JWT 到高级的 SSO、MFA。

### ✅ 开箱即用

精心设计的 API，合理的默认配置，最小化配置即可使用。

### ✅ 高度灵活

模块化设计，可以按需引入，也可以深度定制。

### ✅ 生产就绪

经过充分测试，包含完整的错误处理、日志记录、性能优化。

### ✅ 开发友好

完整的 TypeScript 类型，详细的文档，丰富的示例。

## 社区

- [GitHub](https://github.com/ldesign/ldesign)
- [问题反馈](https://github.com/ldesign/ldesign/issues)
- [讨论区](https://github.com/ldesign/ldesign/discussions)

## 许可证

[MIT License](https://github.com/ldesign/ldesign/blob/main/LICENSE)

