# Vue 3 集成

`@ldesign/auth` 提供了完整的 Vue 3 集成支持，包括 Composables、Plugin 和响应式状态管理。

## 安装

```bash
pnpm add @ldesign/auth @ldesign/http vue@^3.0.0
```

## Composables

### useAuth

`useAuth` 是核心的认证 Composable，提供响应式的认证状态和方法。

#### 基础用法

```vue
<script setup lang="ts">
import { useAuth } from '@ldesign/auth/vue'

const {
  // 响应式状态
  isAuthenticated,
  user,
  loading,
  error,
  
  // 方法
  login,
  logout,
  refreshToken
} = useAuth()
</script>

<template>
  <div>
    <div v-if="loading">
      加载中...
    </div>
    
    <div v-else-if="isAuthenticated">
      <h2>欢迎, {{ user?.username }}!</h2>
      <p>邮箱: {{ user?.email }}</p>
      <button @click="logout">登出</button>
    </div>
    
    <div v-else>
      <h2>请登录</h2>
      <button @click="handleLogin">登录</button>
    </div>
    
    <div v-if="error" class="error">
      {{ error.message }}
    </div>
  </div>
</template>
```

#### 登录表单

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '@ldesign/auth/vue'

const { login, loading, error } = useAuth()

const form = ref({
  username: '',
  password: '',
  rememberMe: false
})

async function handleSubmit() {
  try {
    await login(form.value)
    console.log('登录成功')
  }
  catch (err) {
    console.error('登录失败:', err)
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <div>
      <label>用户名</label>
      <input 
        v-model="form.username" 
        type="text"
        required
      />
    </div>
    
    <div>
      <label>密码</label>
      <input 
        v-model="form.password" 
        type="password"
        required
      />
    </div>
    
    <div>
      <label>
        <input 
          v-model="form.rememberMe" 
          type="checkbox"
        />
        记住我
      </label>
    </div>
    
    <button 
      type="submit" 
      :disabled="loading"
    >
      {{ loading ? '登录中...' : '登录' }}
    </button>
    
    <p v-if="error" class="error">
      {{ error.message }}
    </p>
  </form>
</template>
```

#### API 参考

```typescript
interface UseAuthReturn {
  // 响应式状态
  isAuthenticated: Ref<boolean>
  user: Ref<User | null>
  loading: Ref<boolean>
  error: Ref<Error | null>
  
  // 方法
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
  
  // AuthManager 实例
  authManager: AuthManager
}
```

### useOAuth

用于 OAuth 2.0 社交登录的 Composable。

#### 基础用法

```vue
<script setup lang="ts">
import { useOAuth } from '@ldesign/auth/vue'
import { GitHubProvider } from '@ldesign/auth/oauth'

const provider = new GitHubProvider()

const {
  authorize,
  handleCallback,
  loading,
  error
} = useOAuth({
  clientId: 'your-github-client-id',
  authorizationEndpoint: provider.getAuthorizationEndpoint(),
  tokenEndpoint: provider.getTokenEndpoint(),
  redirectUri: 'http://localhost:3000/callback'
})

async function loginWithGitHub() {
  const authUrl = await authorize()
  window.location.href = authUrl
}
</script>

<template>
  <div>
    <button 
      @click="loginWithGitHub"
      :disabled="loading"
    >
      <svg><!-- GitHub Icon --></svg>
      使用 GitHub 登录
    </button>
    
    <p v-if="error">{{ error.message }}</p>
  </div>
</template>
```

#### 回调页面

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useOAuth } from '@ldesign/auth/vue'
import { GitHubProvider } from '@ldesign/auth/oauth'

const router = useRouter()
const provider = new GitHubProvider()

const {
  handleCallback,
  getUserInfo
} = useOAuth({
  clientId: 'your-github-client-id',
  tokenEndpoint: provider.getTokenEndpoint(),
  userInfoEndpoint: provider.getUserInfoEndpoint(),
  redirectUri: 'http://localhost:3000/callback'
})

onMounted(async () => {
  try {
    // 处理回调
    const params = new URLSearchParams(window.location.search)
    const token = await handleCallback(params)
    
    // 获取用户信息
    const userInfo = await getUserInfo(token.accessToken)
    
    // 保存到本地状态或发送到服务器
    console.log('用户信息:', userInfo)
    
    // 跳转到首页
    router.push('/')
  }
  catch (error) {
    console.error('OAuth 回调失败:', error)
    router.push('/login')
  }
})
</script>

<template>
  <div>
    <p>正在处理登录...</p>
  </div>
</template>
```

## Vue Plugin

### 全局安装

```typescript
// main.ts
import { createApp } from 'vue'
import { AuthPlugin } from '@ldesign/auth/vue'
import { createHttpClient } from '@ldesign/http'
import App from './App.vue'

const app = createApp(App)

const httpClient = createHttpClient({
  baseURL: 'https://api.example.com'
})

// 安装 Auth Plugin
app.use(AuthPlugin, {
  httpClient,
  autoRefresh: true,
  refreshThreshold: 300,
  endpoints: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    refresh: '/api/auth/refresh'
  }
})

app.mount('#app')
```

### 全局属性

安装 Plugin 后，可以在任何组件中通过 `$auth` 访问：

```vue
<script setup lang="ts">
import { getCurrentInstance } from 'vue'

const instance = getCurrentInstance()
const auth = instance?.appContext.config.globalProperties.$auth

// 或使用 Composition API
import { useAuth } from '@ldesign/auth/vue'
const { authManager } = useAuth()
</script>
```

## 路由集成

### Vue Router 守卫

```typescript
// router.ts
import { createRouter, createWebHistory } from 'vue-router'
import { createAuthGuard, createRoleGuard } from '@ldesign/auth/router'
import { authManager } from './auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: Home
    },
    {
      path: '/login',
      component: Login
    },
    {
      path: '/dashboard',
      component: Dashboard,
      meta: { requiresAuth: true }
    },
    {
      path: '/admin',
      component: Admin,
      meta: { 
        requiresAuth: true,
        roles: ['admin']
      }
    }
  ]
})

// 全局认证守卫
router.beforeEach(createAuthGuard(authManager, '/login'))

// 或手动实现
router.beforeEach((to, from) => {
  if (to.meta.requiresAuth && !authManager.isAuthenticated()) {
    return '/login'
  }
  
  if (to.meta.roles) {
    const user = authManager.getUser()
    const hasRole = to.meta.roles.some(role => user?.roles?.includes(role))
    
    if (!hasRole) {
      return '/' // 重定向到首页
    }
  }
})

export default router
```

### 路由级别的角色控制

```typescript
import { createRouter } from 'vue-router'
import { createRoleGuard } from '@ldesign/auth/router'
import { authManager } from './auth'

const adminGuard = createRoleGuard(authManager, ['admin'], '/')

const router = createRouter({
  routes: [
    {
      path: '/admin',
      component: Admin,
      beforeEnter: adminGuard
    },
    {
      path: '/moderator',
      component: Moderator,
      beforeEnter: createRoleGuard(authManager, ['admin', 'moderator'], '/')
    }
  ]
})
```

### 路由级别的权限控制

```typescript
import { createPermissionGuard } from '@ldesign/auth/router'

const editUserGuard = createPermissionGuard(
  authManager, 
  ['user:edit'], 
  '/'
)

const router = createRouter({
  routes: [
    {
      path: '/users/:id/edit',
      component: UserEdit,
      beforeEnter: editUserGuard
    }
  ]
})
```

## 状态管理

### Pinia 集成

```typescript
// stores/auth.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { createAuthManager } from '@ldesign/auth'
import type { User } from '@ldesign/auth/types'

export const useAuthStore = defineStore('auth', () => {
  // 状态
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)
  
  // 计算属性
  const isAuthenticated = computed(() => !!user.value)
  
  // AuthManager 实例
  const authManager = createAuthManager({
    autoRefresh: true
  }, httpClient)
  
  // 订阅状态变化
  authManager.subscribe((state) => {
    user.value = state.user
    loading.value = state.loading
    error.value = state.error
  })
  
  // 方法
  async function login(credentials: LoginCredentials) {
    loading.value = true
    error.value = null
    
    try {
      await authManager.login(credentials)
    }
    catch (err) {
      error.value = err as Error
      throw err
    }
    finally {
      loading.value = false
    }
  }
  
  async function logout() {
    await authManager.logout()
  }
  
  return {
    user,
    loading,
    error,
    isAuthenticated,
    login,
    logout,
    authManager
  }
})
```

使用 Store：

```vue
<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
</script>

<template>
  <div v-if="authStore.isAuthenticated">
    欢迎, {{ authStore.user?.username }}
    <button @click="authStore.logout">登出</button>
  </div>
</template>
```

## 组件示例

### 用户头像组件

```vue
<script setup lang="ts">
import { useAuth } from '@ldesign/auth/vue'

const { user, isAuthenticated, logout } = useAuth()

const userInitials = computed(() => {
  if (!user.value) return ''
  const name = user.value.name || user.value.username
  return name.split(' ').map(n => n[0]).join('').toUpperCase()
})
</script>

<template>
  <div v-if="isAuthenticated" class="user-avatar">
    <img 
      v-if="user?.avatar" 
      :src="user.avatar" 
      :alt="user.username"
    />
    <span v-else class="initials">
      {{ userInitials }}
    </span>
    
    <div class="dropdown">
      <p><strong>{{ user?.name }}</strong></p>
      <p>{{ user?.email }}</p>
      <hr />
      <a href="/profile">个人资料</a>
      <a href="/settings">设置</a>
      <hr />
      <button @click="logout">登出</button>
    </div>
  </div>
</template>
```

### 权限指令

创建自定义指令控制元素可见性：

```typescript
// directives/permission.ts
import type { Directive } from 'vue'
import { authManager } from '@/auth'

export const vPermission: Directive<HTMLElement, string | string[]> = {
  mounted(el, binding) {
    const permissions = Array.isArray(binding.value) 
      ? binding.value 
      : [binding.value]
    
    const user = authManager.getUser()
    const hasPermission = permissions.some(p => 
      user?.permissions?.includes(p)
    )
    
    if (!hasPermission) {
      el.style.display = 'none'
    }
  }
}
```

注册并使用：

```typescript
// main.ts
import { vPermission } from './directives/permission'

app.directive('permission', vPermission)
```

```vue
<template>
  <button v-permission="'user:edit'">
    编辑用户
  </button>
  
  <button v-permission="['user:delete', 'admin']">
    删除用户
  </button>
</template>
```

### 角色指令

```typescript
// directives/role.ts
import type { Directive } from 'vue'
import { authManager } from '@/auth'

export const vRole: Directive<HTMLElement, string | string[]> = {
  mounted(el, binding) {
    const roles = Array.isArray(binding.value) 
      ? binding.value 
      : [binding.value]
    
    const user = authManager.getUser()
    const hasRole = roles.some(r => user?.roles?.includes(r))
    
    if (!hasRole) {
      el.style.display = 'none'
    }
  }
}
```

```vue
<template>
  <button v-role="'admin'">
    管理员功能
  </button>
</template>
```

## 完整应用示例

### App.vue

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuth } from '@ldesign/auth/vue'
import { useRouter } from 'vue-router'

const { isAuthenticated, loading } = useAuth()
const router = useRouter()

// 初始化时检查认证状态
onMounted(() => {
  if (isAuthenticated.value) {
    console.log('用户已登录')
  }
  else if (!loading.value) {
    // 未登录且不在登录页，跳转到登录页
    if (router.currentRoute.value.path !== '/login') {
      router.push('/login')
    }
  }
})
</script>

<template>
  <div id="app">
    <nav v-if="isAuthenticated">
      <router-link to="/">首页</router-link>
      <router-link to="/dashboard">Dashboard</router-link>
      <router-link to="/profile">个人资料</router-link>
    </nav>
    
    <main>
      <router-view />
    </main>
  </div>
</template>
```

### Login.vue

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '@ldesign/auth/vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const { login, loading, error } = useAuth()

const credentials = ref({
  username: '',
  password: ''
})

async function handleLogin() {
  try {
    await login(credentials.value)
    router.push('/')
  }
  catch (err) {
    console.error('登录失败:', err)
  }
}
</script>

<template>
  <div class="login-page">
    <h1>登录</h1>
    
    <form @submit.prevent="handleLogin">
      <input 
        v-model="credentials.username"
        placeholder="用户名"
        required
      />
      
      <input 
        v-model="credentials.password"
        type="password"
        placeholder="密码"
        required
      />
      
      <button type="submit" :disabled="loading">
        {{ loading ? '登录中...' : '登录' }}
      </button>
      
      <p v-if="error" class="error">
        {{ error.message }}
      </p>
    </form>
  </div>
</template>
```

## TypeScript 支持

完整的类型定义：

```typescript
import type { 
  User, 
  AuthState, 
  LoginCredentials 
} from '@ldesign/auth/types'
import type { UseAuthReturn } from '@ldesign/auth/vue'

const { 
  user,           // Ref<User | null>
  isAuthenticated, // Ref<boolean>
  login,          // (credentials: LoginCredentials) => Promise<void>
  logout          // () => Promise<void>
}: UseAuthReturn = useAuth()
```

## 最佳实践

### 1. 集中管理配置

```typescript
// auth/config.ts
export const authConfig = {
  autoRefresh: true,
  refreshThreshold: 300,
  endpoints: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    refresh: '/api/auth/refresh'
  }
}
```

### 2. 错误处理

```vue
<script setup lang="ts">
import { useAuth } from '@ldesign/auth/vue'
import { isAuthError, AuthErrorCode } from '@ldesign/auth/errors'

const { login } = useAuth()

async function handleLogin(credentials) {
  try {
    await login(credentials)
  }
  catch (error) {
    if (isAuthError(error)) {
      switch (error.code) {
        case AuthErrorCode.INVALID_CREDENTIALS:
          showError('用户名或密码错误')
          break
        case AuthErrorCode.ACCOUNT_LOCKED:
          showError('账号已被锁定')
          break
        default:
          showError('登录失败')
      }
    }
  }
}
</script>
```

### 3. 加载状态

```vue
<script setup lang="ts">
const { loading } = useAuth()
</script>

<template>
  <div v-if="loading" class="loading-overlay">
    <div class="spinner"></div>
  </div>
</template>
```

## 下一步

- [路由守卫详解](/guide/router-guards)
- [完整 Vue 应用示例](/examples/vue-app)
- [Vue Router 集成示例](/examples/vue-router)

