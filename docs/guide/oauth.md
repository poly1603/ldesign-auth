# OAuth 2.0

OAuth 2.0 是一个行业标准的授权协议，允许用户授权第三方应用访问他们的资源，而无需共享密码。`@ldesign/auth` 提供了完整的 OAuth 2.0 支持。

## 快速开始

### 基础用法

```typescript
import { createOAuthManager, GitHubProvider } from '@ldesign/auth/oauth'
import { createHttpClient } from '@ldesign/http'

const httpClient = createHttpClient()
const provider = new GitHubProvider()

const oauth = createOAuthManager({
  clientId: 'your-github-client-id',
  clientSecret: 'your-github-client-secret',
  authorizationEndpoint: provider.getAuthorizationEndpoint(),
  tokenEndpoint: provider.getTokenEndpoint(),
  redirectUri: 'http://localhost:3000/callback',
  scope: 'user:email read:user',
  usePKCE: false // GitHub 不支持 PKCE
}, httpClient)

// 1. 开始授权
const authUrl = await oauth.authorize()
window.location.href = authUrl

// 2. 处理回调（在回调页面）
const params = new URLSearchParams(window.location.search)
const token = await oauth.handleCallback(params)

// 3. 获取用户信息
const userInfo = await oauth.getUserInfo(token.accessToken)
console.log('用户信息:', userInfo)
```

## 内置 Provider

### GitHub

```typescript
import { GitHubProvider } from '@ldesign/auth/oauth'

const provider = new GitHubProvider()

const oauth = createOAuthManager({
  clientId: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  authorizationEndpoint: provider.getAuthorizationEndpoint(),
  tokenEndpoint: provider.getTokenEndpoint(),
  userInfoEndpoint: provider.getUserInfoEndpoint(),
  redirectUri: 'http://localhost:3000/callback',
  scope: provider.getDefaultScopes().join(' '),
  usePKCE: false
}, httpClient)
```

#### 配置 GitHub OAuth App

1. 访问 [GitHub Settings](https://github.com/settings/developers)
2. 点击 "New OAuth App"
3. 填写信息：
   - Application name: 你的应用名称
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/callback`
4. 获取 Client ID 和 Client Secret

### Google

```typescript
import { GoogleProvider } from '@ldesign/auth/oauth'

const provider = new GoogleProvider()

const oauth = createOAuthManager({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  authorizationEndpoint: provider.getAuthorizationEndpoint(),
  tokenEndpoint: provider.getTokenEndpoint(),
  userInfoEndpoint: provider.getUserInfoEndpoint(),
  redirectUri: 'http://localhost:3000/callback',
  scope: provider.getDefaultScopes().join(' '),
  usePKCE: true // Google 支持 PKCE
}, httpClient)
```

#### 配置 Google OAuth

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用 Google+ API
4. 创建 OAuth 2.0 凭据
5. 配置授权重定向 URI

### Facebook

```typescript
import { FacebookProvider } from '@ldesign/auth/oauth'

const provider = new FacebookProvider()

const oauth = createOAuthManager({
  clientId: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  authorizationEndpoint: provider.getAuthorizationEndpoint(),
  tokenEndpoint: provider.getTokenEndpoint(),
  userInfoEndpoint: provider.getUserInfoEndpoint(),
  redirectUri: 'http://localhost:3000/callback',
  scope: provider.getDefaultScopes().join(' '),
  usePKCE: false
}, httpClient)
```

## PKCE 支持

PKCE (Proof Key for Code Exchange) 是 OAuth 2.0 的安全增强，特别适合公共客户端（如 SPA）。

### 启用 PKCE

```typescript
const oauth = createOAuthManager({
  clientId: 'your-client-id',
  authorizationEndpoint: 'https://provider.com/oauth/authorize',
  tokenEndpoint: 'https://provider.com/oauth/token',
  redirectUri: 'http://localhost:3000/callback',
  usePKCE: true // 启用 PKCE
}, httpClient)
```

### PKCE 工作流程

1. **授权请求时**：
   - 生成随机 code_verifier
   - 计算 code_challenge = BASE64URL(SHA256(code_verifier))
   - 在授权 URL 中包含 code_challenge

2. **Token 交换时**：
   - 发送 code_verifier 到 Token 端点
   - 服务器验证 code_challenge

### 手动控制 PKCE

```typescript
import { generateCodeChallenge } from '@ldesign/auth/oauth'

// 生成 PKCE 参数
const codeVerifier = generateRandomString(128)
const codeChallenge = await generateCodeChallenge(codeVerifier)

// 存储 code_verifier（重要！）
sessionStorage.setItem('code_verifier', codeVerifier)

// 授权请求
const authUrl = `${authorizationEndpoint}?` +
  `client_id=${clientId}&` +
  `redirect_uri=${redirectUri}&` +
  `response_type=code&` +
  `code_challenge=${codeChallenge}&` +
  `code_challenge_method=S256`

// Token 交换
const codeVerifier = sessionStorage.getItem('code_verifier')
const token = await exchangeToken(code, codeVerifier)
```

## 自定义 Provider

创建自定义 OAuth Provider：

```typescript
import { BaseOAuthProvider } from '@ldesign/auth/oauth'
import type { OAuthUser } from '@ldesign/auth/oauth'

class CustomProvider extends BaseOAuthProvider {
  getName(): string {
    return 'custom'
  }

  getAuthorizationEndpoint(): string {
    return 'https://oauth.example.com/authorize'
  }

  getTokenEndpoint(): string {
    return 'https://oauth.example.com/token'
  }

  getUserInfoEndpoint(): string {
    return 'https://api.example.com/user'
  }

  getDefaultScopes(): string[] {
    return ['profile', 'email']
  }

  transformUser(userData: any): OAuthUser {
    return {
      id: userData.id.toString(),
      username: userData.login,
      email: userData.email,
      name: userData.name,
      avatar: userData.avatar_url,
      provider: 'custom',
      rawData: userData
    }
  }
}

// 使用自定义 Provider
const provider = new CustomProvider()
const oauth = createOAuthManager({
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  authorizationEndpoint: provider.getAuthorizationEndpoint(),
  tokenEndpoint: provider.getTokenEndpoint(),
  userInfoEndpoint: provider.getUserInfoEndpoint(),
  redirectUri: 'http://localhost:3000/callback',
  scope: provider.getDefaultScopes().join(' ')
}, httpClient)
```

## 授权流程

### 标准授权码流程

```typescript
// 页面 1: 登录页面
async function loginWithOAuth() {
  const authUrl = await oauth.authorize({
    state: generateState(), // 防止 CSRF
    scope: 'user:email'
  })
  
  window.location.href = authUrl
}

// 页面 2: 回调页面
async function handleCallback() {
  const params = new URLSearchParams(window.location.search)
  
  // 验证 state
  const state = sessionStorage.getItem('oauth_state')
  if (params.get('state') !== state) {
    throw new Error('Invalid state parameter')
  }
  
  // 交换 Token
  const token = await oauth.handleCallback(params)
  
  // 存储 Token
  localStorage.setItem('access_token', token.accessToken)
  
  // 获取用户信息
  const userInfo = await oauth.getUserInfo(token.accessToken)
  
  // 跳转到首页
  window.location.href = '/'
}
```

### 隐式授权流程（不推荐）

```typescript
// 隐式流程直接返回 Token，不安全
const authUrl = `${authorizationEndpoint}?` +
  `client_id=${clientId}&` +
  `redirect_uri=${redirectUri}&` +
  `response_type=token&` +
  `scope=user:email`

window.location.href = authUrl

// 回调页面从 URL Fragment 获取 Token
const params = new URLSearchParams(window.location.hash.substring(1))
const accessToken = params.get('access_token')
```

## Token 刷新

```typescript
// 使用 Refresh Token 获取新的 Access Token
if (oauth.hasRefreshToken()) {
  try {
    const newToken = await oauth.refreshToken(refreshToken)
    console.log('Token 已刷新:', newToken)
  }
  catch (error) {
    console.error('Token 刷新失败:', error)
    // 重新登录
    loginWithOAuth()
  }
}
```

## 与 AuthManager 集成

将 OAuth 登录集成到 AuthManager：

```typescript
import { createAuthManager } from '@ldesign/auth'
import { createOAuthManager, GitHubProvider } from '@ldesign/auth/oauth'

const auth = createAuthManager({
  autoRefresh: true
}, httpClient)

const oauth = createOAuthManager({
  clientId: 'github-client-id',
  // ... 其他配置
}, httpClient)

// OAuth 登录
async function loginWithGitHub() {
  // 1. OAuth 授权
  const authUrl = await oauth.authorize()
  window.location.href = authUrl
}

// 回调处理
async function handleOAuthCallback() {
  const params = new URLSearchParams(window.location.search)
  const token = await oauth.handleCallback(params)
  
  // 2. 使用 OAuth Token 调用后端 API
  const response = await httpClient.post('/api/auth/oauth/github', {
    accessToken: token.accessToken
  })
  
  // 3. 后端返回应用的 Token
  await auth.setUser(response.user)
  await auth.setToken(response.token)
  
  window.location.href = '/'
}
```

## 多 Provider 支持

同时支持多个 OAuth Provider：

```typescript
const providers = {
  github: createOAuthManager({
    clientId: process.env.GITHUB_CLIENT_ID,
    // ...
  }, httpClient),
  
  google: createOAuthManager({
    clientId: process.env.GOOGLE_CLIENT_ID,
    // ...
  }, httpClient),
  
  facebook: createOAuthManager({
    clientId: process.env.FACEBOOK_APP_ID,
    // ...
  }, httpClient)
}

// 选择 Provider 登录
async function loginWith(providerName: string) {
  const oauth = providers[providerName]
  const authUrl = await oauth.authorize()
  
  // 存储 Provider 信息
  sessionStorage.setItem('oauth_provider', providerName)
  
  window.location.href = authUrl
}

// 回调处理
async function handleCallback() {
  const providerName = sessionStorage.getItem('oauth_provider')
  const oauth = providers[providerName]
  
  const params = new URLSearchParams(window.location.search)
  const token = await oauth.handleCallback(params)
  
  // ...
}
```

## 错误处理

```typescript
import { isOAuthError, OAuthErrorCode } from '@ldesign/auth/oauth'

try {
  const token = await oauth.handleCallback(params)
}
catch (error) {
  if (isOAuthError(error)) {
    switch (error.code) {
      case OAuthErrorCode.ACCESS_DENIED:
        console.error('用户拒绝授权')
        break
        
      case OAuthErrorCode.INVALID_GRANT:
        console.error('授权码无效或已过期')
        break
        
      case OAuthErrorCode.INVALID_CLIENT:
        console.error('Client ID 或 Secret 错误')
        break
        
      default:
        console.error('OAuth 错误:', error.message)
    }
  }
}
```

## 安全建议

### 1. 使用 State 参数

```typescript
// 生成随机 state
const state = generateRandomString(32)
sessionStorage.setItem('oauth_state', state)

const authUrl = await oauth.authorize({ state })

// 回调时验证
const params = new URLSearchParams(window.location.search)
const receivedState = params.get('state')
const savedState = sessionStorage.getItem('oauth_state')

if (receivedState !== savedState) {
  throw new Error('CSRF attack detected')
}
```

### 2. 使用 PKCE

对于 SPA，始终使用 PKCE：

```typescript
const oauth = createOAuthManager({
  // ...
  usePKCE: true
}, httpClient)
```

### 3. 验证 Redirect URI

确保 Redirect URI 与配置的完全一致。

### 4. 安全存储 Token

```typescript
// ❌ 不要存储在 localStorage（XSS 风险）
localStorage.setItem('token', accessToken)

// ✅ 使用 HttpOnly Cookie（需要后端支持）
// 或使用加密存储
import { encrypt } from '@ldesign/crypto'
const encrypted = await encrypt(accessToken, key)
sessionStorage.setItem('token', encrypted)
```

### 5. Token 过期处理

```typescript
// 检查 Token 是否过期
if (token.expiresIn) {
  const expiresAt = Date.now() + token.expiresIn * 1000
  
  if (Date.now() >= expiresAt) {
    // Token 已过期，刷新或重新登录
    await oauth.refreshToken(refreshToken)
  }
}
```

## 最佳实践

### 1. 错误页面处理

```typescript
// 回调页面
async function handleCallback() {
  try {
    const params = new URLSearchParams(window.location.search)
    
    // 检查错误参数
    if (params.has('error')) {
      const error = params.get('error')
      const description = params.get('error_description')
      throw new Error(`OAuth Error: ${error} - ${description}`)
    }
    
    const token = await oauth.handleCallback(params)
    // ...
  }
  catch (error) {
    // 跳转到错误页面
    window.location.href = `/error?message=${error.message}`
  }
}
```

### 2. 加载状态

```typescript
const [loading, setLoading] = useState(false)

async function loginWithOAuth() {
  setLoading(true)
  
  try {
    const authUrl = await oauth.authorize()
    window.location.href = authUrl
  }
  catch (error) {
    setLoading(false)
    console.error(error)
  }
}
```

### 3. 用户取消处理

```typescript
// 检测用户是否取消授权
const params = new URLSearchParams(window.location.search)

if (params.get('error') === 'access_denied') {
  console.log('用户取消了授权')
  // 跳回登录页
  window.location.href = '/login'
}
```

## 调试

### 启用调试日志

```typescript
const oauth = createOAuthManager({
  // ...
  debug: true // 启用调试日志
}, httpClient)
```

### 检查授权 URL

```typescript
const authUrl = await oauth.authorize()
console.log('Authorization URL:', authUrl)

// 检查 URL 参数
const url = new URL(authUrl)
console.log('client_id:', url.searchParams.get('client_id'))
console.log('redirect_uri:', url.searchParams.get('redirect_uri'))
console.log('scope:', url.searchParams.get('scope'))
console.log('state:', url.searchParams.get('state'))
```

## 下一步

- [MFA 多因素认证](/guide/mfa)
- [WebAuthn](/guide/webauthn)
- [完整示例](/examples/oauth-github)

