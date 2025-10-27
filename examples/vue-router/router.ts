/**
 * Vue Router 集成示例
 * 
 * 演示：
 * - 认证守卫
 * - 角色守卫
 * - 权限守卫
 * - 路由元信息
 * - 重定向
 */

import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { createAuthGuard, createRoleGuard, createPermissionGuard } from '@ldesign/auth/router'
import { authManager } from './auth'

// ========================================
// 页面组件
// ========================================

import Home from './views/Home.vue'
import Login from './views/Login.vue'
import Register from './views/Register.vue'
import Dashboard from './views/Dashboard.vue'
import Profile from './views/Profile.vue'
import Settings from './views/Settings.vue'
import Admin from './views/Admin.vue'
import UserManagement from './views/admin/UserManagement.vue'
import Analytics from './views/admin/Analytics.vue'
import NotFound from './views/NotFound.vue'
import Forbidden from './views/Forbidden.vue'

// ========================================
// 路由配置
// ========================================

const routes: RouteRecordRaw[] = [
  // 公开页面
  {
    path: '/',
    name: 'home',
    component: Home,
    meta: {
      title: '首页',
    },
  },

  // 登录页
  {
    path: '/login',
    name: 'login',
    component: Login,
    meta: {
      title: '登录',
      // 已登录用户访问登录页时，重定向到首页
      requiresGuest: true,
    },
  },

  // 注册页
  {
    path: '/register',
    name: 'register',
    component: Register,
    meta: {
      title: '注册',
      requiresGuest: true,
    },
  },

  // Dashboard（需要认证）
  {
    path: '/dashboard',
    name: 'dashboard',
    component: Dashboard,
    meta: {
      title: 'Dashboard',
      requiresAuth: true,
    },
  },

  // 个人资料（需要认证）
  {
    path: '/profile',
    name: 'profile',
    component: Profile,
    meta: {
      title: '个人资料',
      requiresAuth: true,
    },
  },

  // 设置（需要认证）
  {
    path: '/settings',
    name: 'settings',
    component: Settings,
    meta: {
      title: '设置',
      requiresAuth: true,
    },
  },

  // 管理后台（需要 admin 角色）
  {
    path: '/admin',
    name: 'admin',
    component: Admin,
    meta: {
      title: '管理后台',
      requiresAuth: true,
      roles: ['admin'],
    },
    children: [
      {
        path: 'users',
        name: 'admin-users',
        component: UserManagement,
        meta: {
          title: '用户管理',
          requiresAuth: true,
          roles: ['admin'],
          permissions: ['user:manage'],
        },
      },
      {
        path: 'analytics',
        name: 'admin-analytics',
        component: Analytics,
        meta: {
          title: '数据分析',
          requiresAuth: true,
          roles: ['admin', 'analyst'],
        },
      },
    ],
  },

  // 403 禁止访问
  {
    path: '/forbidden',
    name: 'forbidden',
    component: Forbidden,
    meta: {
      title: '禁止访问',
    },
  },

  // 404 页面
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFound,
    meta: {
      title: '页面未找到',
    },
  },
]

// ========================================
// 创建路由实例
// ========================================

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    else {
      return { top: 0 }
    }
  },
})

// ========================================
// 全局前置守卫
// ========================================

// 1. 认证守卫
router.beforeEach((to, from) => {
  // 设置页面标题
  document.title = (to.meta.title as string) || 'My App'

  // 检查是否需要认证
  if (to.meta.requiresAuth) {
    if (!authManager.isAuthenticated()) {
      console.log('未登录，重定向到登录页')
      return {
        path: '/login',
        query: {
          // 保存当前路径，登录后跳回
          redirect: to.fullPath,
        },
      }
    }
  }

  // 已登录用户访问登录/注册页时，重定向到首页
  if (to.meta.requiresGuest && authManager.isAuthenticated()) {
    console.log('已登录，重定向到首页')
    return '/'
  }
})

// 2. 角色守卫
router.beforeEach((to, from) => {
  if (to.meta.roles) {
    const user = authManager.getUser()
    const roles = to.meta.roles as string[]

    // 检查用户是否有所需角色
    const hasRole = roles.some(role => user?.roles?.includes(role))

    if (!hasRole) {
      console.log('无权访问，缺少角色:', roles)
      return {
        path: '/forbidden',
        query: {
          message: `需要以下角色之一: ${roles.join(', ')}`,
        },
      }
    }
  }
})

// 3. 权限守卫
router.beforeEach((to, from) => {
  if (to.meta.permissions) {
    const user = authManager.getUser()
    const permissions = to.meta.permissions as string[]

    // 检查用户是否有所需权限
    const hasPermission = permissions.some(permission =>
      user?.permissions?.includes(permission),
    )

    if (!hasPermission) {
      console.log('无权访问，缺少权限:', permissions)
      return {
        path: '/forbidden',
        query: {
          message: `需要以下权限之一: ${permissions.join(', ')}`,
        },
      }
    }
  }
})

// ========================================
// 使用 @ldesign/auth/router 提供的守卫
// ========================================

// 方式 1: 使用内置的认证守卫
// router.beforeEach(createAuthGuard(authManager, '/login'))

// 方式 2: 在特定路由上使用角色守卫
const adminGuard = createRoleGuard(authManager, ['admin'], '/forbidden')
const moderatorGuard = createRoleGuard(authManager, ['admin', 'moderator'], '/forbidden')

// 方式 3: 在特定路由上使用权限守卫
const userEditGuard = createPermissionGuard(authManager, ['user:edit'], '/forbidden')

// 可以直接在路由配置中使用：
/*
{
  path: '/admin',
  component: Admin,
  beforeEnter: adminGuard
}
*/

// ========================================
// 全局后置守卫
// ========================================

router.afterEach((to, from) => {
  // 记录页面访问
  console.log('Navigation:', from.path, '->', to.path)

  // 可以在这里发送分析数据
  // analytics.trackPageView(to.path)
})

// ========================================
// 错误处理
// ========================================

router.onError((error) => {
  console.error('Router error:', error)
})

// ========================================
// 扩展：动态添加路由
// ========================================

/**
 * 根据用户权限动态添加路由
 */
export function addDynamicRoutes() {
  const user = authManager.getUser()

  if (!user)
    return

  // 管理员路由
  if (user.roles?.includes('admin')) {
    router.addRoute({
      path: '/admin/advanced',
      name: 'admin-advanced',
      component: () => import('./views/admin/Advanced.vue'),
      meta: {
        title: '高级设置',
        requiresAuth: true,
        roles: ['admin'],
      },
    })
  }

  // VIP 用户路由
  if (user.roles?.includes('vip')) {
    router.addRoute({
      path: '/vip',
      name: 'vip',
      component: () => import('./views/VIP.vue'),
      meta: {
        title: 'VIP 专区',
        requiresAuth: true,
        roles: ['vip'],
      },
    })
  }
}

// ========================================
// 扩展：路由权限助手
// ========================================

/**
 * 检查用户是否可以访问指定路由
 */
export function canAccess(routeName: string): boolean {
  const route = router.resolve({ name: routeName })
  const meta = route.meta

  // 需要认证
  if (meta.requiresAuth && !authManager.isAuthenticated()) {
    return false
  }

  const user = authManager.getUser()

  // 需要角色
  if (meta.roles) {
    const roles = meta.roles as string[]
    const hasRole = roles.some(role => user?.roles?.includes(role))
    if (!hasRole)
      return false
  }

  // 需要权限
  if (meta.permissions) {
    const permissions = meta.permissions as string[]
    const hasPermission = permissions.some(permission =>
      user?.permissions?.includes(permission),
    )
    if (!hasPermission)
      return false
  }

  return true
}

/**
 * 获取用户可访问的菜单项
 */
export function getAccessibleRoutes(): RouteRecordRaw[] {
  return routes.filter((route) => {
    // 跳过特殊路由
    if (route.path === '/login' || route.path === '/register' || route.path === '/:pathMatch(.*)*') {
      return false
    }

    // 检查访问权限
    if (route.name) {
      return canAccess(route.name as string)
    }

    return true
  })
}

// ========================================
// 导出
// ========================================

export default router
export {
  adminGuard,
  moderatorGuard,
  userEditGuard,
}

// ========================================
// 类型声明
// ========================================

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    requiresAuth?: boolean
    requiresGuest?: boolean
    roles?: string[]
    permissions?: string[]
  }
}

