# 安装

## 包管理器

### pnpm（推荐）

```bash
pnpm add @ldesign/auth @ldesign/http
```

### npm

```bash
npm install @ldesign/auth @ldesign/http
```

### yarn

```bash
yarn add @ldesign/auth @ldesign/http
```

## CDN

### unpkg

```html
<script src="https://unpkg.com/@ldesign/auth/dist/index.umd.min.js"></script>
```

### jsdelivr

```html
<script src="https://cdn.jsdelivr.net/npm/@ldesign/auth/dist/index.umd.min.js"></script>
```

使用 CDN 时，会在全局注册 `LDesignAuth` 变量：

```html
<!DOCTYPE html>
<html>
<head>
  <title>LDesign Auth Demo</title>
</head>
<body>
  <script src="https://unpkg.com/@ldesign/http/dist/index.umd.min.js"></script>
  <script src="https://unpkg.com/@ldesign/auth/dist/index.umd.min.js"></script>
  
  <script>
    const httpClient = LDesignHttp.createHttpClient({
      baseURL: 'https://api.example.com'
    })
    
    const auth = LDesignAuth.createAuthManager(
      { autoRefresh: true },
      httpClient
    )
    
    console.log('Auth Manager 已创建')
  </script>
</body>
</html>
```

## 依赖说明

### 必需依赖

`@ldesign/auth` 依赖以下包，会自动安装：

- `@ldesign/http` - HTTP 客户端
- `@ldesign/shared` - 共享工具函数

### 可选依赖

根据需要安装以下可选依赖：

#### 缓存支持

```bash
pnpm add @ldesign/cache
```

用于缓存用户信息和 Token，提升性能。

#### 加密支持

```bash
pnpm add @ldesign/crypto
```

用于加密存储敏感信息。

#### 路由守卫

```bash
pnpm add @ldesign/router
```

提供路由级别的权限控制。

#### Vue 集成

```bash
pnpm add vue@^3.0.0
```

在 Vue 3 项目中使用 Composables 和 Plugin。

## 模块化引入

`@ldesign/auth` 采用模块化设计，支持按需引入：

### 核心模块

```typescript
import { createAuthManager } from '@ldesign/auth'
```

### JWT 模块

```typescript
import { jwtParser, jwtValidator } from '@ldesign/auth/jwt'
```

### OAuth 模块

```typescript
import { 
  createOAuthManager,
  GitHubProvider,
  GoogleProvider 
} from '@ldesign/auth/oauth'
```

### MFA 模块

```typescript
import { createMFAManager } from '@ldesign/auth/mfa'
```

### 密码管理模块

```typescript
import { createPasswordManager } from '@ldesign/auth/password'
```

### WebAuthn 模块

```typescript
import { createWebAuthnManager } from '@ldesign/auth/webauthn'
```

### 路由守卫

```typescript
import { 
  createAuthGuard,
  createRoleGuard,
  createPermissionGuard 
} from '@ldesign/auth/router'
```

### Vue 集成

```typescript
import { useAuth, useOAuth } from '@ldesign/auth/vue'
```

### 类型定义

```typescript
import type { 
  User,
  AuthState,
  LoginCredentials,
  TokenInfo 
} from '@ldesign/auth/types'
```

### 错误处理

```typescript
import { 
  AuthError,
  TokenError,
  NetworkError,
  AuthErrorCode 
} from '@ldesign/auth/errors'
```

## TypeScript 支持

`@ldesign/auth` 使用 TypeScript 编写，提供完整的类型定义。

### 类型检查

```typescript
import type { AuthConfig, User } from '@ldesign/auth'

const config: AuthConfig = {
  autoRefresh: true,
  refreshThreshold: 300
}

const user: User = {
  id: '1',
  username: 'john',
  email: 'john@example.com'
}
```

### 类型推断

大多数情况下，TypeScript 会自动推断类型：

```typescript
const auth = createAuthManager(config, httpClient)

// user 类型自动推断为 User | null
const user = auth.getUser()

// state 类型自动推断为 AuthState
auth.subscribe((state) => {
  console.log(state.isAuthenticated)
})
```

## 构建配置

### Vite

无需额外配置，开箱即用。

如需优化，可以配置：

```typescript
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  optimizeDeps: {
    include: ['@ldesign/auth']
  }
})
```

### Webpack

```javascript
// webpack.config.js
module.exports = {
  resolve: {
    alias: {
      '@ldesign/auth': '@ldesign/auth/es'
    }
  }
}
```

### Rollup

```javascript
// rollup.config.js
import resolve from '@rollup/plugin-node-resolve'

export default {
  plugins: [
    resolve({
      extensions: ['.js', '.ts']
    })
  ]
}
```

## 环境要求

### 浏览器

- Chrome >= 90
- Firefox >= 88
- Safari >= 14
- Edge >= 90

### Node.js

开发时需要 Node.js >= 18.0.0

### TypeScript

如果使用 TypeScript，推荐版本 >= 5.0.0

## 验证安装

创建一个简单的测试文件验证安装：

```typescript
// test-auth.ts
import { createAuthManager } from '@ldesign/auth'
import { createHttpClient } from '@ldesign/http'

const httpClient = createHttpClient({
  baseURL: 'https://api.example.com'
})

const auth = createAuthManager(
  { autoRefresh: true },
  httpClient
)

console.log('✅ @ldesign/auth 安装成功!')
console.log('AuthManager 已创建:', auth)
```

运行测试：

```bash
# 如果使用 ts-node
npx ts-node test-auth.ts

# 如果使用 tsx
npx tsx test-auth.ts

# 如果使用 Vite
vite test-auth.ts
```

## 常见问题

### Q: 为什么需要安装 @ldesign/http？

A: `@ldesign/auth` 需要 HTTP 客户端来与后端 API 通信。你也可以使用其他 HTTP 库（如 axios），但需要适配器。

### Q: 如何减小打包体积？

A: 使用模块化引入，只导入需要的功能：

```typescript
// ❌ 不推荐：导入整个包
import * as Auth from '@ldesign/auth'

// ✅ 推荐：按需导入
import { createAuthManager } from '@ldesign/auth'
import { createOAuthManager } from '@ldesign/auth/oauth'
```

### Q: 支持 Tree Shaking 吗？

A: 支持。`@ldesign/auth` 使用 ES 模块，支持 Tree Shaking。

### Q: 可以在服务端使用吗？

A: 部分功能可以，如 JWT 解析和验证。但完整的认证流程（如登录、Session 管理）主要面向浏览器环境。

## 下一步

- [快速开始](/guide/getting-started) - 开始使用
- [核心概念](/guide/auth-manager) - 深入了解
- [API 文档](/api/auth-manager) - 完整 API 参考

