# @ldesign/auth 优化实施指南

## 📋 快速概览

本指南详细说明了如何实施认证包的性能和结构优化。

## 🎯 优化目标

- 🚀 **性能提升**：Token 读取提升 50x，内存降低 30%，渲染提升 20%
- 🏗️ **结构改进**：统一错误处理、日志系统、事件总线、中间件机制
- ✅ **质量保障**：测试覆盖率 ≥ 80%，无内存泄漏

## 📅 实施阶段

### 阶段 1：核心性能优化（1-2 周）⭐⭐⭐

#### 1. Token 刷新防重复（2-3 天）
- 创建 `packages/core/src/token/TokenRefreshQueue.ts`
- 实现 Promise 缓存和队列机制
- 集成到 AuthManager
- 单元测试 + 性能测试

#### 2. TokenManager 缓存优化（1-2 天）
- 修改 `packages/core/src/token/TokenManager.ts`
- 添加内存缓存层
- 实现缓存失效机制
- 异步写入优化

#### 3. Vue Composables 优化（1 天）
- 修改 `packages/vue/src/composables/useAuth.ts`
- 对象类型改用 shallowRef
- 添加 computed 缓存
- 批量更新优化

#### 4. SessionManager 定时器优化（1 天）
- 修改 `packages/core/src/session/SessionManager.ts`
- setTimeout 替代 setInterval
- 添加 destroyed 标志
- 内存泄漏测试

### 阶段 2：代码结构改进（2-3 周）⭐⭐

#### 5. 统一错误处理模块（2-3 天）
```
packages/core/src/errors/
├── index.ts
├── AuthError.ts
├── ErrorHandler.ts
└── errorCodes.ts
```

#### 6. 日志系统模块（2-3 天）
```
packages/core/src/logger/
├── index.ts
├── Logger.ts
├── types.ts
└── transports/
```

#### 7. 事件总线系统（2 天）
```
packages/core/src/events/
├── index.ts
├── EventBus.ts
└── types.ts
```

#### 8. 中间件机制（3-4 天）
```
packages/core/src/middleware/
├── index.ts
├── MiddlewareChain.ts
├── types.ts
└── built-in/
```

#### 9. 存储适配器模式（2-3 天）
```
packages/core/src/storage/
├── index.ts
├── StorageAdapter.ts
└── adapters/
    ├── LocalStorageAdapter.ts
    ├── SessionStorageAdapter.ts
    ├── CookieAdapter.ts
    └── MemoryAdapter.ts
```

### 阶段 3：测试与监控（1-2 周）⭐

#### 10. 性能监控埋点（2-3 天）
- 创建 PerformanceMonitor 类
- 关键路径埋点
- 自定义上报器

#### 11. 单元测试（3-4 天）
- 目标覆盖率：80%+
- 各模块测试用例编写

#### 12. 性能基准测试（2 天）
- Token 操作性能测试
- 内存占用测试
- 并发场景测试

### 阶段 4：文档与示例（1 周）

#### 13. API 文档（2-3 天）
- 核心 API 说明
- 类型定义文档
- 配置项说明

#### 14. 使用示例（2-3 天）
- 基础示例
- Vue 3 完整示例
- 高级用法示例

## 🔧 关键实现示例

### Token 刷新防重复

```typescript
// packages/core/src/token/TokenRefreshQueue.ts
class TokenRefreshQueue {
  private refreshPromise: Promise<TokenInfo | null> | null = null

  async refresh(handler: () => Promise<TokenInfo | null>): Promise<TokenInfo | null> {
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    this.refreshPromise = handler()
    try {
      return await this.refreshPromise
    } finally {
      this.refreshPromise = null
    }
  }
}
```

### 缓存优化

```typescript
class TokenManager {
  private cache = { data: null, dirty: true }

  getAccessToken(): string | null {
    if (this.cache.dirty) {
      this.loadFromStorage()
      this.cache.dirty = false
    }
    return this.cache.data?.accessToken ?? null
  }
}
```

### 响应式优化

```typescript
export function useAuth() {
  const isAuthenticated = ref(false)
  const user = shallowRef<User | null>(null)  // 使用 shallowRef
  const permissions = computed(() => user.value?.permissions ?? [])
  return { isAuthenticated, user, permissions }
}
```

## 📊 验收标准

### 性能指标
- ✅ Token 读取性能：提升 50x
- ✅ 并发刷新请求：减少 90%
- ✅ 内存占用：降低 30%
- ✅ 渲染性能：提升 20%
- ✅ 无内存泄漏

### 代码质量
- ✅ 测试覆盖率 ≥ 80%
- ✅ TypeScript 严格模式
- ✅ ESLint 无错误
- ✅ 完整的类型定义

### 功能完整性
- ✅ 所有现有功能正常
- ✅ 新增模块可用
- ✅ API 向后兼容
- ✅ 文档完善

## ⏱️ 总体时间规划

| 阶段 | 时间 | 优先级 |
|------|------|--------|
| 阶段 1 | 1-2 周 | 🔴 最高 |
| 阶段 2 | 2-3 周 | 🟡 高 |
| 阶段 3 | 1-2 周 | 🟢 中 |
| 阶段 4 | 1 周 | 🔵 低 |
| **总计** | **5-8 周** | - |

## 🚀 快速开始

1. **Fork 项目并创建分支**
   ```bash
   git checkout -b feature/performance-optimization
   ```

2. **从阶段 1 开始实施**
   - 优先完成 Token 刷新防重复
   - 逐项完成各优化任务

3. **运行测试验证**
   ```bash
   pnpm test
   pnpm test:coverage
   ```

4. **提交 PR 进行 Code Review**

## 📚 参考资料

- [ARCHITECTURE.md](./ARCHITECTURE.md) - 架构设计详解
- [OPTIMIZATION_PLAN.md](./OPTIMIZATION_PLAN.md) - 优化方案详情
- 当前 TODO List - 查看任务进度