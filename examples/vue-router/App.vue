<template>
  <div id="app">
    <!-- 导航栏 -->
    <nav class="navbar">
      <div class="nav-brand">
        <router-link to="/">My App</router-link>
      </div>
      
      <div class="nav-links">
        <template v-if="isAuthenticated">
          <router-link to="/">首页</router-link>
          <router-link to="/dashboard">Dashboard</router-link>
          <router-link to="/profile">个人资料</router-link>
          <router-link to="/admin" v-if="isAdmin">管理后台</router-link>
          
          <div class="user-menu">
            <img 
              :src="user?.avatar || '/default-avatar.png'" 
              :alt="user?.username"
              class="avatar"
            />
            <span>{{ user?.username }}</span>
            <button @click="handleLogout" class="btn-logout">
              登出
            </button>
          </div>
        </template>
        
        <template v-else>
          <router-link to="/login">登录</router-link>
          <router-link to="/register">注册</router-link>
        </template>
      </div>
    </nav>
    
    <!-- 主内容区 -->
    <main class="main-content">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-overlay">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>
      
      <!-- 路由视图 -->
      <router-view v-else />
    </main>
    
    <!-- 全局通知 -->
    <div v-if="notification" class="notification" :class="notification.type">
      {{ notification.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@ldesign/auth/vue'

const router = useRouter()
const { isAuthenticated, user, loading, logout } = useAuth()

// 通知
const notification = ref<{ message: string; type: string } | null>(null)

// 检查是否是管理员
const isAdmin = computed(() => {
  return user.value?.roles?.includes('admin')
})

// 登出处理
async function handleLogout() {
  try {
    await logout()
    showNotification('已登出', 'success')
    router.push('/login')
  }
  catch (error) {
    showNotification('登出失败', 'error')
    console.error('Logout failed:', error)
  }
}

// 显示通知
function showNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
  notification.value = { message, type }
  
  setTimeout(() => {
    notification.value = null
  }, 3000)
}

// 初始化时检查认证状态
onMounted(() => {
  if (!isAuthenticated.value && router.currentRoute.value.meta.requiresAuth) {
    router.push('/login')
  }
})
</script>

<style scoped>
#app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  min-height: 100vh;
  background: #f5f5f5;
}

/* 导航栏 */
.navbar {
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-brand a {
  font-size: 1.5rem;
  font-weight: bold;
  color: #1890ff;
  text-decoration: none;
}

.nav-links {
  display: flex;
  gap: 2rem;
  align-items: center;
}

.nav-links a {
  color: #333;
  text-decoration: none;
  transition: color 0.3s;
}

.nav-links a:hover,
.nav-links a.router-link-active {
  color: #1890ff;
}

/* 用户菜单 */
.user-menu {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 8px;
  background: #f5f5f5;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.btn-logout {
  padding: 0.5rem 1rem;
  background: #ff4d4f;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s;
}

.btn-logout:hover {
  background: #ff7875;
}

/* 主内容 */
.main-content {
  max-width: 1200px;
  margin: 2rem auto;
  padding: 0 2rem;
}

/* 加载状态 */
.loading-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #1890ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 通知 */
.notification {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 1rem 1.5rem;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  animation: slideIn 0.3s ease-out;
  z-index: 1000;
}

.notification.success {
  background: #52c41a;
  color: white;
}

.notification.error {
  background: #ff4d4f;
  color: white;
}

.notification.info {
  background: #1890ff;
  color: white;
}

@keyframes slideIn {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>

