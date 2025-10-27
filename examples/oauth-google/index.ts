/**
 * Google OAuth 登录示例
 * 
 * 演示：
 * - Google OAuth 2.0 授权流程
 * - PKCE 安全增强
 * - 用户信息获取
 * - Token 刷新
 */

import { createOAuthManager, GoogleProvider } from '@ldesign/auth/oauth'
import { createHttpClient } from '@ldesign/http'

const httpClient = createHttpClient()
const provider = new GoogleProvider()

// ========================================
// 配置 OAuth Manager
// ========================================

const oauth = createOAuthManager(
  {
    // Google OAuth 应用信息
    clientId: process.env.GOOGLE_CLIENT_ID || 'your-google-client-id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret',

    // OAuth 端点
    authorizationEndpoint: provider.getAuthorizationEndpoint(),
    tokenEndpoint: provider.getTokenEndpoint(),
    userInfoEndpoint: provider.getUserInfoEndpoint(),

    // 回调地址
    redirectUri: 'http://localhost:3000/callback',

    // 请求的权限范围
    scope: provider.getDefaultScopes().join(' '),
    // 等同于: 'openid profile email'

    // Google 支持 PKCE，启用以增强安全性
    usePKCE: true,

    // 可选：额外的授权参数
    authorizationParams: {
      // 强制选择账号
      prompt: 'select_account',

      // 访问类型（offline 可获取 refresh_token）
      access_type: 'offline',
    },
  },
  httpClient,
)

// ========================================
// 页面 1: 登录页面
// ========================================

/**
 * 开始 Google OAuth 授权流程
 */
async function loginWithGoogle() {
  try {
    console.log('📝 开始 Google OAuth 授权...')

    // 生成授权 URL
    const authUrl = await oauth.authorize({
      // 生成随机 state 防止 CSRF 攻击
      state: generateRandomState(),
    })

    console.log('🔗 授权 URL:', authUrl)
    console.log('🌐 重定向到 Google 登录页面...')

    // 实际应用中，跳转到 Google 授权页面
    window.location.href = authUrl

    // URL 示例:
    // https://accounts.google.com/o/oauth2/v2/auth?
    //   client_id=xxx&
    //   redirect_uri=http://localhost:3000/callback&
    //   response_type=code&
    //   scope=openid%20profile%20email&
    //   state=random-state&
    //   code_challenge=xxx&
    //   code_challenge_method=S256&
    //   prompt=select_account&
    //   access_type=offline
  }
  catch (error) {
    console.error('❌ 授权失败:', error)
  }
}

// ========================================
// 页面 2: 回调页面
// ========================================

/**
 * 处理 Google OAuth 回调
 */
async function handleGoogleCallback() {
  try {
    console.log('📥 处理 Google OAuth 回调...')

    // 从 URL 获取参数
    const params = new URLSearchParams(window.location.search)

    console.log('参数:')
    console.log('- code:', params.get('code'))
    console.log('- state:', params.get('state'))

    // 验证 state 参数
    const savedState = sessionStorage.getItem('oauth_state')
    const receivedState = params.get('state')

    if (savedState !== receivedState) {
      throw new Error('Invalid state parameter - possible CSRF attack')
    }

    // 检查错误
    if (params.has('error')) {
      const error = params.get('error')
      const description = params.get('error_description')
      throw new Error(`OAuth Error: ${error} - ${description}`)
    }

    // 使用授权码交换 Token
    console.log('🔄 使用授权码交换 Token...')
    const token = await oauth.handleCallback(params)

    console.log('✅ Token 获取成功!')
    console.log('Token 信息:')
    console.log('- Access Token:', token.accessToken.substring(0, 20) + '...')
    console.log('- Refresh Token:', token.refreshToken?.substring(0, 20) + '...')
    console.log('- 过期时间:', token.expiresIn, '秒')
    console.log('- Token 类型:', token.tokenType)
    console.log('- 权限范围:', token.scope)

    // 获取用户信息
    console.log('\n👤 获取用户信息...')
    const userInfo = await oauth.getUserInfo(token.accessToken)

    console.log('✅ 用户信息获取成功!')
    console.log('原始数据:', userInfo)

    // 使用 Provider 转换为标准格式
    const user = provider.transformUser(userInfo)

    console.log('\n标准化用户信息:')
    console.log('- ID:', user.id)
    console.log('- 用户名:', user.username)
    console.log('- 姓名:', user.name)
    console.log('- 邮箱:', user.email)
    console.log('- 头像:', user.avatar)
    console.log('- 邮箱验证:', user.emailVerified)
    console.log('- Provider:', user.provider)

    // 保存 Token 和用户信息
    localStorage.setItem('access_token', token.accessToken)
    if (token.refreshToken) {
      localStorage.setItem('refresh_token', token.refreshToken)
    }
    localStorage.setItem('user', JSON.stringify(user))

    console.log('\n✅ Google 登录完成!')
    console.log('🔄 重定向到首页...')

    // 跳转到首页
    // window.location.href = '/'
  }
  catch (error) {
    console.error('❌ 回调处理失败:', error)

    // 跳转到错误页面
    // window.location.href = '/login?error=' + encodeURIComponent(error.message)
  }
}

// ========================================
// Token 刷新
// ========================================

/**
 * 刷新 Access Token
 */
async function refreshAccessToken() {
  try {
    const refreshToken = localStorage.getItem('refresh_token')

    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    console.log('🔄 刷新 Access Token...')

    const newToken = await oauth.refreshToken(refreshToken)

    console.log('✅ Token 刷新成功!')
    console.log('新 Access Token:', newToken.accessToken.substring(0, 20) + '...')

    // 更新存储
    localStorage.setItem('access_token', newToken.accessToken)
    if (newToken.refreshToken) {
      localStorage.setItem('refresh_token', newToken.refreshToken)
    }

    return newToken
  }
  catch (error) {
    console.error('❌ Token 刷新失败:', error)

    // 刷新失败，需要重新登录
    console.log('请重新登录')
    // window.location.href = '/login'
    throw error
  }
}

// ========================================
// 使用 Token 调用 Google API
// ========================================

/**
 * 调用 Google API 获取日历
 */
async function getGoogleCalendar() {
  try {
    let accessToken = localStorage.getItem('access_token')

    if (!accessToken) {
      throw new Error('Not authenticated')
    }

    // 调用 Google Calendar API
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )

    if (response.status === 401) {
      // Token 过期，尝试刷新
      console.log('Token 过期，刷新中...')
      const newToken = await refreshAccessToken()
      accessToken = newToken.accessToken

      // 使用新 Token 重试
      return getGoogleCalendar()
    }

    const data = await response.json()
    console.log('📅 日历事件:', data)

    return data
  }
  catch (error) {
    console.error('❌ 获取日历失败:', error)
    throw error
  }
}

// ========================================
// 完整的 Google 登录流程
// ========================================

/**
 * 完整示例：从登录到获取数据
 */
async function completeGoogleLoginFlow() {
  console.log('=== Google OAuth 完整流程示例 ===\n')

  // 检查当前页面
  const isCallbackPage = window.location.pathname === '/callback'

  if (isCallbackPage) {
    // 回调页面：处理授权回调
    await handleGoogleCallback()
  }
  else {
    // 登录页面：开始授权
    await loginWithGoogle()
  }
}

// ========================================
// 辅助函数
// ========================================

/**
 * 生成随机 state 参数
 */
function generateRandomState(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  const state = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')

  // 保存到 sessionStorage 用于验证
  sessionStorage.setItem('oauth_state', state)

  return state
}

/**
 * 检查是否已登录
 */
function isLoggedIn(): boolean {
  return !!localStorage.getItem('access_token')
}

/**
 * 登出
 */
function logout() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
  console.log('✅ 已登出')
}

// ========================================
// 导出供外部使用
// ========================================

export {
  loginWithGoogle,
  handleGoogleCallback,
  refreshAccessToken,
  getGoogleCalendar,
  isLoggedIn,
  logout,
}

// ========================================
// HTML 页面示例
// ========================================

/*
<!DOCTYPE html>
<html>
<head>
  <title>Google OAuth 示例</title>
</head>
<body>
  <h1>Google OAuth 登录示例</h1>
  
  <!-- 登录按钮 -->
  <div id="login-section">
    <button onclick="loginWithGoogle()">
      <img src="google-icon.svg" alt="Google" />
      使用 Google 登录
    </button>
  </div>
  
  <!-- 用户信息 -->
  <div id="user-section" style="display: none;">
    <h2>欢迎, <span id="username"></span>!</h2>
    <img id="avatar" src="" alt="Avatar" />
    <p>邮箱: <span id="email"></span></p>
    <button onclick="logout()">登出</button>
    <button onclick="getGoogleCalendar()">获取日历</button>
  </div>
  
  <script type="module">
    import { loginWithGoogle, handleGoogleCallback, logout, getGoogleCalendar } from './index.js'
    
    // 检查是否是回调页面
    if (window.location.pathname === '/callback') {
      handleGoogleCallback()
    } else {
      // 检查是否已登录
      const user = JSON.parse(localStorage.getItem('user') || 'null')
      
      if (user) {
        document.getElementById('login-section').style.display = 'none'
        document.getElementById('user-section').style.display = 'block'
        document.getElementById('username').textContent = user.name
        document.getElementById('email').textContent = user.email
        document.getElementById('avatar').src = user.avatar
      }
    }
    
    // 全局函数
    window.loginWithGoogle = loginWithGoogle
    window.logout = () => {
      logout()
      location.reload()
    }
    window.getGoogleCalendar = getGoogleCalendar
  </script>
</body>
</html>
*/

// 运行示例
if (typeof window !== 'undefined') {
  completeGoogleLoginFlow().catch(console.error)
}

