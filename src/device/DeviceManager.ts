/**
 * 设备管理器
 */

import type { HttpClient } from '@ldesign/http'

/**
 * 设备信息
 */
export interface Device {
  /**
   * 设备 ID
   */
  id: string

  /**
   * 用户 ID
   */
  userId: string

  /**
   * 设备名称
   */
  name: string

  /**
   * 设备类型
   */
  type: 'desktop' | 'mobile' | 'tablet' | 'other'

  /**
   * 操作系统
   */
  os: string

  /**
   * 浏览器
   */
  browser: string

  /**
   * 是否信任
   */
  trusted: boolean

  /**
   * 最后使用时间
   */
  lastUsed: Date

  /**
   * 创建时间
   */
  createdAt: Date

  /**
   * IP 地址
   */
  ip?: string

  /**
   * 设备指纹
   */
  fingerprint?: string
}

/**
 * 设备管理器配置
 */
export interface DeviceManagerConfig {
  /**
   * 设备列表端点
   * @default '/api/auth/devices'
   */
  devicesEndpoint?: string

  /**
   * 信任设备端点
   * @default '/api/auth/devices/trust'
   */
  trustEndpoint?: string

  /**
   * 移除设备端点
   * @default '/api/auth/devices/remove'
   */
  removeEndpoint?: string
}

/**
 * 设备管理器类
 */
export class DeviceManager {
  private config: Required<DeviceManagerConfig>
  private httpClient?: HttpClient

  constructor(config: DeviceManagerConfig = {}, httpClient?: HttpClient) {
    this.config = {
      devicesEndpoint: config.devicesEndpoint || '/api/auth/devices',
      trustEndpoint: config.trustEndpoint || '/api/auth/devices/trust',
      removeEndpoint: config.removeEndpoint || '/api/auth/devices/remove',
    }

    this.httpClient = httpClient
  }

  /**
   * 获取设备信息
   *
   * @returns 当前设备信息
   *
   * @example
   * ```typescript
   * const manager = new DeviceManager()
   * const device = await manager.getDeviceInfo()
   * console.log('设备:', device)
   * ```
   */
  async getDeviceInfo(): Promise<Partial<Device>> {
    // 简化的设备信息检测
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''

    return {
      name: this.getDeviceName(userAgent),
      type: this.getDeviceType(userAgent),
      os: this.getOS(userAgent),
      browser: this.getBrowser(userAgent),
      fingerprint: await this.getDeviceFingerprint(),
    }
  }

  /**
   * 获取设备指纹
   *
   * @returns 设备指纹
   *
   * @example
   * ```typescript
   * const fingerprint = await manager.getDeviceFingerprint()
   * ```
   */
  async getDeviceFingerprint(): Promise<string> {
    // 简化的设备指纹生成
    // 实际应该使用更复杂的指纹算法
    const components = []

    if (typeof navigator !== 'undefined') {
      components.push(navigator.userAgent)
      components.push(navigator.language)
      components.push(screen.width.toString())
      components.push(screen.height.toString())
      components.push(screen.colorDepth.toString())
      components.push(new Date().getTimezoneOffset().toString())
    }

    const fingerprint = components.join('|')

    // 生成哈希
    const encoder = new TextEncoder()
    const data = encoder.encode(fingerprint)

    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    }

    // Fallback
    return fingerprint
  }

  /**
   * 获取设备列表
   *
   * @param userId - 用户 ID
   * @returns 设备列表
   */
  async getDevices(userId: string): Promise<Device[]> {
    if (!this.httpClient) {
      return []
    }

    try {
      const response = await this.httpClient.get<{ devices: Device[] }>(
        this.config.devicesEndpoint,
        { params: { userId } },
      )

      return response.devices
    }
    catch (error) {
      console.error('[DeviceManager] Get devices failed:', error)
      return []
    }
  }

  /**
   * 信任设备
   *
   * @param deviceId - 设备 ID
   */
  async trustDevice(deviceId: string): Promise<void> {
    if (!this.httpClient) {
      return
    }

    await this.httpClient.post(this.config.trustEndpoint, { deviceId })
  }

  /**
   * 移除设备
   *
   * @param deviceId - 设备 ID
   */
  async removeDevice(deviceId: string): Promise<void> {
    if (!this.httpClient) {
      return
    }

    await this.httpClient.post(this.config.removeEndpoint, { deviceId })
  }

  /**
   * 获取设备名称
   *
   * @param userAgent - User Agent
   * @returns 设备名称
   * @private
   */
  private getDeviceName(userAgent: string): string {
    const browser = this.getBrowser(userAgent)
    const os = this.getOS(userAgent)
    return `${browser} on ${os}`
  }

  /**
   * 获取设备类型
   *
   * @param userAgent - User Agent
   * @returns 设备类型
   * @private
   */
  private getDeviceType(userAgent: string): 'desktop' | 'mobile' | 'tablet' | 'other' {
    if (/mobile/i.test(userAgent)) {
      return /tablet|ipad/i.test(userAgent) ? 'tablet' : 'mobile'
    }
    return 'desktop'
  }

  /**
   * 获取操作系统
   *
   * @param userAgent - User Agent
   * @returns 操作系统
   * @private
   */
  private getOS(userAgent: string): string {
    if (/windows/i.test(userAgent))
      return 'Windows'
    if (/mac/i.test(userAgent))
      return 'macOS'
    if (/linux/i.test(userAgent))
      return 'Linux'
    if (/android/i.test(userAgent))
      return 'Android'
    if (/iphone|ipad/i.test(userAgent))
      return 'iOS'
    return 'Unknown'
  }

  /**
   * 获取浏览器
   *
   * @param userAgent - User Agent
   * @returns 浏览器
   * @private
   */
  private getBrowser(userAgent: string): string {
    if (/chrome/i.test(userAgent))
      return 'Chrome'
    if (/firefox/i.test(userAgent))
      return 'Firefox'
    if (/safari/i.test(userAgent))
      return 'Safari'
    if (/edge/i.test(userAgent))
      return 'Edge'
    return 'Unknown'
  }
}

/**
 * 创建设备管理器
 *
 * @param config - 配置
 * @param httpClient - HTTP 客户端
 * @returns 设备管理器实例
 *
 * @example
 * ```typescript
 * import { createDeviceManager } from '@ldesign/auth/device'
 *
 * const manager = createDeviceManager({}, httpClient)
 * const devices = await manager.getDevices('user123')
 * ```
 */
export function createDeviceManager(
  config?: DeviceManagerConfig,
  httpClient?: HttpClient,
): DeviceManager {
  return new DeviceManager(config, httpClient)
}

