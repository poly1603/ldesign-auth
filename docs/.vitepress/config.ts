import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '@ldesign/auth',
  description: 'LDesign 认证授权系统 - 完整的身份认证解决方案',
  base: '/auth/',

  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/introduction' },
      { text: 'API', link: '/api/auth-manager' },
      { text: '示例', link: '/examples/' },
      { text: 'GitHub', link: 'https://github.com/ldesign/ldesign' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: '开始',
          items: [
            { text: '介绍', link: '/guide/introduction' },
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '安装', link: '/guide/installation' }
          ]
        },
        {
          text: '核心功能',
          items: [
            { text: '认证管理', link: '/guide/auth-manager' },
            { text: 'Token 管理', link: '/guide/token' },
            { text: 'Session 管理', link: '/guide/session' },
            { text: '事件系统', link: '/guide/events' }
          ]
        },
        {
          text: '高级功能',
          items: [
            { text: 'OAuth 2.0', link: '/guide/oauth' },
            { text: '多因素认证 (MFA)', link: '/guide/mfa' },
            { text: '密码管理', link: '/guide/password' },
            { text: 'WebAuthn', link: '/guide/webauthn' },
            { text: 'SSO 单点登录', link: '/guide/sso' },
            { text: '账户安全', link: '/guide/security' }
          ]
        },
        {
          text: '集成',
          items: [
            { text: 'Vue 集成', link: '/guide/vue' },
            { text: '路由守卫', link: '/guide/router-guards' },
            { text: 'HTTP 拦截器', link: '/guide/http-interceptors' }
          ]
        },
        {
          text: '最佳实践',
          items: [
            { text: '安全建议', link: '/guide/best-practices' },
            { text: '错误处理', link: '/guide/error-handling' },
            { text: '性能优化', link: '/guide/performance' }
          ]
        }
      ],
      '/api/': [
        {
          text: '核心 API',
          items: [
            { text: 'AuthManager', link: '/api/auth-manager' },
            { text: 'TokenManager', link: '/api/token-manager' },
            { text: 'SessionManager', link: '/api/session-manager' },
            { text: 'EventEmitter', link: '/api/event-emitter' }
          ]
        },
        {
          text: '功能模块',
          items: [
            { text: 'JWT', link: '/api/jwt' },
            { text: 'OAuth', link: '/api/oauth' },
            { text: 'MFA', link: '/api/mfa' },
            { text: 'Password', link: '/api/password' },
            { text: 'WebAuthn', link: '/api/webauthn' },
            { text: 'SSO', link: '/api/sso' }
          ]
        },
        {
          text: '集成',
          items: [
            { text: 'Vue Composables', link: '/api/vue' },
            { text: '路由守卫', link: '/api/router-guards' }
          ]
        },
        {
          text: '类型定义',
          items: [
            { text: '类型', link: '/api/types' },
            { text: '错误', link: '/api/errors' }
          ]
        }
      ],
      '/examples/': [
        {
          text: '基础示例',
          items: [
            { text: '概览', link: '/examples/' },
            { text: '基础认证', link: '/examples/basic-auth' },
            { text: 'Token 刷新', link: '/examples/token-refresh' }
          ]
        },
        {
          text: 'OAuth 示例',
          items: [
            { text: 'GitHub 登录', link: '/examples/oauth-github' },
            { text: 'Google 登录', link: '/examples/oauth-google' },
            { text: '自定义 Provider', link: '/examples/oauth-custom' }
          ]
        },
        {
          text: '高级示例',
          items: [
            { text: 'MFA 双因素认证', link: '/examples/mfa-totp' },
            { text: '密码重置', link: '/examples/password-reset' },
            { text: 'WebAuthn 生物识别', link: '/examples/webauthn' },
            { text: 'SSO 集成', link: '/examples/sso' }
          ]
        },
        {
          text: 'Vue 示例',
          items: [
            { text: 'Vue 3 应用', link: '/examples/vue-app' },
            { text: '路由守卫', link: '/examples/vue-router' },
            { text: '全局状态', link: '/examples/vue-state' }
          ]
        },
        {
          text: '完整应用',
          items: [
            { text: '后台管理系统', link: '/examples/admin-dashboard' },
            { text: '电商平台', link: '/examples/ecommerce' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/ldesign/ldesign' }
    ],

    search: {
      provider: 'local'
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024 LDesign Team'
    }
  }
})

