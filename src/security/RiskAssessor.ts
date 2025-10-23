/**
 * 风险评估器
 */

/**
 * 登录上下文
 */
export interface LoginContext {
  /**
   * IP 地址
   */
  ip: string

  /**
   * 设备信息
   */
  device: string

  /**
   * 地理位置
   */
  location?: {
    country?: string
    city?: string
  }

  /**
   * 登录时间
   */
  timestamp: Date
}

/**
 * 风险级别
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

/**
 * 异常类型
 */
export interface Anomaly {
  /**
   * 异常类型
   */
  type: string

  /**
   * 描述
   */
  description: string

  /**
   * 风险级别
   */
  riskLevel: RiskLevel
}

/**
 * 风险评估器类
 */
export class RiskAssessor {
  private ipBlacklist: Set<string> = new Set()
  private loginHistory: Map<string, LoginContext[]> = new Map()

  /**
   * 评估登录风险
   *
   * @param userId - 用户 ID
   * @param context - 登录上下文
   * @returns 风险级别
   *
   * @example
   * ```typescript
   * const assessor = new RiskAssessor()
   * const risk = await assessor.assessLoginRisk('user123', {
   *   ip: '192.168.1.1',
   *   device: 'Chrome on Windows',
   *   timestamp: new Date(),
   * })
   *
   * if (risk === 'high') {
   *   console.log('高风险登录，需要额外验证')
   * }
   * ```
   */
  async assessLoginRisk(userId: string, context: LoginContext): Promise<RiskLevel> {
    const anomalies = this.detectAnomalies(userId, context)

    if (anomalies.length === 0) {
      return 'low'
    }

    // 根据异常数量和级别评估总体风险
    const criticalCount = anomalies.filter(a => a.riskLevel === 'critical').length
    const highCount = anomalies.filter(a => a.riskLevel === 'high').length

    if (criticalCount > 0) {
      return 'critical'
    }
    if (highCount > 1) {
      return 'high'
    }
    if (highCount === 1 || anomalies.length > 2) {
      return 'medium'
    }

    return 'low'
  }

  /**
   * 检测异常
   *
   * @param userId - 用户 ID
   * @param context - 登录上下文
   * @returns 异常列表
   */
  detectAnomalies(userId: string, context: LoginContext): Anomaly[] {
    const anomalies: Anomaly[] = []

    // 1. 检查 IP 黑名单
    if (this.isBlacklistedIP(context.ip)) {
      anomalies.push({
        type: 'blacklisted_ip',
        description: 'IP 在黑名单中',
        riskLevel: 'critical',
      })
    }

    // 2. 检查新设备
    const history = this.loginHistory.get(userId) || []
    const knownDevices = new Set(history.map(h => h.device))

    if (!knownDevices.has(context.device)) {
      anomalies.push({
        type: 'new_device',
        description: '使用新设备登录',
        riskLevel: 'medium',
      })
    }

    // 3. 检查新位置
    if (context.location && history.length > 0) {
      const lastLocation = history[history.length - 1].location
      if (lastLocation && lastLocation.country !== context.location.country) {
        anomalies.push({
          type: 'new_location',
          description: '从新位置登录',
          riskLevel: 'medium',
        })
      }
    }

    // 4. 检查频繁登录
    const recentLogins = history.filter((h) => {
      const timeDiff = context.timestamp.getTime() - h.timestamp.getTime()
      return timeDiff < 60000 // 1分钟内
    })

    if (recentLogins.length > 5) {
      anomalies.push({
        type: 'rapid_login_attempts',
        description: '频繁登录尝试',
        riskLevel: 'high',
      })
    }

    return anomalies
  }

  /**
   * 检查 IP 是否在黑名单中
   *
   * @param ip - IP 地址
   * @returns 是否在黑名单中
   */
  isBlacklistedIP(ip: string): boolean {
    return this.ipBlacklist.has(ip)
  }

  /**
   * 添加 IP 到黑名单
   *
   * @param ip - IP 地址
   */
  addToBlacklist(ip: string): void {
    this.ipBlacklist.add(ip)
  }

  /**
   * 从黑名单移除 IP
   *
   * @param ip - IP 地址
   */
  removeFromBlacklist(ip: string): void {
    this.ipBlacklist.delete(ip)
  }

  /**
   * 记录登录历史（用于风险评估）
   *
   * @param userId - 用户 ID
   * @param context - 登录上下文
   */
  recordLogin(userId: string, context: LoginContext): void {
    const history = this.loginHistory.get(userId) || []
    history.push(context)

    // 只保留最近 100 条记录
    if (history.length > 100) {
      history.shift()
    }

    this.loginHistory.set(userId, history)
  }
}

/**
 * 创建风险评估器
 *
 * @returns 风险评估器实例
 */
export function createRiskAssessor(): RiskAssessor {
  return new RiskAssessor()
}

