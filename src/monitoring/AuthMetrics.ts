/**
 * 认证性能监控
 *
 * 收集和统计认证操作的性能指标
 */

/**
 * 认证指标数据
 */
export interface AuthMetrics {
  /** 登录尝试次数 */
  loginAttempts: number
  /** 登录成功次数 */
  loginSuccesses: number
  /** 登录失败次数 */
  loginFailures: number
  /** Token 刷新次数 */
  tokenRefreshes: number
  /** Token 刷新失败次数 */
  tokenRefreshFailures: number
  /** 平均登录耗时（毫秒） */
  averageLoginTime: number
  /** 平均 Token 刷新耗时（毫秒） */
  averageRefreshTime: number
  /** 登出次数 */
  logouts: number
  /** Session 超时次数 */
  sessionTimeouts: number
  /** 最后登录时间 */
  lastLoginTime?: number
  /** 最后刷新时间 */
  lastRefreshTime?: number
}

/**
 * 性能计时器
 */
export class PerformanceTimer {
  private startTime: number

  constructor() {
    this.startTime = performance.now()
  }

  /**
   * 获取经过的时间（毫秒）
   */
  elapsed(): number {
    return performance.now() - this.startTime
  }

  /**
   * 重置计时器
   */
  reset(): void {
    this.startTime = performance.now()
  }
}

/**
 * 认证指标收集器
 *
 * @example
 * ```typescript
 * const metrics = new AuthMetricsCollector()
 *
 * // 记录登录
 * const timer = metrics.startTimer()
 * await login()
 * metrics.recordLogin(true, timer.elapsed())
 *
 * // 获取指标
 * const data = metrics.getMetrics()
 * console.log('登录成功率:', data.loginSuccesses / data.loginAttempts)
 * ```
 */
export class AuthMetricsCollector {
  private metrics: AuthMetrics = {
    loginAttempts: 0,
    loginSuccesses: 0,
    loginFailures: 0,
    tokenRefreshes: 0,
    tokenRefreshFailures: 0,
    averageLoginTime: 0,
    averageRefreshTime: 0,
    logouts: 0,
    sessionTimeouts: 0,
  }

  private loginTimes: number[] = []
  private refreshTimes: number[] = []
  private readonly maxSamples = 100 // 保留最近 100 个样本

  /**
   * 创建性能计时器
   */
  startTimer(): PerformanceTimer {
    return new PerformanceTimer()
  }

  /**
   * 记录登录操作
   *
   * @param success - 是否成功
   * @param duration - 耗时（毫秒）
   */
  recordLogin(success: boolean, duration: number): void {
    this.metrics.loginAttempts++

    if (success) {
      this.metrics.loginSuccesses++
      this.metrics.lastLoginTime = Date.now()
      this.addLoginTime(duration)
    }
    else {
      this.metrics.loginFailures++
    }
  }

  /**
   * 记录 Token 刷新操作
   *
   * @param success - 是否成功
   * @param duration - 耗时（毫秒）
   */
  recordTokenRefresh(success: boolean, duration: number): void {
    if (success) {
      this.metrics.tokenRefreshes++
      this.metrics.lastRefreshTime = Date.now()
      this.addRefreshTime(duration)
    }
    else {
      this.metrics.tokenRefreshFailures++
    }
  }

  /**
   * 记录登出操作
   */
  recordLogout(): void {
    this.metrics.logouts++
  }

  /**
   * 记录 Session 超时
   */
  recordSessionTimeout(): void {
    this.metrics.sessionTimeouts++
  }

  /**
   * 获取所有指标
   */
  getMetrics(): AuthMetrics {
    return { ...this.metrics }
  }

  /**
   * 获取登录成功率
   */
  getLoginSuccessRate(): number {
    if (this.metrics.loginAttempts === 0) {
      return 0
    }
    return this.metrics.loginSuccesses / this.metrics.loginAttempts
  }

  /**
   * 获取 Token 刷新成功率
   */
  getRefreshSuccessRate(): number {
    const total = this.metrics.tokenRefreshes + this.metrics.tokenRefreshFailures
    if (total === 0) {
      return 0
    }
    return this.metrics.tokenRefreshes / total
  }

  /**
   * 重置所有指标
   */
  reset(): void {
    this.metrics = {
      loginAttempts: 0,
      loginSuccesses: 0,
      loginFailures: 0,
      tokenRefreshes: 0,
      tokenRefreshFailures: 0,
      averageLoginTime: 0,
      averageRefreshTime: 0,
      logouts: 0,
      sessionTimeouts: 0,
    }
    this.loginTimes = []
    this.refreshTimes = []
  }

  /**
   * 导出指标数据（用于持久化或上报）
   */
  export(): string {
    return JSON.stringify({
      metrics: this.metrics,
      timestamp: Date.now(),
    })
  }

  /**
   * 添加登录时间样本
   * @private
   */
  private addLoginTime(duration: number): void {
    this.loginTimes.push(duration)

    // 限制样本数量
    if (this.loginTimes.length > this.maxSamples) {
      this.loginTimes.shift()
    }

    // 计算移动平均
    this.metrics.averageLoginTime = this.calculateAverage(this.loginTimes)
  }

  /**
   * 添加刷新时间样本
   * @private
   */
  private addRefreshTime(duration: number): void {
    this.refreshTimes.push(duration)

    if (this.refreshTimes.length > this.maxSamples) {
      this.refreshTimes.shift()
    }

    this.metrics.averageRefreshTime = this.calculateAverage(this.refreshTimes)
  }

  /**
   * 计算平均值
   * @private
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) {
      return 0
    }
    const sum = values.reduce((acc, val) => acc + val, 0)
    return sum / values.length
  }
}

/**
 * 创建认证指标收集器
 *
 * @returns 指标收集器实例
 */
export function createAuthMetricsCollector(): AuthMetricsCollector {
  return new AuthMetricsCollector()
}

