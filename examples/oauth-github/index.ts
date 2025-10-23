/**
 * GitHub OAuth 登录示例
 */

import { createOAuthManager, GitHubProvider } from '@ldesign/auth/oauth'
import { createHttpClient } from '@ldesign/http'

const httpClient = createHttpClient()
const provider = new GitHubProvider()

const oauth = createOAuthManager({
  clientId: 'your-github-client-id',
  clientSecret: 'your-github-client-secret',
  authorizationEndpoint: provider.getAuthorizationEndpoint(),
  tokenEndpoint: provider.getTokenEndpoint(),
  userInfoEndpoint: provider.getUserInfoEndpoint(),
  redirectUri: 'http://localhost:3000/callback',
  scope: provider.getDefaultScopes().join(' '),
  usePKCE: false, // GitHub 不支持 PKCE
}, httpClient)

// 登录页面：开始授权
async function loginWithGitHub() {
  try {
    const authUrl = await oauth.authorize()
    console.log('重定向到 GitHub 授权页面:', authUrl)

    // 实际应用中：
    window.location.href = authUrl
  }
  catch (error) {
    console.error('授权失败:', error)
  }
}

// 回调页面：处理授权回调
async function handleCallback() {
  try {
    // 从 URL 获取参数
    const params = new URLSearchParams(window.location.search)

    // 交换 code 获取 token
    const token = await oauth.handleCallback(params)

    console.log('✅ 授权成功!')
    console.log('Access Token:', token.accessToken)

    // 获取用户信息
    const userInfo = await oauth.getUserInfo(token.accessToken)

    // 转换为标准用户对象
    const user = provider.transformUser(userInfo)

    console.log('GitHub 用户:', user)
    console.log('- ID:', user.id)
    console.log('- 用户名:', user.username)
    console.log('- 邮箱:', user.email)
    console.log('- 头像:', user.avatar)
  }
  catch (error) {
    console.error('处理回调失败:', error)
  }
}

// 根据当前页面选择执行
if (window.location.pathname === '/callback') {
  handleCallback()
}
else {
  loginWithGitHub()
}

