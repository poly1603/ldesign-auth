# @ldesign/auth 使用指南

## 目录

- [快速开始](#快速开始)
- [核心概念](#核心概念)
- [高级功能](#高级功能)
- [最佳实践](#最佳实践)
- [故障排查](#故障排查)

---

## 快速开始

### 1. 安装

```bash
pnpm add @ldesign/auth @ldesign/http @ldesign/cache
```

### 2. 创建认证管理器

```typescript
import { createAuthManager } from '@ldesign/auth'
import { createHttpClient } from '@ldesign/http'
import { createCache } from '@ldesign/cache'

// 创建 HTTP 客户端
const httpClient = createHttpClient({
  baseURL: 'https://api.example.com',
})

// 创建缓存管理器（可选，但推荐）
const cache = createCache()

// 创建认证管理器
const auth = createAuthManager(
  {
    autoRefresh: true,
    refreshThreshold: 300, // 5 分钟
    endpoints: {
      login: '/api/auth/login',
      logout: '/api/auth/logout',
      refresh: '/api/auth/refresh',
    },
  },
  httpClient,
  cache,
)
```

### 3. 登录

```typescript
try {
  await auth.login({
    username: 'user@example.com',
    password: 'password123',
  })

  console.log('登录成功！')
  const user = auth.getUser()
  console.log('欢迎,', user?.username)
}
catch (error) {
  console.error('登录失败:', error.message)
}
```

### 4. 监听事件

```typescript
const events = auth.getEvents()

events.on('loginSuccess', (response) => {
  console.log('登录成功:', response.user)
})

events.on('tokenRefreshed', (token) => {
  console.log('Token 已刷新')
})

events.on('sessionTimeout', () => {
  console.log('Session 超时，请重新登录')
})
```

---

## 核心概念

### Token 管理

@ldesign/auth 使用双 Token 机制：

- **Access Token**: 短期访问令牌，用于 API 请求
- **Refresh Token**: 长期刷新令牌，用于获取新的 Access Token

Token 会自动存储到 localStorage，并在过期前自动刷新。

### Session 管理

Session 管理器负责：

- 超时检测：30 分钟无活动自动登出
- 活动监控：监听鼠标、键盘等事件
- 多标签页同步：多个标签页共享登录状态

### 事件系统

支持 11 种认证事件：

- `userLoaded` - 用户加载
- `loginSuccess` / `loginFailed` - 登录成功/失败
- `tokenRefreshed` - Token 刷新
- `accessTokenExpired` - Token 过期
- `sessionTimeout` - Session 超时
- 等等

---

## 高级功能

### OAuth 2.0 社交登录

```typescript
import { createOAuthManager, GitHubProvider } from '@ldesign/auth/oauth'

const oauth = createOAuthManager({
  clientId: 'your-github-client-id',
  authorizationEndpoint: new GitHubProvider().getAuthorizationEndpoint(),
  tokenEndpoint: new GitHubProvider().getTokenEndpoint(),
  redirectUri: 'http://localhost:3000/callback',
  usePKCE: false, // GitHub 不支持 PKCE
}, httpClient)

// 登录页面
const authUrl = await oauth.authorize()
window.location.href = authUrl

// 回调页面
const params = new URLSearchParams(window.location.search)
const token = await oauth.handleCallback(params)
const userInfo = await oauth.getUserInfo(token.accessToken)
```

### MFA 多因素认证

```typescript
import { createMFAManager } from '@ldesign/auth/mfa'

const mfa = createMFAManager({
  appName: 'My App',
}, httpClient)

// 设置 TOTP
const setup = await mfa.enable('user123', 'totp')

// 生成 QR 码（使用第三方库）
import QRCode from 'qrcode'
const qrCodeImage = await QRCode.toDataURL(setup.qrCode)

// 用户扫描 QR 码后，验证
const isValid = await mfa.verify('user123', '123456', 'totp', setup.secret)
```

### 密码管理

```typescript
import { createPasswordManager } from '@ldesign/auth/password'

const passwordManager = createPasswordManager({
  minLength: 10,
  requireUppercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
}, {}, httpClient)

// 验证密码强度
const result = passwordManager.validatePassword('MyP@ssw0rd123')
console.log('强度:', result.strengthLevel)
console.log('分数:', result.strength)

// 密码重置
await passwordManager.requestReset('user@example.com')
// 用户收到邮件，点击链接
await passwordManager.resetPassword(resetToken, 'NewP@ssw0rd123')
```

### 路由守卫

```typescript
import { createAuthGuard, createRoleGuard } from '@ldesign/auth/router'

// Vue Router
import { createRouter } from 'vue-router'

const router = createRouter({
  routes: [
    {
      path: '/dashboard',
      component: Dashboard,
      meta: { requiresAuth: true },
    },
    {
      path: '/admin',
      component: Admin,
      beforeEnter: createRoleGuard(auth, ['admin']),
    },
  ],
})

router.beforeEach(createAuthGuard(auth))
```

---

## 最佳实践

### 1. 使用事件而非轮询

❌ 不推荐:
```typescript
setInterval(() => {
  if (!auth.isAuthenticated()) {
    // 做某事
  }
}, 1000)
```

✅ 推荐:
```typescript
auth.getEvents().on('userUnloaded', () => {
  // 做某事
})
```

### 2. 总是处理错误

```typescript
try {
  await auth.login(credentials)
}
catch (error) {
  if (isAuthError(error)) {
    switch (error.code) {
      case AuthErrorCode.INVALID_CREDENTIALS:
        showMessage('用户名或密码错误')
        break
      case AuthErrorCode.ACCOUNT_LOCKED:
        showMessage('账号已锁定')
        break
      default:
        showMessage('登录失败')
    }
  }
}
```

### 3. 使用 TypeScript

充分利用类型定义：

```typescript
import type { User, AuthState, LoginCredentials } from '@ldesign/auth'

const user: User = auth.getUser()!
const state: AuthState = auth.getState()
const credentials: LoginCredentials = { username: 'user', password: 'pass' }
```

### 4. 清理资源

在组件卸载时清理：

```typescript
const unsubscribe = auth.subscribe((state) => {
  // ...
})

onUnmounted(() => {
  unsubscribe()
})
```

---

## 故障排查

### Token 无法刷新

**问题**: Token 过期后无法自动刷新。

**解决方案**:
1. 检查是否提供了 `httpClient`
2. 检查 `autoRefresh` 是否为 `true`
3. 检查 `refreshEndpoint` 是否正确
4. 查看控制台错误信息

### Session 意外超时

**问题**: Session 在活动状态下仍然超时。

**解决方案**:
1. 检查 `monitorActivity` 是否启用
2. 确保活动事件正常触发
3. 增加 `timeout` 配置

### 多标签页不同步

**问题**: 一个标签页登出，其他标签页仍保持登录。

**解决方案**:
1. 检查 `enableTabSync` 是否启用
2. 确保浏览器支持 BroadcastChannel 或 localStorage
3. 检查浏览器控制台是否有错误

---

更多问题请查看 [FAQ](./FAQ.md) 或提交 Issue。

