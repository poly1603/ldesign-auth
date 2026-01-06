/**
 * 密码安全工具
 *
 * @module @ldesign/auth-core/security
 * @author LDesign Team
 */

/**
 * 密码强度等级
 */
export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong' | 'excellent'

/**
 * 密码验证结果
 */
export interface PasswordValidationResult {
  /** 是否有效 */
  valid: boolean
  /** 密码强度 */
  strength: PasswordStrength
  /** 强度分数 (0-100) */
  score: number
  /** 验证失败的规则 */
  errors: string[]
  /** 改进建议 */
  suggestions: string[]
}

/**
 * 密码验证配置
 */
export interface PasswordConfig {
  /** 最小长度 */
  minLength?: number
  /** 最大长度 */
  maxLength?: number
  /** 需要小写字母 */
  requireLowercase?: boolean
  /** 需要大写字母 */
  requireUppercase?: boolean
  /** 需要数字 */
  requireNumber?: boolean
  /** 需要特殊字符 */
  requireSpecial?: boolean
  /** 禁止连续字符 */
  disallowSequential?: boolean
  /** 禁止重复字符 */
  disallowRepeating?: boolean
  /** 常见弱密码黑名单 */
  blacklist?: string[]
}

/**
 * 默认密码配置
 */
const DEFAULT_CONFIG: Required<PasswordConfig> = {
  minLength: 8,
  maxLength: 128,
  requireLowercase: true,
  requireUppercase: true,
  requireNumber: true,
  requireSpecial: false,
  disallowSequential: true,
  disallowRepeating: true,
  blacklist: [
    'password', 'password123', '123456', '12345678', 'qwerty',
    'abc123', 'admin', 'letmein', 'welcome', 'monkey',
  ],
}

/**
 * 特殊字符集
 */
const SPECIAL_CHARS = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/`~'

/**
 * 连续字符序列
 */
const SEQUENTIAL_PATTERNS = [
  'abcdefghijklmnopqrstuvwxyz',
  'qwertyuiopasdfghjklzxcvbnm',
  '0123456789',
]

/**
 * 检查密码强度
 *
 * @param password - 密码
 * @returns 密码强度等级和分数
 *
 * @example
 * ```ts
 * const result = checkPasswordStrength('MyP@ssw0rd')
 * console.log(result.strength) // 'strong'
 * console.log(result.score) // 85
 * ```
 */
export function checkPasswordStrength(password: string): {
  strength: PasswordStrength
  score: number
} {
  let score = 0

  // 长度得分 (最多 30 分)
  score += Math.min(30, password.length * 3)

  // 小写字母得分 (10 分)
  if (/[a-z]/.test(password)) score += 10

  // 大写字母得分 (10 分)
  if (/[A-Z]/.test(password)) score += 10

  // 数字得分 (10 分)
  if (/\d/.test(password)) score += 10

  // 特殊字符得分 (15 分)
  if (/[!@#$%^&*()_+\-=\[\]{}|;:'",.<>?/`~]/.test(password)) score += 15

  // 混合字符类型加分 (最多 15 分)
  const charTypes = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[!@#$%^&*()_+\-=\[\]{}|;:'",.<>?/`~]/.test(password),
  ].filter(Boolean).length

  score += (charTypes - 1) * 5

  // 扣分：连续字符
  if (hasSequentialChars(password)) score -= 10

  // 扣分：重复字符
  if (hasRepeatingChars(password)) score -= 10

  // 确保分数在 0-100 范围内
  score = Math.max(0, Math.min(100, score))

  // 根据分数确定强度
  let strength: PasswordStrength
  if (score < 30) strength = 'weak'
  else if (score < 50) strength = 'fair'
  else if (score < 70) strength = 'good'
  else if (score < 90) strength = 'strong'
  else strength = 'excellent'

  return { strength, score }
}

/**
 * 验证密码
 *
 * @param password - 密码
 * @param config - 验证配置
 * @returns 验证结果
 *
 * @example
 * ```ts
 * const result = validatePassword('MyP@ssw0rd', {
 *   minLength: 8,
 *   requireSpecial: true,
 * })
 *
 * if (!result.valid) {
 *   console.log(result.errors)
 * }
 * ```
 */
export function validatePassword(
  password: string,
  config: PasswordConfig = {},
): PasswordValidationResult {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const errors: string[] = []
  const suggestions: string[] = []

  // 检查长度
  if (password.length < cfg.minLength) {
    errors.push(`密码长度不能少于 ${cfg.minLength} 个字符`)
  }
  if (password.length > cfg.maxLength) {
    errors.push(`密码长度不能超过 ${cfg.maxLength} 个字符`)
  }

  // 检查小写字母
  if (cfg.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('密码必须包含小写字母')
    suggestions.push('添加至少一个小写字母 (a-z)')
  }

  // 检查大写字母
  if (cfg.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('密码必须包含大写字母')
    suggestions.push('添加至少一个大写字母 (A-Z)')
  }

  // 检查数字
  if (cfg.requireNumber && !/\d/.test(password)) {
    errors.push('密码必须包含数字')
    suggestions.push('添加至少一个数字 (0-9)')
  }

  // 检查特殊字符
  if (cfg.requireSpecial) {
    const hasSpecial = SPECIAL_CHARS.split('').some(char => password.includes(char))
    if (!hasSpecial) {
      errors.push('密码必须包含特殊字符')
      suggestions.push(`添加至少一个特殊字符 (${SPECIAL_CHARS.slice(0, 10)}...)`)
    }
  }

  // 检查连续字符
  if (cfg.disallowSequential && hasSequentialChars(password)) {
    errors.push('密码不能包含连续字符序列')
    suggestions.push('避免使用如 "abc", "123" 等连续字符')
  }

  // 检查重复字符
  if (cfg.disallowRepeating && hasRepeatingChars(password)) {
    errors.push('密码不能包含过多重复字符')
    suggestions.push('避免使用如 "aaa", "111" 等重复字符')
  }

  // 检查黑名单
  if (cfg.blacklist.some(weak => password.toLowerCase().includes(weak))) {
    errors.push('密码太常见，请选择更复杂的密码')
    suggestions.push('避免使用常见密码或词汇')
  }

  // 计算强度
  const { strength, score } = checkPasswordStrength(password)

  return {
    valid: errors.length === 0,
    strength,
    score,
    errors,
    suggestions,
  }
}

/**
 * 生成安全密码
 *
 * @param length - 密码长度
 * @param options - 生成选项
 * @returns 生成的密码
 *
 * @example
 * ```ts
 * const password = generateSecurePassword(16, {
 *   includeLowercase: true,
 *   includeUppercase: true,
 *   includeNumbers: true,
 *   includeSpecial: true,
 * })
 * ```
 */
export function generateSecurePassword(
  length = 16,
  options: {
    includeLowercase?: boolean
    includeUppercase?: boolean
    includeNumbers?: boolean
    includeSpecial?: boolean
    excludeAmbiguous?: boolean
  } = {},
): string {
  const {
    includeLowercase = true,
    includeUppercase = true,
    includeNumbers = true,
    includeSpecial = true,
    excludeAmbiguous = true,
  } = options

  let chars = ''

  if (includeLowercase) {
    chars += excludeAmbiguous ? 'abcdefghjkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz'
  }
  if (includeUppercase) {
    chars += excludeAmbiguous ? 'ABCDEFGHJKMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  }
  if (includeNumbers) {
    chars += excludeAmbiguous ? '23456789' : '0123456789'
  }
  if (includeSpecial) {
    chars += '!@#$%^&*'
  }

  if (chars.length === 0) {
    chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  }

  let password = ''

  // 使用 crypto.getRandomValues 如果可用
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint32Array(length)
    crypto.getRandomValues(array)
    for (let i = 0; i < length; i++) {
      password += chars[array[i] % chars.length]
    }
  } else {
    // 回退方案
    for (let i = 0; i < length; i++) {
      password += chars[Math.floor(Math.random() * chars.length)]
    }
  }

  // 确保密码包含所需的字符类型
  const requirements: Array<{ check: () => boolean; chars: string }> = []

  if (includeLowercase) {
    requirements.push({
      check: () => /[a-z]/.test(password),
      chars: 'abcdefghijklmnopqrstuvwxyz',
    })
  }
  if (includeUppercase) {
    requirements.push({
      check: () => /[A-Z]/.test(password),
      chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    })
  }
  if (includeNumbers) {
    requirements.push({
      check: () => /\d/.test(password),
      chars: '0123456789',
    })
  }
  if (includeSpecial) {
    requirements.push({
      check: () => /[!@#$%^&*]/.test(password),
      chars: '!@#$%^&*',
    })
  }

  // 替换字符以满足要求
  let passwordArray = password.split('')
  requirements.forEach((req, index) => {
    if (!req.check()) {
      const randomChar = req.chars[Math.floor(Math.random() * req.chars.length)]
      passwordArray[index % length] = randomChar
    }
  })

  return passwordArray.join('')
}

/**
 * 检查是否包含连续字符
 */
function hasSequentialChars(password: string, minLength = 3): boolean {
  const lower = password.toLowerCase()

  for (const pattern of SEQUENTIAL_PATTERNS) {
    for (let i = 0; i <= pattern.length - minLength; i++) {
      const seq = pattern.substring(i, i + minLength)
      const reverseSeq = seq.split('').reverse().join('')

      if (lower.includes(seq) || lower.includes(reverseSeq)) {
        return true
      }
    }
  }

  return false
}

/**
 * 检查是否包含重复字符
 */
function hasRepeatingChars(password: string, minRepeat = 3): boolean {
  for (let i = 0; i <= password.length - minRepeat; i++) {
    const char = password[i]
    let count = 1

    for (let j = i + 1; j < password.length; j++) {
      if (password[j] === char) {
        count++
        if (count >= minRepeat) return true
      } else {
        break
      }
    }
  }

  return false
}
