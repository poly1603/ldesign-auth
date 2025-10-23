/**
 * 安全模块
 *
 * 提供风险评估和账号保护功能
 *
 * @example
 * ```typescript
 * import { createRiskAssessor, createAccountProtection } from '@ldesign/auth/security'
 *
 * const assessor = createRiskAssessor()
 * const protection = createAccountProtection()
 *
 * // 评估风险
 * const risk = await assessor.assessLoginRisk('user123', {
 *   ip: '192.168.1.1',
 *   device: 'Chrome on Windows',
 *   timestamp: new Date(),
 * })
 *
 * // 应用保护措施
 * if (risk === 'high') {
 *   const restrictions = protection.applyLoginRestrictions('user123')
 *   if (restrictions.requireMFA) {
 *     console.log('需要 MFA 验证')
 *   }
 * }
 * ```
 */

// 导出风险评估器
export { RiskAssessor, createRiskAssessor } from './RiskAssessor'
export type { LoginContext, RiskLevel, Anomaly } from './RiskAssessor'

// 导出账号保护
export { AccountProtection, createAccountProtection } from './AccountProtection'
export type { LoginRestrictions } from './AccountProtection'

