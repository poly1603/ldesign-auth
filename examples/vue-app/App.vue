<script setup lang="ts">
import { useAuth } from '@ldesign/auth/vue'
import { ref } from 'vue'

const {
  isAuthenticated,
  user,
  loading,
  error,
  login,
  logout,
} = useAuth()

const username = ref('')
const password = ref('')

async function handleLogin() {
  try {
    await login({
      username: username.value,
      password: password.value,
    })

    console.log('登录成功!')
  }
  catch (err) {
    console.error('登录失败:', err)
  }
}

async function handleLogout() {
  await logout()
  username.value = ''
  password.value = ''
}
</script>

<template>
  <div class="auth-demo">
    <h1>@ldesign/auth Vue 示例</h1>

    <div v-if="isAuthenticated" class="user-info">
      <h2>欢迎, {{ user?.username }}!</h2>
      <p>用户 ID: {{ user?.id }}</p>
      <p>邮箱: {{ user?.email }}</p>

      <button @click="handleLogout">
        登出
      </button>
    </div>

    <div v-else class="login-form">
      <h2>登录</h2>

      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label>用户名:</label>
          <input
            v-model="username"
            type="text"
            placeholder="user@example.com"
            required
          >
        </div>

        <div class="form-group">
          <label>密码:</label>
          <input
            v-model="password"
            type="password"
            placeholder="password"
            required
          >
        </div>

        <button type="submit" :disabled="loading">
          {{ loading ? '登录中...' : '登录' }}
        </button>

        <p v-if="error" class="error">
          {{ error.message }}
        </p>
      </form>
    </div>
  </div>
</template>

<style scoped>
.auth-demo {
  max-width: 400px;
  margin: 50px auto;
  padding: 20px;
}

.form-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

button {
  width: 100%;
  padding: 10px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  color: #ff4d4f;
  margin-top: 10px;
}

.user-info {
  text-align: center;
}
</style>

