/**
 * 性能测试示例 - 对比标准版和优化版
 */

import { createAuthManager } from '../src/core/AuthManager'
import { createOptimizedAuthManager, PERFORMANCE_PRESETS } from '../src'
import { createHttpClient } from '@ldesign/http'

// 模拟 HTTP 客户端
const mockHttpClient = {
  post: async (url: string, data: any) => {
    // 模拟 API 延迟
    await new Promise(resolve => setTimeout(resolve, 100))

    if (url.includes('/login')) {
      return {
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        token: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6IlRlc3QgVXNlciIsImV4cCI6OTk5OTk5OTk5OX0.test',
          refreshToken: 'refresh-token',
          expiresIn: 3600
        }
      }
    }

    if (url.includes('/refresh')) {
      return {
        token: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          expiresIn: 3600
        }
      }
    }

    return {}
  },

  get: async (url: string) => {
    await new Promise(resolve => setTimeout(resolve, 50))
    return { id: '1', name: 'Test User', email: 'test@example.com' }
  }
} as any

/**
 * 性能测试
 */
async function runPerformanceTest() {
  console.log('🚀 Auth 性能测试\n')

  // 测试配置
  const iterations = 1000
  const listenerCount = 100

  // 创建标准版
  console.log('创建标准版 AuthManager...')
  const standardAuth = createAuthManager({}, mockHttpClient)

  // 创建优化版
  console.log('创建优化版 AuthManager...')
  const optimizedAuth = createOptimizedAuthManager({
    performance: PERFORMANCE_PRESETS.performance
  }, mockHttpClient)

  // 测试登录性能
  console.log('\n📊 测试登录性能...')

  // 标准版
  const standardLoginStart = performance.now()
  await standardAuth.login({ username: 'test', password: 'test' })
  const standardLoginTime = performance.now() - standardLoginStart

  // 优化版
  const optimizedLoginStart = performance.now()
  await optimizedAuth.login({ username: 'test', password: 'test' })
  const optimizedLoginTime = performance.now() - optimizedLoginStart

  console.log(`标准版登录耗时: ${standardLoginTime.toFixed(2)}ms`)
  console.log(`优化版登录耗时: ${optimizedLoginTime.toFixed(2)}ms`)
  console.log(`性能提升: ${((1 - optimizedLoginTime / standardLoginTime) * 100).toFixed(1)}%`)

  // 测试状态更新性能
  console.log('\n📊 测试状态更新性能...')

  // 添加多个监听器
  const standardListeners: (() => void)[] = []
  const optimizedListeners: (() => void)[] = []

  for (let i = 0; i < listenerCount; i++) {
    standardListeners.push(standardAuth.subscribe(() => { }))
    optimizedListeners.push(optimizedAuth.subscribe(() => { }))
  }

  // 标准版状态更新
  const standardUpdateStart = performance.now()
  for (let i = 0; i < iterations; i++) {
    await standardAuth.refreshToken()
  }
  const standardUpdateTime = performance.now() - standardUpdateStart

  // 优化版状态更新
  const optimizedUpdateStart = performance.now()
  for (let i = 0; i < iterations; i++) {
    await optimizedAuth.refreshToken()
  }
  const optimizedUpdateTime = performance.now() - optimizedUpdateStart

  console.log(`标准版 ${iterations} 次更新耗时: ${standardUpdateTime.toFixed(2)}ms`)
  console.log(`优化版 ${iterations} 次更新耗时: ${optimizedUpdateTime.toFixed(2)}ms`)
  console.log(`性能提升: ${((1 - optimizedUpdateTime / standardUpdateTime) * 100).toFixed(1)}%`)

  // 测试 Token 解析性能
  console.log('\n📊 测试 Token 解析性能...')

  const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6IlRlc3QgVXNlciIsImV4cCI6OTk5OTk5OTk5OX0.test'

  // 标准版解析
  const standardParseStart = performance.now()
  for (let i = 0; i < iterations; i++) {
    standardAuth.getTokenManager().decode(testToken)
  }
  const standardParseTime = performance.now() - standardParseStart

  // 优化版解析（带缓存）
  const optimizedParseStart = performance.now()
  for (let i = 0; i < iterations; i++) {
    optimizedAuth.getTokenManager().decode(testToken)
  }
  const optimizedParseTime = performance.now() - optimizedParseStart

  console.log(`标准版 ${iterations} 次解析耗时: ${standardParseTime.toFixed(2)}ms`)
  console.log(`优化版 ${iterations} 次解析耗时: ${optimizedParseTime.toFixed(2)}ms`)
  console.log(`性能提升: ${((1 - optimizedParseTime / standardParseTime) * 100).toFixed(1)}%`)

  // 内存使用对比
  console.log('\n📊 内存使用对比...')

  if (typeof process !== 'undefined' && process.memoryUsage) {
    const memUsage = process.memoryUsage()
    console.log(`堆内存使用: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`)
    console.log(`总堆内存: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`)
  }

  // 获取优化版指标
  const metrics = optimizedAuth.getMetrics()
  console.log('\n📊 优化版指标:')
  console.log(`事件监听器数量: ${metrics.eventListenerCount}`)
  console.log(`Token 缓存大小: ${metrics.tokenCacheSize}`)
  console.log(`黑名单大小: ${metrics.blacklistSize}`)

  // 清理资源
  console.log('\n🧹 清理资源...')

  // 移除监听器
  standardListeners.forEach(unsubscribe => unsubscribe())
  optimizedListeners.forEach(unsubscribe => unsubscribe())

  // 销毁管理器
  standardAuth.destroy()
  await optimizedAuth.destroy()

  console.log('\n✅ 性能测试完成！')
}

// 运行测试
if (require.main === module) {
  runPerformanceTest().catch(console.error)
}

export { runPerformanceTest }
