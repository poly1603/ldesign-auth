/**
 * 认证系统常量定义
 *
 * 集中管理所有硬编码值，提高可维护性
 */

/**
 * 认证系统默认配置
 */
export const AUTH_DEFAULTS = {
  /** Token 存储键名 */
  TOKEN_KEY: 'auth-token',
  /** 用户信息存储键名 */
  USER_KEY: 'auth-user',
  /** Refresh Token 存储键名 */
  REFRESH_TOKEN_KEY: 'auth-refresh-token',
  /** Token 刷新阈值（秒） */
  REFRESH_THRESHOLD: 300,
  /** Session 超时时间（毫秒） */
  SESSION_TIMEOUT: 30 * 60 * 1000,
  /** 最大重试次数 */
  MAX_RETRIES: 3,
  /** 重试延迟（毫秒） */
  RETRY_DELAY: 1000,
  /** State 长度 */
  STATE_LENGTH: 32,
  /** PKCE 长度 */
  PKCE_LENGTH: 128,
  /** Base64 填充长度 */
  BASE64_PAD_LENGTH: 4,
  /** 状态更新批处理延迟（毫秒） */
  STATE_UPDATE_BATCH_DELAY: 0,
  /** 活动记录防抖延迟（毫秒） */
  ACTIVITY_DEBOUNCE_DELAY: 1000,
  /** 请求缓存 TTL（毫秒） */
  REQUEST_CACHE_TTL: 5000,
  /** Session 同步键名 */
  SESSION_SYNC_KEY: 'auth-session-sync',
  /** Token 预刷新比例 */
  PREEMPTIVE_REFRESH_RATIO: 0.8,
} as const

/**
 * 用户活动事件类型
 */
export const ACTIVITY_EVENTS = [
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
  'mousemove',
  'click',
] as const

/**
 * HTTP 请求头常量
 */
export const HTTP_HEADERS = {
  /** 表单类型 */
  CONTENT_TYPE_FORM: 'application/x-www-form-urlencoded',
  /** JSON 类型 */
  CONTENT_TYPE_JSON: 'application/json',
  /** 授权头 */
  AUTHORIZATION: 'Authorization',
  /** Bearer 前缀 */
  BEARER_PREFIX: 'Bearer',
} as const

/**
 * API 端点默认值
 */
export const API_ENDPOINTS = {
  /** 登录端点 */
  LOGIN: '/api/auth/login',
  /** 登出端点 */
  LOGOUT: '/api/auth/logout',
  /** 刷新 Token 端点 */
  REFRESH: '/api/auth/refresh',
  /** 用户信息端点 */
  USER_INFO: '/api/auth/user',
  /** 注册端点 */
  REGISTER: '/api/auth/register',
} as const

/**
 * 路由默认值
 */
export const ROUTES = {
  /** 登录页 */
  LOGIN: '/login',
  /** 登录成功后重定向 */
  REDIRECT: '/',
} as const

/**
 * 存储类型
 */
export const STORAGE_TYPES = {
  LOCAL: 'localStorage',
  SESSION: 'sessionStorage',
  COOKIE: 'cookie',
  MEMORY: 'memory',
} as const

/**
 * 重试策略配置
 */
export const RETRY_STRATEGY = {
  /** 初始延迟（毫秒） */
  INITIAL_DELAY: 1000,
  /** 最大延迟（毫秒） */
  MAX_DELAY: 30000,
  /** 退避因子 */
  BACKOFF_FACTOR: 2,
} as const

/**
 * 清理间隔
 */
export const CLEANUP_INTERVALS = {
  /** Token 黑名单清理间隔（毫秒） */
  TOKEN_BLACKLIST: 5 * 60 * 1000, // 5分钟
  /** 过期数据清理间隔（毫秒） */
  EXPIRED_DATA: 10 * 60 * 1000, // 10分钟
} as const

/**
 * 性能配置
 */
export const PERFORMANCE_CONFIG = {
  /** 启用 Token 解析缓存 */
  ENABLE_TOKEN_PARSE_CACHE: true,
  /** 启用对象池 */
  ENABLE_OBJECT_POOL: true,
  /** 启用内存监控 */
  ENABLE_MEMORY_MONITORING: false,
  /** 使用微任务批处理 */
  USE_MICROTASK_BATCHING: true,
} as const

/**
 * 内存限制
 */
export const MEMORY_LIMITS = {
  /** Token 解析缓存大小 */
  TOKEN_PARSE_CACHE_SIZE: 100,
  /** 对象池大小 */
  OBJECT_POOL_SIZE: 50,
  /** 内存监控间隔（毫秒） */
  MEMORY_MONITOR_INTERVAL: 60000,
  /** 每个事件最大监听器数 */
  MAX_LISTENERS_PER_EVENT: 50,
  /** 全局最大监听器数 */
  MAX_GLOBAL_LISTENERS: 500,
  /** Token 黑名单最大条目 */
  TOKEN_BLACKLIST_MAX_SIZE: 10000,
} as const

