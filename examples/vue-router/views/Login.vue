<template>
  <div class="login-page">
    <div class="login-card">
      <h1>登录</h1>
      <p class="subtitle">欢迎回来！</p>
      
      <!-- 登录表单 -->
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="username">用户名或邮箱</label>
          <input
            id="username"
            v-model="form.username"
            type="text"
            placeholder="user@example.com"
            required
            autocomplete="username"
          />
        </div>
        
        <div class="form-group">
          <label for="password">密码</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            placeholder="输入密码"
            required
            autocomplete="current-password"
          />
        </div>
        
        <!-- MFA 验证码（如果需要） -->
        <div v-if="needsMFA" class="form-group">
          <label for="mfaCode">双因素验证码</label>
          <input
            id="mfaCode"
            v-model="form.mfaCode"
            type="text"
            placeholder="输入 6 位验证码"
            maxlength="6"
            required
          />
          <p class="hint">
            请输入 Authenticator App 显示的 6 位验证码
          </p>
        </div>
        
        <div class="form-group checkbox">
          <label>
            <input
              v-model="form.rememberMe"
              type="checkbox"
            />
            记住我
          </label>
        </div>
        
        <!-- 错误提示 -->
        <div v-if="error" class="error-message">
          <span class="icon">⚠️</span>
          {{ error.message }}
        </div>
        
        <!-- 提交按钮 -->
        <button
          type="submit"
          class="btn-primary"
          :disabled="loading"
        >
          <span v-if="loading">登录中...</span>
          <span v-else>登录</span>
        </button>
      </form>
      
      <!-- 其他选项 -->
      <div class="login-options">
        <router-link to="/forgot-password">忘记密码？</router-link>
        <router-link to="/register">还没有账号？注册</router-link>
      </div>
      
      <!-- 社交登录 -->
      <div class="social-login">
        <div class="divider">
          <span>或使用社交账号登录</span>
        </div>
        
        <div class="social-buttons">
          <button
            class="btn-social btn-github"
            @click="loginWithGitHub"
          >
            <svg viewBox="0 0 16 16" width="20" height="20">
              <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            GitHub
          </button>
          
          <button
            class="btn-social btn-google"
            @click="loginWithGoogle"
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
            </svg>
            Google
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '@ldesign/auth/vue'
import { AuthErrorCode } from '@ldesign/auth/errors'
import { createOAuthManager, GitHubProvider, GoogleProvider } from '@ldesign/auth/oauth'
import { httpClient } from '../auth'

const router = useRouter()
const route = useRoute()
const { login, loading, error } = useAuth()

// 表单数据
const form = ref({
  username: '',
  password: '',
  mfaCode: '',
  rememberMe: false,
})

// 是否需要 MFA
const needsMFA = ref(false)

// 登录处理
async function handleLogin() {
  try {
    await login({
      username: form.value.username,
      password: form.value.password,
      mfaCode: form.value.mfaCode || undefined,
      rememberMe: form.value.rememberMe,
    })
    
    // 登录成功，跳转
    const redirect = route.query.redirect as string || '/'
    router.push(redirect)
  }
  catch (err: any) {
    // 检查是否需要 MFA
    if (err.code === AuthErrorCode.MFA_REQUIRED) {
      needsMFA.value = true
    }
    else {
      console.error('Login failed:', err)
    }
  }
}

// GitHub 登录
async function loginWithGitHub() {
  const provider = new GitHubProvider()
  const oauth = createOAuthManager({
    clientId: import.meta.env.VITE_GITHUB_CLIENT_ID,
    authorizationEndpoint: provider.getAuthorizationEndpoint(),
    tokenEndpoint: provider.getTokenEndpoint(),
    redirectUri: window.location.origin + '/callback/github',
  }, httpClient)
  
  const authUrl = await oauth.authorize()
  window.location.href = authUrl
}

// Google 登录
async function loginWithGoogle() {
  const provider = new GoogleProvider()
  const oauth = createOAuthManager({
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    authorizationEndpoint: provider.getAuthorizationEndpoint(),
    tokenEndpoint: provider.getTokenEndpoint(),
    redirectUri: window.location.origin + '/callback/google',
    usePKCE: true,
  }, httpClient)
  
  const authUrl = await oauth.authorize()
  window.location.href = authUrl
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.login-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  padding: 3rem;
  width: 100%;
  max-width: 420px;
}

h1 {
  font-size: 2rem;
  margin: 0 0 0.5rem;
  color: #333;
}

.subtitle {
  color: #666;
  margin: 0 0 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  color: #333;
  font-weight: 500;
}

input[type="text"],
input[type="password"] {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

input[type="text"]:focus,
input[type="password"]:focus {
  outline: none;
  border-color: #667eea;
}

.form-group.checkbox {
  display: flex;
  align-items: center;
}

.form-group.checkbox label {
  display: flex;
  align-items: center;
  margin: 0;
  cursor: pointer;
}

.form-group.checkbox input {
  margin-right: 0.5rem;
  cursor: pointer;
}

.hint {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: #666;
}

.error-message {
  padding: 1rem;
  background: #fff3f3;
  border: 1px solid #ffccc7;
  border-radius: 8px;
  color: #ff4d4f;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary {
  width: 100%;
  padding: 0.875rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-options {
  margin-top: 1.5rem;
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}

.login-options a {
  color: #667eea;
  text-decoration: none;
  transition: color 0.3s;
}

.login-options a:hover {
  color: #764ba2;
}

/* 社交登录 */
.social-login {
  margin-top: 2rem;
}

.divider {
  text-align: center;
  margin-bottom: 1.5rem;
  position: relative;
}

.divider::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  width: 100%;
  height: 1px;
  background: #e0e0e0;
}

.divider span {
  position: relative;
  background: white;
  padding: 0 1rem;
  color: #999;
  font-size: 0.875rem;
}

.social-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.btn-social {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  color: #333;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: 500;
}

.btn-social:hover {
  border-color: #667eea;
  background: #f5f7ff;
}

.btn-github svg,
.btn-google svg {
  flex-shrink: 0;
}
</style>

