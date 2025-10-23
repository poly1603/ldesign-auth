# @ldesign/auth 完整项目计划书

<div align="center">

# 🔐 @ldesign/auth v0.1.0

**认证授权系统 - JWT、OAuth 2.0、SSO、MFA，完整的身份认证解决方案**

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](./CHANGELOG.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](./tsconfig.json)
[![Security](https://img.shields.io/badge/security-enterprise-green.svg)](#安全特性)
[![Protocols](https://img.shields.io/badge/protocols-JWT%2BOAuth%2BSSO-blue.svg)](#功能清单)

</div>

---

## 🚀 快速导航

| 想要... | 查看章节 | 预计时间 |
|---------|---------|---------|
| 📖 了解认证系统 | [项目概览](#项目概览) | 3 分钟 |
| 🔍 查看参考项目 | [参考项目分析](#参考项目深度分析) | 15 分钟 |
| ✨ 查看功能清单 | [功能清单](#功能清单) | 18 分钟 |
| 🏗️ 了解架构 | [架构设计](#架构设计) | 12 分钟 |

---

## 📊 项目全景图

```
┌──────────────────────────────────────────────────────────────┐
│              @ldesign/auth - 认证授权全景                      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  🎯 核心认证                                                  │
│  ├─ 🔑 JWT 认证（Access + Refresh Token）                   │
│  ├─ 🔄 自动刷新（Token 过期前刷新）                          │
│  ├─ 💾 状态持久化（LocalStorage/Cookie）                    │
│  ├─ 👤 用户管理（User Info + Roles）                        │
│  └─ 📊 认证状态（isAuthenticated + Loading）                │
│                                                              │
│  🌐 OAuth 2.0                                               │
│  ├─ 🔐 Authorization Code Flow                             │
│  ├─ 🎫 Implicit Flow                                        │
│  ├─ 🔗 PKCE 支持                                            │
│  └─ 🌍 社交登录（GitHub/Google/Facebook）                   │
│                                                              │
│  🏢 企业功能                                                 │
│  ├─ 🔒 SSO 单点登录                                          │
│  ├─ 📱 MFA/2FA 多因素认证                                   │
│  ├─ 🔐 SAML 2.0 支持                                        │
│  └─ 🎯 RBAC 角色权限                                         │
│                                                              │
│  🔧 高级功能                                                 │
│  ├─ 🌐 WebAuthn 生物识别                                    │
│  ├─ 📱 设备管理                                              │
│  ├─ 📜 登录历史                                              │
│  ├─ 🔔 安全告警                                              │
│  └─ 📊 审计日志                                              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 📚 参考项目深度分析

### 1. @auth0/auth0-spa-js (★★★★★)

**项目信息**:
- GitHub: https://github.com/auth0/auth0-spa-js
- Stars: 800+
- 团队: Auth0
- 定位: SPA 认证 SDK

**核心特点**:
- ✅ OAuth 2.0 完整实现
- ✅ PKCE 支持
- ✅ Token 管理（access + refresh）
- ✅ 自动刷新机制
- ✅ 静默认证（iframe）
- ✅ 完善的错误处理

**借鉴要点**:
1. **Token 管理** - access + refresh token 双 token 机制
2. **自动刷新** - 过期前自动刷新
3. **PKCE Flow** - 更安全的 OAuth 流程
4. **静默认证** - iframe 静默获取 token
5. **错误处理** - 详细的错误码和消息

**功能借鉴**:
- [x] Access + Refresh Token（已实现）
- [x] 自动刷新（已实现）
- [ ] PKCE Flow
- [ ] 静默认证
- [ ] 完善错误处理

### 2. oidc-client-ts (★★★★★)

**项目信息**:
- GitHub: https://github.com/authts/oidc-client-ts
- Stars: 1,000+
- 定位: OpenID Connect 客户端

**核心特点**:
- ✅ OpenID Connect 完整实现
- ✅ 多种 OAuth 流程
- ✅ ID Token 验证
- ✅ UserInfo 端点
- ✅ Session 管理
- ✅ TypeScript 完整支持

**借鉴要点**:
1. **OIDC 流程** - Authorization Code + Implicit + Hybrid
2. **ID Token** - JWT ID Token 解析和验证
3. **UserManager** - 用户管理类
4. **Session 监控** - 会话状态监控
5. **事件系统** - userLoaded/userUnloaded/accessTokenExpiring

**功能借鉴**:
- [ ] OIDC 协议支持
- [ ] ID Token 验证
- [x] UserManager（已有 AuthManager）
- [ ] Session 监控
- [ ] 事件系统

### 3. firebase-auth (★★★★☆)

**项目信息**:
- 产品: Firebase Authentication
- 团队: Google
- 定位: BaaS 认证服务

**核心特点**:
- ✅ 多种登录方式（邮箱/手机/社交）
- ✅ 匿名登录
- ✅ 邮箱验证
- ✅ 密码重置
- ✅ 多因素认证（MFA）
- ✅ 设备管理

**借鉴要点**:
1. **多种登录** - Email/Phone/Google/Facebook/GitHub
2. **邮箱验证** - 发送验证邮件
3. **密码重置** - 完整的密码重置流程
4. **MFA** - SMS/TOTP 多因素
5. **持久化** - session/local/none

**功能借鉴**:
- [ ] 多种登录方式
- [ ] 邮箱验证流程
- [ ] 密码重置流程
- [ ] MFA 支持
- [ ] 持久化策略

### 4. next-auth (★★★★★)

**项目信息**:
- GitHub: https://github.com/nextauthjs/next-auth
- Stars: 23,000+
- 定位: Next.js 认证

**核心特点**:
- ✅ 社交登录集成（50+ 提供商）
- ✅ 凭证登录（用户名密码）
- ✅ 邮箱登录（Magic Link）
- ✅ Session 管理
- ✅ JWT 策略
- ✅ 数据库适配器

**借鉴要点**:
1. **Provider 系统** - 统一的登录提供商接口
2. **Callbacks** - 丰富的回调钩子
3. **Session 策略** - JWT vs Database
4. **Adapter 模式** - 数据库适配器
5. **配置化** - 声明式配置

**功能借鉴**:
- [ ] Provider 系统
- [ ] 社交登录集成
- [ ] Callbacks 钩子
- [ ] Session 策略
- [ ] Adapter 模式

### 5. passport.js (★★★★☆)

**项目信息**:
- GitHub: https://github.com/jaredhanson/passport
- Stars: 22,000+
- 定位: Node.js 认证中间件

**核心特点**:
- ✅ 策略（Strategy）架构
- ✅ 500+ 策略插件
- ✅ 会话管理
- ✅ 序列化/反序列化
- ✅ 中间件模式

**借鉴要点**:
1. **Strategy 模式** - 可插拔认证策略
2. **中间件** - Express/Koa 集成
3. **序列化** - 用户对象序列化
4. **生态丰富** - 大量社区策略
5. **灵活配置** - 高度可定制

**功能借鉴**:
- [ ] Strategy 模式
- [ ] 中间件支持
- [ ] 序列化机制

### 参考项目功能对比

| 功能 | auth0 | oidc-client | firebase | next-auth | passport | **@ldesign/auth** |
|------|-------|-------------|----------|-----------|----------|-------------------|
| JWT | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| OAuth 2.0 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ 计划 |
| OIDC | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | ✅ 计划 |
| SSO | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | ✅ 计划 |
| MFA | ✅ | ⚠️ | ✅ | ⚠️ | ❌ | ✅ 计划 |
| 社交登录 | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ 计划 |
| TypeScript | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| 浏览器 | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| 自动刷新 | ✅ | ✅ | ✅ | ⚠️ | ❌ | ✅ |
| Bundle 大小 | 32KB | 45KB | 大 | N/A | 中 | **<40KB** 🎯 |

---

## ✨ 功能清单

### P0 核心功能（15项）

#### JWT 认证

- [x] **AuthManager 核心** - 认证管理器（参考: auth0）
  - ✅ login() - 登录
  - ✅ logout() - 登出
  - ✅ getUser() - 获取用户
  - ✅ getAccessToken() - 获取Token
  - ✅ isAuthenticated() - 检查认证状态

- [x] **Token 管理** - 双Token机制（参考: auth0）
  - ✅ Access Token - 短期访问令牌
  - ✅ Refresh Token - 长期刷新令牌
  - ✅ Token 存储（localStorage）
  - ✅ Token 过期检测

- [x] **自动刷新** - Token 自动刷新（参考: auth0）
  - ✅ 过期前自动刷新
  - ✅ refreshThreshold 配置
  - ✅ 刷新失败处理
  - ✅ 定时器管理

- [x] **状态管理** - 认证状态（参考: firebase）
  - ✅ isAuthenticated - 是否认证
  - ✅ user - 当前用户
  - ✅ token - Token 信息
  - ✅ loading - 加载状态
  - ✅ error - 错误信息

- [x] **状态持久化** - 本地存储（参考: 所有）
  - ✅ localStorage 存储
  - [ ] Cookie 存储（可选）
  - [ ] sessionStorage（可选）
  - [x] 自动恢复状态

- [ ] **会话管理** - Session 管理（参考: oidc-client）
  - 会话超时
  - 会话延长
  - 多标签页同步

#### 登录流程

- [x] **用户名密码登录** - 基础登录（参考: 所有）
  - ✅ 登录接口
  - ✅ 凭证验证
  - [ ] 记住我功能

- [ ] **邮箱登录** - 无密码登录（参考: next-auth）
  - Magic Link
  - OTP 验证码

- [ ] **手机号登录** - 短信验证（参考: firebase）
  - 短信验证码
  - 验证码验证

### P1 高级功能（18项）

#### OAuth 2.0

- [ ] **Authorization Code Flow** - 标准流程（参考: oidc-client）
  - 授权请求
  - 授权码交换
  - State 参数验证
  - PKCE 支持

- [ ] **Implicit Flow** - 简化流程（参考: auth0）
  - 直接返回 token
  - 浏览器友好

- [ ] **OAuth Provider** - 提供商系统（参考: next-auth）
  - GitHub Provider
  - Google Provider
  - Facebook Provider
  - 自定义 Provider
  - 统一接口

#### OpenID Connect

- [ ] **OIDC 协议** - OpenID Connect（参考: oidc-client）
  - Discovery 端点
  - UserInfo 端点
  - ID Token 验证
  - Claims 解析

#### SSO 单点登录

- [ ] **SSO 支持** - 企业 SSO（参考: auth0）
  - SAML 2.0 协议
  - CAS 协议
  - LDAP 集成
  - AD 集成

#### 多因素认证

- [ ] **MFA/2FA** - 多因素认证（参考: firebase）
  - SMS 验证码
  - TOTP（Google Authenticator）
  - 邮箱验证码
  - 生物识别（WebAuthn）

#### 社交登录

- [ ] **社交账号集成** - 第三方登录（参考: next-auth）
  - GitHub OAuth
  - Google OAuth
  - Facebook OAuth
  - Twitter OAuth
  - 微信/QQ/微博
  - Apple Sign In

#### 密码管理

- [ ] **密码重置** - 完整流程（参考: firebase）
  - 发送重置邮件
  - 重置 Token 验证
  - 密码更新
  - 重置成功通知

- [ ] **邮箱验证** - 邮箱验证流程（参考: firebase）
  - 发送验证邮件
  - 验证 Token
  - 标记已验证

- [ ] **密码策略** - 安全策略（参考: auth0）
  - 密码强度要求
  - 密码历史
  - 密码过期
  - 密码重试限制

### P2 扩展功能（10项）

#### 生物识别

- [ ] **WebAuthn** - 生物识别登录
  - 指纹识别
  - 面部识别
  - 硬件密钥（YubiKey）
  - 平台认证器

#### 设备管理

- [ ] **设备追踪** - 登录设备管理
  - 设备列表
  - 设备信任
  - 设备注销
  - 可疑设备告警

#### 安全审计

- [ ] **登录历史** - 登录记录
  - 登录时间
  - 登录IP
  - 登录设备
  - 登录位置

- [ ] **安全审计** - 审计日志
  - 操作记录
  - 权限变更
  - 敏感操作

#### 高级特性

- [ ] **风险评估** - 登录风险
  - 异常登录检测
  - IP 黑名单
  - 频率限制

- [ ] **账号保护** - 安全保护
  - 账号锁定
  - 登录限制
  - 验证码

---

## 🏗️ 架构设计

### 整体架构

```
┌────────────────────────────────────────────────────────┐
│                  @ldesign/auth                          │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────┐     ┌──────────────┐               │
│  │ AuthManager  │────▶│ TokenManager │               │
│  │              │     │              │               │
│  │ - login()    │     │ - refresh()  │               │
│  │ - logout()   │     │ - validate() │               │
│  │ - getUser()  │     │ - store()    │               │
│  └──────────────┘     └──────────────┘               │
│         │                     │                       │
│         ▼                     ▼                       │
│  ┌──────────────┐     ┌──────────────┐               │
│  │ StateManager │     │StorageManager│               │
│  │              │     │              │               │
│  │ - state      │     │ - save()     │               │
│  │ - subscribe()│     │ - load()     │               │
│  └──────────────┘     └──────────────┘               │
│                                                        │
│  ┌────────────────────────────────────────────┐      │
│  │         OAuth/OIDC Module                  │      │
│  ├─ OAuthManager                               │      │
│  ├─ OIDCManager                                │      │
│  ├─ Provider 系统                               │      │
│  └─ Flow 处理器                                 │      │
│  └────────────────────────────────────────────┘      │
│                                                        │
│  ┌────────────────────────────────────────────┐      │
│  │         MFA Module                         │      │
│  ├─ SMS Verifier                               │      │
│  ├─ TOTP Verifier                              │      │
│  └─ WebAuthn Handler                           │      │
│  └────────────────────────────────────────────┘      │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 核心类设计

```typescript
class AuthManager {
  // 认证方法
  login(credentials: LoginCredentials): Promise<void>
  logout(): Promise<void>
  refreshToken(): Promise<void>
  
  // 状态查询
  getUser(): User | null
  getAccessToken(): string | null
  isAuthenticated(): boolean
  
  // 状态订阅
  subscribe(listener: (state: AuthState) => void): () => void
  
  // 配置
  setAuth(user: User, token: TokenInfo): Promise<void>
}

class TokenManager {
  refresh(refreshToken: string): Promise<TokenInfo>
  validate(token: string): boolean
  decode(token: string): TokenPayload
  store(token: TokenInfo): void
  load(): TokenInfo | null
}

class OAuthManager {
  authorize(provider: OAuthProvider): Promise<void>
  callback(code: string, state: string): Promise<TokenInfo>
  buildAuthUrl(provider: OAuthProvider): string
}
```

---

## 🛠️ 技术栈

### 核心技术

- **TypeScript 5.7+**
- **JWT** (JSON Web Tokens)
- **OAuth 2.0** 协议
- **OpenID Connect** 协议

### 内部依赖

```json
{
  "dependencies": {
    "@ldesign/http": "workspace:*",     // HTTP 请求
    "@ldesign/crypto": "workspace:*",   // 加密解密
    "@ldesign/router": "workspace:*",   // 路由守卫
    "@ldesign/cache": "workspace:*",    // Token 缓存
    "@ldesign/shared": "workspace:*"    // 工具函数
  }
}
```

---

## 🗺️ 开发路线图

### v0.1.0 - MVP（当前）✅

**已完成**:
- [x] AuthManager 核心
- [x] JWT 基础认证
- [x] Token 管理（access + refresh）
- [x] 自动刷新
- [x] 状态管理
- [x] 持久化（localStorage）

**待完善**:
- [ ] 完整文档
- [ ] 单元测试
- [ ] 错误处理完善

### v0.2.0 - OAuth（4-5周）

**功能**:
- [ ] OAuth 2.0 完整实现
- [ ] PKCE 支持
- [ ] 社交登录（GitHub/Google）
- [ ] Provider 系统
- [ ] 完整测试

### v0.3.0 - 企业功能（5-6周）

**功能**:
- [ ] SSO 单点登录
- [ ] SAML 2.0
- [ ] MFA/2FA
- [ ] 密码重置流程
- [ ] 邮箱验证流程

### v1.0.0 - 完整安全（10-12周）

**功能**:
- [ ] WebAuthn 生物识别
- [ ] 设备管理
- [ ] 登录历史
- [ ] 安全审计
- [ ] 风险评估

---

## 📋 详细任务分解

### Week 1-2: v0.1.0 完善

#### Week 1
- [ ] JWT 解析器（2天）
  - JWT decode
  - Payload 验证
  - 过期检测
  
- [ ] 错误处理（2天）
  - 错误码定义
  - 错误类型
  - 错误消息

- [ ] 文档（1天）

#### Week 2
- [ ] 单元测试（3天）
- [ ] 集成测试（2天）

### Week 3-7: v0.2.0 OAuth

#### Week 3-4: OAuth 核心
- [ ] OAuth 流程（10天）
  - Authorization Code
  - PKCE
  - State 验证

#### Week 5: Provider 系统
- [ ] GitHub Provider（3天）
- [ ] Google Provider（2天）

#### Week 6-7: 测试和文档
- [ ] 完整测试（5天）
- [ ] OAuth 文档（5天）

---

## 🧪 测试策略

### 单元测试

**覆盖率**: >85%

**测试内容**:
- AuthManager 所有方法
- Token 管理
- 状态管理
- 持久化

### E2E 测试

**场景**:
- 完整登录流程
- Token 刷新流程
- 登出流程
- OAuth 流程

---

## 📊 性能目标

| 指标 | 目标 |
|------|------|
| Bundle 大小 | <40KB |
| 登录耗时 | <500ms |
| Token 刷新 | <200ms |
| 状态恢复 | <50ms |

---

**文档版本**: 1.0  
**创建时间**: 2025-10-22






