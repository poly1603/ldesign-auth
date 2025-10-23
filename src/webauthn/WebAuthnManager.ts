/**
 * WebAuthn 管理器
 *
 * 实现 WebAuthn (Web Authentication API) 生物识别登录
 */

/**
 * WebAuthn 设备
 */
export interface WebAuthnDevice {
  /**
   * 凭证 ID
   */
  credentialId: string

  /**
   * 设备名称
   */
  name: string

  /**
   * 创建时间
   */
  createdAt: Date

  /**
   * 最后使用时间
   */
  lastUsed?: Date
}

/**
 * 认证器类型
 */
export type AuthenticatorType = 'platform' | 'cross-platform'

/**
 * WebAuthn 管理器类
 */
export class WebAuthnManager {
  private rpName: string
  private rpId: string

  constructor(rpName = 'LDesign', rpId?: string) {
    this.rpName = rpName
    this.rpId = rpId || (typeof window !== 'undefined' ? window.location.hostname : 'localhost')
  }

  /**
   * 检查 WebAuthn 是否可用
   *
   * @returns 是否可用
   */
  isAvailable(): boolean {
    return typeof window !== 'undefined'
      && typeof window.PublicKeyCredential !== 'undefined'
  }

  /**
   * 注册设备
   *
   * @param userId - 用户 ID
   * @param userName - 用户名
   * @returns 公钥凭证
   *
   * @example
   * ```typescript
   * const manager = new WebAuthnManager()
   * const credential = await manager.register('user123', 'john@example.com')
   * ```
   */
  async register(userId: string, userName: string): Promise<PublicKeyCredential> {
    if (!this.isAvailable()) {
      throw new Error('WebAuthn is not available')
    }

    const challenge = this.generateChallenge()

    const publicKey: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: this.rpName,
        id: this.rpId,
      },
      user: {
        id: new TextEncoder().encode(userId),
        name: userName,
        displayName: userName,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 }, // ES256
        { type: 'public-key', alg: -257 }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
      },
      timeout: 60000,
      attestation: 'none',
    }

    const credential = await navigator.credentials.create({
      publicKey,
    }) as PublicKeyCredential

    return credential
  }

  /**
   * 认证
   *
   * @param userId - 用户 ID
   * @returns 是否认证成功
   *
   * @example
   * ```typescript
   * const success = await manager.authenticate('user123')
   * ```
   */
  async authenticate(_userId: string): Promise<boolean> {
    if (!this.isAvailable()) {
      throw new Error('WebAuthn is not available')
    }

    const challenge = this.generateChallenge()

    const publicKey: PublicKeyCredentialRequestOptions = {
      challenge,
      timeout: 60000,
      userVerification: 'required',
      rpId: this.rpId,
    }

    try {
      await navigator.credentials.get({ publicKey })
      return true
    }
    catch {
      return false
    }
  }

  /**
   * 获取支持的认证器类型
   *
   * @returns 认证器类型列表
   */
  getSupportedAuthenticators(): AuthenticatorType[] {
    const types: AuthenticatorType[] = []

    if (this.isAvailable()) {
      types.push('platform')
      types.push('cross-platform')
    }

    return types
  }

  /**
   * 生成 Challenge
   *
   * @returns Challenge
   * @private
   */
  private generateChallenge(): Uint8Array {
    const challenge = new Uint8Array(32)
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(challenge)
    }
    return challenge
  }
}

/**
 * 创建 WebAuthn 管理器
 *
 * @param rpName - 依赖方名称
 * @param rpId - 依赖方 ID
 * @returns WebAuthn 管理器实例
 */
export function createWebAuthnManager(rpName?: string, rpId?: string): WebAuthnManager {
  return new WebAuthnManager(rpName, rpId)
}

