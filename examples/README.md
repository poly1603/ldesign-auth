# @ldesign/auth 示例

本目录包含 @ldesign/auth 的各种使用示例。

## 示例列表

### 1. 基础认证 (`basic-auth/`)

演示基本的 JWT 认证流程：
- 登录/登出
- Token 管理
- 事件监听
- Session 管理

**运行**:
```bash
cd basic-auth
pnpm install
pnpm dev
```

### 2. GitHub OAuth 登录 (`oauth-github/`)

演示 GitHub OAuth 2.0 社交登录：
- OAuth 授权流程
- GitHub Provider 使用
- 用户信息获取

**运行**:
```bash
cd oauth-github
# 配置 GitHub OAuth App
pnpm install
pnpm dev
```

### 3. Vue 应用示例 (`vue-app/`)

演示 Vue 3 集成：
- useAuth Composable
- AuthPlugin 使用
- 响应式状态管理
- 路由守卫

**运行**:
```bash
cd vue-app
pnpm install
pnpm dev
```

---

## 通用配置

所有示例都需要配置后端 API：

```typescript
const httpClient = createHttpClient({
  baseURL: 'https://your-api.example.com', // 修改为你的 API 地址
})
```

## 后端要求

### API 端点

你的后端需要实现以下端点：

#### 登录
```
POST /api/auth/login
Content-Type: application/json

{
  "username": "user@example.com",
  "password": "password123"
}

Response:
{
  "user": {
    "id": 1,
    "username": "user",
    "email": "user@example.com"
  },
  "token": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "refresh...",
    "expiresIn": 3600
  }
}
```

#### 登出
```
POST /api/auth/logout

{
  "token": "eyJhbGc..."
}
```

#### 刷新 Token
```
POST /api/auth/refresh

{
  "refreshToken": "refresh..."
}

Response:
{
  "token": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "refresh...",
    "expiresIn": 3600
  }
}
```

---

## 更多示例

更多示例正在开发中：

- MFA/2FA 示例
- WebAuthn 生物识别示例
- SSO 单点登录示例
- 完整应用示例

---

**需要帮助？** 请查看 [文档](../docs/) 或提交 [Issue](https://github.com/ldesign/ldesign/issues)

