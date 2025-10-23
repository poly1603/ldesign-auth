# Changelog

All notable changes to `@ldesign/auth` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-10-23

### ✨ Added

#### 核心功能
- ✅ **AuthManager** - 完整的认证管理器
  - 登录/登出功能
  - 状态管理和持久化
  - 自动恢复认证状态
  - 状态订阅机制
  - 集成 HTTP 客户端和缓存管理器

#### JWT 支持
- ✅ **JWT 解析器** - 完整的 JWT Token 解析功能
  - decode() - 解码 JWT Token
  - getPayload() - 获取 Payload
  - getHeader() - 获取 Header
  - isExpired() - 检查是否过期
  - getTimeToLive() - 获取剩余有效时间
  - isExpiring() - 检查是否即将过期

- ✅ **JWT 验证器** - 完整的 JWT Token 验证功能
  - verify() - 完整验证
  - validateStructure() - 结构验证
  - validateExpiry() - 过期时间验证
  - validateNotBefore() - 生效时间验证
  - validateIssuer() - 签发者验证
  - validateAudience() - 受众验证
  - validateSubject() - 主题验证
  - validateAlgorithm() - 算法验证

#### Token 管理
- ✅ **TokenManager** - Token 管理器
  - 多种存储方式支持 (localStorage/sessionStorage/Cookie/Memory)
  - Access Token + Refresh Token 双 Token 机制
  - 自动刷新机制
  - Token 验证和解码
  - Token 缓存（集成 @ldesign/cache）
  - 刷新失败重试机制
  - 事件回调（刷新成功/过期）

- ✅ **存储适配器**
  - LocalStorage 适配器
  - SessionStorage 适配器
  - Cookie 适配器（支持 Secure、SameSite）
  - Memory 适配器（内存存储）
  - 存储适配器工厂

#### Session 管理
- ✅ **SessionManager** - Session 管理器
  - Session 超时检测
  - 用户活动监控（鼠标、键盘、滚动、触摸）
  - 自动延长 Session
  - 多标签页同步（BroadcastChannel / localStorage 事件）
  - 页面可见性检测
  - Session 状态查询
  - 剩余时间计算
  - 事件回调（超时/活动）

#### 事件系统
- ✅ **AuthEventEmitter** - 认证事件发射器
  - on() - 监听事件
  - once() - 监听一次
  - off() - 取消监听
  - emit() - 触发事件（异步）
  - emitSync() - 触发事件（同步）
  - 支持的事件：
    - userLoaded - 用户已加载
    - userUnloaded - 用户已退出
    - loginSuccess - 登录成功
    - loginFailed - 登录失败
    - logoutSuccess - 登出成功
    - tokenRefreshed - Token 已刷新
    - accessTokenExpiring - Token 即将过期
    - accessTokenExpired - Token 已过期
    - refreshTokenExpired - Refresh Token 已过期
    - sessionTimeout - Session 已超时
    - error - 错误事件

#### 错误处理
- ✅ **完整的错误类型系统**
  - AuthError - 基础认证错误类
  - TokenError - Token 相关错误
  - NetworkError - 网络相关错误
  - ValidationError - 验证相关错误

- ✅ **错误码定义**
  - 100+ 个详细的错误码
  - 中文错误消息
  - 错误分类（认证/Token/网络/验证/OAuth/MFA/Session/权限/存储）

- ✅ **错误工具函数**
  - isAuthError() - 判断是否为 AuthError
  - isTokenError() - 判断是否为 TokenError
  - isNetworkError() - 判断是否为 NetworkError
  - isValidationError() - 判断是否为 ValidationError

#### 类型定义
- ✅ **完整的 TypeScript 类型**
  - User - 用户信息接口
  - TokenInfo - Token 信息接口
  - AuthConfig - 认证配置接口
  - AuthState - 认证状态接口
  - LoginCredentials - 登录凭据接口
  - AuthEndpoints - API 端点配置接口
  - 事件类型定义

#### 集成支持
- ✅ **@ldesign/http 集成**
  - HTTP 客户端支持
  - API 请求自动化
  - 错误处理集成

- ✅ **@ldesign/cache 集成**
  - Token 缓存
  - 用户信息缓存
  - 自动过期管理

### 📦 模块化导出

- ✅ 主模块：`@ldesign/auth`
- ✅ JWT 模块：`@ldesign/auth/jwt`
- ✅ Token 模块：`@ldesign/auth/token`
- ✅ Session 模块：`@ldesign/auth/session`
- ✅ 事件模块：`@ldesign/auth/events`
- ✅ 错误模块：`@ldesign/auth/errors`
- ✅ 类型模块：`@ldesign/auth/types`

### 🎯 特性

- ✅ **TypeScript 优先** - 完整的类型定义和类型安全
- ✅ **Tree-shaking 友好** - ESM 模块化，支持按需引入
- ✅ **零依赖（核心）** - 核心功能无外部依赖
- ✅ **浏览器兼容** - 支持所有现代浏览器
- ✅ **性能优化** - Token 缓存、防重复刷新
- ✅ **安全性** - 多种存储方式、自动清理
- ✅ **可扩展** - 插件化设计，易于扩展

### 📊 统计

- **核心代码**: ~3000 行
- **测试覆盖率**: 目标 >85% (待实现)
- **Bundle 大小**: 目标 <40KB (待测试)
- **模块数量**: 7 个独立模块

### 🚧 即将推出 (v0.2.0+)

- OAuth 2.0 完整实现
- PKCE 支持
- 社交登录（GitHub、Google、Facebook）
- OIDC 支持
- MFA/2FA 多因素认证
- SAML 2.0 单点登录
- WebAuthn 生物识别
- 密码管理
- 设备管理
- 安全审计
- Vue 3 Composables
- React Hooks
- 路由守卫

### 📝 说明

这是 `@ldesign/auth` 的首个版本，提供了完整的 JWT 认证基础功能。更多高级功能（OAuth、MFA、SSO等）将在后续版本中陆续推出。

---

**完整项目计划**: 参见 [PROJECT_PLAN.md](./PROJECT_PLAN.md)


