/**
 * 性能优化配置
 */

import { MEMORY_LIMITS, PERFORMANCE_CONFIG } from '../constants'

export interface PerformanceOptions {
  /**
   * 启用 Token 解析缓存
   * @default true
   */
  enableTokenCache?: boolean

  /**
   * Token 缓存大小
   * @default 100
   */
  tokenCacheSize?: number

  /**
   * 启用对象池
   * @default true
   */
  enableObjectPool?: boolean

  /**
   * 对象池大小
   * @default 50
   */
  objectPoolSize?: number

  /**
   * 启用内存监控
   * @default false
   */
  enableMemoryMonitoring?: boolean

  /**
   * 内存监控间隔（毫秒）
   * @default 60000
   */
  memoryMonitorInterval?: number

  /**
   * 启用微任务批处理
   * @default true
   */
  enableMicrotaskBatching?: boolean

  /**
   * 最大事件监听器数（每个事件）
   * @default 50
   */
  maxListenersPerEvent?: number

  /**
   * 全局最大监听器数
   * @default 500
   */
  maxGlobalListeners?: number

  /**
   * Token 黑名单最大条目
   * @default 10000
   */
  tokenBlacklistMaxSize?: number

  /**
   * 启用自动清理
   * @default true
   */
  enableAutoCleanup?: boolean

  /**
   * 清理间隔（毫秒）
   * @default 300000 (5分钟)
   */
  cleanupInterval?: number
}

/**
 * 默认性能配置
 */
export const DEFAULT_PERFORMANCE_OPTIONS: Required<PerformanceOptions> = {
  enableTokenCache: PERFORMANCE_CONFIG.ENABLE_TOKEN_PARSE_CACHE,
  tokenCacheSize: MEMORY_LIMITS.TOKEN_PARSE_CACHE_SIZE,
  enableObjectPool: PERFORMANCE_CONFIG.ENABLE_OBJECT_POOL,
  objectPoolSize: MEMORY_LIMITS.OBJECT_POOL_SIZE,
  enableMemoryMonitoring: PERFORMANCE_CONFIG.ENABLE_MEMORY_MONITORING,
  memoryMonitorInterval: MEMORY_LIMITS.MEMORY_MONITOR_INTERVAL,
  enableMicrotaskBatching: PERFORMANCE_CONFIG.USE_MICROTASK_BATCHING,
  maxListenersPerEvent: MEMORY_LIMITS.MAX_LISTENERS_PER_EVENT,
  maxGlobalListeners: MEMORY_LIMITS.MAX_GLOBAL_LISTENERS,
  tokenBlacklistMaxSize: MEMORY_LIMITS.TOKEN_BLACKLIST_MAX_SIZE,
  enableAutoCleanup: true,
  cleanupInterval: 300000,
}

/**
 * 性能预设配置
 */
export const PERFORMANCE_PRESETS = {
  /**
   * 最小内存占用配置
   */
  minimal: {
    enableTokenCache: false,
    tokenCacheSize: 10,
    enableObjectPool: false,
    objectPoolSize: 10,
    enableMemoryMonitoring: false,
    enableMicrotaskBatching: false,
    maxListenersPerEvent: 10,
    maxGlobalListeners: 100,
    tokenBlacklistMaxSize: 1000,
    enableAutoCleanup: true,
    cleanupInterval: 60000,
  },

  /**
   * 平衡配置（默认）
   */
  balanced: DEFAULT_PERFORMANCE_OPTIONS,

  /**
   * 高性能配置
   */
  performance: {
    enableTokenCache: true,
    tokenCacheSize: 500,
    enableObjectPool: true,
    objectPoolSize: 200,
    enableMemoryMonitoring: false,
    enableMicrotaskBatching: true,
    maxListenersPerEvent: 100,
    maxGlobalListeners: 1000,
    tokenBlacklistMaxSize: 50000,
    enableAutoCleanup: true,
    cleanupInterval: 600000,
  },

  /**
   * 开发模式配置
   */
  development: {
    enableTokenCache: true,
    tokenCacheSize: 100,
    enableObjectPool: true,
    objectPoolSize: 50,
    enableMemoryMonitoring: true,
    memoryMonitorInterval: 30000,
    enableMicrotaskBatching: true,
    maxListenersPerEvent: 50,
    maxGlobalListeners: 500,
    tokenBlacklistMaxSize: 10000,
    enableAutoCleanup: true,
    cleanupInterval: 300000,
  },
} as const

/**
 * 合并性能配置
 */
export function mergePerformanceOptions(
  ...options: (PerformanceOptions | keyof typeof PERFORMANCE_PRESETS)[]
): Required<PerformanceOptions> {
  const result = { ...DEFAULT_PERFORMANCE_OPTIONS }

  for (const option of options) {
    if (typeof option === 'string') {
      // 使用预设
      Object.assign(result, PERFORMANCE_PRESETS[option])
    } else {
      // 自定义配置
      Object.assign(result, option)
    }
  }

  return result
}

/**
 * 性能优化建议
 */
export interface PerformanceRecommendation {
  issue: string
  recommendation: string
  impact: 'low' | 'medium' | 'high'
}

/**
 * 分析性能配置并给出建议
 */
export function analyzePerformanceConfig(
  config: PerformanceOptions,
  metrics?: {
    listenerCount?: number
    tokenCacheHitRate?: number
    memoryUsageMB?: number
    blacklistSize?: number
  }
): PerformanceRecommendation[] {
  const recommendations: PerformanceRecommendation[] = []

  // 分析缓存配置
  if (!config.enableTokenCache && metrics?.tokenCacheHitRate && metrics.tokenCacheHitRate > 0.5) {
    recommendations.push({
      issue: 'Token 缓存已禁用，但缓存命中率较高',
      recommendation: '建议启用 Token 缓存以提升性能',
      impact: 'high'
    })
  }

  // 分析监听器限制
  if (metrics?.listenerCount && config.maxGlobalListeners) {
    if (metrics.listenerCount > config.maxGlobalListeners * 0.8) {
      recommendations.push({
        issue: '监听器数量接近上限',
        recommendation: '建议增加 maxGlobalListeners 或优化监听器使用',
        impact: 'medium'
      })
    }
  }

  // 分析内存使用
  if (metrics?.memoryUsageMB && metrics.memoryUsageMB > 100) {
    if (!config.enableMemoryMonitoring) {
      recommendations.push({
        issue: '内存使用较高但未启用监控',
        recommendation: '建议启用内存监控以追踪内存使用情况',
        impact: 'medium'
      })
    }
  }

  // 分析黑名单大小
  if (metrics?.blacklistSize && config.tokenBlacklistMaxSize) {
    if (metrics.blacklistSize > config.tokenBlacklistMaxSize * 0.8) {
      recommendations.push({
        issue: 'Token 黑名单接近容量上限',
        recommendation: '建议增加 tokenBlacklistMaxSize 或减少清理间隔',
        impact: 'low'
      })
    }
  }

  return recommendations
}
