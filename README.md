# @ldesign/auth

> 认证授权系统 - JWT、OAuth 2.0、SSO、MFA，完整的身份认证解决方案

## ✨ 特性

- 🔐 **JWT 认证** - Access Token + Refresh Token
- 🌐 **OAuth 2.0** - 第三方登录集成
- 🔑 **SSO 单点登录** - 企业级单点登录
- 📱 **MFA/2FA** - 多因素认证
- ⚡ **自动刷新** - Token 自动刷新机制
- 💾 **状态持久化** - 自动保存认证状态
- 🎯 **TypeScript** - 完整类型支持

## 📦 安装

```bash
pnpm add @ldesign/auth
```

## 🚀 快速开始

```typescript
import { createAuthManager } from '@ldesign/auth'

const auth = createAuthManager({
  autoRefresh: true,
  refreshThreshold: 300, // 5分钟
})

// 登录
await auth.login({
  username: 'user@example.com',
  password: 'password123',
})

// 获取用户信息
const user = auth.getUser()

// 获取 Token
const token = auth.getAccessToken()

// 检查认证状态
const isAuth = auth.isAuthenticated()

// 登出
await auth.logout()
```

## 📄 许可证

MIT © LDesign Team

