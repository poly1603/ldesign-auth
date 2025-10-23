/**
 * MFA (多因素认证) 模块
 *
 * @example
 * ```typescript
 * import { createMFAManager } from '@ldesign/auth/mfa'
 * import { createHttpClient } from '@ldesign/http'
 *
 * const httpClient = createHttpClient()
 * const mfa = createMFAManager({
 *   appName: 'My App',
 *   issuer: 'My Company',
 * }, httpClient)
 *
 * // 启用 TOTP
 * const setup = await mfa.enable('user123', 'totp')
 * console.log('Secret:', setup.secret)
 * console.log('QR Code URI:', setup.qrCode)
 * console.log('备用码:', setup.backupCodes)
 *
 * // 用户使用 Google Authenticator 扫描 QR 码后，验证
 * const isValid = await mfa.verify('user123', '123456', 'totp', setup.secret)
 *
 * if (isValid) {
 *   console.log('MFA 验证通过')
 * }
 * ```
 */

// 导出类型
export type * from './types'

// 导出 TOTP
export { TOTPVerifier, createTOTPVerifier } from './totp'

// 导出 SMS
export { SMSVerifier, createSMSVerifier } from './sms'
export type { SMSVerifierConfig } from './sms'

// 导出 MFA 管理器
export { MFAManager, createMFAManager } from './MFAManager'

