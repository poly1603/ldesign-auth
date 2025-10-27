/**
 * 优化版 AuthManager 使用示例
 */

import {
  createOptimizedAuthManager,
  PERFORMANCE_PRESETS,
  analyzePerformanceConfig,
  getGlobalMemoryMonitor
} from '@ldesign/auth'
import { createHttpClient } from '@ldesign/http'
import { createCache } from '@ldesign/cache'

async function main() {
  // 创建依赖
  const httpClient = createHttpClient({
    baseURL: 'https://api.example.com'
  })

  const cache = createCache({
    prefix: 'auth:',
    ttl: 3600000 // 1小时
  })

  // 1. 使用预设配置创建
  console.log('1. 使用预设配置')
  const auth1 = createOptimizedAuthManager({
    autoRefresh: true,
    refreshThreshold: 300,
    performance: PERFORMANCE_PRESETS.balanced
  }, httpClient, cache)

  // 2. 自定义性能配置
  console.log('\n2. 自定义性能配置')
  const auth2 = createOptimizedAuthManager({
    autoRefresh: true,
    performance: {
      enableTokenCache: true,
      tokenCacheSize: 500,
      enableObjectPool: true,
      objectPoolSize: 100,
      enableMemoryMonitoring: true,
      maxListenersPerEvent: 100,
      tokenBlacklistMaxSize: 20000
    }
  }, httpClient, cache)

  // 3. 使用内存监控
  console.log('\n3. 内存监控示例')
  const memoryMonitor = getGlobalMemoryMonitor()

  // 开始监控
  memoryMonitor.startMonitoring(30000) // 30秒记录一次

  // 模拟使用
  try {
    // 登录
    await auth2.login({
      username: 'user@example.com',
      password: 'password123'
    })

    // 添加多个监听器
    const unsubscribes = []
    for (let i = 0; i < 50; i++) {
      unsubscribes.push(
        auth2.subscribe((state) => {
          // 处理状态变化
          if (i === 0) {
            console.log('认证状态:', state.isAuthenticated)
          }
        })
      )
    }

    // 监听事件
    const events = auth2.getEvents()
    events.on('tokenRefreshed', (token) => {
      console.log('Token 已刷新')
    })

    events.on('sessionTimeout', () => {
      console.log('Session 超时')
    })

    // 执行一些操作
    const user = auth2.getUser()
    console.log('当前用户:', user?.name)

    // 获取内存报告
    const report = memoryMonitor.generateReport()
    console.log('\n内存报告:')
    console.log('- 当前堆使用:', (report.currentMemory?.heapUsed || 0) / 1024 / 1024, 'MB')
    console.log('- 组件内存:', report.componentSizes)
    console.log('- 可能内存泄漏:', report.possibleLeak)

    // 获取性能指标
    const metrics = auth2.getMetrics()
    console.log('\n性能指标:')
    console.log('- 登录成功率:', (metrics.loginSuccesses / metrics.loginAttempts * 100).toFixed(1), '%')
    console.log('- 平均登录耗时:', metrics.avgLoginTime?.toFixed(2), 'ms')
    console.log('- 事件监听器数:', metrics.eventListenerCount)
    console.log('- Token 缓存大小:', metrics.tokenCacheSize)
    console.log('- 黑名单大小:', metrics.blacklistSize)

    // 分析配置
    const recommendations = analyzePerformanceConfig(
      {
        enableTokenCache: true,
        tokenCacheSize: 500,
        maxGlobalListeners: 500
      },
      {
        listenerCount: metrics.eventListenerCount,
        tokenCacheHitRate: 0.85,
        memoryUsageMB: 30,
        blacklistSize: metrics.blacklistSize
      }
    )

    if (recommendations.length > 0) {
      console.log('\n性能建议:')
      recommendations.forEach(rec => {
        console.log(`- [${rec.impact}] ${rec.recommendation}`)
      })
    }

    // 清理资源
    console.log('\n清理资源...')
    unsubscribes.forEach(fn => fn())

  } catch (error) {
    console.error('错误:', error)
  } finally {
    // 销毁认证管理器
    await auth1.destroy()
    await auth2.destroy()

    // 停止内存监控
    memoryMonitor.stopMonitoring()

    console.log('✅ 示例完成')
  }
}

// 4. Vue 3 集成示例
export function vueExample() {
  return `
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { createOptimizedAuthManager, PERFORMANCE_PRESETS } from '@ldesign/auth'
import { useAuth } from '@ldesign/auth/vue'

// 创建优化版认证管理器
const authManager = createOptimizedAuthManager({
  performance: PERFORMANCE_PRESETS.balanced,
  endpoints: {
    login: '/api/auth/login',
    refresh: '/api/auth/refresh'
  }
})

// 使用 composable
const { user, isAuthenticated, login, logout } = useAuth(authManager)

// 登录
async function handleLogin() {
  try {
    await login({
      username: 'user@example.com',
      password: 'password'
    })
  } catch (error) {
    console.error('登录失败:', error)
  }
}

// 清理
onUnmounted(async () => {
  await authManager.destroy()
})
</script>

<template>
  <div>
    <div v-if="isAuthenticated">
      欢迎，{{ user?.name }}!
      <button @click="logout">退出</button>
    </div>
    <div v-else>
      <button @click="handleLogin">登录</button>
    </div>
  </div>
</template>
`
}

// 5. 不同场景的配置建议
export const configExamples = {
  // 移动应用
  mobile: {
    performance: PERFORMANCE_PRESETS.minimal,
    refreshThreshold: 600, // 10分钟
  },

  // 企业应用
  enterprise: {
    performance: {
      ...PERFORMANCE_PRESETS.performance,
      maxGlobalListeners: 2000,
      tokenBlacklistMaxSize: 100000,
    }
  },

  // 实时应用
  realtime: {
    performance: {
      enableMicrotaskBatching: true,
      enableTokenCache: true,
      tokenCacheSize: 1000,
      enableObjectPool: true,
      objectPoolSize: 200,
    }
  },

  // 测试环境
  testing: {
    performance: {
      ...PERFORMANCE_PRESETS.development,
      memoryMonitorInterval: 10000, // 10秒
    }
  }
}

// 运行示例
if (require.main === module) {
  main().catch(console.error)
}
