/**
 * WebAuthn 模块
 *
 * @example
 * ```typescript
 * import { createWebAuthnManager } from '@ldesign/auth/webauthn'
 *
 * const manager = createWebAuthnManager('My App')
 *
 * // 检查是否可用
 * if (manager.isAvailable()) {
 *   // 注册设备
 *   const credential = await manager.register('user123', 'user@example.com')
 *
 *   // 认证
 *   const success = await manager.authenticate('user123')
 * }
 * ```
 */

// 导出 WebAuthn 管理器
export { WebAuthnManager, createWebAuthnManager } from './WebAuthnManager'
export type { WebAuthnDevice, AuthenticatorType } from './WebAuthnManager'

