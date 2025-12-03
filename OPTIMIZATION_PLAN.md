
# @ldesign/auth 认证包优化计划

> **优化目标**：提升性能、改善代码结构、确保现有功能稳定高效
> 
> **创建时间**：2025-12-03
> 
> **优先级**：性能优化 + 代码结构改进

---

## 📊 当前状态分析

### 项目结构
```
@ldesign/auth (monorepo)
├── packages/core/          # 核心认证逻辑 ✅
│   ├── auth/              # AuthManager
│   ├── session/           # SessionManager  
│   ├── token/             # TokenManager
│   └── types/             # TypeScript 类型定义
└── packages/vue/          # Vue 框架集成 ✅
    ├── composables/       # useAuth, useLogin, usePermission, useUser
    └── plugin/           # Vue 插件、路由守卫
```

### 已有功能
- ✅ 基础认证管理（登录/登出）
- ✅ Token 管理（存储、过期检测）
- ✅ 会话管理（超时检测、自动续期）
- ✅ 权限验证（hasPermission、hasRole）
- ✅ Vue 3 集成（Composables、插件）
- ✅ 路由守卫

### 识别的问题

#### 🔴 性能问题
1. **Token 刷新并发问题**：多个请求同时触发刷新时会重复调用
2. **响应式开销**：Vue Composables 中使用了 `ref` 而非 `shallowRef`
3. **缓存策略缺失**：TokenManager 每次都从 storage 读取
4. **定时器资源泄漏风险**：SessionManager 的定时器管理不够完善
5. **事件监听器未优化**：可能导致内存泄漏

#### 🟡 代码结构问题
1. **缺少统一错误处理**：错误处理分散在各个模块
2. **缺少日志系统**：无法追踪关键操作和调试
3. **缺少事件总线**：事件系统耦合在 AuthManager 中
4. **缺少中间件机制**：无法扩展认证流程
5. **存储层不够抽象**：Cookie 存储未实现

---

## 🎯 优化方案

### 第一阶段：性能优化（核心重点）

#### 1. Token 刷新机制优化

**问题描述**：
```typescript
// 当前实现：多个请求同时触发时会重复刷新
// AuthManager.ts:278-305
private async tryRefreshToken(): Promise<boolean> {
  const refreshToken = this.tokenManager.getRefreshToken()
  // 没有防重复机制 ❌
  const newToken = await this.refreshTokenHandler(refreshToken)
  // ...
}
```

**优化方案**：
```typescript
// 添加请求防重机制
private refreshPromise: Promise<boolean> | null = null

private async tryRefreshToken(): Promise<boolean> {
  // 如果已有刷新请求在进行中，复用该 Promise
  if (this.refreshPromise) {
    return this.refreshPromise
  }

  this.refreshPromise = this._doRefreshToken()
  
  try {
    return await this.refreshPromise
  } finally {
    this.refreshPromise = null
  }
}

private async _doRefreshToken(): Promise<boolean> {
  // 实际的刷新逻辑
}
```

**性能收益**：
- 避免并发刷新请求
- 减少服务器负载
- 降低 Token 冲突风险

---

#### 2. Vue Composables 响应式优化

**问题描述**：
```typescript
// useAuth.ts:104-108
const isAuthenticated = ref(authManager.isAuthenticated())  // ❌ 深度响应式
const user = shallowRef<User | null>(authManager.getUser()) // ✅ 浅层响应式
const token = shallowRef<TokenInfo | null>(...) // ✅
```

**优化方案**：
```typescript
// 1. 基础类型使用 ref，对象使用 shallowRef
const isAuthenticated = ref(authManager.isAuthenticated())
const isLoading = ref(false)

// 2. 对象类型使用 shallowRef 避免深度监听
const user = shallowRef<User | null>(authManager.getUser())
const token = shallowRef<TokenInfo | null>(...)
const error = shallowRef<AuthError | null>(null)

// 3. 使用 computed 缓存计算结果
const permissions = computed(() => user.value?.permissions ?? [])
const roles = computed(() => user.value?.roles ?? [])
```

**性能收益**：
- 减少响应式追踪开销
- 降低内存占用
- 提升更新性能

---

#### 3. TokenManager 缓存策略优化

**问题描述**：
```typescript
// TokenManager.ts:161-173
private loadFromStorage(): void {
  // 每次实例化都从 storage 读取 ❌
  const accessToken = this.storage.get(...)
  const refreshToken = this.storage.get(...)
}
```

**优化方案**：
```typescript
class TokenManager {
  private tokenInfo: TokenInfo | null = null
  private cacheValid = false

  // 懒加载 + 缓存
  getAccessToken(): string | null {
    if (!this.cacheValid) {
      this.loadFromStorage()
      this.cacheValid = true
    }
    return this.tokenInfo?.accessToken ?? null
  }

  // 设置时更新缓存
  setToken(token: TokenInfo): void {
    this.tokenInfo = { ...token, expiresAt: ... }
    this.cacheValid = true
    this.saveToStorage()
  }

  // 清除时失效缓存
  clearToken(): void {
    this.tokenInfo = null
    this.cacheValid = false
    this.clearStorage()
  }
}
```

**性能收益**：
- 减少 localStorage/sessionStorage 访问
- 提升 Token 读取性能 10-50 倍
- 降低浏览器 I/O 开销

---

#### 4. SessionManager 定时器优化

**问题描述**：
```typescript
// SessionManager.ts:240-260
private startActivityMonitor(): void {
  this.stopActivityMonitor()
  
  // 定时器未清理完全可能导致内存泄漏 ⚠️
  this.activityTimer = setInterval(() => {
    if (this.isSessionExpired()) {
      this.handleSessionExpired()
    }
  }, this.options.activityCheckInterval)
}
```

**优化方案**：
```typescript
class SessionManager {
  private activityTimer: number | null = null
  private destroyed = false

  private startActivityMonitor(): void {
    if (this.destroyed) return
    
    this.stopActivityMonitor()
    
    // 使用 requestIdleCallback 优化性能
    const checkActivity = () => {
      if (this.destroyed) return
      
      if (this.isSessionExpired()) {
        this.handleSessionExpired()
        return
      }
      
      this.activityTimer = window.setTimeout(
        checkActivity, 
        this.options.activityCheckInterval
      )
    }
    
    checkActivity()
  }

  destroy(): void {
    this.destroyed = true
    this.stopActivityMonitor()
    this.onExpiredCallbacks = []
  }
}
```

**性能收益**：
- 避免内存泄漏
- 降低 CPU 占用
- 更好的资源管理

---

### 第二阶段：代码结构改进

#### 1. 统一错误处理模块

**新增文件**：`packages/core/src/errors/index.ts`

```typescript
/**
 * 错误码枚举
 */
export enum AuthErrorCode {
  // 认证错误
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  REFRESH_FAILED = 'REFRESH_FAILED',
  
  // 权限错误
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ROLE_REQUIRED = 'ROLE_REQUIRED',
  
  // 配置错误
  NO_LOGIN_HANDLER = 'NO_LOGIN_HANDLER',
  NO_REFRESH_HANDLER = 'NO_REFRESH_HANDLER',
  
  // 网络错误
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  
  // 会话错误
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  SESSION_INVALID = 'SESSION_INVALID',
}

/**
 * 认证错误类
 */
export class AuthError extends Error {
  constructor(
    public code: AuthErrorCode,
    message: string,
    public details?: unknown,
    public retryable = false
  ) {
    super(message)
    this.name = 'AuthError'
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      retryable: this.retryable,
    }
  }
}

/**
 * 错误处理器
 */
export class ErrorHandler {
  private handlers = new Map<AuthErrorCode, (error: AuthError) => void>()

  register(code: AuthErrorCode, handler: (error: AuthError) => void): void {
    this.handlers.set(code, handler)
  }

  handle(error: AuthError): void {
    const handler = this.handlers.get(error.code)
    handler?.(error)
  }
}
```

**使用示例**：
```typescript
// 在 AuthManager 中使用
import { AuthError, AuthErrorCode, ErrorHandler } from '../errors'

class AuthManager {
  private errorHandler = new ErrorHandler()

  constructor(config: AuthConfig) {
    // 注册错误处理器
    this.errorHandler.register(
      AuthErrorCode.TOKEN_EXPIRED,
      (error) => {
        this.tryRefreshToken()
      }
    )
  }

  async login(credentials: Credentials): Promise<LoginResult> {
    try {
      // ...
    } catch (err) {
      const error = new AuthError(
        AuthErrorCode.INVALID_CREDENTIALS,
        '登录失败：用户名或密码错误',
        err,
        true // 可重试
      )
      this.errorHandler.handle(error)
      throw error
    }
  }
}
```

---

#### 2. 日志系统模块

**新增文件**：`packages/core/src/logger/index.ts`

```typescript
/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

/**
 * 日志配置
 */
export interface LoggerConfig {
  level: LogLevel
  prefix?: string
  timestamp?: boolean
  enableConsole?: boolean
  customHandler?: (level: LogLevel, message: string, data?: unknown) => void
}

/**
 * 日志器类
 */
export class Logger {
  private config: Required<LoggerConfig>

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      prefix: '[Auth]',
      timestamp: true,
      enableConsole: true,
      customHandler: undefined,
      ...config,
    }
  }

  debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, data)
  }

  info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, data)
  }

  warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, data)
  }

  error(message: string, data?: unknown): void {
    this.log(LogLevel.ERROR, message, data)
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    if (level < this.config.level) return

    const timestamp = this.config.timestamp 
      ? new Date().toISOString() 
      : ''
    const prefix = this.config.prefix
    const fullMessage = `${timestamp} ${prefix} ${message}`

    // 自定义处理器
    if (this.config.customHandler) {
      this.config.customHandler(level, fullMessage, data)
      return
    }

    // 控制台输出
    if (this.config.enableConsole) {
      const consoleFn = this.getConsoleFunction(level)
      if (data !== undefined) {
        consoleFn(fullMessage, data)
      } else {
        consoleFn(fullMessage)
      }
    }
  }

  private getConsoleFunction(level: LogLevel) {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug
      case LogLevel.INFO:
        return console.info
      case LogLevel.WARN:
        return console.warn
      case LogLevel.ERROR:
        return console.error
      default:
        return console.log
    }
  }
}

// 导出默认实例
export const logger = new Logger()
```

**使用示例**：
```typescript
import { logger, LogLevel } from '../logger'

class AuthManager {
  constructor(config: AuthConfig) {
    // 配置日志级别
    if (config.debug) {
      logger.config.level = LogLevel.DEBUG
    }
    
    logger.info('AuthManager 初始化', { config })
  }

  async login(credentials: Credentials): Promise<LoginResult> {
    logger.debug('开始登录', { username: credentials.username })
    
    try {
      const result = await this.loginHandler(credentials)
      logger.info('登录成功', { user: result.user })
      return result
    } catch (error) {
      logger.error('登录失败', error)
      throw error
    }
  }
}
```

---

#### 3. 事件总线系统

**新增文件**：`packages/core/src/events/EventBus.ts`

```typescript
/**
 * 事件监听器类型
 */
type EventListener<T = unknown> = (data: T) => void

/**
 * 事件总线类
 */
export class EventBus {
  private listeners = new Map<string, Set<EventListener>>()
  private onceListeners = new Map<string, Set<EventListener>>()

  /**
   * 注册事件监听器
   */
  on<T = unknown>(event: string, listener: EventListener<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener as EventListener)

    return () => this.off(event, listener)
  }

  /**
   * 注册一次性事件监听器
   */
  once<T = unknown>(event: string, listener: EventListener<T>): () => void {
    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, new Set())
    }
    this.onceListeners.get(event)!.add(listener as EventListener)

    return () => {
      this.onceListeners.get(event)?.delete(listener as EventListener)
    }
  }

  /**
   * 移除事件监听器
   */
