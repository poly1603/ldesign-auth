# 介绍

## 什么是 @ldesign/auth？

`@ldesign/auth` 是 LDesign 设计系统的认证授权模块，提供完整的身份认证和授权解决方案。它支持从基础的 JWT 认证到企业级的 SSO 单点登录、多因素认证等高级功能。

## 特性

### 🔐 核心认证功能

- **JWT 认证**: 完整的 Token 管理，支持 Access Token 和 Refresh Token
- **自动刷新**: Token 过期前自动刷新，无缝用户体验
- **Session 管理**: 智能会话管理，支持超时检测和多标签页同步
- **状态管理**: 响应式的认证状态，便于集成到前端框架

### 🌐 OAuth 2.0 社交登录

- **内置 Provider**: GitHub、Google、Facebook 等主流平台
- **PKCE 支持**: 增强的授权码流程，更安全
- **自定义 Provider**: 轻松集成任何 OAuth 2.0 提供商
- **用户信息标准化**: 统一的用户信息格式

### 🔒 高级安全特性

- **多因素认证 (MFA)**: TOTP、SMS、邮件等多种方式
- **WebAuthn**: 支持指纹、Face ID 等生物识别
- **账户保护**: 登录失败锁定、异常检测、风险评估
- **审计日志**: 完整的操作记录和安全事件追踪
- **设备管理**: 设备识别、信任设备管理

### 🚀 框架集成

- **Vue 3**: 完美集成，提供 Composables 和 Plugin
- **路由守卫**: 轻松实现路由级别的权限控制
- **HTTP 拦截器**: 自动添加 Token 到请求头
- **响应式状态**: 基于 Vue Reactivity 的状态管理

### 📦 模块化设计

```typescript
// 只引入需要的功能
import { createAuthManager } from '@ldesign/auth'
import { createOAuthManager } from '@ldesign/auth/oauth'
import { createMFAManager } from '@ldesign/auth/mfa'
import { createPasswordManager } from '@ldesign/auth/password'
```

按需引入，减小打包体积。

## 适用场景

### Web 应用

- SPA (单页应用)
- MPA (多页应用)
- PWA (渐进式应用)

### 应用类型

- ✅ 企业后台管理系统
- ✅ 电商平台
- ✅ 社交媒体应用
- ✅ SaaS 产品
- ✅ 在线教育平台
- ✅ 金融应用

## 架构设计

### 核心概念

```
┌─────────────────────────────────────────┐
│          AuthManager (核心)              │
│  - 统一的认证入口                         │
│  - 状态管理                               │
│  - 事件分发                               │
└─────────────────────────────────────────┘
              │
    ┌─────────┼──────────┐
    │         │          │
┌───▼───┐ ┌──▼───┐ ┌────▼─────┐
│Token  │ │Session│ │ Event    │
│Manager│ │Manager│ │ Emitter  │
└───────┘ └──────┘ └──────────┘
    │         │          │
    └─────────┼──────────┘
              │
    ┌─────────┴──────────┐
    │                    │
┌───▼─────┐      ┌──────▼─────┐
│ Storage │      │   HTTP     │
│ Manager │      │   Client   │
└─────────┘      └────────────┘
```

### 模块职责

#### AuthManager
中央管理器，负责：
- 登录/登出流程
- 用户状态管理
- 协调各个子模块
- 事件分发

#### TokenManager
Token 管理，负责：
- Token 存储和获取
- 自动刷新
- 过期检测
- 黑名单管理

#### SessionManager
会话管理，负责：
- 超时检测
- 活动监控
- 多标签页同步
- 会话保持

#### EventEmitter
事件系统，负责：
- 认证事件发布
- 事件订阅管理
- 生命周期钩子

## 设计原则

### 1. 简单易用

提供合理的默认配置，最小化配置即可使用：

```typescript
const auth = createAuthManager(
  { autoRefresh: true },
  httpClient
)
```

### 2. 类型安全

完整的 TypeScript 类型定义：

```typescript
import type { User, AuthState, LoginCredentials } from '@ldesign/auth'
```

### 3. 可扩展性

支持自定义实现和扩展：

```typescript
class CustomOAuthProvider extends BaseOAuthProvider {
  // 自定义实现
}
```

### 4. 高性能

- 优化的事件系统
- 智能缓存机制
- 按需加载模块
- 减少不必要的计算

### 5. 安全第一

- HTTPS 强制要求
- Token 安全存储
- CSRF 防护
- XSS 防护
- 安全的默认配置

## 浏览器兼容性

- Chrome >= 90
- Firefox >= 88
- Safari >= 14
- Edge >= 90

支持现代浏览器的最新两个主要版本。

## 依赖

### 必需依赖

```json
{
  "@ldesign/http": "workspace:*",
  "@ldesign/shared": "workspace:*"
}
```

### 可选依赖

```json
{
  "@ldesign/cache": "workspace:*",  // 用于缓存
  "@ldesign/crypto": "workspace:*", // 用于加密
  "@ldesign/router": "workspace:*", // 用于路由守卫
  "vue": "^3.0.0"                   // Vue 集成
}
```

## 下一步

- [快速开始](/guide/getting-started) - 5 分钟上手
- [安装指南](/guide/installation) - 详细安装说明
- [核心概念](/guide/auth-manager) - 深入了解架构

## 获取帮助

- 📖 [API 文档](/api/auth-manager)
- 💡 [示例代码](/examples/)
- 🐛 [问题反馈](https://github.com/ldesign/ldesign/issues)
- 💬 [讨论区](https://github.com/ldesign/ldesign/discussions)

