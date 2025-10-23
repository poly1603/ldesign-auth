/**
 * 账号保护
 */

/**
 * 登录限制
 */
export interface LoginRestrictions {
  /**
   * 是否需要验证码
   */
  requireCaptcha: boolean

  /**
   * 是否需要 MFA
   */
  requireMFA: boolean

  /**
   * 允许的登录次数
   */
  allowedAttempts: number

  /**
   * 剩余尝试次数
   */
  remainingAttempts: number

  /**
   * 锁定时长（毫秒）
   */
  lockDuration?: number
}

/**
 * 账号保护类
 */
export class AccountProtection {
  private lockedAccounts: Map<string, { until: Date, reason: string }> = new Map()
  private loginAttempts: Map<string, number> = new Map()
  private maxAttempts = 5

  /**
   * 锁定账号
   *
   * @param userId - 用户 ID
   * @param reason - 锁定原因
   * @param duration - 锁定时长（毫秒），默认 30 分钟
   *
   * @example
   * ```typescript
   * const protection = new AccountProtection()
   * await protection.lockAccount('user123', '多次登录失败', 30 * 60 * 1000)
   * ```
   */
  async lockAccount(
    userId: string,
    reason: string,
    duration = 30 * 60 * 1000,
  ): Promise<void> {
    const until = new Date(Date.now() + duration)

    this.lockedAccounts.set(userId, { until, reason })

    // 重置登录尝试
    this.loginAttempts.delete(userId)
  }

  /**
   * 解锁账号
   *
   * @param userId - 用户 ID
   *
   * @example
   * ```typescript
   * await protection.unlockAccount('user123')
   * ```
   */
  async unlockAccount(userId: string): Promise<void> {
    this.lockedAccounts.delete(userId)
    this.loginAttempts.delete(userId)
  }

  /**
   * 检查账号是否被锁定
   *
   * @param userId - 用户 ID
   * @returns 是否被锁定
   */
  isLocked(userId: string): boolean {
    const lock = this.lockedAccounts.get(userId)

    if (!lock) {
      return false
    }

    // 检查是否已到解锁时间
    if (Date.now() >= lock.until.getTime()) {
      this.lockedAccounts.delete(userId)
      return false
    }

    return true
  }

  /**
   * 记录登录失败
   *
   * @param userId - 用户 ID
   * @returns 是否应该锁定账号
   */
  recordFailedAttempt(userId: string): boolean {
    const attempts = (this.loginAttempts.get(userId) || 0) + 1
    this.loginAttempts.set(userId, attempts)

    // 超过最大尝试次数，锁定账号
    if (attempts >= this.maxAttempts) {
      this.lockAccount(userId, '多次登录失败', 30 * 60 * 1000)
      return true
    }

    return false
  }

  /**
   * 重置登录尝试
   *
   * @param userId - 用户 ID
   */
  resetAttempts(userId: string): void {
    this.loginAttempts.delete(userId)
  }

  /**
   * 检查是否需要验证码
   *
   * @param userId - 用户 ID
   * @returns 是否需要验证码
   */
  requireCaptcha(userId: string): boolean {
    const attempts = this.loginAttempts.get(userId) || 0
    return attempts >= 3
  }

  /**
   * 应用登录限制
   *
   * @param userId - 用户 ID
   * @returns 登录限制
   */
  applyLoginRestrictions(userId: string): LoginRestrictions {
    const attempts = this.loginAttempts.get(userId) || 0
    const lock = this.lockedAccounts.get(userId)

    return {
      requireCaptcha: this.requireCaptcha(userId),
      requireMFA: attempts >= 4,
      allowedAttempts: this.maxAttempts,
      remainingAttempts: Math.max(0, this.maxAttempts - attempts),
      lockDuration: lock ? lock.until.getTime() - Date.now() : undefined,
    }
  }
}

/**
 * 创建账号保护实例
 *
 * @returns 账号保护实例
 */
export function createAccountProtection(): AccountProtection {
  return new AccountProtection()
}

