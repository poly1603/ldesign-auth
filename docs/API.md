# @ldesign/auth API 文档

## 核心 API

### AuthManager

认证管理器，整合所有认证功能。

#### 创建实例

```typescript
import { createAuthManager } from '@ldesign/auth'
import { createHttpClient } from '@ldesign/http'
import { createCache } from '@ldesign/cache'

const httpClient = createHttpClient({ baseURL: 'https://api.example.com' })
const cache = createCache()

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
```

#### 方法

##### `login(credentials: LoginCredentials): Promise<void>`

登录用户。

**参数**:
- `credentials.username` - 用户名或邮箱
- `credentials.password` - 密码
- `credentials.rememberMe` - 是否记住我（可选）
- `credentials.mfaCode` - MFA 验证码（可选）

**示例**:
```typescript
await auth.login({
  username: 'user@example.com',
  password: 'password123',
})
```

##### `logout(): Promise<void>`

登出用户。

##### `refreshToken(): Promise<void>`

手动刷新 Token。

##### `getUser(): User | null`

获取当前用户信息。

##### `getAccessToken(): string | null`

获取 Access Token。

##### `isAuthenticated(): boolean`

检查是否已认证。

##### `subscribe(listener: (state: AuthState) => void): () => void`

订阅状态变化。

返回取消订阅函数。

##### `getEvents(): AuthEventEmitter`

获取事件发射器。

##### `getSessionManager(): SessionManager`

获取 Session 管理器。

##### `getTokenManager(): TokenManager`

获取 Token 管理器。

---

## JWT 模块

### JWTParser

JWT Token 解析器。

```typescript
import { jwtParser } from '@ldesign/auth/jwt'

const decoded = jwtParser.decode('eyJhbGc...')
const isExpired = jwtParser.isExpired(decoded)
const ttl = jwtParser.getTimeToLive(decoded)
```

#### 方法

- `decode(token: string): DecodedJWT` - 解码 JWT
- `getPayload(token: string): JWTPayload` - 获取 Payload
- `getHeader(token: string): JWTHeader` - 获取 Header
- `isExpired(token): boolean` - 检查是否过期
- `getTimeToLive(token): number` - 获取剩余时间（秒）
- `isExpiring(token, threshold): boolean` - 检查是否即将过期

### JWTValidator

JWT Token 验证器。

```typescript
import { jwtValidator } from '@ldesign/auth/jwt'

const result = jwtValidator.verify('eyJhbGc...', {
  verifyExpiry: true,
  issuer: 'https://auth.example.com',
  audience: 'my-app',
})

if (result.valid) {
  console.log('Token 有效')
}
```

#### 方法

- `verify(token, options): JWTVerifyResult` - 完整验证
- `validateStructure(decoded): string | null` - 验证结构
- `validateExpiry(decoded): string | null` - 验证过期时间
- `validateIssuer(decoded, expected): string | null` - 验证签发者
- `isValid(token): boolean` - 快速验证

---

## OAuth 模块

### OAuthManager

OAuth 2.0 授权管理器。

```typescript
import { createOAuthManager } from '@ldesign/auth/oauth'

const oauth = createOAuthManager({
  clientId: 'your-client-id',
  authorizationEndpoint: 'https://provider.com/oauth/authorize',
  tokenEndpoint: 'https://provider.com/oauth/token',
  redirectUri: 'http://localhost:3000/callback',
  usePKCE: true,
}, httpClient)

// 开始授权
const authUrl = await oauth.authorize()
window.location.href = authUrl

// 处理回调
const token = await oauth.handleCallback(new URLSearchParams(window.location.search))
```

#### 方法

- `authorize(): Promise<string>` - 开始授权，返回授权 URL
- `handleCallback(params): Promise<TokenInfo>` - 处理授权回调
- `refreshToken(refreshToken): Promise<TokenInfo>` - 刷新 Token
- `getUserInfo(accessToken): Promise<any>` - 获取用户信息

### Providers

内置的 OAuth Provider。

```typescript
import { GitHubProvider, GoogleProvider, FacebookProvider } from '@ldesign/auth/oauth'

const github = new GitHubProvider()
const google = new GoogleProvider()
const facebook = new FacebookProvider()

console.log(github.getAuthorizationEndpoint())
console.log(google.getDefaultScopes())
```

---

## MFA 模块

### MFAManager

多因素认证管理器。

```typescript
import { createMFAManager } from '@ldesign/auth/mfa'

const mfa = createMFAManager({
  appName: 'My App',
  issuer: 'My Company',
}, httpClient)

// 启用 TOTP
const setup = await mfa.enable('user123', 'totp')
console.log('扫描此 QR 码:', setup.qrCode)

// 验证
const isValid = await mfa.verify('user123', '123456', 'totp', setup.secret)
```

#### 方法

- `enable(userId, method): Promise<MFASetupInfo>` - 启用 MFA
- `verify(userId, code, method, secret?): Promise<boolean>` - 验证 MFA 代码
- `generateBackupCodes(count?): string[]` - 生成备用码

---

## 路由守卫

### createAuthGuard

创建认证守卫。

```typescript
import { createAuthGuard } from '@ldesign/auth/router'

const authGuard = createAuthGuard(auth, '/login')

// Vue Router
router.beforeEach((to, from) => {
  return authGuard(
    { path: to.path, meta: to.meta },
    { path: from.path, meta: from.meta },
  )
})
```

### createRoleGuard

创建角色守卫。

```typescript
import { createRoleGuard } from '@ldesign/auth/router'

const adminGuard = createRoleGuard(auth, ['admin'], '/')
```

### createPermissionGuard

创建权限守卫。

```typescript
import { createPermissionGuard } from '@ldesign/auth/router'

const editGuard = createPermissionGuard(auth, ['user:edit'], '/')
```

---

## Vue 集成

### useAuth

认证 Composable。

```vue
<script setup lang="ts">
import { useAuth } from '@ldesign/auth/vue'

const {
  isAuthenticated,
  user,
  loading,
  error,
  login,
  logout,
} = useAuth()
</script>

<template>
  <div v-if="isAuthenticated">
    <p>欢迎, {{ user?.username }}</p>
    <button @click="logout">登出</button>
  </div>
</template>
```

### useOAuth

OAuth Composable。

```vue
<script setup lang="ts">
import { useOAuth } from '@ldesign/auth/vue'

const { authorize, handleCallback } = useOAuth(oauthConfig, httpClient)
</script>
```

### AuthPlugin

Vue 插件。

```typescript
import { createApp } from 'vue'
import { AuthPlugin } from '@ldesign/auth/vue'

app.use(AuthPlugin, {
  httpClient,
  autoRefresh: true,
})
```

---

更多详细信息请查看各模块的使用指南。

